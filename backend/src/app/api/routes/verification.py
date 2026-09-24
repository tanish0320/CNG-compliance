from fastapi import APIRouter, Depends, Header, HTTPException

from app.adapters.db.idempotency_store_db import IdempotencyStoreDB
from app.adapters.db.verification_repository_db import VerificationRepositoryDB
from app.adapters.mock_compliance_provider import MockComplianceProvider
from app.core.auth import AuthenticatedUser, get_current_user
from app.core.database import get_session_factory
from app.domain.exceptions import IdempotencyConflictError
from app.domain.models import (
    ManualReviewConfirmationRequest,
    VerificationRequest,
    VerificationResult,
)
from app.ports.idempotency_store import IdempotencyStore
from app.ports.verification_repository import VerificationRepository
from app.services.verification_service import VerificationService

router = APIRouter(prefix="/verifications", tags=["verifications"])

_override_idempotency_store: IdempotencyStore | None = None
_override_verification_repository: VerificationRepository | None = None


def get_idempotency_store() -> IdempotencyStore:
    if _override_idempotency_store is not None:
        return _override_idempotency_store
    return IdempotencyStoreDB(get_session_factory())


def get_verification_repository() -> VerificationRepository:
    if _override_verification_repository is not None:
        return _override_verification_repository
    return VerificationRepositoryDB(get_session_factory())


def set_idempotency_store(store: IdempotencyStore | None) -> None:
    global _override_idempotency_store
    _override_idempotency_store = store


def set_verification_repository(repo: VerificationRepository | None) -> None:
    global _override_verification_repository
    _override_verification_repository = repo


@router.post("", response_model=VerificationResult)
async def create_verification(
    payload: VerificationRequest,
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> VerificationResult:
    """Run a compliance verification with mandatory persistent Idempotency-Key processing."""
    if not idempotency_key or not idempotency_key.strip():
        raise HTTPException(status_code=400, detail="Idempotency-Key header cannot be empty")

    store = get_idempotency_store()
    payload_dict = payload.model_dump()

    if hasattr(store, "acquire_or_get"):
        cached = await store.acquire_or_get(idempotency_key, payload_dict)
        if cached is not None:
            return cached
    else:
        cached = await store.get(idempotency_key)
        if cached is not None:
            cached_payload, cached_result = cached
            if cached_payload == payload_dict:
                return cached_result
            raise IdempotencyConflictError(
                "Idempotency-Key reused with different request payload"
            )

    repository = get_verification_repository()
    service = VerificationService(
        provider=MockComplianceProvider(),
        repository=repository,
    )

    result = await service.verify(
        vehicle_registration=payload.vehicle_registration,
        ocr_confidence=payload.ocr_confidence,
        idempotency_key=idempotency_key,
    )

    await store.set(idempotency_key, payload_dict, result)
    return result


@router.post("/confirm-manual-review", response_model=VerificationResult)
async def confirm_manual_review(
    payload: ManualReviewConfirmationRequest,
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> VerificationResult:
    """Submit human-confirmed/corrected registration and proceed to compliance check."""
    if not idempotency_key or not idempotency_key.strip():
        raise HTTPException(status_code=400, detail="Idempotency-Key header cannot be empty")

    store = get_idempotency_store()
    payload_dict = payload.model_dump()

    if hasattr(store, "acquire_or_get"):
        cached = await store.acquire_or_get(idempotency_key, payload_dict)
        if cached is not None:
            return cached
    else:
        cached = await store.get(idempotency_key)
        if cached is not None:
            cached_payload, cached_result = cached
            if cached_payload == payload_dict:
                return cached_result
            raise IdempotencyConflictError(
                "Idempotency-Key reused with different request payload"
            )

    repository = get_verification_repository()
    service = VerificationService(
        provider=MockComplianceProvider(),
        repository=repository,
    )

    result = await service.verify(
        vehicle_registration=payload.confirmed_registration,
        ocr_confidence=None,
        idempotency_key=idempotency_key,
    )

    if repository is not None:
        # Derive audit actor directly from authenticated user identity
        actor_identity = current_user.user_id if current_user else payload.actor
        await repository.log_audit_event(
            event_type="MANUAL_REVIEW_CONFIRMED",
            actor=actor_identity,
            verification_id=result.id,
            details={
                "original_raw_text": payload.original_raw_text,
                "original_confidence": payload.original_confidence,
                "confirmed_registration": payload.confirmed_registration,
                "authenticated_actor": actor_identity,
                "actor_roles": current_user.roles if current_user else [],
            },
        )

    await store.set(idempotency_key, payload_dict, result)
    return result

