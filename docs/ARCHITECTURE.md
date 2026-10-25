# ResQVision — System Architecture & Technical Specifications

> **Hackathon Scope Notice**: ResQVision is built under strict one-day hackathon constraints. It focuses on high-precision human detection in disaster/emergency scene imagery, deterministic feature extraction, and structured LLM-driven incident assessment without sending raw pixels to the LLM.

---

## 1. System Overview & Core Principles

ResQVision is an emergency response assessment pipeline that accepts field or drone imagery, isolates human subjects using computer vision (YOLO), extracts deterministic mathematical and contextual features from the visual scene, and submits only structured metadata to an LLM for rapid triage analysis.

### Core Architecture Principles
1. **Zero Raw Pixel Ingestion by LLM**: The reasoning model (`openai/gpt-oss-120b` via Groq) never receives image bytes, base64 payloads, or raw pixels. It operates purely as an evidence-based reasoning engine consuming deterministic mathematical and heuristic telemetry.
2. **Detection $\neq$ Real-World Geolocation**: 2D image detection coordinates $(x, y, w, h)$ reflect bounding boxes inside image pixel space. They never fabricate or establish real-world GPS coordinates unless explicit camera telemetry/metadata is supplied.
3. **Backend-Only Secrets**: The `GROQ_API_KEY` is strictly confined to the FastAPI backend. No frontend client or client-side environment variable ever has access to Groq credentials.
4. **Zero Heavy Infrastructure**: No external relational/document database engines, authentication layers, or Docker container overhead are introduced for the MVP. Local JSON file persistence guarantees instant setup, transparency, and high portability.

---

## 2. Component Responsibilities

```
+-------------------------------------------------------------------------+
|                        Frontend (Next.js 15+)                           |
|  - App Router, Tailwind CSS, Lucide Icons                               |
|  - Marketing & Architectural Landing Page (/)                           |
|  - Image Upload & Validation (/analyze, < MAX_UPLOAD_MB)                |
|  - Canvas Overlay: Bounding box rendering & confidence threshold slider |
|  - Evidence Viewer: Visual breakdown of extracted scene features        |
|  - Assessment Dashboard: Priority badges, hazard alerts, recommendations|
|  - Incident History & Local Caching                                     |
+------------------------------------+------------------------------------+
                                     | REST (JSON / Multipart)
                                     v
+-------------------------------------------------------------------------+
|                        Backend (FastAPI)                                |
|  +-------------------------------------------------------------------+  |
|  | Routers & Validation: FastAPI, Pydantic, python-multipart         |  |
|  +-------------------------------------------------------------------+  |
|  | Vision Service (Ultralytics YOLO)                                 |  |
|  | - Person class filtering (COCO class index 0 only)                |  |
|  | - Confidence thresholding & bounding box normalization [0, 1]     |  |
|  +-------------------------------------------------------------------+  |
|  | Feature Extraction Service                                        |  |
|  | - Deterministic clustering, density, distribution spread          |  |
|  | - Aspect ratios, image coverage %, approximate spatial layout   |  |
|  +-------------------------------------------------------------------+  |
|  | Reasoning Service (Groq API - openai/gpt-oss-120b)                |  |
|  | - Strict JSON schema adherence via Pydantic model                 |  |
|  | - Zero hallucination prompt constraints                           |  |
|  +-------------------------------------------------------------------+  |
|  | Storage Service                                                   |  |
|  | - File-based JSON storage (data/incidents.json)                   |  |
|  | - Image asset storage (data/uploads/{id}.jpg)                     |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

---

## 3. Data Structures & Pydantic Schemas

### 3.1 Detection
Bounding box and confidence for an individual identified person (COCO class 0). Coordinates are normalized to $[0.0, 1.0]$ relative to image dimensions.
```python
class Detection(BaseModel):
    id: str                        # Unique detection identifier (e.g. "det_1")
    class_id: int = 0              # Class index (0 for person)
    class_name: str = "person"     # COCO class name
    confidence: float              # Confidence score [0.0 - 1.0]
    bbox_xyxy: list[float]         # [x1, y1, x2, y2] normalized [0.0, 1.0]
    area_fraction: float           # Normalized area occupied (width * height)
    aspect_ratio: float            # Width / Height ratio
```

### 3.2 DetectionResult
Output of the computer vision detection step.
```python
class DetectionResult(BaseModel):
    image_id: str
    width: int
    height: int
    person_count: int
    detections: list[Detection]
    inference_time_ms: float
```

### 3.3 SceneFeatures
Deterministic metrics derived from detections and image dimensions.
```python
class SceneFeatures(BaseModel):
    person_count: int
    density_category: str          # "none" | "isolated" (1) | "small_group" (2-4) | "crowd" (5+)
    spread_score: float            # Spatial dispersion metric across frame [0.0 - 1.0]
    centroid: list[float]          # [cx, cy] center of mass of detected people [0.0, 1.0]
    avg_confidence: float          # Mean confidence across detections
    max_area_fraction: float       # Largest person box (indicates subject proximity to camera)
    min_area_fraction: float       # Smallest person box (indicates distant subjects)
    quadrant_counts: dict[str, int] # {"top_left": int, "top_right": int, "bottom_left": int, "bottom_right": int}
    aspect_ratio_classification: str # "standing" | "prone_or_seated" | "mixed"
```

### 3.4 Assessment
Schema-validated structured response from Groq LLM (`openai/gpt-oss-120b`).
```python
class Assessment(BaseModel):
    urgency_level: str             # "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"
    summary: str                   # 2-3 sentence executive synopsis based strictly on evidence
    detected_situation: str        # Interpretation of evidence (e.g., "Isolated individual prone in frame")
    recommended_resources: list[str] # Recommended dispatch items (e.g., ["Paramedic unit", "Thermal drone"])
    confidence_in_assessment: float # LLM self-evaluated confidence [0.0 - 1.0]
    rationale: list[str]           # Specific bullet points tying conclusions back to SceneFeatures
    warnings: list[str]            # Caveats (e.g., "No location data; thermal verification advised")
