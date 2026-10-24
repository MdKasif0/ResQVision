import math
from typing import Any, Dict, List, Optional
from app.schemas import (
    DensityCategory,
    Detection,
    DetectionResult,
    EvidenceItem,
    SceneFeatures,
)

# Rule thresholds
RULES_CONFIG: Dict[str, Any] = {
    "confidence_threshold": 0.25,
    "low_confidence_threshold": 0.4,
    "horizontal_aspect_ratio_min": 1.2,
    "max_edge_touches_allowed": 1,
    "edge_touch_tolerance_px": 5.0,
}


def compute_scene_features(
    detection_result: DetectionResult,
    rules: Optional[Dict[str, Any]] = None,
) -> SceneFeatures:
    """
    Compute deterministic scene features from YOLO detections using pure Python.
    No ML models are invoked in this step.

    Features computed:
    - person_count: Total person detections meeting the model confidence threshold.
    - coverage_ratio: Sum of individual bounding box areas divided by total image area,
      clamped to [0.0, 1.0]. Note: Overlapping person boxes are intentionally not deduplicated
      to reflect cumulative scene visual occlusion by subjects.
    - low_confidence_count: Number of detections with confidence < 0.4 (indicators of distant,
      partially occluded, or ambiguous subjects).
    - horizontal_candidates: Detection IDs ("p1", "p2", ...) where box width / height >= 1.2
      and the box does not touch 2 or more image edges (to filter out corner-cropped subjects).
    - rules: Dictionary of active threshold parameters for transparency to reasoning layer and UI.
    - density_category: "none" (0), "isolated" (1), "small_group" (2-4), or "crowd" (5+).
    - spread_score: Normalized spatial dispersion metric across the image frame [0.0 - 1.0].
    - centroid: [cx, cy] center of mass of detected people normalized to [0.0, 1.0].
    - quadrant_counts: Person counts across 4 image quadrants.
    - aspect_ratio_classification: "standing", "prone_or_seated", "mixed", or "none".
    - evidence_items: List of structured EvidenceItem objects for LLM consumption.
    """
    cfg = rules or RULES_CONFIG
    low_conf_thresh = cfg.get("low_confidence_threshold", 0.4)
    horiz_aspect_min = cfg.get("horizontal_aspect_ratio_min", 1.2)
    edge_tolerance = cfg.get("edge_touch_tolerance_px", 5.0)

    detections = detection_result.detections
    width = max(1, detection_result.width)
    height = max(1, detection_result.height)
    image_area = float(width * height)

    person_count = len(detections)

    # 1. Zero detection fast-path
    if person_count == 0:
        return SceneFeatures(
            person_count=0,
            coverage_ratio=0.0,
            low_confidence_count=0,
            horizontal_candidates=[],
            rules=cfg,
            density_category="none",
            spread_score=0.0,
            centroid=[0.0, 0.0],
            avg_confidence=0.0,
            max_area_fraction=0.0,
            min_area_fraction=0.0,
            quadrant_counts={
                "top_left": 0,
                "top_right": 0,
                "bottom_left": 0,
                "bottom_right": 0,
            },
            aspect_ratio_classification="none",
            evidence_items=[
                EvidenceItem(
                    id="ev_person_count_zero",
                    category="count",
                    origin="yolo_detection",
                    description="Zero human subjects detected in frame at conf >= 0.25",
                    value=0,
                    confidence=1.0,
                )
            ],
        )

    # 2. Coverage ratio (Sum of box areas / image area, clamped to 1.0; overlap not deduplicated)
    total_box_area = 0.0
    low_confidence_count = 0
    horizontal_candidates: List[str] = []
    norm_centroids = []
    area_fractions = []
    confidences = []

    quadrant_counts = {
        "top_left": 0,
        "top_right": 0,
        "bottom_left": 0,
        "bottom_right": 0,
    }

    mid_x = width / 2.0
    mid_y = height / 2.0

    for det in detections:
        x1, y1, x2, y2 = det.bbox_xyxy
        box_w = max(0.0, x2 - x1)
        box_h = max(0.0, y2 - y1)
        box_area = box_w * box_h
        total_box_area += box_area

        # Low confidence count (< 0.4)
        if det.confidence < low_conf_thresh:
            low_confidence_count += 1

        # Edge touch check (left, top, right, bottom)
        touch_left = x1 <= edge_tolerance
        touch_top = y1 <= edge_tolerance
        touch_right = x2 >= (width - edge_tolerance)
        touch_bottom = y2 >= (height - edge_tolerance)
        edge_touches = sum([touch_left, touch_top, touch_right, touch_bottom])

        # Horizontal candidate check: aspect_ratio >= 1.2 AND not touching 2+ edges
        box_aspect_ratio = (box_w / box_h) if box_h > 0 else 1.0
        if box_aspect_ratio >= horiz_aspect_min and edge_touches < 2:
            horizontal_candidates.append(det.id)

        # Centroids and spatial positioning
        cx_px = (x1 + x2) / 2.0
        cy_px = (y1 + y2) / 2.0
        cx_norm = min(1.0, max(0.0, cx_px / width))
        cy_norm = min(1.0, max(0.0, cy_px / height))
        norm_centroids.append((cx_norm, cy_norm))

        # Quadrant classification
        if cx_px < mid_x and cy_px < mid_y:
            quadrant_counts["top_left"] += 1
        elif cx_px >= mid_x and cy_px < mid_y:
            quadrant_counts["top_right"] += 1
        elif cx_px < mid_x and cy_px >= mid_y:
            quadrant_counts["bottom_left"] += 1
        else:
            quadrant_counts["bottom_right"] += 1

        area_fractions.append(det.area_fraction)
        confidences.append(det.confidence)

    # Clamp coverage ratio to [0.0, 1.0]
    coverage_ratio = min(1.0, max(0.0, round(total_box_area / image_area, 4)))

    # Density category
    if person_count == 1:
        density_category: DensityCategory = "isolated"
    elif 2 <= person_count <= 4:
        density_category = "small_group"
    else:
        density_category = "crowd"

    # Centroid (center of mass)
    mean_cx = sum(c[0] for c in norm_centroids) / person_count
    mean_cy = sum(c[1] for c in norm_centroids) / person_count
    centroid = [round(mean_cx, 3), round(mean_cy, 3)]

    # Spread score (normalized dispersion)
    if person_count <= 1:
        spread_score = 0.0
    else:
        var_x = sum((c[0] - mean_cx) ** 2 for c in norm_centroids) / person_count
        var_y = sum((c[1] - mean_cy) ** 2 for c in norm_centroids) / person_count
        std_dist = math.sqrt(var_x + var_y)
        # Scale by approx max possible std dev in unit square (~0.5)
        spread_score = min(1.0, max(0.0, round(std_dist * 2.0, 3)))

    avg_confidence = round(sum(confidences) / person_count, 3)
    max_area_fraction = round(max(area_fractions), 4)
    min_area_fraction = round(min(area_fractions), 4)

    # Posture classification based on horizontal candidates
    if len(horizontal_candidates) == person_count:
        aspect_ratio_classification = "prone_or_seated"
    elif len(horizontal_candidates) > 0:
        aspect_ratio_classification = "mixed"
    else:
        aspect_ratio_classification = "standing"

    # Structured evidence items
    evidence_items = [
        EvidenceItem(
            id="ev_person_count",
            category="count",
            origin="yolo_detection",
            description=f"Identified {person_count} human subject(s) in visual frame",
            value=person_count,
            confidence=avg_confidence,
        ),
        EvidenceItem(
            id="ev_coverage_ratio",
            category="spatial",
            origin="deterministic_measurement",
            description=f"Person bounding boxes occupy {round(coverage_ratio * 100, 1)}% of total image frame",
            value=coverage_ratio,
        ),
        EvidenceItem(
            id="ev_density_category",
            category="density",
            origin="heuristic",
            description=f"Scene density classified as '{density_category}' ({person_count} individuals)",
            value=density_category,
        ),
    ]

    if horizontal_candidates:
        evidence_items.append(
            EvidenceItem(
                id="ev_horizontal_posture",
                category="posture",
                origin="deterministic_measurement",
                description=f"{len(horizontal_candidates)} subject(s) exhibit prone/seated aspect ratios (w/h >= {horiz_aspect_min})",
                value=horizontal_candidates,
            )
        )

    if low_confidence_count > 0:
        evidence_items.append(
            EvidenceItem(
                id="ev_low_confidence",
                category="spatial",
                origin="deterministic_measurement",
                description=f"{low_confidence_count} detection(s) have confidence below {low_conf_thresh} (possible occlusion or distance)",
                value=low_confidence_count,
            )
        )

    return SceneFeatures(
        person_count=person_count,
        coverage_ratio=coverage_ratio,
        low_confidence_count=low_confidence_count,
        horizontal_candidates=horizontal_candidates,
        rules=cfg,
        density_category=density_category,
        spread_score=spread_score,
        centroid=centroid,
        avg_confidence=avg_confidence,
        max_area_fraction=max_area_fraction,
        min_area_fraction=min_area_fraction,
        quadrant_counts=quadrant_counts,
        aspect_ratio_classification=aspect_ratio_classification,
        evidence_items=evidence_items,
    )
