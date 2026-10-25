import logging
import threading
import time
import uuid
from pathlib import Path
from typing import List, Optional
from PIL import Image

from app.exceptions import ModelNotLoadedException
from app.schemas import BBox, Detection, DetectionResult

logger = logging.getLogger("resqvision.detector")

# Standard configuration defaults for person detection
DEFAULT_MODEL_FILENAME = "yolov8n.pt"
COCO_PERSON_CLASS_ID = 0
DEFAULT_IMGSZ = 640
DEFAULT_CONF = 0.25
DEFAULT_DEVICE = "cpu"


class YOLODetectorService:
    """
    Ultralytics YOLO nano person detector service.
    Restricted strictly to COCO class 0 (person).
    Thread-safe execution for CPU inference.
    """

    def __init__(
        self,
        model_path: Optional[Path] = None,
        device: str = DEFAULT_DEVICE,
        imgsz: int = DEFAULT_IMGSZ,
        conf: float = DEFAULT_CONF,
    ):
        if model_path is None:
            # Default to backend/models/yolov8n.pt
            base_dir = Path(__file__).resolve().parent.parent.parent
            model_path = base_dir / "models" / DEFAULT_MODEL_FILENAME

        self.model_path = Path(model_path)
        self.device = device
        self.imgsz = imgsz
        self.conf = conf
        self.classes = [COCO_PERSON_CLASS_ID]

        self._model = None
        self._lock = threading.Lock()

    def load_model(self) -> None:
        """Load YOLO model weights once at startup."""
        with self._lock:
            if self._model is not None:
                return

            if not self.model_path.exists():
                logger.error(f"YOLO weights not found at path: {self.model_path}")
                raise FileNotFoundError(f"Model file missing: {self.model_path}")

            try:
                from ultralytics import YOLO

                logger.info(f"Loading YOLO weights from {self.model_path} on device '{self.device}'...")
                model = YOLO(str(self.model_path))
                # Warm up model with a dummy inference to eliminate first-request cold start latency
                try:
                    dummy_img = Image.new("RGB", (self.imgsz, self.imgsz), (0, 0, 0))
                    model.predict(
                        source=dummy_img,
                        imgsz=self.imgsz,
                        classes=self.classes,
                        conf=self.conf,
                        device=self.device,
                        verbose=False,
                    )
                    logger.info("YOLO model warmed up successfully.")
                except Exception as warm_exc:
                    logger.warning(f"Model warm-up encountered non-fatal error: {warm_exc}")

                self._model = model
                logger.info("YOLO person detector model loaded successfully.")
            except Exception as exc:
                logger.error(f"Failed to load YOLO model: {exc}", exc_info=True)
                self._model = None
                raise

    def unload_model(self) -> None:
        """Unload model from memory on shutdown."""
        with self._lock:
            self._model = None
            logger.info("YOLO model unloaded.")

    def is_loaded(self) -> bool:
        """Check if model weights are loaded and ready."""
        return self._model is not None

    def detect(self, image: Image.Image, image_id: Optional[str] = None) -> DetectionResult:
        """
        Execute YOLO person detection on a PIL Image.

        Args:
            image: Processed PIL Image.
            image_id: Unique image identifier (UUID generated if None).

        Returns:
            DetectionResult: Bounding boxes in pixel coordinates of the processed image,
            image dimensions, person count, inference latency, sorted by confidence descending.

        Raises:
            ModelNotLoadedException: If the model is not loaded.
        """
        if not self.is_loaded():
            raise ModelNotLoadedException("YOLO detection model is not loaded. Service unavailable.")

        img_id = image_id or str(uuid.uuid4())
        width, height = image.size

        start_time = time.perf_counter()

        # Guard against concurrent inference corrupting model internal state
        with self._lock:
            results = self._model.predict(
                source=image,
                imgsz=self.imgsz,
                classes=self.classes,
                conf=self.conf,
                device=self.device,
                verbose=False,
            )

        inference_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        raw_detections = []
        if results and len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes
            for i in range(len(boxes)):
                box = boxes[i]
                cls_id = int(box.cls[0].item())
                if cls_id != COCO_PERSON_CLASS_ID:
                    continue

                conf = float(box.conf[0].item())
                coords = box.xyxy[0].tolist()

                # Clamp boxes to image bounds
                x1 = max(0.0, min(float(width), float(coords[0])))
                y1 = max(0.0, min(float(height), float(coords[1])))
                x2 = max(0.0, min(float(width), float(coords[2])))
                y2 = max(0.0, min(float(height), float(coords[3])))

                if x1 > x2:
                    x1, x2 = x2, x1
                if y1 > y2:
                    y1, y2 = y2, y1

                box_w = max(0.0, x2 - x1)
                box_h = max(0.0, y2 - y1)

                area_fraction = (box_w * box_h) / (width * height) if (width * height) > 0 else 0.0
                area_fraction = min(1.0, max(0.0, area_fraction))
                aspect_ratio = (box_w / box_h) if box_h > 0 else 1.0

                nx1 = x1 / width if width > 0 else 0.0
                ny1 = y1 / height if height > 0 else 0.0
                nx2 = x2 / width if width > 0 else 0.0
                ny2 = y2 / height if height > 0 else 0.0

                raw_detections.append(
                    {
                        "confidence": conf,
                        "class_id": COCO_PERSON_CLASS_ID,
                        "class_name": "person",
                        "bbox_xyxy": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
                        "area_fraction": round(area_fraction, 4),
                        "aspect_ratio": round(aspect_ratio, 3),
                        "bbox_normalized": [round(nx1, 4), round(ny1, 4), round(nx2, 4), round(ny2, 4)],
                        "bbox": BBox(
                            x1=round(nx1, 4),
                            y1=round(ny1, 4),
                            x2=round(nx2, 4),
                            y2=round(ny2, 4),
                        ),
                    }
                )

        # Assign stable ids ("p1", "p2", ...) sorted by confidence descending
        raw_detections.sort(key=lambda d: d["confidence"], reverse=True)

        final_detections: List[Detection] = []
        for index, item in enumerate(raw_detections, start=1):
            detection = Detection(
                id=f"p{index}",
                class_id=item["class_id"],
                class_name=item["class_name"],
                confidence=round(item["confidence"], 3),
                bbox_xyxy=item["bbox_xyxy"],
                area_fraction=item["area_fraction"],
                aspect_ratio=item["aspect_ratio"],
                bbox=item["bbox"],
                bbox_normalized=item["bbox_normalized"],
            )
            final_detections.append(detection)

        return DetectionResult(
            image_id=img_id,
            width=width,
            height=height,
            person_count=len(final_detections),
            detections=final_detections,
            inference_time_ms=inference_ms,
            inference_ms=inference_ms,
        )


# Global singleton instance
detector = YOLODetectorService()