```

### 3.5 Incident
Complete persisted record combining upload metadata, vision detections, computed features, and the LLM assessment.
```python
class Incident(BaseModel):
    id: str                        # UUIDv4
    created_at: str                # ISO 8601 UTC timestamp
    image_filename: str            # Stored under data/uploads/{id}.ext
    original_filename: str         # Original uploaded file name
    image_width: int
    image_height: int
    detection_result: DetectionResult
    scene_features: SceneFeatures
    assessment: Assessment
```

---

## 4. API Endpoints Contract

All endpoints follow standard REST conventions.

### Base URL: `/api`

### 4.1 `GET /api/health`
Health check and runtime status.
- **Response**: `200 OK`
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "yolo_loaded": true,
  "groq_configured": true
}
```

### 4.2 `POST /api/detect`
Uploads an image, executes YOLO person detection, and computes deterministic scene features without invoking the LLM.
- **Request**: `multipart/form-data` with `file: UploadFile`
- **Response**: `200 OK`
```json
{
  "image_id": "8f3b6c7a-1234-4567-89ab-cdef01234567",
  "detection_result": { ... },
  "scene_features": { ... }
}
```

### 4.3 `POST /api/analyze`
Submits computed `scene_features` (or an `image_id`) to the Groq LLM for schema-validated assessment and persists the resulting `Incident`.
- **Request**: `application/json`
```json
{
  "image_id": "8f3b6c7a-1234-4567-89ab-cdef01234567",
  "scene_features": { ... }
}
```
- **Response**: `201 Created` returns full `Incident` object.

### 4.4 `GET /api/incidents`
Lists all persisted incidents sorted by `created_at` descending.
- **Query Params**: `limit` (default: 50), `offset` (default: 0)
- **Response**: `200 OK`
```json
[
  {
    "id": "8f3b6c7a-1234-4567-89ab-cdef01234567",
    "created_at": "2026-10-24T10:00:00Z",
    "urgency_level": "HIGH",
    "person_count": 3,
    "summary": "..."
  }
]
```

### 4.5 `GET /api/incidents/{id}`
Retrieves a single incident by ID.
- **Response**: `200 OK` with full `Incident` object.

### 4.6 `GET /api/incidents/{id}/image`
Streams the original uploaded image binary for the given incident.
- **Response**: `200 OK` with `Content-Type: image/jpeg` or `image/png`.

### 4.7 `DELETE /api/incidents/{id}`
Deletes an incident record from storage along with its uploaded image.
- **Response**: `204 No Content`

---

## 5. Standard Error Format

All error responses return uniform JSON bodies with HTTP error codes (4xx, 5xx):
```json
{
  "error": {
    "code": "INVALID_IMAGE_FORMAT",
    "message": "Uploaded file must be a JPEG or PNG image under 8MB."
  }
}
```

### Common Error Codes:
- `PAYLOAD_TOO_LARGE`: Uploaded file exceeds `MAX_UPLOAD_MB`.
- `INVALID_FILE_TYPE`: Unsupported media type.
- `DETECTION_FAILED`: YOLO inference pipeline error.
- `LLM_ASSESSMENT_FAILED`: Groq API failure or JSON validation mismatch.
- `NOT_FOUND`: Incident or asset does not exist.
- `INTERNAL_SERVER_ERROR`: Unhandled exception.

---

## 6. Environment Variables

| Variable Name | Required | Target | Default Value | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GROQ_API_KEY` | **Yes** | Backend | *None* | Groq cloud API key for LLM inference |
| `GROQ_MODEL` | No | Backend | `openai/gpt-oss-120b` | Reasoning model identifier |
| `CORS_ORIGINS` | No | Backend | `http://localhost:3000` | Allowed origins for CORS middleware |
| `MAX_UPLOAD_MB` | No | Backend | `8` | Maximum file upload size in MB |
| `NEXT_PUBLIC_API_BASE_URL` | No | Frontend | `http://localhost:8000` | Base URL of FastAPI backend |

---

## 7. Scope Roadmap (P0 / P1 / P2)

### P0 (Core MVP - Hackathon Day-1 Baseline)
- [x] Architecture & skeleton setup
- [ ] Image upload via drag-and-drop with size validation (< 8MB)
- [ ] Ultralytics YOLOv8/v11 Nano person detection (COCO class 0 only)
- [ ] Deterministic `SceneFeatures` extraction (counts, dispersion, quadrant distribution, area fractions)
- [ ] Groq API integration (`openai/gpt-oss-120b`) with strict Pydantic JSON schema output
- [ ] Results screen: image with detection bounding boxes + urgency assessment + evidence explanation
- [ ] Local JSON file persistence (`data/incidents.json` + `data/uploads/`)
- [ ] Incident history table/list with click-to-view detail

### P1 (Extended Value & Polish)
- [ ] MapLibre GL JS integration for incidents with simulated/manual location tags
- [ ] Urgency & date range filtering in incident history
- [ ] Incident deletion endpoint & UI trigger
- [ ] Curated disaster benchmark dataset in `data/samples/`
- [ ] Model evaluation & accuracy notes documentation (`docs/EVAL.md`)

### P2 (Stretch Goals)
- [ ] Audio/Voice synthesis of triage assessment (Web Speech API)
- [ ] PDF / JSON export of incident assessment report for field responders
- [ ] Multi-frame video or RTSP stream support with keyframe aggregation
