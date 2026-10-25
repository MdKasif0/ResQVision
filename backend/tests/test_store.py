import concurrent.futures
import io
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import (
    Assessment,
    DetectionResult,
    Incident,
    SceneFeatures,
)
from app.services.detector import detector
from app.services.store import (
    MAX_INCIDENTS,
    delete_incident,
    get_data_dir,
    get_incident,
    get_incidents_file_path,
    get_uploads_dir,
    list_incidents,
    save_incident,
)


@pytest.fixture(autouse=True)
def setup_test_store(tmp_path, monkeypatch):
    """Isolate store to a clean temporary directory for each test."""
    test_data_dir = tmp_path / "data"
    test_data_dir.mkdir(parents=True, exist_ok=True)
    test_uploads_dir = test_data_dir / "uploads"
    test_uploads_dir.mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr("app.services.store.get_data_dir", lambda: test_data_dir)
    monkeypatch.setattr("app.services.store.get_uploads_dir", lambda: test_uploads_dir)
    monkeypatch.setattr("app.services.store.get_incidents_file_path", lambda: test_data_dir / "incidents.json")
    monkeypatch.setattr("app.main.get_uploads_dir", lambda: test_uploads_dir)

    detector.load_model()
    yield test_data_dir


def _make_dummy_incident(incident_id: str, origin: str = "live_analysis", created_at: str = None) -> Incident:
    """Helper to construct a valid schema-compliant Incident record."""
    if created_at is None:
        created_at = datetime.now(timezone.utc).isoformat()

    return Incident(
        id=incident_id,
        created_at=created_at,
        image_filename=f"{incident_id}.jpg",
        original_filename="test.jpg",
        image_width=640,
        image_height=480,
        detection_result=DetectionResult(
            image_id=incident_id,
            width=640,
            height=480,
            person_count=1,
            detections=[],
            inference_time_ms=15.0,
        ),
        scene_features=SceneFeatures(
            person_count=1,
            coverage_ratio=0.05,
            low_confidence_count=0,
            horizontal_candidates=[],
        ),
        assessment=Assessment(
            urgency_level="LOW",
            summary="Routine visual reconnaissance; 1 subject observed.",
            detected_situation="Single isolated individual.",
            category="routine_scene",
            confidence_in_assessment=0.9,
            source="rules_fallback",
        ),
        origin=origin,
    )


def test_save_and_retrieve_incident():
    """Verify save_incident, get_incident, and list_incidents basic persistence."""
    inc_id = str(uuid.uuid4())
    inc = _make_dummy_incident(inc_id)

    save_incident(inc)

    retrieved = get_incident(inc_id)
    assert retrieved is not None
    assert retrieved.id == inc_id
    assert retrieved.assessment.urgency_level == "LOW"

    all_incidents = list_incidents()
    assert len(all_incidents) == 1
    assert all_incidents[0].id == inc_id


def test_delete_incident_and_removes_image():
    """Verify deleting an incident removes both the JSON record and its uploaded image asset."""
    inc_id = str(uuid.uuid4())
    inc = _make_dummy_incident(inc_id)

    # Create dummy image in uploads dir
    uploads_dir = get_uploads_dir()
    img_path = uploads_dir / f"{inc_id}.jpg"
    img_path.write_bytes(b"dummy image data")
    assert img_path.exists()

    save_incident(inc)
    assert get_incident(inc_id) is not None

    deleted = delete_incident(inc_id)
    assert deleted is True

    # Record should be gone
    assert get_incident(inc_id) is None
    assert len(list_incidents()) == 0

    # Image should be unlinked
    assert not img_path.exists()

    # Deleting non-existent returns False
    assert delete_incident(inc_id) is False


def test_trim_cap_to_50_incidents():
    """Verify storage caps at 50 newest incidents and deletes images for trimmed records."""
    uploads_dir = get_uploads_dir()
    total_to_create = 55
    created_ids = []

    for i in range(total_to_create):
        # Create timestamps with minute offsets to ensure deterministic ordering
        ts = f"2026-10-24T10:{i:02d}:00Z"
        inc_id = str(uuid.uuid4())
        created_ids.append(inc_id)
        inc = _make_dummy_incident(inc_id, created_at=ts)

        # Create image file
        (uploads_dir / f"{inc_id}.jpg").write_bytes(b"dummy image")
        save_incident(inc)

    incidents = list_incidents()
    assert len(incidents) == MAX_INCIDENTS  # Exactly 50

    # Oldest 5 IDs should have been trimmed out
    trimmed_ids = set(created_ids[:5])
    kept_ids = set(created_ids[5:])

    current_ids = {inc.id for inc in incidents}
    assert current_ids == kept_ids
    assert not (current_ids & trimmed_ids)

    # Trimmed images should be deleted
    for trimmed_id in trimmed_ids:
        assert not (uploads_dir / f"{trimmed_id}.jpg").exists()

    # Kept images should still exist
    for kept_id in kept_ids:
        assert (uploads_dir / f"{kept_id}.jpg").exists()


