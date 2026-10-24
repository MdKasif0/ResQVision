import collections
import hashlib
import json
import logging
import threading
import time
from typing import Any, Dict, List, Optional, Set, Tuple

from app.config import settings
from app.schemas import Assessment, AssessmentSource, DetectionResult, SceneFeatures

logger = logging.getLogger("resqvision.reasoner")

# Bounded in-memory LRU cache size
MAX_CACHE_SIZE = 50

VALID_FEATURE_KEYS = {
    "person_count",
    "coverage_ratio",
    "low_confidence_count",
    "horizontal_candidates",
    "density_category",
    "spread_score",
    "centroid",
    "quadrant_counts",
    "aspect_ratio_classification",
    "rules",
    "image_dimensions",
    "user_note",
    "location_label",
    "no_people",
}

SYSTEM_PROMPT = """You are the Evidentiary Reasoning Engine for ResQVision, a mission-critical disaster and incident triage tool.
You receive ONLY structured detection evidence and spatial telemetry (DetectionResult summary, SceneFeatures, optional user note, and location label).
You NEVER see the raw image and MUST NEVER claim to see the image or visual pixels.

CORE OPERATIONAL RULES:
1. Grounding in Evidence: Use strictly and exclusively the structured evidence provided in the user message. Do not invent, extrapolate, or hallucinate facts, causes, injuries, environmental hazards, or real-world locations.
2. Citation of Evidence: Every claim in your rationale and summary must cite specific evidence references ('evidence_refs'). Every reference MUST be either a detection ID from the input (e.g., 'p1', 'p2') or a recognized feature name from the input (e.g., 'person_count', 'coverage_ratio', 'horizontal_candidates', 'density_category', 'low_confidence_count', 'spread_score', 'centroid', 'quadrant_counts', 'rules'). NEVER cite non-existent IDs.
3. Explicit Uncertainty: State uncertainty explicitly. 'horizontal_candidates' are weak geometric bounding-box heuristics (w/h >= 1.2), NOT confirmation of medical distress, injury, or fallen persons.
4. No Presumption of Danger: Never infer danger or emergency solely from a person's mere presence or upright posture in the scene.
5. Strict Situation Categorization:
   - If person_count is 0: category MUST be 'no_people' and urgency_level MUST be 'LOW'.
   - If horizontal candidates are present: category MUST be 'possible_person_down' and urgency_level MUST be 'MEDIUM' with explicit uncertainty noted.
   - If high density/coverage: category MUST be 'crowding' and urgency_level MUST be 'MEDIUM'.
   - If routine upright scene: category MUST be 'routine_scene' and urgency_level MUST be 'LOW'.
   - If evidence is insufficient, contradictory, or ambiguous: category MUST be 'indeterminate' and urgency_level MUST be 'UNKNOWN' or 'LOW'.
6. Action Recommendations: Recommended actions ('recommended_actions') must be cautious, verification-oriented procedural steps (e.g., 'Dispatch ground personnel to visually verify subject welfare', 'Confirm scene status via local radio'). You MUST NEVER make medical, clinical, or legal claims.

OUTPUT FORMAT:
Respond with pure JSON conforming exactly to this structure:
{
  "urgency_level": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN",
  "category": "no_people" | "possible_person_down" | "crowding" | "routine_scene" | "indeterminate",
  "summary": "Concise executive synopsis strictly based on evidence",
  "detected_situation": "Objective interpretation of evidence",
  "recommended_resources": ["list", "of", "dispatch", "resources"],
  "recommended_actions": ["cautious", "verification-oriented", "steps"],
  "confidence_in_assessment": 0.85,
  "rationale": ["bullet citing evidence", "bullet citing evidence"],
  "evidence_refs": ["p1", "horizontal_candidates", "coverage_ratio"],
  "warnings": ["operational caveats", "limitations"]
}
"""


class AssessmentCache:
    """Thread-safe bounded LRU cache for assessment results."""

    def __init__(self, maxsize: int = MAX_CACHE_SIZE):
        self._maxsize = maxsize
        self._cache: collections.OrderedDict[str, Tuple[Assessment, str]] = collections.OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Tuple[Assessment, str]]:
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                return self._cache[key]
            return None

    def put(self, key: str, value: Tuple[Assessment, str]) -> None:
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            self._cache[key] = value
            if len(self._cache) > self._maxsize:
                self._cache.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._cache)


