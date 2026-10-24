from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.exceptions import AppException, NotImplementedException
from app.schemas import AnalyzeRequest, ErrorBody, HealthResponse
from app.services.image_validator import validate_and_process_image

app = FastAPI(
    title="ResQVision Backend API",
    description="Emergency Incident Triage & Evidentiary Assessment Pipeline",
    version=settings.VERSION,
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
    """Return health status, model load flag, and Groq configuration status."""
    return HealthResponse(
        status="healthy",
        model_loaded=False,  # Loaded in later YOLO step
        groq_configured=settings.is_groq_configured,
        version=settings.VERSION,
    )


@app.post(
    "/api/detect",
    tags=["Inference"],
    summary="Upload image, validate, and run YOLO person detection",
    responses={
        400: {"model": ErrorBody},
        413: {"model": ErrorBody},
        415: {"model": ErrorBody},
        501: {"model": ErrorBody},
    },
)
async def detect_endpoint(file: UploadFile = File(...)):
    """
    Validates uploaded imagery (size, MIME type, Pillow integrity, 1920px cap).
    Stubbed to return 501 once validation passes.
    """
    # 1. Reusable upload validation service enforces type, size, and Pillow integrity
    await validate_and_process_image(file)

    # 2. Stubbed inference pipeline (implemented in Step 3)
    raise NotImplementedException(
        "YOLO person detection and feature extraction pipeline is not implemented yet in this phase."
    )


@app.post(
    "/api/analyze",
    tags=["Reasoning"],
    summary="Submit scene features to Groq LLM for assessment",
    responses={501: {"model": ErrorBody}},
)
async def analyze_endpoint(payload: AnalyzeRequest):
    """Stubbed reasoning endpoint; returns 501."""
    raise NotImplementedException(
        "Groq LLM evidentiary assessment service is not implemented yet in this phase."
    )


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
