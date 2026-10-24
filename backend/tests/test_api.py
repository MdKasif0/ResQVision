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