# Global singleton cache
assessment_cache = AssessmentCache(maxsize=MAX_CACHE_SIZE)


def make_evidence_hash(
    detection_result: DetectionResult,
    features: SceneFeatures,
    note: Optional[str] = None,
    location_label: Optional[str] = None,
) -> str:
    """Compute deterministic SHA256 hash for evidence caching."""
    payload = {
        "width": detection_result.width,
        "height": detection_result.height,
        "person_count": detection_result.person_count,
        "detections": [
            {"id": d.id, "conf": d.confidence, "box": d.bbox_xyxy}
            for d in detection_result.detections
        ],
        "features": {
            "person_count": features.person_count,
            "coverage_ratio": features.coverage_ratio,
            "low_confidence_count": features.low_confidence_count,
            "horizontal_candidates": sorted(features.horizontal_candidates),
            "density_category": str(features.density_category),
            "spread_score": features.spread_score,
            "centroid": features.centroid,
            "quadrant_counts": features.quadrant_counts,
            "aspect_ratio_classification": str(features.aspect_ratio_classification),
        },
        "note": note or "",
        "location": location_label or "",
    }
    raw = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def rules_assess(
    features: SceneFeatures,
    fallback_reason: Optional[str] = None,
) -> Assessment:
    """
    Deterministic rule-based assessment fallback.
    Never labeled as AI. Always marks source as 'rules_fallback'.

    Documented rules:
    - no people -> no_people / low
    - horizontal candidates present -> possible_person_down / moderate with explicit uncertainty
    - coverage_ratio high (>= 0.35) -> crowding / moderate
    - else -> routine_scene / low
    """
    person_count = features.person_count
    coverage_ratio = features.coverage_ratio
    horiz_candidates = features.horizontal_candidates

    # Rule 1: No people detected
    if person_count == 0:
        return Assessment(
            urgency_level="LOW",
            category="no_people",
            detected_situation="No human subjects detected in scene",
            summary="Deterministic computer vision analysis detected zero human subjects within the provided image frame.",
            recommended_resources=[],
            recommended_actions=[
                "Confirm whether initial emergency reporting indicated human presence at this coordinate.",
                "Verify camera field of view covers the intended incident perimeter.",
            ],
            confidence_in_assessment=0.95,
            rationale=[
                "person_count is 0 at confidence threshold >= 0.25",
                "coverage_ratio is 0.0",
            ],
            evidence_refs=["person_count", "coverage_ratio"],
            warnings=[
                "Visual detection is bounded by camera angle and resolution; occluded areas cannot be evaluated."
            ],
            source="rules_fallback",
            fallback_reason=fallback_reason,
        )

    # Rule 2: Horizontal posture candidates present
    if len(horiz_candidates) > 0:
        return Assessment(
            urgency_level="MEDIUM",
            category="possible_person_down",
            detected_situation="Potential horizontal or prone posture detected",
            summary=(
                f"Spatial feature extraction identified {len(horiz_candidates)} individual(s) "
                f"({', '.join(horiz_candidates)}) with horizontal bounding box aspect ratios (w/h >= 1.2). "
                "Subject to explicit visual uncertainty."
            ),
            recommended_resources=["Field welfare verification unit"],
            recommended_actions=[
                "Dispatch ground personnel to visually verify the physical welfare of detected individual(s).",
                "Maintain radio communication and check for local distress signals.",
            ],
            confidence_in_assessment=0.6,
            rationale=[
                f"horizontal_candidates detected: {', '.join(horiz_candidates)}",
                "Bounding box aspect ratio meets or exceeds horizontal threshold (1.2)",
            ],
            evidence_refs=["horizontal_candidates"] + list(horiz_candidates),
            warnings=[
                "Horizontal posture is a weak heuristic based strictly on 2D bounding boxes and does not confirm injury, unconsciousness, or medical distress."
            ],
            source="rules_fallback",
            fallback_reason=fallback_reason,
        )

    # Rule 3: High coverage ratio or crowding
    if coverage_ratio >= 0.35 or person_count >= 5 or features.density_category == "crowd":
        return Assessment(
            urgency_level="MEDIUM",
            category="crowding",
            detected_situation="High spatial density or crowd concentration",
            summary=(
                f"Visual scene exhibits high human occupancy with coverage ratio "
                f"{coverage_ratio * 100:.1f}% across {person_count} individuals."
            ),
            recommended_resources=["Crowd monitoring / perimeter access unit"],
            recommended_actions=[
                "Verify crowd movement direction and ensure emergency ingress/egress routes remain clear.",
                "Monitor for potential crowd bottlenecks or structural perimeter strain.",
            ],
            confidence_in_assessment=0.75,
            rationale=[
                f"coverage_ratio is {coverage_ratio}",
                f"person_count is {person_count}",
                f"density_category is {features.density_category}",
            ],
            evidence_refs=["coverage_ratio", "person_count", "density_category"],
            warnings=[
                "High coverage ratio may reflect subject proximity to camera lens rather than total group headcount."
            ],
            source="rules_fallback",
            fallback_reason=fallback_reason,
        )

    # Rule 4: Routine scene
    return Assessment(
        urgency_level="LOW",
        category="routine_scene",
        detected_situation="Routine upright human subjects in frame",
        summary=(
            f"Identified {person_count} upright individual(s) with normal spatial dispersion "
            "and no prone posture indicators."
        ),
        recommended_resources=[],
        recommended_actions=[
            "Maintain standard situational monitoring.",
        ],
        confidence_in_assessment=0.8,
        rationale=[
            f"person_count is {person_count}",
            f"coverage_ratio is {coverage_ratio}",
            "Zero horizontal candidates detected",
        ],
        evidence_refs=["person_count", "coverage_ratio"],
        warnings=[
            "2D person detection does not assess medical condition, environmental hazards, or structural stability."
        ],
        source="rules_fallback",
        fallback_reason=fallback_reason,
    )


