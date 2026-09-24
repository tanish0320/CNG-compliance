import uuid
from datetime import UTC, datetime

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.adapters.db.idempotency_store_db import IdempotencyStoreDB
from app.adapters.db.models import AuditEventORM, Base
from app.adapters.db.verification_repository_db import VerificationRepositoryDB
from app.domain.exceptions import IdempotencyConflictError
from app.domain.models import ComplianceStatus, VerificationResult


@pytest_asyncio.fixture
async def db_session_factory() -> async_sessionmaker[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    yield factory
    await engine.dispose()


@pytest.mark.asyncio
async def test_database_schema_creation_and_crud(
    db_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    repo = VerificationRepositoryDB(db_session_factory)
    result_id = uuid.uuid4()
    verification = VerificationResult(
        id=result_id,
        vehicle_registration="DL01AB1234",
        status=ComplianceStatus.VALID,
        compliance_id="CNG-DL01AB1234",
        expires_at=datetime.now(UTC),
        source_reference="mock://authorized-provider",
        rule_version="v1",
        manual_review_required=False,
    )

    saved = await repo.save_verification(verification, ocr_confidence=0.95, idempotency_key="key-123")
    assert saved.id == result_id

    fetched = await repo.get_verification_by_id(result_id)
    assert fetched is not None
    assert fetched.vehicle_registration == "DL01AB1234"
    assert fetched.status == ComplianceStatus.VALID

    # Check audit log entry was created
    async with db_session_factory() as session:
        stmt = select(AuditEventORM).where(AuditEventORM.verification_id == result_id)
        res = await session.execute(stmt)
        audit_event = res.scalar_one_or_none()
        assert audit_event is not None
        assert audit_event.event_type == "VERIFICATION_COMPLETED"


@pytest.mark.asyncio
async def test_idempotency_first_request_and_replay(
    db_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    store = IdempotencyStoreDB(db_session_factory)
    key = "idem-key-1"
    payload = {"vehicle_registration": "DL01AB1234"}

    # First request
    acquired = await store.acquire_or_get(key, payload)
    assert acquired is None

    result = VerificationResult(
        vehicle_registration="DL01AB1234",
        status=ComplianceStatus.VALID,
    )
    await store.set(key, payload, result)

    # Replay request
    replayed = await store.acquire_or_get(key, payload)
    assert replayed is not None
    assert replayed.id == result.id
    assert replayed.status == ComplianceStatus.VALID


@pytest.mark.asyncio
async def test_idempotency_payload_conflict(
    db_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    store = IdempotencyStoreDB(db_session_factory)
    key = "idem-key-2"
    payload1 = {"vehicle_registration": "DL01AB1234"}
    payload2 = {"vehicle_registration": "MH12DE5678"}

    await store.acquire_or_get(key, payload1)
    result = VerificationResult(
        vehicle_registration="DL01AB1234",
        status=ComplianceStatus.VALID,
    )
    await store.set(key, payload1, result)

    with pytest.raises(IdempotencyConflictError):
        await store.acquire_or_get(key, payload2)


@pytest.mark.asyncio
async def test_idempotency_survives_restart(
    db_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    store1 = IdempotencyStoreDB(db_session_factory)
    key = "idem-key-restart"
    payload = {"vehicle_registration": "DL01EXPIRED"}

    await store1.acquire_or_get(key, payload)
    result = VerificationResult(
        vehicle_registration="DL01EXPIRED",
        status=ComplianceStatus.EXPIRED,
    )
    await store1.set(key, payload, result)

    # Instantiate a new store instance pointing to same DB session factory
    store2 = IdempotencyStoreDB(db_session_factory)
    replayed = await store2.acquire_or_get(key, payload)
    assert replayed is not None
    assert replayed.status == ComplianceStatus.EXPIRED


@pytest.mark.asyncio
async def test_verification_all_statuses_persisted(
    db_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    repo = VerificationRepositoryDB(db_session_factory)
    statuses = [
        ComplianceStatus.VALID,
        ComplianceStatus.EXPIRING_SOON,
        ComplianceStatus.EXPIRED,
        ComplianceStatus.INVALID,
        ComplianceStatus.NOT_FOUND,
        ComplianceStatus.MANUAL_REVIEW,
        ComplianceStatus.PROVIDER_UNAVAILABLE,
    ]

    for status in statuses:
        v_id = uuid.uuid4()
        v = VerificationResult(
            id=v_id,
            vehicle_registration="DL01TEST",
            status=status,
            manual_review_required=(status in (ComplianceStatus.NOT_FOUND, ComplianceStatus.MANUAL_REVIEW, ComplianceStatus.PROVIDER_UNAVAILABLE)),
        )
        await repo.save_verification(v)

        retrieved = await repo.get_verification_by_id(v_id)
        assert retrieved is not None
        assert retrieved.status == status


@pytest.mark.asyncio
async def test_concurrent_idempotent_requests(
    db_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    store = IdempotencyStoreDB(db_session_factory)
    key = "idem-key-concurrent"
    payload = {"vehicle_registration": "DL01CONCURRENT"}

    # Simulate two tasks attempting acquire at once
    res1 = await store.acquire_or_get(key, payload)
    assert res1 is None

    result = VerificationResult(
        vehicle_registration="DL01CONCURRENT",
        status=ComplianceStatus.VALID,
    )
    await store.set(key, payload, result)

    # Second concurrent call obtains result
    res2 = await store.acquire_or_get(key, payload)
    assert res2 is not None
    assert res2.id == result.id
