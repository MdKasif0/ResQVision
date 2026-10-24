import json
from unittest.mock import MagicMock
import pytest

from app.schemas import BBox, Detection, DetectionResult, SceneFeatures
from app.services.reasoner import (
    assessment_cache,
    assess,
    make_evidence_hash,
    rules_assess,
)


@pytest.fixture(autouse=True)
def clear_assessment_cache():
    """Clear memory cache before and after every test."""
    assessment_cache.clear()
    yield
    assessment_cache.clear()


def make_dummy_data(
    person_count: int = 1,
    horizontal_candidates: list = None,
    coverage_ratio: float = 0.1,
    density_category: str = "isolated",
):
    horiz = horizontal_candidates if horizontal_candidates is not None else []
    detections = []
    for i in range(1, person_count + 1):
        pid = f"p{i}"
        detections.append(
            Detection(
                id=pid,
                class_id=0,
                class_name="person",
                confidence=0.85,
                bbox_xyxy=[100.0, 100.0, 200.0, 400.0],
                area_fraction=0.05,
                aspect_ratio=0.33,
                bbox=BBox(x1=0.1, y1=0.1, x2=0.2, y2=0.4),
                bbox_normalized=[0.1, 0.1, 0.2, 0.4],
            )
        )

    det_res = DetectionResult(
        image_id="img_test",
        width=1000,
        height=1000,
        person_count=person_count,
        detections=detections,
        inference_time_ms=25.0,
    )

    features = SceneFeatures(
        person_count=person_count,
        coverage_ratio=coverage_ratio,
        low_confidence_count=0,
        horizontal_candidates=horiz,
        density_category=density_category,
        spread_score=0.1,
        centroid=[0.15, 0.25],
        quadrant_counts={"top_left": person_count},
        aspect_ratio_classification="standing" if not horiz else "prone_or_seated",
    )
    return det_res, features


# ---------------------------------------------------------------------------
# (a) rules_assess deterministic fallback test cases
# ---------------------------------------------------------------------------

def test_rules_assess_no_people():
    _, features = make_dummy_data(person_count=0, coverage_ratio=0.0, density_category="none")
    assessment = rules_assess(features)

    assert assessment.urgency_level == "LOW"
    assert assessment.category == "no_people"
    assert assessment.source == "rules_fallback"
    assert assessment.confidence_in_assessment >= 0.9
    assert "person_count" in assessment.evidence_refs


def test_rules_assess_horizontal_candidates_possible_down():
    _, features = make_dummy_data(
        person_count=2,
        horizontal_candidates=["p1"],
        coverage_ratio=0.2,
    )
    assessment = rules_assess(features)

    assert assessment.urgency_level == "MEDIUM"
    assert assessment.category == "possible_person_down"
    assert assessment.source == "rules_fallback"
    assert "p1" in assessment.evidence_refs
    assert "horizontal_candidates" in assessment.evidence_refs
    # Explicit uncertainty warning
    assert any("heuristic" in w.lower() or "uncertainty" in w.lower() for w in assessment.warnings)


def test_rules_assess_crowding():
    _, features = make_dummy_data(
        person_count=6,
        horizontal_candidates=[],
        coverage_ratio=0.42,
        density_category="crowd",
    )
    assessment = rules_assess(features)

    assert assessment.urgency_level == "MEDIUM"
    assert assessment.category == "crowding"
    assert assessment.source == "rules_fallback"
    assert "coverage_ratio" in assessment.evidence_refs


def test_rules_assess_routine_scene():
    _, features = make_dummy_data(
        person_count=2,
        horizontal_candidates=[],
        coverage_ratio=0.08,
        density_category="small_group",
    )
    assessment = rules_assess(features)

    assert assessment.urgency_level == "LOW"
    assert assessment.category == "routine_scene"
    assert assessment.source == "rules_fallback"


# ---------------------------------------------------------------------------
# (b) Validation rejects an assessment citing a nonexistent ref
# ---------------------------------------------------------------------------