def build_user_prompt(
    detection_result: DetectionResult,
    features: SceneFeatures,
    note: Optional[str] = None,
    location_label: Optional[str] = None,
) -> str:
    """Build structured evidence user message for the LLM."""
    evidence_payload = {
        "image_metadata": {
            "processed_width": detection_result.width,
            "processed_height": detection_result.height,
        },
        "detections_summary": [
            {
                "id": d.id,
                "confidence": d.confidence,
                "aspect_ratio": d.aspect_ratio,
                "area_fraction": d.area_fraction,
                "bbox_xyxy": d.bbox_xyxy,
            }
            for d in detection_result.detections
        ],
        "scene_features": {
            "person_count": features.person_count,
            "coverage_ratio": features.coverage_ratio,
            "low_confidence_count": features.low_confidence_count,
            "horizontal_candidates": features.horizontal_candidates,
            "density_category": str(features.density_category),
            "spread_score": features.spread_score,
            "centroid": features.centroid,
            "quadrant_counts": features.quadrant_counts,
            "aspect_ratio_classification": str(features.aspect_ratio_classification),
            "rules": features.rules,
        },
        "user_context": {
            "user_note": note if note else "None provided",
            "location_label": location_label if location_label else "None provided (unverified)",
        },
    }
    return (
        "Analyze the following strictly structured visual detection telemetry and produce "
        "a schema-validated incident assessment JSON:\n\n"
        f"{json.dumps(evidence_payload, indent=2)}"
    )


def extract_valid_refs(
    detection_result: DetectionResult,
    features: SceneFeatures,
) -> Set[str]:
    """Collect the exact set of valid evidence references from the input."""
    valid: Set[str] = set(d.id for d in detection_result.detections)
    valid.update(VALID_FEATURE_KEYS)
    valid.update(features.horizontal_candidates)
    return valid


def validate_evidence_refs(
    evidence_refs: List[str],
    valid_refs: Set[str],
) -> List[str]:
    """Return list of invalid references cited in the assessment."""
    return [ref for ref in evidence_refs if ref not in valid_refs]


