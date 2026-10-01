import io
import uuid

import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
from PIL.PngImagePlugin import PngInfo

from app.adapters.ocr.paddle_ocr_adapter import PaddleOcrAdapter
from app.adapters.ocr.preprocessor import ImagePreprocessor
from app.api.routes.ocr import set_ocr_provider
from app.api.routes.verification import set_idempotency_store, set_verification_repository
from app.domain.exceptions import InvalidImageError, OcrProcessingError
from app.main import app
from app.ports.idempotency_store import InMemoryIdempotencyStore

client = TestClient(app)


def generate_test_image_bytes(text: str = "DL01AB1234") -> bytes:
    """Generate valid PNG image bytes in memory for test fixtures with embedded metadata."""
    img = Image.new("RGB", (300, 100), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((10, 40), text, fill=(0, 0, 0))
    buf = io.BytesIO()
    png_info = PngInfo()
    png_info.add_text("test_text", text)
    img.save(buf, format="PNG", pnginfo=png_info)
    return buf.getvalue()


from app.api.routes.ocr import set_ocr_provider, set_plate_detector
from app.adapters.plate_detection import YoloPlateDetectorAdapter
from app.core.config import get_settings


def setup_function() -> None:
    """Reset providers and store overrides before each test."""
    get_settings().enable_dev_auth = True
    set_ocr_provider(PaddleOcrAdapter(mock_mode=True))
    set_plate_detector(YoloPlateDetectorAdapter(mock_mode=True))
    set_idempotency_store(InMemoryIdempotencyStore())
    set_verification_repository(None)


def test_preprocessor_valid_image() -> None:
    preprocessor = ImagePreprocessor()
    img_bytes = generate_test_image_bytes("DL01AB1234")
    processed = preprocessor.validate_and_preprocess(img_bytes)
    assert isinstance(processed, bytes)
    assert len(processed) > 0


def test_preprocessor_empty_image() -> None:
    preprocessor = ImagePreprocessor()
    with pytest.raises(InvalidImageError, match="empty"):
        preprocessor.validate_and_preprocess(b"")


def test_preprocessor_oversized_image() -> None:
    preprocessor = ImagePreprocessor(max_size_bytes=100)
    img_bytes = generate_test_image_bytes("DL01AB1234")
    with pytest.raises(InvalidImageError, match="exceeds maximum allowed size"):
        preprocessor.validate_and_preprocess(img_bytes)


def test_preprocessor_corrupted_image() -> None:
    preprocessor = ImagePreprocessor()
    with pytest.raises(InvalidImageError, match="Corrupted"):
        preprocessor.validate_and_preprocess(b"NOT_AN_IMAGE_PAYLOAD_GARBAGE")


@pytest.mark.asyncio
async def test_paddle_ocr_adapter_extraction() -> None:
    adapter = PaddleOcrAdapter(mock_mode=True)
    img_bytes = generate_test_image_bytes("DL01AB1234")
    res = await adapter.extract_registration(img_bytes)
    assert res.normalized_registration == "DL01AB1234"
    assert res.confidence == 0.95
    assert res.engine_name.startswith("PaddleOCR")


@pytest.mark.asyncio
async def test_paddle_ocr_adapter_low_confidence() -> None:
    adapter = PaddleOcrAdapter(mock_mode=True)
    img_bytes = generate_test_image_bytes("DL01AB1234 LOW_CONF")
    res = await adapter.extract_registration(img_bytes)
    assert res.confidence == 0.65


@pytest.mark.asyncio
async def test_paddle_ocr_adapter_failure() -> None:
    adapter = PaddleOcrAdapter(mock_mode=True)
    img_bytes = generate_test_image_bytes("FAIL")
    with pytest.raises(OcrProcessingError):
        await adapter.extract_registration(img_bytes)


def test_api_ocr_extract_high_confidence() -> None:
    img_bytes = generate_test_image_bytes("DL01AB1234")
    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/v1/ocr/extract",
            files={"file": ("plate.png", img_bytes, "image/png")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["normalized_registration"] == "DL01AB1234"
        assert data["confidence"] >= 0.85
        assert data["manual_review_required"] is False
        assert data["verification_result"]["status"] == "VALID"


def test_api_ocr_extract_low_confidence_triggers_manual_review() -> None:
    img_bytes = generate_test_image_bytes("DL01AB1234 LOW_CONF")
    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/v1/ocr/extract",
            files={"file": ("plate.png", img_bytes, "image/png")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["manual_review_required"] is True
        assert data["verification_result"]["status"] == "MANUAL_REVIEW"
        # Compliance provider should NOT be queried automatically on low confidence
        assert data["verification_result"]["compliance_id"] is None


def test_api_ocr_extract_unsupported_mime() -> None:
    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/v1/ocr/extract",
            files={"file": ("doc.txt", b"some text", "text/plain")},
        )
        assert response.status_code == 400
        assert "Unsupported MIME type" in response.json()["detail"]


def test_api_ocr_extract_corrupted_image() -> None:
    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/v1/ocr/extract",
            files={"file": ("bad.png", b"corrupted bytes", "image/png")},
        )
        assert response.status_code == 400
        assert "Corrupted or unreadable image" in response.json()["detail"]


def test_api_manual_review_confirmation() -> None:
    key = str(uuid.uuid4())
    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/v1/verifications/confirm-manual-review",
            json={
                "confirmed_registration": "DL 01 AB 1234",
                "original_raw_text": "DL 01 AB 1234 LOW_CONF",
                "original_confidence": 0.65,
                "actor": "operator-101",
            },
            headers={"Idempotency-Key": key},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "VALID"
        assert data["vehicle_registration"] == "DL01AB1234"
        assert data["manual_review_required"] is False


def test_api_ocr_extract_no_plate_detected() -> None:
    img_bytes = generate_test_image_bytes("PEPSI_CAN_NO_PLATE")
    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/v1/ocr/extract",
            files={"file": ("pepsi.png", img_bytes, "image/png")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["normalized_registration"] == ""
        assert data["confidence"] == 0.0
        assert data["manual_review_required"] is True
        assert data["verification_result"]["vehicle_registration"] == "NO_PLATE_DETECTED"
        assert data["verification_result"]["status"] == "MANUAL_REVIEW"

