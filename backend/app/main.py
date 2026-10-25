import logging
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from starlette.concurrency import run_in_threadpool

from app.config import settings
from app.exceptions import (
    AppException,
    ModelNotLoadedException,
    NotImplementedException,
)
from app.schemas import (
    AnalyzeRequest,
    Assessment,
    DetectResponse,
    ErrorBody,
    HealthResponse,
    Incident,
    IncidentSummary,
    Location,
    ReasonDebugRequest,
    TranscribeResponse,
)
from app.services.detector import detector
from app.services.features import compute_scene_features
from app.services.image_validator import validate_and_process_image
from app.services.reasoner import assess
from app.services.store import (
    delete_incident,
    get_data_dir,
    get_incident,
    get_uploads_dir,
    list_incidents,
    save_incident,
)




logger = logging.getLogger("resqvision.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager: Load YOLO nano weights once at startup."""
    try:
        detector.load_model()
    except Exception as exc:
        logger.error(f"Failed to load YOLO model at startup: {exc}")
    yield
    detector.unload_model()


app = FastAPI(
    title="ResQVision Backend API",
    description="Emergency Incident Triage & Evidentiary Assessment Pipeline",
    version=settings.VERSION,
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS Middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Global Exception Handlers (enforce uniform {"error": {"code", "message"}})
# ---------------------------------------------------------------------------

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Flatten validation errors to a clean message
    errors = exc.errors()
    msg = errors[0].get("msg", "Invalid request body") if errors else "Request validation failed"
    loc = " -> ".join(str(l) for l in errors[0].get("loc", [])) if errors else ""
    full_msg = f"{loc}: {msg}" if loc else msg

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": {"code": "VALIDATION_ERROR", "message": full_msg}},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        413: "PAYLOAD_TOO_LARGE",
        415: "UNSUPPORTED_MEDIA_TYPE",
        422: "VALIDATION_ERROR",
        500: "INTERNAL_SERVER_ERROR",
        501: "NOT_IMPLEMENTED",
        503: "SERVICE_UNAVAILABLE",
    }
    error_code = code_map.get(exc.status_code, f"HTTP_{exc.status_code}")
    error_message = exc.detail if isinstance(exc.detail, str) else "HTTP Exception occurred"

    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": error_code, "message": error_message}},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Never leak sensitive tracebacks or keys to the client
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred. Please try again later.",
            }
        },
    )


# ---------------------------------------------------------------------------
# Core Endpoints
# ---------------------------------------------------------------------------

@app.get(
    "/api/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Health check and service status",
)
async def health_check():
    """Return health status, model load flag truthfully, and Groq configuration status."""
    return HealthResponse(
        status="healthy",
        model_loaded=detector.is_loaded(),
        groq_configured=settings.is_groq_configured,
        version=settings.VERSION,
    )


@app.post(
    "/api/detect",
    response_model=DetectResponse,
    tags=["Inference"],
    summary="Upload image, validate, and run YOLO person detection",
    responses={
        400: {"model": ErrorBody},
        413: {"model": ErrorBody},
        415: {"model": ErrorBody},
        422: {"model": ErrorBody},
        503: {"model": ErrorBody},
    },
)
async def detect_endpoint(file: UploadFile = File(...)):
    """
    Validates uploaded imagery (size, MIME type, Pillow integrity, 1920px cap).
    Executes YOLO person detection and computes deterministic scene features.
    """
    # 1. Reusable upload validation service enforces type, size, and Pillow integrity
    processed_img = await validate_and_process_image(file)

    # 2. Check if model is loaded; return 503 if unavailable
    if not detector.is_loaded():
        raise ModelNotLoadedException(
            "YOLO detection model is not loaded. Service unavailable."
        )

    # 3. Execute inference in threadpool so event loop remains unblocked
    image_id = str(uuid.uuid4())
    detection_result = await run_in_threadpool(
        detector.detect, processed_img.image, image_id
    )

    # 4. Extract deterministic scene features (pure Python, no ML)
    scene_features = compute_scene_features(detection_result)

    return DetectResponse(
        image_id=image_id,
        detection_result=detection_result,
        scene_features=scene_features,
        features=scene_features,
    )



