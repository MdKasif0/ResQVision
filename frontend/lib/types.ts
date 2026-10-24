/**
 * ResQVision Data Types
 * Mirrored directly from docs/ARCHITECTURE.md
 */

export interface Detection {
  id: string; // Unique detection identifier (e.g. "det_1")
  class_id: number; // Class index (0 for person)
  class_name: string; // COCO class name ("person")
  confidence: float_number; // Confidence score [0.0 - 1.0]
  bbox_xyxy: [number, number, number, number]; // [x1, y1, x2, y2] normalized [0.0 - 1.0]
  area_fraction: number; // Normalized area occupied (width * height)
  aspect_ratio: number; // Width / Height ratio
}

// Type alias for float semantics
type float_number = number;

export interface DetectionResult {
  image_id: string;
  width: number;
  height: number;
  person_count: number;
  detections: Detection[];
  inference_time_ms: number;
}

export type DensityCategory = "none" | "isolated" | "small_group" | "crowd" | string;
export type AspectRatioClassification = "standing" | "prone_or_seated" | "mixed" | string;

export interface QuadrantCounts {
  top_left: number;
  top_right: number;
  bottom_left: number;
  bottom_right: number;
  [key: string]: number;
}

export interface SceneFeatures {
  person_count: number;
  density_category: DensityCategory;
  spread_score: number; // Spatial dispersion metric across frame [0.0 - 1.0]
  centroid: [number, number]; // [cx, cy] center of mass of detected people [0.0 - 1.0]
  avg_confidence: number; // Mean confidence across detections
  max_area_fraction: number; // Largest person box (subject proximity to camera)
  min_area_fraction: number; // Smallest person box (distant subjects)
  quadrant_counts: QuadrantCounts;
  aspect_ratio_classification: AspectRatioClassification;
}

export type UrgencyLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export interface Assessment {
  urgency_level: UrgencyLevel;
  summary: string; // 2-3 sentence executive synopsis based strictly on evidence
  detected_situation: string; // Interpretation of evidence
  recommended_resources: string[]; // Recommended dispatch items
  confidence_in_assessment: number; // LLM self-evaluated confidence [0.0 - 1.0]
  rationale: string[]; // Specific bullet points tying conclusions back to SceneFeatures
  warnings: string[]; // Caveats
}

export interface Incident {
  id: string; // UUIDv4
  created_at: string; // ISO 8601 UTC timestamp
  image_filename: string; // Stored under data/uploads/{id}.ext
  original_filename: string; // Original uploaded file name
  image_width: number;
  image_height: number;
  detection_result: DetectionResult;
  scene_features: SceneFeatures;
  assessment: Assessment;
}

/** API Standard Error Format: {"error": {"code": string, "message": string}} */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface HealthResponse {
  status: string;
  version: string;
  model_loaded: boolean;
  groq_configured: boolean;
  yolo_loaded?: boolean;
}

export interface DetectResponse {
  image_id: string;
  detection_result: DetectionResult;
  scene_features: SceneFeatures;
}

export interface IncidentListItem {
  id: string;
  created_at: string;
  urgency_level: UrgencyLevel;
  person_count: number;
  summary: string;
}
