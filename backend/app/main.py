import logging
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
    Location,
    ReasonDebugRequest,
)
from app.services.detector import detector
from app.services.features import compute_scene_features
from app.services.image_validator import validate_and_process_image
from app.services.reasoner import assess
from app.services.store import save_incident



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
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    location_label: Optional[str] = Form(None),
    note: Optional[str] = Form(None),
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
        base_dir = Path(__file__).resolve().parent.parent.parent
        uploads_dir = base_dir / "data" / "uploads"
        uploads_dir.mkdir(parents=True, exist_ok=True)
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
        origin="live_analysis",
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



@app.get(
    "/api/incidents",
    tags=["Incidents"],
    summary="List persisted incidents",
    responses={501: {"model": ErrorBody}},
)
async def list_incidents_endpoint():
    """Stubbed incidents list endpoint; returns 501."""
    raise NotImplementedException(
        "Incident storage and retrieval service is not implemented yet in this phase."
    )


@app.get(
    "/api/incidents/{incident_id}",
    tags=["Incidents"],
    summary="Get single incident by ID",
    responses={501: {"model": ErrorBody}},
)
async def get_incident_endpoint(incident_id: str):
    """Stubbed incident retrieval endpoint; returns 501."""
    raise NotImplementedException(
        "Incident storage and retrieval service is not implemented yet in this phase."
    )


@app.get(
    "/api/incidents/{incident_id}/image",
    tags=["Incidents"],
    summary="Stream incident image binary",
    responses={501: {"model": ErrorBody}},
)
async def get_incident_image_endpoint(incident_id: str):
    """Stubbed incident image streaming endpoint; returns 501."""
    raise NotImplementedException(
        "Incident asset streaming service is not implemented yet in this phase."
    )


@app.delete(
    "/api/incidents/{incident_id}",
    tags=["Incidents"],
    summary="Delete incident by ID",
    responses={501: {"model": ErrorBody}},
)
async def delete_incident_endpoint(incident_id: str):
    """Stubbed incident deletion endpoint; returns 501."""
    raise NotImplementedException(
        "Incident deletion service is not implemented yet in this phase."
    )