def test_validation_rejects_nonexistent_ref_and_falls_back():
    det_res, features = make_dummy_data(person_count=1)  # Only has "p1"

    # Mock client that returns a fake ID "p999" not in detection_result
    mock_bad_assessment = {
        "urgency_level": "LOW",
        "category": "routine_scene",
        "summary": "Hallucinated reference summary",
        "detected_situation": "Single person in frame",
        "recommended_resources": [],
        "recommended_actions": ["Visually verify welfare."],
        "confidence_in_assessment": 0.85,
        "rationale": ["Subject p999 is present."],
        "evidence_refs": ["p999", "coverage_ratio"],  # p999 is invalid!
        "warnings": [],
    }

    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps(mock_bad_assessment)
    mock_client.chat.completions.create.return_value.choices = [mock_choice]

    assessment, source = assess(
        detection_result=det_res,
        features=features,
        groq_client=mock_client,
    )

    # Must fall back to rules_fallback because p999 was never in the input
    assert source == "rules_fallback"
    assert assessment.source == "rules_fallback"
    assert assessment.fallback_reason is not None
    assert "p999" in assessment.fallback_reason


def test_validation_accepts_valid_refs():
    det_res, features = make_dummy_data(person_count=2, horizontal_candidates=["p1"])

    mock_valid_assessment = {
        "urgency_level": "MEDIUM",
        "category": "possible_person_down",
        "summary": "Subject p1 exhibits horizontal posture.",
        "detected_situation": "Possible person down",
        "recommended_resources": ["Field team"],
        "recommended_actions": ["Visually verify welfare on site."],
        "confidence_in_assessment": 0.75,
        "rationale": ["p1 aspect ratio exceeds threshold."],
        "evidence_refs": ["p1", "horizontal_candidates"],  # both exist!
        "warnings": ["Visual heuristic only."],
    }

    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps(mock_valid_assessment)
    mock_client.chat.completions.create.return_value.choices = [mock_choice]

    assessment, source = assess(
        detection_result=det_res,
        features=features,
        groq_client=mock_client,
    )

    assert source == "groq_llm"
    assert assessment.source == "groq_llm"
    assert assessment.category == "possible_person_down"
    assert assessment.evidence_refs == ["p1", "horizontal_candidates"]


# ---------------------------------------------------------------------------
# (c) Malformed model JSON triggers fallback
# ---------------------------------------------------------------------------

def test_malformed_json_triggers_fallback():
    det_res, features = make_dummy_data(person_count=1)

    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "Malformed plain text without JSON: {broken"
    mock_client.chat.completions.create.return_value.choices = [mock_choice]

    assessment, source = assess(
        detection_result=det_res,
        features=features,
        groq_client=mock_client,
    )

    assert source == "rules_fallback"
    assert assessment.source == "rules_fallback"
    assert assessment.fallback_reason is not None


# ---------------------------------------------------------------------------
# (d) Caching avoids second API call for identical evidence
# ---------------------------------------------------------------------------

def test_identical_evidence_reuses_cache():
    det_res, features = make_dummy_data(person_count=1)

    mock_valid_assessment = {
        "urgency_level": "LOW",
        "category": "routine_scene",
        "summary": "Subject p1 is upright.",
        "detected_situation": "Routine upright individual",
        "recommended_resources": [],
        "recommended_actions": ["Maintain monitoring."],
        "confidence_in_assessment": 0.85,
        "rationale": ["p1 in frame."],
        "evidence_refs": ["p1", "person_count"],
        "warnings": [],
    }

    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps(mock_valid_assessment)
    mock_client.chat.completions.create.return_value.choices = [mock_choice]

    # First call
    a1, s1 = assess(det_res, features, groq_client=mock_client)
    assert s1 == "groq_llm"
    assert mock_client.chat.completions.create.call_count == 1

    # Second identical call
    a2, s2 = assess(det_res, features, groq_client=mock_client)
    assert s2 == "groq_llm"
    # Call count must still be 1 (served from in-memory cache)
    assert mock_client.chat.completions.create.call_count == 1
    assert a1.summary == a2.summary