@app.post(
    "/api/analyze",
    response_model=Incident,
    tags=["Analysis"],
    summary="End-to-end incident analysis: vision detection, features extraction, and evidentiary assessment",
    responses={
        400: {"model": ErrorBody},
        413: {"model": ErrorBody},
        415: {"model": ErrorBody},
        422: {"model": ErrorBody},
        503: {"model": ErrorBody},
    },
)
async def analyze_endpoint(
    file: UploadFile = File(...),
    lat: Optional[float] = Form(None, ge=-90.0, le=90.0),
    lng: Optional[float] = Form(None, ge=-180.0, le=180.0),
    location_label: Optional[str] = Form(None),
    note: Optional[str] = Form(None),
    origin: Optional[str] = Form("live_analysis"),
):
    """
    Primary user journey pipeline:
    1. Validate image upload (format, max size, Pillow decode, 1920px cap).
    2. Check YOLO detector status.
    3. Run real YOLO person detection in threadpool.
    4. Compute deterministic scene features (pure Python).
    5. Execute evidentiary assessment via Groq LLM (with rules fallback).
    6. Construct Incident audit record.
    7. Save processed image under data/uploads/{id}.jpg and stage in store stub.
    8. Return Incident with timing metrics {detect_ms, reason_ms, total_ms}.
    """
    overall_start = time.perf_counter()

    # Coordinate validation
    if lat is not None and not (-90.0 <= lat <= 90.0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Latitude must be between -90 and 90 degrees.",
        )
    if lng is not None and not (-180.0 <= lng <= 180.0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Longitude must be between -180 and 180 degrees.",
        )

    # Input length limits
    if location_label and len(location_label) > 200:
        location_label = location_label[:200]
    if note and len(note) > 1000:
        note = note[:1000]

    # 1. Image validation & preprocessing
    processed_img = await validate_and_process_image(file)

    # 2. Check model loaded
    if not detector.is_loaded():
        raise ModelNotLoadedException("YOLO detection model is not loaded. Service unavailable.")

    incident_id = str(uuid.uuid4())

    # 3. Save processed image under data/uploads/{id}.jpg
    try:
        uploads_dir = get_uploads_dir()
        image_save_path = uploads_dir / f"{incident_id}.jpg"
        processed_img.image.save(image_save_path, format="JPEG", quality=90)
    except Exception as exc:
        logger.warning("Could not save uploaded image asset to %s: %s", incident_id, exc)


    # 4. YOLO person detection
    t_det_start = time.perf_counter()
    detection_result = await run_in_threadpool(
        detector.detect, processed_img.image, incident_id
    )
    detect_ms = round((time.perf_counter() - t_det_start) * 1000.0, 2)

    # 5. Deterministic features extraction
    scene_features = compute_scene_features(detection_result)

    # 6. Evidentiary assessment via Groq / rules fallback
    t_reason_start = time.perf_counter()
    assessment, source = assess(
        detection_result=detection_result,
        features=scene_features,
        note=note,
        location_label=location_label,
    )
    reason_ms = round((time.perf_counter() - t_reason_start) * 1000.0, 2)
    total_ms = round((time.perf_counter() - overall_start) * 1000.0, 2)

    # 7. Construct Location if provided
    location = None
    if lat is not None or lng is not None or location_label:
        location = Location(
            latitude=lat,
            longitude=lng,
            address=location_label,
            source="user_entered",
        )

    # 8. Build Incident record
    origin_val = "sample" if origin == "sample" else "live_analysis"
    incident = Incident(
        id=incident_id,
        created_at=datetime.now(timezone.utc).isoformat(),
        image_filename=f"{incident_id}.jpg",
        original_filename=file.filename or f"{incident_id}.jpg",
        image_width=processed_img.processed_width,
        image_height=processed_img.processed_height,
        detection_result=detection_result,
        scene_features=scene_features,
        assessment=assessment,
        location=location,
        origin=origin_val,
        user_note=note,
        timing={
            "detect_ms": detect_ms,
            "reason_ms": reason_ms,
            "total_ms": total_ms,
        },
    )

    # 9. Pluggable store staging
    save_incident(incident)

    logger.info(
        "Incident %s created (persons: %d, urgency: %s, source: %s, total: %.1fms)",
        incident_id,
        detection_result.person_count,
        assessment.urgency_level,
        assessment.source,
        total_ms,
    )

    return incident



