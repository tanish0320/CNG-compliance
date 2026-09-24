from fastapi import APIRouter, File, Header, HTTPException, UploadFile

from app.adapters.ocr.paddle_ocr_adapter import PaddleOcrAdapter
from app.adapters.ocr.preprocessor import ALLOWED_MIME_TYPES
from app.core.config import get_settings
from app.domain.exceptions import InvalidImageError, OcrProcessingError
from app.domain.models import ComplianceStatus, OcrExtractResponse, VerificationResult
from app.ports.ocr_provider import OcrProvider
from app.services.verification_service import VerificationService

router = APIRouter(prefix="/ocr", tags=["ocr"])

_override_ocr_provider: OcrProvider | None = None


def get_ocr_provider() -> OcrProvider:
    if _override_ocr_provider is not None:
        return _override_ocr_provider
    return PaddleOcrAdapter(mock_mode=True)


def set_ocr_provider(provider: OcrProvider | None) -> None:
    global _override_ocr_provider
    _override_ocr_provider = provider


@router.post("/extract", response_model=OcrExtractResponse)
async def extract_ocr(
    file: UploadFile = File(...),
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
) -> OcrExtractResponse:
    """
    Upload vehicle plate image, extract registration number via OCR,
    and enforce confidence threshold gating before compliance check.
    """
    if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported MIME type: '{file.content_type}'. Allowed types: {ALLOWED_MIME_TYPES}",
        )

    try:
        image_bytes = await file.read()
        ocr_provider = get_ocr_provider()
        ocr_result = await ocr_provider.extract_registration(image_bytes)
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OcrProcessingError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OCR extraction failed: {exc}") from exc

    settings = get_settings()
    is_high_confidence = (
        bool(ocr_result.normalized_registration)
        and ocr_result.confidence >= settings.ocr_confidence_threshold
    )

    if not is_high_confidence:
        return OcrExtractResponse(
            raw_text=ocr_result.raw_text,
            normalized_registration=ocr_result.normalized_registration,
            confidence=ocr_result.confidence,
            engine_name=ocr_result.engine_name,
            manual_review_required=True,
            verification_result=VerificationResult(
                vehicle_registration=ocr_result.normalized_registration or "UNKNOWN",
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
        vehicle_registration=ocr_result.normalized_registration,
        ocr_confidence=ocr_result.confidence,
        idempotency_key=idempotency_key,
    )

    return OcrExtractResponse(
        raw_text=ocr_result.raw_text,
        normalized_registration=ocr_result.normalized_registration,
        confidence=ocr_result.confidence,
        engine_name=ocr_result.engine_name,
        manual_review_required=verification.manual_review_required,
        verification_result=verification,
    )
