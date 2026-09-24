import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    String,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class IdempotencyRecordORM(Base):
    """SQLAlchemy model for persistent idempotency key management."""

    __tablename__ = "idempotency_records"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    idempotency_key: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    request_payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PROCESSING")
    response_result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )


class VerificationRecordORM(Base):
    """SQLAlchemy model for persistent verification outcome records."""

    __tablename__ = "verification_records"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    idempotency_key: Mapped[str | None] = mapped_column(
        String(255), index=True, nullable=True
    )
    vehicle_registration: Mapped[str] = mapped_column(
        String(20), index=True, nullable=False
    )
    ocr_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    compliance_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    source_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rule_version: Mapped[str] = mapped_column(String(10), nullable=False, default="v1")
    manual_review_required: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    audit_events: Mapped[list["AuditEventORM"]] = relationship(
        "AuditEventORM", back_populates="verification", cascade="all, delete-orphan"
    )


class AuditEventORM(Base):
    """SQLAlchemy model for compliance verification audit events."""

    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    verification_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("verification_records.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    actor: Mapped[str] = mapped_column(String(128), nullable=False, default="system")
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    verification: Mapped[VerificationRecordORM | None] = relationship(
        "VerificationRecordORM", back_populates="audit_events"
    )


class SystemConfigORM(Base):
    """SQLAlchemy model for dynamic system rules and provider configurations."""

    __tablename__ = "system_configs"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    key: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    value: Mapped[dict] = mapped_column(JSON, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    version: Mapped[int] = mapped_column(nullable=False, default=1)
    updated_by: Mapped[str] = mapped_column(String(128), nullable=False, default="system")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