# ---------------------------------------------------------------------------
# Benchmark Sample Endpoints
# ---------------------------------------------------------------------------

SAMPLE_REGISTRY = [
    {
        "id": "sample_people_crowd",
        "filename": "sample_people_crowd.jpg",
        "name": "Crowd Scene (Urban)",
        "description": "Multi-person benchmark verifying spatial clustering, quadrant density, and coverage ratio.",
        "expected_persons": 4,
    },
    {
        "id": "sample_person_single",
        "filename": "sample_person_single.jpg",
        "name": "Search & Rescue Scene",
        "description": "Field search benchmark verifying prone posture detection and aspect ratio classification.",
        "expected_persons": 2,
    },
    {
        "id": "sample_empty_landscape",
        "filename": "sample_empty_landscape.jpg",
        "name": "Empty Terrain (Wildland)",
        "description": "Aerial terrain benchmark verifying zero false-positive detection edge case.",
        "expected_persons": 0,
    },
]


def get_samples_dir() -> Path:
    """Resolve data/samples directory safely."""
    data_dir = get_data_dir()
    samples_dir = (data_dir / "samples").resolve()
    return samples_dir


@app.get(
    "/api/samples",
    tags=["Samples"],
    summary="List curated benchmark evaluation samples",
)
async def list_samples_endpoint():
    """Return available benchmark sample imagery with metadata."""
    samples_dir = get_samples_dir()
    available = []
    for s in SAMPLE_REGISTRY:
        path = samples_dir / s["filename"]
        available.append({
            **s,
            "available": path.exists() and path.is_file(),
        })
    return available


@app.get(
    "/api/samples/{sample_id}/image",
    tags=["Samples"],
    summary="Stream benchmark sample image",
)
async def get_sample_image_endpoint(sample_id: str):
    """Stream a benchmark sample image by ID."""
    clean_id = Path(sample_id).name.replace(".jpg", "")
    sample_entry = next((s for s in SAMPLE_REGISTRY if s["id"] == clean_id), None)
    if not sample_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sample '{sample_id}' not found.",
        )
    samples_dir = get_samples_dir()
    sample_path = (samples_dir / sample_entry["filename"]).resolve()
    if not str(sample_path).startswith(str(samples_dir)) or not sample_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sample file '{sample_entry['filename']}' not found on disk.",
        )
    return FileResponse(
        path=str(sample_path),
        media_type="image/jpeg",
        filename=sample_entry["filename"],
    )


