from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.adapters.db.models import AuditEventORM, VerificationRecordORM
from app.domain.models import ComplianceStatus, VerificationResult
from app.ports.verification_repository import VerificationRepository


class VerificationRepositoryDB(VerificationRepository):
    """PostgreSQL / SQLAlchemy implementation of VerificationRepository."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def save_verification(
        self,
        verification: VerificationResult,
        ocr_confidence: float | None = None,
        idempotency_key: str | None = None,
    ) -> VerificationResult:
        async with self._session_factory() as session:
            record = VerificationRecordORM(
                id=verification.id,
                idempotency_key=idempotency_key,
                vehicle_registration=verification.vehicle_registration,
                ocr_confidence=ocr_confidence,
                status=verification.status,
                compliance_id=verification.compliance_id,
                expires_at=verification.expires_at,
                source_reference=verification.source_reference,
                rule_version=verification.rule_version,
                manual_review_required=verification.manual_review_required,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            session.add(record)

            audit_event = AuditEventORM(
                verification_id=verification.id,
                event_type="VERIFICATION_COMPLETED",
                actor="system",
                details={
                    "status": verification.status,
                    "vehicle_registration": verification.vehicle_registration,
                    "manual_review_required": verification.manual_review_required,
                    "idempotency_key": idempotency_key,
                },
                created_at=datetime.now(UTC),
            )
            session.add(audit_event)
            await session.commit()

        return verification

    async def get_verification_by_id(self, verification_id: UUID) -> VerificationResult | None:
        async with self._session_factory() as session:
            stmt = select(VerificationRecordORM).where(
                VerificationRecordORM.id == verification_id
            )
            result = await session.execute(stmt)
            record = result.scalar_one_or_none()
            if record is None:
                return None

            return VerificationResult(
                id=record.id,
                vehicle_registration=record.vehicle_registration,
                status=ComplianceStatus(record.status),
                compliance_id=record.compliance_id,
                expires_at=record.expires_at,
                source_reference=record.source_reference,
                rule_version=record.rule_version,
                manual_review_required=record.manual_review_required,
            )

    async def log_audit_event(
        self,
        event_type: str,
        actor: str = "system",
        verification_id: UUID | None = None,
        details: dict | None = None,
    ) -> None:
        async with self._session_factory() as session:
            audit_event = AuditEventORM(
                verification_id=verification_id,
                event_type=event_type,
                actor=actor,
                details=details,
                created_at=datetime.now(UTC),
            )
            session.add(audit_event)
            await session.commit()
