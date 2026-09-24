import re
from datetime import UTC, datetime

import structlog

from app.core.config import get_settings
from app.domain.exceptions import InvalidRegistrationError, ProviderUnavailableError
from app.domain.models import ComplianceStatus, VerificationResult
from app.ports.compliance_provider import ComplianceProvider
from app.ports.verification_repository import VerificationRepository

logger = structlog.get_logger(__name__)

REGISTRATION_PATTERN = re.compile(r"^[A-Z0-9]{4,15}$")


class VerificationService:
    """Orchestrate provider lookup and deterministic compliance classification."""

    def __init__(
        self,
        provider: ComplianceProvider,
        repository: VerificationRepository | None = None,
        ocr_confidence_threshold: float | None = None,
    ) -> None:
        self._provider = provider
        self._repository = repository
        settings = get_settings()
        self._ocr_confidence_threshold = (
            ocr_confidence_threshold
            if ocr_confidence_threshold is not None
            else settings.ocr_confidence_threshold
        )

    async def verify(
        self,
        vehicle_registration: str,
        ocr_confidence: float | None = None,
        idempotency_key: str | None = None,
    ) -> VerificationResult:
        normalized = self.normalize_registration(vehicle_registration)
        logger.info("verification_started", vehicle_registration=normalized)

        if ocr_confidence is not None and ocr_confidence < self._ocr_confidence_threshold:
            logger.warning(
                "low_ocr_confidence_triggering_manual_review",
                vehicle_registration=normalized,
                confidence=ocr_confidence,
                threshold=self._ocr_confidence_threshold,
            )
            result = VerificationResult(
                vehicle_registration=normalized,
                status=ComplianceStatus.MANUAL_REVIEW,
                manual_review_required=True,
            )
            if self._repository is not None:
                await self._repository.save_verification(
                    result, ocr_confidence=ocr_confidence, idempotency_key=idempotency_key
                )
            return result

        try:
            record = await self._provider.lookup(normalized)
        except (ProviderUnavailableError, TimeoutError) as exc:
            logger.error(
                "provider_unavailable",
                vehicle_registration=normalized,
                error=str(exc),
            )
            result = VerificationResult(
                vehicle_registration=normalized,
                status=ComplianceStatus.PROVIDER_UNAVAILABLE,
                manual_review_required=True,
            )
            if self._repository is not None:
                await self._repository.save_verification(
                    result, ocr_confidence=ocr_confidence, idempotency_key=idempotency_key
                )
            return result
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "provider_error",
                vehicle_registration=normalized,
                error=str(exc),
            )
            result = VerificationResult(
                vehicle_registration=normalized,
                status=ComplianceStatus.PROVIDER_UNAVAILABLE,
                manual_review_required=True,
            )
            if self._repository is not None:
                await self._repository.save_verification(
                    result, ocr_confidence=ocr_confidence, idempotency_key=idempotency_key
                )
            return result

        if record is None:
            logger.warning("compliance_record_not_found", vehicle_registration=normalized)
            result = VerificationResult(
                vehicle_registration=normalized,
                status=ComplianceStatus.NOT_FOUND,
                manual_review_required=True,
            )
            if self._repository is not None:
                await self._repository.save_verification(
                    result, ocr_confidence=ocr_confidence, idempotency_key=idempotency_key
                )
            return result

        now = datetime.now(UTC)
        if record.is_valid is False:
            status = ComplianceStatus.INVALID
        elif record.expires_at and record.expires_at < now:
            status = ComplianceStatus.EXPIRED
        elif record.expires_at and (record.expires_at - now).days <= 30:
            status = ComplianceStatus.EXPIRING_SOON
        else:
            status = ComplianceStatus.VALID

        logger.info(
            "verification_completed",
            vehicle_registration=normalized,
            status=status,
            source_reference=record.source_reference,
        )
        result = VerificationResult(
            vehicle_registration=normalized,
            status=status,
            compliance_id=record.compliance_id,
            expires_at=record.expires_at,
            source_reference=record.source_reference,
        )
        if self._repository is not None:
            await self._repository.save_verification(
                result, ocr_confidence=ocr_confidence, idempotency_key=idempotency_key
            )
        return result

    @staticmethod
    def normalize_registration(value: str) -> str:
        """Normalize registration string and validate against alphanumeric format."""
        if not value:
            raise InvalidRegistrationError("Vehicle registration cannot be empty")

        normalized = "".join(value.upper().split()).replace("-", "")

        if not REGISTRATION_PATTERN.match(normalized):
            raise InvalidRegistrationError(
                f"Invalid vehicle registration format: '{value}'. "
                "Registration must be 4-15 alphanumeric characters."
            )

        return normalized