@app.post(
    "/api/samples/{sample_id}/load",
    response_model=Incident,
    tags=["Samples"],
    summary="Execute real inference pipeline on curated benchmark sample image",
)
async def load_sample_endpoint(sample_id: str):
    """
    Executes the REAL vision and reasoning pipeline on a benchmark sample:
    1. Loads sample image from data/samples/.
    2. Runs YOLO person detection.
    3. Computes deterministic scene features.
    4. Executes evidentiary assessment.
    5. Stores Incident in local registry with origin='sample'.
    6. Returns full Incident.
    """
    clean_id = Path(sample_id).name.replace(".jpg", "")
    sample_entry = next((s for s in SAMPLE_REGISTRY if s["id"] == clean_id), None)
    if not sample_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sample '{sample_id}' not found. Available samples: {[s['id'] for s in SAMPLE_REGISTRY]}",
        )

    samples_dir = get_samples_dir()
    sample_path = (samples_dir / sample_entry["filename"]).resolve()
    if not str(sample_path).startswith(str(samples_dir)) or not sample_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sample image '{sample_entry['filename']}' missing from disk.",
        )

    if not detector.is_loaded():
        raise ModelNotLoadedException("YOLO detection model is not loaded. Service unavailable.")

    overall_start = time.perf_counter()

    try:
        from PIL import Image, ImageOps
        pil_img = Image.open(sample_path)
        pil_img = ImageOps.exif_transpose(pil_img)
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")
        if max(pil_img.width, pil_img.height) > 1920:
            pil_img.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
    except Exception as exc:
        logger.error("Failed to load sample image %s: %s", sample_path, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to read benchmark sample image.",
        )

    incident_id = str(uuid.uuid4())
    img_width, img_height = pil_img.size

    # Save image to data/uploads/{incident_id}.jpg
    try:
        uploads_dir = get_uploads_dir()
        save_path = uploads_dir / f"{incident_id}.jpg"
        pil_img.save(save_path, format="JPEG", quality=90)
    except Exception as exc:
        logger.warning("Could not stage sample image under uploads/%s: %s", incident_id, exc)

    # Real YOLO person detection
    t_det_start = time.perf_counter()
    detection_result = await run_in_threadpool(
        detector.detect, pil_img, incident_id
    )
    detect_ms = round((time.perf_counter() - t_det_start) * 1000.0, 2)

    # Deterministic scene features
    scene_features = compute_scene_features(detection_result)

    # Evidentiary assessment via Groq / rules fallback
    t_reason_start = time.perf_counter()
    assessment, source = assess(
        detection_result=detection_result,
        features=scene_features,
        note=f"Benchmark sample: {sample_entry['name']}",
        location_label="Benchmark Dataset (Curated)",
    )
    reason_ms = round((time.perf_counter() - t_reason_start) * 1000.0, 2)
    total_ms = round((time.perf_counter() - overall_start) * 1000.0, 2)

    incident = Incident(
        id=incident_id,
        created_at=datetime.now(timezone.utc).isoformat(),
        image_filename=f"{incident_id}.jpg",
        original_filename=sample_entry["filename"],
        image_width=img_width,
        image_height=img_height,
        detection_result=detection_result,
        scene_features=scene_features,
        assessment=assessment,
        location=Location(
            latitude=None,
            longitude=None,
            address="Benchmark Evaluation Dataset",
            source="user_entered",
        ),
        origin="sample",
        user_note=f"Benchmark sample ({sample_entry['name']}): {sample_entry['description']}",
        timing={
            "detect_ms": detect_ms,
            "reason_ms": reason_ms,
            "total_ms": total_ms,
        },
    )

    save_incident(incident)

    logger.info(
        "Sample incident %s created for %s (persons: %d, urgency: %s, total: %.1fms)",
        incident_id,
        sample_entry["id"],
        detection_result.person_count,
        assessment.urgency_level,
        total_ms,
    )

    return incident


# ---------------------------------------------------------------------------
# Audio Transcription (Voice Notes) Endpoint
# ---------------------------------------------------------------------------

MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024  # 10MB cap


@app.post(
    "/api/transcribe",
    response_model=TranscribeResponse,
    tags=["Audio"],
    summary="Transcribe field voice notes using Groq whisper-large-v3-turbo",
    responses={
        400: {"model": ErrorBody},
        413: {"model": ErrorBody},
        503: {"model": ErrorBody},
    },
)
async def transcribe_endpoint(file: UploadFile = File(...)):
    """
    Transcribes audio notes for emergency field responders using Groq whisper-large-v3-turbo.
    Caps payload at 10MB, handles unconfigured Groq keys and network errors gracefully.
    """
    if not settings.is_groq_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Voice transcription service unavailable. GROQ_API_KEY is not configured.",
        )

    # Read audio bytes up to MAX_AUDIO_SIZE_BYTES + 1
    chunks = []
    total = 0
    while True:
        chunk = await file.read(64 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_AUDIO_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Audio file exceeds maximum allowed limit of 10MB.",
            )
        chunks.append(chunk)

    audio_bytes = b"".join(chunks)
    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio recording is empty (0 bytes).",
        )

    filename = file.filename or "recording.webm"

    try:
        import groq

        client = groq.Groq(api_key=settings.GROQ_API_KEY, timeout=25.0)

        def _run_transcription():
            return client.audio.transcriptions.create(
                file=(filename, audio_bytes),
                model="whisper-large-v3-turbo",
                response_format="json",
            )

        transcription = await run_in_threadpool(_run_transcription)
        text = getattr(transcription, "text", str(transcription)).strip()

        return TranscribeResponse(text=text)
    except Exception as exc:
        logger.error("Audio transcription failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audio transcription failed: {str(exc)}",
        )


