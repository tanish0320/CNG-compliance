import io
import uuid
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from app.adapters.ocr.paddle_ocr_adapter import PaddleOcrAdapter
from app.adapters.plate_detection import YoloPlateDetectorAdapter
from app.api.routes.ocr import set_ocr_provider, set_plate_detector
from app.api.routes.verification import set_idempotency_store, set_verification_repository
from app.core.config import get_settings
from app.main import app
from app.ports.idempotency_store import InMemoryIdempotencyStore
from app.ports.plate_detector import PlateDetectionResult, PlateDetector


class CustomMockPlateDetector(PlateDetector):
    def __init__(self, detected: bool = True, multiple: bool = False, conf: float = 0.95):
        self.detected = detected
        self.multiple = multiple
        self.conf = conf

    async def detect_plate(self, image_bytes: bytes) -> PlateDetectionResult:
        if not self.detected:
            return PlateDetectionResult(
                detected=False,
                bbox=None,
                confidence=0.0,
                crop_bytes=None,
                detector_name="MockPlateDetector",
                detector_version="mock-v1",
            )
        img = Image.open(io.BytesIO(image_bytes))
        w, h = img.size
        crop_buf = io.BytesIO()
        png_info = PngInfo()
        png_info.add_text("test_text", img.info.get("test_text", ""))
        img.save(crop_buf, format="PNG", pnginfo=png_info)
        return PlateDetectionResult(
            detected=True,
            bbox=[10, 10, w - 10, h - 10],
            confidence=self.conf,
            crop_bytes=crop_buf.getvalue(),
            detector_name="MockPlateDetector",
            detector_version="mock-v1",
            multiple_detected=self.multiple,
        )


def setup_function() -> None:
    get_settings().enable_dev_auth = True
    set_ocr_provider(PaddleOcrAdapter(mock_mode=True))
    set_plate_detector(YoloPlateDetectorAdapter(mock_mode=True))
    set_idempotency_store(InMemoryIdempotencyStore())
    set_verification_repository(None)


from PIL.PngImagePlugin import PngInfo

def generate_sample_plate_jpeg(text: str = "DL01AB1234") -> bytes:
    img = Image.new("RGB", (400, 150), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.rectangle([20, 20, 380, 130], outline=(0, 0, 0), width=3)
    d.text((40, 50), text, fill=(0, 0, 0))
    buf = io.BytesIO()
    png_info = PngInfo()
    png_info.add_text("test_text", text)
    img.save(buf, format="PNG", pnginfo=png_info)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_yolo_adapter_opencv_aspect_ratio_fallback() -> None:
    detector = YoloPlateDetectorAdapter(mock_mode=False)
    sample_jpeg = generate_sample_plate_jpeg("DL01AB1234")
    res = await detector.detect_plate(sample_jpeg)
    assert res.detected is True
    assert res.bbox is not None
    assert len(res.bbox) == 4
    assert res.crop_bytes is not None
    assert len(res.crop_bytes) > 0


def test_e2e_full_pipeline_image_to_verification() -> None:
    set_plate_detector(CustomMockPlateDetector(detected=True, conf=0.95))
    set_ocr_provider(PaddleOcrAdapter(mock_mode=True))
    img_bytes = generate_sample_plate_jpeg("DL01AB1234")
    key = str(uuid.uuid4())

    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/v1/ocr/extract",
            files={"file": ("vehicle_plate.jpg", img_bytes, "image/jpeg")},
            headers={"Idempotency-Key": key},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["normalized_registration"] == "DL01AB1234"
        assert data["confidence"] >= 0.85
        assert data["manual_review_required"] is False
        assert data["verification_result"]["status"] == "VALID"
        assert data["verification_result"]["vehicle_registration"] == "DL01 AB1234"


def test_pipeline_multiple_plates_triggers_manual_review() -> None:
    set_plate_detector(CustomMockPlateDetector(detected=True, multiple=True, conf=0.90))
    img_bytes = generate_sample_plate_jpeg("DL01AB1234")

    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/v1/ocr/extract",
            files={"file": ("vehicle_plate.jpg", img_bytes, "image/jpeg")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["manual_review_required"] is True
        assert data["verification_result"]["status"] == "MANUAL_REVIEW"


def test_pipeline_no_plate_detected_triggers_manual_review() -> None:
    set_plate_detector(CustomMockPlateDetector(detected=False))
    img_bytes = generate_sample_plate_jpeg("NO_PLATE")

    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/v1/ocr/extract",
            files={"file": ("non_plate.jpg", img_bytes, "image/jpeg")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["manual_review_required"] is True
        assert data["verification_result"]["status"] == "MANUAL_REVIEW"
        assert data["verification_result"]["vehicle_registration"] == "NO_PLATE_DETECTED"
