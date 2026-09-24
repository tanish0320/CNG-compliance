import asyncio
import hashlib
import json
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.adapters.db.models import IdempotencyRecordORM
from app.domain.exceptions import IdempotencyConflictError
from app.domain.models import ComplianceStatus, VerificationResult
from app.ports.idempotency_store import IdempotencyStore


class IdempotencyStoreDB(IdempotencyStore):
    """PostgreSQL / SQLAlchemy implementation of persistent IdempotencyStore."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    @staticmethod
    def compute_hash(payload: dict[str, Any]) -> str:
        """Compute deterministic SHA-256 hash of a JSON payload dictionary."""
        serialized = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    async def acquire_or_get(
        self, key: str, payload: dict[str, Any]
    ) -> VerificationResult | None:
        """
        Atomically register request or return existing completed result.
        Returns:
          - VerificationResult if completed result exists for identical key + payload
          - None if this is the first request and acquisition was successful
        Raises:
          - IdempotencyConflictError if key exists with different payload hash
        """
        payload_hash = self.compute_hash(payload)

        async with self._session_factory() as session:
            stmt = select(IdempotencyRecordORM).where(
                IdempotencyRecordORM.idempotency_key == key
            )
            result = await session.execute(stmt)
            record = result.scalar_one_or_none()

            if record is not None:
                if record.payload_hash != payload_hash:
                    raise IdempotencyConflictError(
                        "Idempotency-Key reused with different request payload"
                    )
                if record.status == "COMPLETED" and record.response_result:
                    return self._deserialize_result(record.response_result)

                # If status is PROCESSING (concurrent request), wait for completion up to 5 seconds
                for _ in range(50):
                    await asyncio.sleep(0.1)
                    async with self._session_factory() as session2:
                        res2 = await session2.execute(stmt)
                        rec2 = res2.scalar_one_or_none()
                        if rec2 and rec2.status == "COMPLETED" and rec2.response_result:
                            return self._deserialize_result(rec2.response_result)

                raise IdempotencyConflictError("Concurrent request in progress for this Idempotency-Key")

            try:
                new_record = IdempotencyRecordORM(
                    idempotency_key=key,
                    payload_hash=payload_hash,
                    request_payload=payload,
                    status="PROCESSING",
                    created_at=datetime.now(UTC),
                    updated_at=datetime.now(UTC),
                )
                session.add(new_record)
                await session.commit()
            except IntegrityError:
                await session.rollback()
                async with self._session_factory() as session3:
                    res3 = await session3.execute(stmt)
                    rec3 = res3.scalar_one_or_none()
                    if rec3 and rec3.payload_hash != payload_hash:
                        raise IdempotencyConflictError(
                            "Idempotency-Key reused with different request payload"
                        )
                    if rec3 and rec3.status == "COMPLETED" and rec3.response_result:
                        return self._deserialize_result(rec3.response_result)
                    raise IdempotencyConflictError("Concurrent request in progress for this Idempotency-Key")

        return None

    async def get(self, key: str) -> tuple[dict[str, Any], VerificationResult] | None:
        async with self._session_factory() as session:
            stmt = select(IdempotencyRecordORM).where(
                IdempotencyRecordORM.idempotency_key == key
            )
            result = await session.execute(stmt)
            record = result.scalar_one_or_none()
            if record is None or record.response_result is None:
                return None

            verification = self._deserialize_result(record.response_result)
            return record.request_payload, verification

    async def set(
        self, key: str, payload: dict[str, Any], result: VerificationResult
    ) -> None:
        payload_hash = self.compute_hash(payload)
        serialized_result = self._serialize_result(result)

        async with self._session_factory() as session:
            stmt = select(IdempotencyRecordORM).where(
                IdempotencyRecordORM.idempotency_key == key
            )
            db_result = await session.execute(stmt)
            record = db_result.scalar_one_or_none()

            if record is not None:
                record.status = "COMPLETED"
                record.response_result = serialized_result
                record.updated_at = datetime.now(UTC)
            else:
                new_record = IdempotencyRecordORM(
                    idempotency_key=key,
                    payload_hash=payload_hash,
                    request_payload=payload,
                    status="COMPLETED",
                    response_result=serialized_result,
                    created_at=datetime.now(UTC),
                    updated_at=datetime.now(UTC),
                )
                session.add(new_record)

            await session.commit()

    async def clear(self) -> None:
        async with self._session_factory() as session:
            await session.execute(delete(IdempotencyRecordORM))
            await session.commit()

    @staticmethod
    def _serialize_result(result: VerificationResult) -> dict[str, Any]:
        return {
            "id": str(result.id),
            "vehicle_registration": result.vehicle_registration,
            "status": result.status,
            "compliance_id": result.compliance_id,
            "expires_at": result.expires_at.isoformat() if result.expires_at else None,
            "source_reference": result.source_reference,
            "rule_version": result.rule_version,
            "manual_review_required": result.manual_review_required,
        }

    @staticmethod
    def _deserialize_result(data: dict[str, Any]) -> VerificationResult:
        expires_at = (
            datetime.fromisoformat(data["expires_at"]) if data.get("expires_at") else None
        )
        return VerificationResult(
            id=UUID(data["id"]),
            vehicle_registration=data["vehicle_registration"],
            status=ComplianceStatus(data["status"]),
            compliance_id=data.get("compliance_id"),
            expires_at=expires_at,
            source_reference=data.get("source_reference"),
            rule_version=data.get("rule_version", "v1"),
            manual_review_required=data.get("manual_review_required", False),
        )
