from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums and Literal Types
# ---------------------------------------------------------------------------

SeverityLevel = Literal["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]
EvidenceCategory = Literal[
    "count", "spatial", "density", "posture", "proximity", "clustering", "other"
]
EvidenceOrigin = Literal[
    "yolo_detection", "deterministic_measurement", "heuristic"
]
AssessmentSource = Literal["groq_llm", "rules_fallback", "fallback_heuristic", "rule_based"]
DensityCategory = Literal["none", "isolated", "small_group", "crowd"]
AspectRatioClassification = Literal["standing", "prone_or_seated", "mixed"]
LocationSource = Literal["user_entered"]


# ---------------------------------------------------------------------------
# Core Geometric & Evidence Primitives
# ---------------------------------------------------------------------------

class BBox(BaseModel):
    """Normalized bounding box coordinates [0.0 - 1.0]."""
    x1: float = Field(..., ge=0.0, le=1.0, description="Normalized top-left x")
    y1: float = Field(..., ge=0.0, le=1.0, description="Normalized top-left y")
    x2: float = Field(..., ge=0.0, le=1.0, description="Normalized bottom-right x")
    y2: float = Field(..., ge=0.0, le=1.0, description="Normalized bottom-right y")


class EvidenceItem(BaseModel):
    """Atomic evidentiary unit produced by deterministic vision or heuristic measurement."""
    id: str = Field(..., description="Unique evidence item key")
    category: EvidenceCategory = Field(..., description="Classification category")
    origin: EvidenceOrigin = Field(
        default="deterministic_measurement", description="Origin of measurement"
    )
    description: str = Field(..., description="Human-readable description of measurement")
    value: Any = Field(default=None, description="Observed numeric or structured value")
    confidence: Optional[float] = Field(
        default=None, ge=0.0, le=1.0, description="Confidence of evidence item"
    )


# ---------------------------------------------------------------------------
# Computer Vision Schemas
# ---------------------------------------------------------------------------

class Detection(BaseModel):
    """Bounding box and confidence for an individual identified person (COCO class 0)."""
    id: str = Field(..., description="Unique detection identifier (e.g. p1, p2)")
    class_id: int = Field(default=0, description="COCO class index (0 for person)")
    class_name: str = Field(default="person", description="Class name")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence")
    bbox_xyxy: List[float] = Field(
        ...,
        min_length=4,
        max_length=4,
        description="[x1, y1, x2, y2] in pixel coordinates of the processed image",
    )
    area_fraction: float = Field(
        ..., ge=0.0, le=1.0, description="Normalized area occupied in frame"
    )
    aspect_ratio: float = Field(..., description="Width / Height aspect ratio")
    bbox: Optional[BBox] = Field(
        default=None, description="Structured normalized BBox representation"
    )
    bbox_normalized: Optional[List[float]] = Field(
        default=None, description="[nx1, ny1, nx2, ny2] normalized to [0.0, 1.0]"
    )


class DetectionResult(BaseModel):
    """Result of computer vision detection step."""
    image_id: str = Field(..., description="Associated image UUID")
    width: int = Field(..., gt=0, description="Image pixel width")
    height: int = Field(..., gt=0, description="Image pixel height")
    person_count: int = Field(..., ge=0, description="Number of detected persons")
    detections: List[Detection] = Field(
        default_factory=list, description="List of individual detections sorted by confidence descending"
    )
    inference_time_ms: float = Field(
        default=0.0, ge=0.0, description="Model inference duration in milliseconds"
    )
    inference_ms: Optional[float] = Field(
        default=None, description="Alias for inference_time_ms"
    )


class SceneFeatures(BaseModel):
    """Deterministic spatial metrics derived from detections and image geometry."""
    person_count: int = Field(..., ge=0, description="Total persons detected")
    coverage_ratio: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Sum of box areas / image area (clamped to 1.0; note overlap is not deduplicated)",
    )
    low_confidence_count: int = Field(
        default=0, ge=0, description="Detections with confidence < 0.4"
    )
    horizontal_candidates: List[str] = Field(
        default_factory=list,
        description="IDs of horizontal/prone candidates (w/h >= 1.2, not touching 2+ edges)",
    )
    rules: Dict[str, Any] = Field(
        default_factory=dict, description="Threshold parameters used for rule evaluation"
    )
    density_category: Union[DensityCategory, str] = Field(
        default="none", description="Spatial density category"
    )
    spread_score: float = Field(
        default=0.0, ge=0.0, le=1.0, description="Spatial dispersion score across image frame"
    )
    centroid: List[float] = Field(
        default_factory=lambda: [0.0, 0.0],
        min_length=2,
        max_length=2,
        description="[cx, cy] center of mass [0.0, 1.0]",
    )
    avg_confidence: float = Field(
        default=0.0, ge=0.0, le=1.0, description="Mean detection confidence"
    )
    max_area_fraction: float = Field(
        default=0.0, ge=0.0, le=1.0, description="Largest person box area fraction"
    )
    min_area_fraction: float = Field(
        default=0.0, ge=0.0, le=1.0, description="Smallest person box area fraction"
    )
    quadrant_counts: Dict[str, int] = Field(
        default_factory=dict, description="Persons detected per frame quadrant"
    )
    aspect_ratio_classification: Union[AspectRatioClassification, str] = Field(
        default="standing", description="Dominant posture indicator"
    )
    evidence_items: List[EvidenceItem] = Field(
        default_factory=list, description="Structured evidence items"
    )


