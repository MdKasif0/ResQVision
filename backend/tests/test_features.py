import pytest
from app.schemas import BBox, Detection, DetectionResult
from app.services.features import compute_scene_features


def make_detection(
    det_id: str,
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    confidence: float = 0.85,
    img_w: int = 800,
    img_h: int = 600,
) -> Detection:
    """Helper to construct synthetic Detection objects for deterministic feature tests."""
    box_w = max(0.0, x2 - x1)
    box_h = max(0.0, y2 - y1)
    area_fraction = round((box_w * box_h) / (img_w * img_h), 4)
    aspect_ratio = round((box_w / box_h) if box_h > 0 else 1.0, 3)
    nx1 = round(x1 / img_w, 4)
    ny1 = round(y1 / img_h, 4)
    nx2 = round(x2 / img_w, 4)
    ny2 = round(y2 / img_h, 4)

    return Detection(
        id=det_id,
        class_id=0,
        class_name="person",
        confidence=confidence,
        bbox_xyxy=[x1, y1, x2, y2],
        area_fraction=area_fraction,
        aspect_ratio=aspect_ratio,
        bbox=BBox(x1=nx1, y1=ny1, x2=nx2, y2=ny2),
        bbox_normalized=[nx1, ny1, nx2, ny2],
    )


def test_zero_detections():
    """Verify feature math for scene with no people in frame."""
    result = DetectionResult(
        image_id="test_zero",
        width=800,
        height=600,
        person_count=0,
        detections=[],
        inference_time_ms=12.5,
    )
    features = compute_scene_features(result)

    assert features.person_count == 0
    assert features.coverage_ratio == 0.0
    assert features.low_confidence_count == 0
    assert features.horizontal_candidates == []
    assert features.density_category == "none"
    assert features.centroid == [0.0, 0.0]
    assert features.spread_score == 0.0
    assert features.quadrant_counts == {
        "top_left": 0,
        "top_right": 0,
        "bottom_left": 0,
        "bottom_right": 0,
    }
    assert features.aspect_ratio_classification == "none"
    assert len(features.evidence_items) == 1
    assert features.evidence_items[0].id == "ev_person_count_zero"


def test_single_standing_person():
    """Verify standard upright posture subject."""
    det = make_detection("p1", x1=350, y1=100, x2=450, y2=500, confidence=0.88)
    result = DetectionResult(
        image_id="test_standing",
        width=800,
        height=600,
        person_count=1,
        detections=[det],
        inference_time_ms=15.0,
    )
    features = compute_scene_features(result)

    assert features.person_count == 1
    assert features.density_category == "isolated"
    assert features.low_confidence_count == 0
    assert features.horizontal_candidates == []
    assert features.aspect_ratio_classification == "standing"
    assert features.spread_score == 0.0
    # Centroid: cx = 400/800 = 0.5, cy = 300/600 = 0.5
    assert features.centroid == [0.5, 0.5]


def test_horizontal_prone_candidate_center():
    """Verify wide horizontal box not touching edges is identified as horizontal candidate."""
    # width = 400, height = 100 -> aspect ratio = 4.0 >= 1.2
    # Located centrally: x1=200, y1=250, x2=600, y2=350 (no edge touches)
    det = make_detection("p1", x1=200, y1=250, x2=600, y2=350, confidence=0.75)
    result = DetectionResult(
        image_id="test_prone",
        width=800,
        height=600,
        person_count=1,
        detections=[det],
        inference_time_ms=14.0,
    )
    features = compute_scene_features(result)

    assert features.horizontal_candidates == ["p1"]
    assert features.aspect_ratio_classification == "prone_or_seated"