def test_missing_file_creates_empty_file(setup_test_store):
    """Verify that if incidents.json is missing, it is automatically created as an empty JSON list."""
    incidents_path = get_incidents_file_path()
    if incidents_path.exists():
        incidents_path.unlink()
    assert not incidents_path.exists()

    incidents = list_incidents()
    assert incidents == []
    assert incidents_path.exists()
    assert json.loads(incidents_path.read_text(encoding="utf-8")) == []


def test_corrupt_file_recovery(setup_test_store):
    """Verify that a corrupt incidents.json does not crash the server and renames to incidents.corrupt.<timestamp>.json."""
    incidents_path = get_incidents_file_path()
    incidents_path.write_text("{ this is definitely invalid JSON !!!", encoding="utf-8")

    # Reading should not crash, returns empty list, and renames corrupt file
    incidents = list_incidents()
    assert incidents == []

    # Verify corrupt file was created
    corrupt_files = list(incidents_path.parent.glob("incidents.corrupt.*.json"))
    assert len(corrupt_files) == 1
    assert "{ this is definitely invalid JSON" in corrupt_files[0].read_text(encoding="utf-8")

    # Saving a new incident now works seamlessly
    new_id = str(uuid.uuid4())
    save_incident(_make_dummy_incident(new_id))

    fresh_list = list_incidents()
    assert len(fresh_list) == 1
    assert fresh_list[0].id == new_id


def test_concurrent_saves():
    """Verify 20 concurrent threads saving incidents leaves a clean, non-corrupted JSON file."""
    num_threads = 20
    inc_ids = [str(uuid.uuid4()) for _ in range(num_threads)]

    def worker(i_id: str):
        inc = _make_dummy_incident(i_id)
        save_incident(inc)
        return i_id

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        results = list(executor.map(worker, inc_ids))

    assert len(results) == num_threads

    # Verify file is valid JSON and contains all 20 records
    incidents = list_incidents()
    assert len(incidents) == num_threads
    persisted_ids = {inc.id for inc in incidents}
    assert persisted_ids == set(inc_ids)


def test_api_incidents_endpoints_and_id_validation():
    """Test REST API: GET /api/incidents, GET /api/incidents/{id}, GET /api/incidents/{id}/image, DELETE /api/incidents/{id}."""
    client = TestClient(app)

    # 1. Initially empty
    res = client.get("/api/incidents")
    assert res.status_code == 200
    assert res.json() == []

    # 2. Create an incident via /api/analyze
    img = Image.new("RGB", (200, 200), color=(100, 100, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    res_post = client.post(
        "/api/analyze",
        files={"file": ("recon.jpg", buf, "image/jpeg")},
        data={"location_label": "Sector Bravo", "note": "Aerial scan"},
    )
    assert res_post.status_code == 200
    created_incident = res_post.json()
    inc_id = created_incident["id"]

    # 3. List incidents returns summary item
    res_list = client.get("/api/incidents")
    assert res_list.status_code == 200
    items = res_list.json()
    assert len(items) == 1
    assert items[0]["id"] == inc_id
    assert items[0]["location_label"] == "Sector Bravo"
    assert items[0]["origin"] == "live_analysis"
    assert "severity" in items[0]
    assert "person_count" in items[0]

    # 4. Get single incident
    res_get = client.get(f"/api/incidents/{inc_id}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == inc_id
    assert res_get.json()["user_note"] == "Aerial scan"

    # 5. Get image binary
    res_img = client.get(f"/api/incidents/{inc_id}/image")
    assert res_img.status_code == 200
    assert res_img.headers["content-type"] == "image/jpeg"
    assert len(res_img.content) > 0

    # 6. ID Validation & Path Traversal Prevention
    # Malformed non-UUID returns 404
    res_invalid = client.get("/api/incidents/not-a-valid-uuid")
    assert res_invalid.status_code == 404
    assert res_invalid.json()["error"]["code"] == "NOT_FOUND"

    # Path traversal attack returns 404, never files outside data/uploads
    res_traversal = client.get("/api/incidents/../../etc/passwd")
    assert res_traversal.status_code == 404

    res_img_traversal = client.get("/api/incidents/../../etc/passwd/image")
    assert res_img_traversal.status_code == 404

    # 7. Delete incident
    res_del = client.delete(f"/api/incidents/{inc_id}")
    assert res_del.status_code == 204

    # Confirm it's gone
    res_get_gone = client.get(f"/api/incidents/{inc_id}")
    assert res_get_gone.status_code == 404

    res_img_gone = client.get(f"/api/incidents/{inc_id}/image")
    assert res_img_gone.status_code == 404

    res_list_empty = client.get("/api/incidents")
    assert len(res_list_empty.json()) == 0