# ---------------------------------------------------------------------------
# Geolocation & Assessment Schemas
# ---------------------------------------------------------------------------

class Location(BaseModel):
    """Location metadata. Detection alone never establishes real-world position."""
    latitude: Optional[float] = Field(default=None, description="GPS latitude")
    longitude: Optional[float] = Field(default=None, description="GPS longitude")
    address: Optional[str] = Field(default=None, description="User supplied address or landmark")
    source: Literal["user_entered"] = Field(
        default="user_entered",
        description="Provenance of location. Must be user_entered.",
    )


class Assessment(BaseModel):
    """Schema-validated incident triage assessment produced by Groq LLM or rules fallback."""
    urgency_level: Union[SeverityLevel, str] = Field(
        ..., description="Triage priority level"
    )
    summary: str = Field(..., description="Concise executive synopsis based strictly on evidence")
    detected_situation: str = Field(..., description="Interpretation of evidence")
    category: Optional[str] = Field(
        default=None,
        description="Categorization: 'no_people', 'possible_person_down', 'crowding', 'routine_scene', or 'indeterminate'",
    )
    recommended_resources: List[str] = Field(
        default_factory=list, description="Recommended emergency dispatch resources"
    )
    recommended_actions: List[str] = Field(
        default_factory=list,
        description="Cautious verification-oriented steps (never medical or legal claims)",
    )
    confidence_in_assessment: float = Field(
        ..., ge=0.0, le=1.0, description="Model self-evaluated assessment confidence"
    )
    rationale: List[str] = Field(
        default_factory=list, description="Evidentiary justification linking to SceneFeatures"
    )
    evidence_refs: List[str] = Field(
        default_factory=list,
        description="Detection IDs (e.g. 'p1') or feature names cited as evidence",
    )
    warnings: List[str] = Field(
        default_factory=list, description="Operational warnings and caveats"
    )
    source: AssessmentSource = Field(
        default="groq_llm", description="Origin of assessment: 'groq_llm' or 'rules_fallback'"
    )
    fallback_reason: Optional[str] = Field(
        default=None, description="Diagnostic explanation if generated via rules fallback"
    )



# ---------------------------------------------------------------------------
# Incident Persisted Record
# ---------------------------------------------------------------------------

class Incident(BaseModel):
    """Persisted incident record combining upload, vision, features, and assessment."""
    id: str = Field(..., description="Unique incident UUIDv4")
    created_at: str = Field(..., description="ISO 8601 UTC timestamp")
    image_filename: str = Field(..., description="Stored image filename")
    original_filename: str = Field(..., description="Original upload filename")
    image_width: int = Field(..., gt=0, description="Processed image width")
    image_height: int = Field(..., gt=0, description="Processed image height")
    detection_result: DetectionResult = Field(..., description="YOLO detection results")
    scene_features: SceneFeatures = Field(..., description="Deterministic spatial features")
    assessment: Assessment = Field(..., description="Schema-validated assessment")
    location: Optional[Location] = Field(
        default=None, description="User-entered location metadata"
    )


# ---------------------------------------------------------------------------
# API Responses, Requests, and Error Bodies
# ---------------------------------------------------------------------------

class ErrorDetail(BaseModel):
    code: str = Field(..., description="Standardized machine-readable error code")
    message: str = Field(..., description="Human-readable error explanation")


class ErrorBody(BaseModel):
    """Uniform error format {"error": {"code": str, "message": str}}"""
    error: ErrorDetail


class HealthResponse(BaseModel):
    status: str = "healthy"
    model_loaded: bool = False
    groq_configured: bool = False
    version: str = "0.1.0"


class DetectResponse(BaseModel):
    image_id: str
    detection_result: DetectionResult
    scene_features: SceneFeatures
    features: Optional[SceneFeatures] = None



class AnalyzeRequest(BaseModel):
    image_id: str
    scene_features: SceneFeatures
    location: Optional[Location] = None


class ReasonDebugRequest(BaseModel):
    detection_result: DetectionResult
    scene_features: SceneFeatures
    note: Optional[str] = None
    location_label: Optional[str] = None



class IncidentListItem(BaseModel):
    id: str
    created_at: str
    urgency_level: str
    person_count: int
    summary: str