# Dev-only debugging endpoint for reasoning service
if settings.DEBUG:
    @app.post(
        "/api/_reason_debug",
        response_model=Assessment,
        tags=["Debug"],
        summary="Dev endpoint: run assessment on DetectionResult + SceneFeatures (DEBUG only)",
    )
    async def reason_debug_endpoint(payload: ReasonDebugRequest):
        """
        Temporary development endpoint for testing the reasoning service
        with synthetic or captured detection telemetry.
        """
        assessment, source = assess(
            detection_result=payload.detection_result,
            features=payload.scene_features,
            note=payload.note,
            location_label=payload.location_label,
        )
        return assessment



def validate_incident_id(incident_id: str) -> str:
    """Validate that incident_id is a valid UUIDv4 string. Rejects path traversal and malformed IDs."""
    try:
        parsed = uuid.UUID(incident_id)
        return str(parsed)
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found. Invalid ID format.",
        )


@app.get(
    "/api/incidents",
    response_model=List[IncidentSummary],
    tags=["Incidents"],
    summary="List persisted incidents (summary records)",
)
async def list_incidents_endpoint(limit: int = 50, offset: int = 0):
    """
    Returns summary list of persisted incidents (newest first):
    id, created_at, origin, severity, category, person_count, location_label, summary.
    """
    all_incidents = list_incidents()
    summaries: List[IncidentSummary] = []
    for inc in all_incidents[offset : offset + limit]:
        loc_label = inc.location.address if inc.location else None
        summaries.append(
            IncidentSummary(
                id=inc.id,
                created_at=inc.created_at,
                origin=inc.origin,
                severity=inc.assessment.urgency_level,
                urgency_level=inc.assessment.urgency_level,
                category=inc.assessment.category,
                person_count=inc.detection_result.person_count,
                location_label=loc_label,
                summary=inc.assessment.summary,
                location=inc.location,
            )
        )
    return summaries


@app.get(
    "/api/incidents/{incident_id}",
    response_model=Incident,
    tags=["Incidents"],
    summary="Get single incident by ID",
    responses={404: {"model": ErrorBody}},
)
async def get_incident_endpoint(incident_id: str):
    """Retrieve full persisted incident by UUID."""
    valid_id = validate_incident_id(incident_id)
    incident = get_incident(valid_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )
    return incident


@app.get(
    "/api/incidents/{incident_id}/image",
    tags=["Incidents"],
    summary="Stream incident image binary",
    responses={404: {"model": ErrorBody}},
)
async def get_incident_image_endpoint(incident_id: str):
    """
    Stream uploaded JPEG image asset for the specified incident.
    Enforces strict UUID validation and path-traversal prevention.
    """
    valid_id = validate_incident_id(incident_id)
    uploads_dir = get_uploads_dir().resolve()
    img_path = (uploads_dir / f"{valid_id}.jpg").resolve()

    # Path traversal safety check
    if not str(img_path).startswith(str(uploads_dir)):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image asset not found.",
        )

    if not img_path.exists() or not img_path.is_file():
        # Fallback to incident.image_filename if present
        incident = get_incident(valid_id)
        if incident and incident.image_filename:
            custom_path = (uploads_dir / Path(incident.image_filename).name).resolve()
            if (
                str(custom_path).startswith(str(uploads_dir))
                and custom_path.exists()
                and custom_path.is_file()
            ):
                img_path = custom_path

    if not img_path.exists() or not img_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image asset for incident '{incident_id}' not found.",
        )

    return FileResponse(
        path=str(img_path),
        media_type="image/jpeg",
        filename=f"{valid_id}.jpg",
    )


@app.delete(
    "/api/incidents/{incident_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Incidents"],
    summary="Delete incident by ID",
    responses={404: {"model": ErrorBody}},
)
async def delete_incident_endpoint(incident_id: str):
    """Delete an incident record and its associated image asset."""
    valid_id = validate_incident_id(incident_id)
    deleted = delete_incident(valid_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)