def assess(
    detection_result: DetectionResult,
    features: SceneFeatures,
    note: Optional[str] = None,
    location_label: Optional[str] = None,
    groq_client: Optional[Any] = None,
) -> Tuple[Assessment, str]:
    """
    Execute AI evidentiary assessment via Groq LLM (openai/gpt-oss-120b) with
    strict validation, bounded caching, and deterministic rules fallback.

    Args:
        detection_result: Vision detection results with person boxes.
        features: Deterministic scene features.
        note: Optional operator note.
        location_label: Optional user-entered location label.
        groq_client: Optional injected Groq client for testing/mocking.

    Returns:
        Tuple[Assessment, str]: (Assessment, assessment_source) where source is
        either 'groq_llm' or 'rules_fallback'.
    """
    cache_key = make_evidence_hash(detection_result, features, note, location_label)
    cached = assessment_cache.get(cache_key)
    if cached is not None:
        logger.debug("Assessment cache hit (SHA256: %s)", cache_key[:12])
        return cached

    # Fast-path fallback if Groq API key is missing and no client is injected
    if groq_client is None and not settings.is_groq_configured:
        logger.info("GROQ_API_KEY not configured; executing rules fallback.")
        assessment = rules_assess(features, fallback_reason="GROQ_API_KEY not configured")
        result = (assessment, "rules_fallback")
        assessment_cache.put(cache_key, result)
        return result

    # Prepare Groq client
    client = groq_client
    if client is None:
        try:
            import groq
            client = groq.Groq(
                api_key=settings.GROQ_API_KEY,
                timeout=20.0,
            )
        except Exception as exc:
            logger.warning(f"Failed to initialize Groq client: {exc}; executing rules fallback.")
            assessment = rules_assess(features, fallback_reason=f"Client initialization failed: {exc}")
            result = (assessment, "rules_fallback")
            assessment_cache.put(cache_key, result)
            return result

    user_message = build_user_prompt(detection_result, features, note, location_label)
    valid_refs = extract_valid_refs(detection_result, features)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]

    last_error: Optional[str] = None
    max_attempts = 2  # 1 initial call + 1 retry on transient or validation error

    for attempt in range(max_attempts):
        try:
            # Call Groq LLM with JSON mode and low reasoning effort
            # Note: Wrap reasoning_effort in fallback in case provider/mocking signature varies
            completion_kwargs = {
                "model": settings.GROQ_MODEL,
                "messages": messages,
                "response_format": {"type": "json_object"},
                "temperature": 0.1,
            }

            try:
                # Attempt with low reasoning effort
                response = client.chat.completions.create(
                    **completion_kwargs,
                    reasoning_effort="low",
                )
            except TypeError:
                # If SDK/model does not accept reasoning_effort keyword
                response = client.chat.completions.create(**completion_kwargs)

            raw_content = response.choices[0].message.content
            if not raw_content or not raw_content.strip():
                raise ValueError("Groq returned an empty response.")

            # Strict Pydantic parsing and validation
            parsed_json = json.loads(raw_content)
            assessment = Assessment.model_validate(parsed_json)

            # Strict validation: verify all cited evidence_refs exist in input
            invalid_refs = validate_evidence_refs(assessment.evidence_refs, valid_refs)
            if invalid_refs:
                err_msg = (
                    f"Assessment cited non-existent evidence refs: {invalid_refs}. "
                    f"Valid refs are: {sorted(list(valid_refs))}."
                )
                logger.warning("Attempt %d validation failure: %s", attempt + 1, err_msg)

                if attempt == 0:
                    # Retry once with explicit feedback
                    messages.append({"role": "assistant", "content": raw_content})
                    messages.append(
                        {
                            "role": "user",
                            "content": (
                                f"Validation Error: You cited invalid evidence_refs: {invalid_refs}. "
                                f"You MUST only cite references that exist in the input: {sorted(list(valid_refs))}. "
                                "Output the corrected JSON adhering strictly to the schema."
                            ),
                        }
                    )
                    time.sleep(0.5)
                    continue
                else:
                    raise ValueError(err_msg)

            # Validated successfully
            assessment.source = "groq_llm"
            assessment.fallback_reason = None
            result = (assessment, "groq_llm")
            assessment_cache.put(cache_key, result)
            logger.info("Successfully produced Groq LLM assessment with model '%s'", settings.GROQ_MODEL)
            return result

        except Exception as exc:
            last_error = str(exc)
            logger.warning("Groq reasoning attempt %d failed: %s", attempt + 1, exc)
            if attempt == 0:
                time.sleep(0.5)
                continue

    # All attempts exhausted: execute deterministic rules fallback
    logger.warning("Groq reasoning exhausted retries (%s); falling back to deterministic rules.", last_error)
    assessment = rules_assess(features, fallback_reason=f"Groq API fallback: {last_error}")
    result = (assessment, "rules_fallback")
    assessment_cache.put(cache_key, result)
    return result
