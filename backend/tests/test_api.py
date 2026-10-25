import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.services.detector import detector


@pytest.fixture(autouse=True)
def ensure_detector_loaded():
    """Ensure detector is loaded before each test and reload after."""
    detector.load_model()
    yield
    detector.load_model()


def test_health_endpoint():
    """Verify GET /api/health reports model_loaded true."""
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
    assert "version" in data


def test_detect_endpoint_with_image():
    """Verify POST /api/detect processes valid image and returns detection result and features."""
    client = TestClient(app)
    # Create simple RGB test image
    img = Image.new("RGB", (320, 240), color=(120, 150, 180))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    response = client.post(
        "/api/detect",
        files={"file": ("test.jpg", buf, "image/jpeg")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "image_id" in data
    assert "detection_result" in data
    assert "scene_features" in data
    assert "features" in data
    assert data["detection_result"]["person_count"] == 0
    assert data["scene_features"]["coverage_ratio"] == 0.0


def test_detect_model_not_loaded_503():
    """Verify POST /api/detect returns 503 when model is unloaded."""
    client = TestClient(app)
    detector.unload_model()

    img = Image.new("RGB", (320, 240), color=(120, 150, 180))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    response = client.post(
        "/api/detect",
        files={"file": ("test.jpg", buf, "image/jpeg")},
    )
    assert response.status_code == 503
    data = response.json()
    assert data["error"]["code"] == "MODEL_NOT_LOADED"
    assert "not loaded" in data["error"]["message"].lower()


def test_analyze_endpoint_end_to_end():
    """Verify POST /api/analyze full pipeline: vision -> features -> assessment -> incident."""
    client = TestClient(app)
    img = Image.new("RGB", (400, 300), color=(100, 140, 180))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    response = client.post(
        "/api/analyze",
        files={"file": ("field_drone.jpg", buf, "image/jpeg")},
        data={
            "location_label": "Sector 4 North",
            "note": "Field reconnaissance pass",
        },
    )
    assert response.status_code == 200
    incident = response.json()

    assert "id" in incident
    assert incident["origin"] == "live_analysis"
    assert incident["user_note"] == "Field reconnaissance pass"
    assert incident["location"]["address"] == "Sector 4 North"
    assert incident["location"]["source"] == "user_entered"
    assert "detection_result" in incident
    assert "scene_features" in incident
    assert "assessment" in incident
    assert "timing" in incident
    assert incident["timing"]["detect_ms"] > 0
    assert incident["timing"]["total_ms"] > 0
    assert incident["assessment"]["source"] in ("groq_llm", "rules_fallback")


def test_detect_invalid_file_type():
    """Verify POST /api/detect rejects non-image files with 415 or 400."""
    client = TestClient(app)
    fake_txt = io.BytesIO(b"Hello world, not an image!")
    response = client.post(
        "/api/detect",
        files={"file": ("notes.txt", fake_txt, "text/plain")},
    )
    assert response.status_code in (400, 415)
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] in ("INVALID_IMAGE_FORMAT", "BAD_REQUEST")


def test_detect_oversized_file():
    """Verify POST /api/detect rejects payloads exceeding MAX_UPLOAD_MB with 413."""
    client = TestClient(app)
    # 9MB dummy payload
    oversized = io.BytesIO(b"0" * (9 * 1024 * 1024))
    response = client.post(
        "/api/detect",
        files={"file": ("huge.jpg", oversized, "image/jpeg")},
    )
    assert response.status_code == 413
    data = response.json()
    assert data["error"]["code"] == "PAYLOAD_TOO_LARGE"


def test_analyze_no_people_image():
    """Verify POST /api/analyze on an empty scene correctly reports 0 persons and LOW urgency."""
    client = TestClient(app)
    img = Image.new("RGB", (300, 200), color=(50, 100, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    response = client.post(
        "/api/analyze",
        files={"file": ("empty_field.jpg", buf, "image/jpeg")},
    )
    assert response.status_code == 200
    incident = response.json()
    assert incident["detection_result"]["person_count"] == 0
    assert incident["scene_features"]["person_count"] == 0
    assert incident["assessment"]["category"] == "no_people"
    assert incident["assessment"]["urgency_level"] == "LOW"


def test_incident_lifecycle_crud():
    """Verify full lifecycle: create incident, fetch, get image, and delete."""
    client = TestClient(app)
    img = Image.new("RGB", (100, 100), color=(200, 200, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    # 1. Create
    resp = client.post(
        "/api/analyze",
        files={"file": ("crud_test.jpg", buf, "image/jpeg")},
    )
    assert resp.status_code == 200
    inc = resp.json()
    inc_id = inc["id"]

    # 2. Get by ID
    get_resp = client.get(f"/api/incidents/{inc_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == inc_id

    # 3. Stream image
    img_resp = client.get(f"/api/incidents/{inc_id}/image")
    assert img_resp.status_code == 200
    assert img_resp.headers["content-type"] == "image/jpeg"

    # 4. Delete
    del_resp = client.delete(f"/api/incidents/{inc_id}")
    assert del_resp.status_code == 204

    # 5. Confirm 404 after deletion
    post_del_resp = client.get(f"/api/incidents/{inc_id}")
    assert post_del_resp.status_code == 404


def test_analyze_with_valid_coordinates():
    """Verify POST /api/analyze accepts valid lat/lng and persists in incident and list."""
    client = TestClient(app)
    img = Image.new("RGB", (200, 200), color=(100, 100, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    lat = 30.7688
    lng = 76.5754

    resp = client.post(
        "/api/analyze",
        files={"file": ("coord_test.jpg", buf, "image/jpeg")},
        data={
            "lat": lat,
            "lng": lng,
            "location_label": "Mohali Campus",
        },
    )
    assert resp.status_code == 200
    inc = resp.json()
    assert inc["location"] is not None
    assert inc["location"]["latitude"] == pytest.approx(lat)
    assert inc["location"]["longitude"] == pytest.approx(lng)
    assert inc["location"]["address"] == "Mohali Campus"
    assert inc["location"]["source"] == "user_entered"

    # Verify present in list
    list_resp = client.get("/api/incidents")
    assert list_resp.status_code == 200
    items = list_resp.json()
    matching = next((item for item in items if item["id"] == inc["id"]), None)
    assert matching is not None
    assert matching["location"] is not None
    assert matching["location"]["latitude"] == pytest.approx(lat)
    assert matching["location"]["longitude"] == pytest.approx(lng)


def test_analyze_rejects_out_of_range_coordinates():
    """Verify POST /api/analyze rejects out-of-range latitude and longitude with 422."""
    client = TestClient(app)
    img = Image.new("RGB", (200, 200), color=(100, 100, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    # Lat too high (> 90)
    buf.seek(0)
    resp = client.post(
        "/api/analyze",
        files={"file": ("bad_lat.jpg", buf, "image/jpeg")},
        data={"lat": 91.5, "lng": 76.5},
    )
    assert resp.status_code == 422

    # Lat too low (< -90)
    buf.seek(0)
    resp = client.post(
        "/api/analyze",
        files={"file": ("bad_lat.jpg", buf, "image/jpeg")},
        data={"lat": -95.0, "lng": 76.5},
    )
    assert resp.status_code == 422

    # Lng too high (> 180)
    buf.seek(0)
    resp = client.post(
        "/api/analyze",
        files={"file": ("bad_lng.jpg", buf, "image/jpeg")},
        data={"lat": 30.0, "lng": 181.0},
    )
    assert resp.status_code == 422

    # Lng too low (< -180)
    buf.seek(0)
    resp = client.post(
        "/api/analyze",
        files={"file": ("bad_lng.jpg", buf, "image/jpeg")},
        data={"lat": 30.0, "lng": -185.0},
    )
    assert resp.status_code == 422


def test_list_samples_endpoint():
    """Verify GET /api/samples returns registered benchmark evaluation samples."""
    client = TestClient(app)
    resp = client.get("/api/samples")
    assert resp.status_code == 200
    samples = resp.json()
    assert isinstance(samples, list)
    assert len(samples) >= 3
    sample_ids = [s["id"] for s in samples]
    assert "sample_people_crowd" in sample_ids
    assert "sample_person_single" in sample_ids
    assert "sample_empty_landscape" in sample_ids


def test_get_sample_image_endpoint():
    """Verify GET /api/samples/{id}/image streams sample binary and 404s for invalid id."""
    client = TestClient(app)
    resp = client.get("/api/samples/sample_people_crowd/image")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/jpeg"

    bad_resp = client.get("/api/samples/non_existent_sample/image")
    assert bad_resp.status_code == 404


def test_load_sample_endpoint_real_pipeline():
    """Verify POST /api/samples/{id}/load executes genuine pipeline and persists with origin 'sample'."""
    client = TestClient(app)
    resp = client.post("/api/samples/sample_people_crowd/load")
    assert resp.status_code == 200
    incident = resp.json()

    assert incident["origin"] == "sample"
    assert "id" in incident
    assert incident["detection_result"]["person_count"] > 0
    assert incident["scene_features"]["person_count"] > 0
    assert "timing" in incident
    assert incident["timing"]["detect_ms"] > 0

    # Verify persisted in incidents store
    get_resp = client.get(f"/api/incidents/{incident['id']}")
    assert get_resp.status_code == 200
    assert get_resp.json()["origin"] == "sample"

    # Verify image is streamable
    img_resp = client.get(f"/api/incidents/{incident['id']}/image")
    assert img_resp.status_code == 200


def test_load_sample_invalid_id_404():
    """Verify POST /api/samples/{id}/load returns 404 for unknown sample id."""
    client = TestClient(app)
    resp = client.post("/api/samples/unknown_sample_slug/load")
    assert resp.status_code == 404


def test_transcribe_unconfigured_groq_returns_503(monkeypatch):
    """Verify POST /api/transcribe returns 503 when GROQ_API_KEY is not configured."""
    from app.config import settings
    monkeypatch.setattr(settings, "GROQ_API_KEY", None)

    client = TestClient(app)
    fake_audio = io.BytesIO(b"fake audio content")
    resp = client.post(
        "/api/transcribe",
        files={"file": ("voice.webm", fake_audio, "audio/webm")},
    )
    assert resp.status_code == 503
    data = resp.json()
    assert "error" in data
    assert "GROQ_API_KEY" in data["error"]["message"]


def test_transcribe_empty_file_returns_400(monkeypatch):
    """Verify POST /api/transcribe rejects empty audio files with 400."""
    from app.config import settings
    monkeypatch.setattr(settings, "GROQ_API_KEY", "gsk_testkey123")

    client = TestClient(app)
    empty_audio = io.BytesIO(b"")
    resp = client.post(
        "/api/transcribe",
        files={"file": ("voice.webm", empty_audio, "audio/webm")},
    )
    assert resp.status_code == 400


def test_transcribe_success_with_mocked_groq(monkeypatch):
    """Verify POST /api/transcribe returns transcribed text when Groq API succeeds."""
    from app.config import settings
    from unittest.mock import MagicMock
    monkeypatch.setattr(settings, "GROQ_API_KEY", "gsk_testkey123")

    mock_client = MagicMock()
    mock_transcription = MagicMock()
    mock_transcription.text = "Two people located on north ridge, requesting ground transport."
    mock_client.audio.transcriptions.create.return_value = mock_transcription

    import groq
    monkeypatch.setattr(groq, "Groq", lambda **kwargs: mock_client)

    client = TestClient(app)
    audio_buf = io.BytesIO(b"RIFF....WAVEfmt ....data....")
    resp = client.post(
        "/api/transcribe",
        files={"file": ("voice.webm", audio_buf, "audio/webm")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["text"] == "Two people located on north ridge, requesting ground transport."





