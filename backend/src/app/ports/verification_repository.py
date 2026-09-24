from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.models import VerificationResult


class VerificationRepository(ABC):
    """Port interface for persisting verification results and audit logs."""

    @abstractmethod
    async def save_verification(
        self,
        verification: VerificationResult,
        ocr_confidence: float | None = None,
        idempotency_key: str | None = None,
    ) -> VerificationResult:
        """Persist a verification result record and associated audit trail event."""
        raise NotImplementedError

    @abstractmethod
    async def get_verification_by_id(self, verification_id: UUID) -> VerificationResult | None:
        """Retrieve a persisted verification result by unique ID."""
        raise NotImplementedError

    @abstractmethod
    async def log_audit_event(
        self,
        event_type: str,
        actor: str = "system",
        verification_id: UUID | None = None,
        details: dict | None = None,
    ) -> None:
        """Record an immutable audit event."""
        raise NotImplementedError