def test_corner_cropped_person_excluded_from_horizontal():
    """Verify wide box touching 2 image edges is excluded to reduce cropped-person false positives."""
    # width = 200, height = 100 -> aspect ratio = 2.0 >= 1.2
    # But touches left edge (x1=0 <= 5) AND top edge (y1=0 <= 5) -> 2 edge touches!
    det = make_detection("p1", x1=0, y1=0, x2=200, y2=100, confidence=0.72)
    result = DetectionResult(
        image_id="test_corner_crop",
        width=800,
        height=600,
        person_count=1,
        detections=[det],
        inference_time_ms=13.0,
    )
    features = compute_scene_features(result)

    # Must NOT be in horizontal candidates due to touching 2+ edges
    assert features.horizontal_candidates == []
    assert features.aspect_ratio_classification == "standing"


def test_coverage_ratio_clamped():
    """Verify sum of box areas / image area is properly computed and clamped to 1.0."""
    # Image area = 800 * 600 = 480,000
    # Two large overlapping boxes of area 300,000 each = 600,000 total > 480,000
    det1 = make_detection("p1", x1=0, y1=0, x2=600, y2=500)
    det2 = make_detection("p2", x1=200, y1=100, x2=800, y2=600)
    result = DetectionResult(
        image_id="test_clamp",
        width=800,
        height=600,
        person_count=2,
        detections=[det1, det2],
        inference_time_ms=16.0,
    )
    features = compute_scene_features(result)

    # Clamped to exactly 1.0
    assert features.coverage_ratio == 1.0


def test_low_confidence_count():
    """Verify detections below 0.4 are accurately counted as low confidence."""
    d1 = make_detection("p1", x1=100, y1=100, x2=150, y2=250, confidence=0.85)
    d2 = make_detection("p2", x1=200, y1=100, x2=250, y2=250, confidence=0.38)
    d3 = make_detection("p3", x1=300, y1=100, x2=350, y2=250, confidence=0.29)
    d4 = make_detection("p4", x1=400, y1=100, x2=450, y2=250, confidence=0.62)

    result = DetectionResult(
        image_id="test_low_conf",
        width=800,
        height=600,
        person_count=4,
        detections=[d1, d2, d3, d4],
        inference_time_ms=18.0,
    )
    features = compute_scene_features(result)

    assert features.person_count == 4
    assert features.low_confidence_count == 2
    assert features.density_category == "small_group"


def test_density_categories():
    """Verify density classifications: none, isolated, small_group, crowd."""
    dets = [
        make_detection(f"p{i}", x1=i * 50, y1=100, x2=i * 50 + 30, y2=200)
        for i in range(1, 7)
    ]

    # 1 person -> isolated
    r1 = DetectionResult(
        image_id="r1", width=800, height=600, person_count=1, detections=dets[:1]
    )
    assert compute_scene_features(r1).density_category == "isolated"

    # 3 persons -> small_group
    r3 = DetectionResult(
        image_id="r3", width=800, height=600, person_count=3, detections=dets[:3]
    )
    assert compute_scene_features(r3).density_category == "small_group"

    # 6 persons -> crowd
    r6 = DetectionResult(
        image_id="r6", width=800, height=600, person_count=6, detections=dets
    )
    assert compute_scene_features(r6).density_category == "crowd"


def test_quadrant_counts():
    """Verify person spatial counting into 4 frame quadrants."""
    # Top-Left: cx < 400, cy < 300
    d_tl = make_detection("p1", x1=100, y1=100, x2=200, y2=200)
    # Top-Right: cx >= 400, cy < 300
    d_tr = make_detection("p2", x1=500, y1=100, x2=600, y2=200)
    # Bottom-Left: cx < 400, cy >= 300
    d_bl = make_detection("p3", x1=100, y1=400, x2=200, y2=500)
    # Bottom-Right: cx >= 400, cy >= 300
    d_br = make_detection("p4", x1=500, y1=400, x2=600, y2=500)

    result = DetectionResult(
        image_id="test_quadrants",
        width=800,
        height=600,
        person_count=4,
        detections=[d_tl, d_tr, d_bl, d_br],
        inference_time_ms=15.0,
    )
    features = compute_scene_features(result)

    assert features.quadrant_counts["top_left"] == 1
    assert features.quadrant_counts["top_right"] == 1
    assert features.quadrant_counts["bottom_left"] == 1
    assert features.quadrant_counts["bottom_right"] == 1
