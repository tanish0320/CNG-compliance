import hashlib
import io
from fastapi import APIRouter, File, Header, HTTPException, UploadFile
from PIL import Image
import structlog

from app.adapters.ocr.paddle_ocr_adapter import PaddleOcrAdapter
from app.adapters.ocr.preprocessor import ALLOWED_MIME_TYPES
from app.adapters.plate_detection import YoloPlateDetectorAdapter
from app.core.config import get_settings
from app.domain.exceptions import InvalidImageError, OcrProcessingError
from app.domain.models import ComplianceStatus, OcrExtractResponse, VerificationResult
from app.domain.registration_normalizer import IndianRegistrationNormalizer
from app.ports.ocr_provider import OcrProvider
from app.ports.plate_detector import PlateDetector
from app.services.verification_service import VerificationService

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/ocr", tags=["ocr"])

_override_ocr_provider: OcrProvider | None = None
_override_plate_detector: PlateDetector | None = None


def get_ocr_provider() -> OcrProvider:
    if _override_ocr_provider is not None:
        return _override_ocr_provider
    return PaddleOcrAdapter(mock_mode=False)


def set_ocr_provider(provider: OcrProvider | None) -> None:
    global _override_ocr_provider
    _override_ocr_provider = provider


def get_plate_detector() -> PlateDetector:
    if _override_plate_detector is not None:
        return _override_plate_detector
    return YoloPlateDetectorAdapter(mock_mode=False)


def set_plate_detector(detector: PlateDetector | None) -> None:
    global _override_plate_detector
    _override_plate_detector = detector


@router.post("/extract", response_model=OcrExtractResponse)
async def extract_ocr(
    file: UploadFile = File(...),
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
) -> OcrExtractResponse:
    """
    Upload vehicle plate image, detect and crop plate bounding box,
    extract registration number via OCR, and enforce confidence gating.
    """
    if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported MIME type: '{file.content_type}'. Allowed types: {ALLOWED_MIME_TYPES}",
        )

    try:
        image_bytes = await file.read()
        sha256_hash = hashlib.sha256(image_bytes).hexdigest()
        image_size_bytes = len(image_bytes)

        image_dimensions = None
        try:
            with Image.open(io.BytesIO(image_bytes)) as img:
                image_dimensions = img.size
        except Exception:
            pass

        logger.info(
            "ocr_extract_received_image",
            filename=file.filename,
            content_type=file.content_type,
            byte_size=image_size_bytes,
            dimensions=image_dimensions,
            sha256=sha256_hash,
        )

        settings = get_settings()

        # Step 1: Real License Plate Detection & Bounding Box Extraction
        plate_detector = get_plate_detector()
        plate_res = await plate_detector.detect_plate(image_bytes)

        logger.info(
            "plate_detection_completed",
            detected=plate_res.detected,
            bbox=plate_res.bbox,
            confidence=plate_res.confidence,
            detector_name=plate_res.detector_name,
            detector_version=plate_res.detector_version,
            multiple_detected=plate_res.multiple_detected,
            sha256=sha256_hash,
        )

        # Use cropped plate region if detected, otherwise fall back to full image
        ocr_input_bytes = (
            plate_res.crop_bytes
            if (plate_res.detected and plate_res.crop_bytes)
            else image_bytes
        )

        # Step 2: OCR Registration Extraction
        ocr_provider = get_ocr_provider()
        ocr_result = await ocr_provider.extract_registration(ocr_input_bytes)

        # Determine detection source and valid registration candidate
        norm_res = IndianRegistrationNormalizer.normalize(ocr_result.raw_text)

        detector_passed = (
            plate_res.detected
            and not plate_res.multiple_detected
            and plate_res.confidence >= settings.plate_detection_confidence_threshold
        )

        if plate_res.multiple_detected:
            # Multiple plates detected in single scene -> ambiguous, enforce MANUAL_REVIEW
            detection_source = plate_res.detector_name
            is_plate_valid = False
        elif detector_passed:
            detection_source = plate_res.detector_name
            is_plate_valid = True
        elif norm_res.is_valid and ocr_result.confidence >= settings.ocr_confidence_threshold:
            # Requirement 6 & 9: OCR Fallback when single plate detector missed
            detection_source = "ocr_fallback"
            is_plate_valid = True
        else:
            detection_source = "none"
            is_plate_valid = False

        is_high_confidence = (
            is_plate_valid
            and norm_res.is_valid
            and ocr_result.confidence >= settings.ocr_confidence_threshold
        )

        display_registration = (
            norm_res.formatted_plate if norm_res.is_valid else "NO_PLATE_DETECTED"
        )
        normalized_registration = norm_res.normalized_plate if norm_res.is_valid else ""

        logger.info(
            "ocr_extract_completed",
            filename=file.filename,
            content_type=file.content_type,
            byte_size=image_size_bytes,
            dimensions=image_dimensions,
            sha256=sha256_hash,
            detector_name=plate_res.detector_name,
            detection_source=detection_source,
            detector_confidence=plate_res.confidence,
            bbox=plate_res.bbox,
            engine_name=ocr_result.engine_name,
            confidence=ocr_result.confidence,
            normalized_registration=normalized_registration,
            formatted_registration=display_registration,
        )
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OcrProcessingError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OCR extraction failed: {exc}") from exc

    if not is_high_confidence:
        return OcrExtractResponse(
            raw_text=ocr_result.raw_text,
            normalized_registration=normalized_registration,
            formatted_registration=display_registration,
            confidence=ocr_result.confidence,
            engine_name=ocr_result.engine_name,
            detection_source=detection_source,
            manual_review_required=True,
            verification_result=VerificationResult(
                vehicle_registration=display_registration,
                status=ComplianceStatus.MANUAL_REVIEW,
                manual_review_required=True,
            ),
        )

    # Perform automated verification only for high confidence OCR results
    from app.adapters.mock_compliance_provider import MockComplianceProvider
    from app.api.routes.verification import get_verification_repository

    service = VerificationService(
        provider=MockComplianceProvider(),
        repository=get_verification_repository(),
    )

    verification = await service.verify(
        vehicle_registration=norm_res.normalized_plate,
        ocr_confidence=ocr_result.confidence,
        idempotency_key=idempotency_key,
    )

    verification_with_formatted = VerificationResult(
        id=verification.id,
        vehicle_registration=norm_res.formatted_plate,
        status=verification.status,
        compliance_id=verification.compliance_id,
        expires_at=verification.expires_at,
        source_reference=verification.source_reference,
        rule_version=verification.rule_version,
        manual_review_required=verification.manual_review_required,
    )

    return OcrExtractResponse(
        raw_text=ocr_result.raw_text,
        normalized_registration=norm_res.normalized_plate,
        formatted_registration=norm_res.formatted_plate,
        confidence=ocr_result.confidence,
        engine_name=ocr_result.engine_name,
        detection_source=detection_source,
        manual_review_required=verification.manual_review_required,
        verification_result=verification_with_formatted,
    )
