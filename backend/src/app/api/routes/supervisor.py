import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.adapters.db.verification_repository_db import VerificationRepositoryDB
from app.adapters.mock_compliance_provider import MockComplianceProvider
from app.core.auth import AuthenticatedUser, RequireRole
from app.core.database import get_session_factory
from app.domain.models import VerificationResult
from app.ports.verification_repository import VerificationRepository
from app.services.verification_service import VerificationService

router = APIRouter(prefix="/supervisor", tags=["supervisor"])

_override_repo: VerificationRepository | None = None


def get_repo() -> VerificationRepository:
    if _override_repo is not None:
        return _override_repo
    return VerificationRepositoryDB(get_session_factory())


def set_repo(repo: VerificationRepository | None) -> None:
    global _override_repo
    _override_repo = repo


class SupervisorConfirmRequest(BaseModel):
    confirmed_registration: str = Field(..., min_length=4, max_length=20)
    actor: str = Field(default="supervisor_user")
    notes: str | None = None


@router.get("/queue", response_model=list[dict[str, Any]])
async def get_manual_review_queue(
    limit: int = Query(50, ge=1, le=200),
    current_user: AuthenticatedUser = Depends(RequireRole(["SUPERVISOR", "ADMIN", "AUDITOR"])),
) -> list[dict[str, Any]]:
    """Get all verifications currently requiring manual review by supervisors."""
    repo = get_repo()
    if hasattr(repo, "get_manual_review_queue"):
        return await repo.get_manual_review_queue(limit=limit)

    if isinstance(repo, VerificationRepositoryDB):
        async with repo._session_factory() as session:
            from sqlalchemy import select

            from app.adapters.db.models import VerificationRecordORM

            stmt = (
                select(VerificationRecordORM)
                .where(VerificationRecordORM.manual_review_required == True)
                .order_by(VerificationRecordORM.created_at.desc())
                .limit(limit)
            )
            res = await session.execute(stmt)
            orms = res.scalars().all()
            return [
                {
                    "id": str(orm.id),
                    "vehicle_registration": orm.vehicle_registration,
                    "ocr_confidence": orm.ocr_confidence,
                    "status": orm.status,
                    "manual_review_required": orm.manual_review_required,
                    "created_at": orm.created_at.isoformat(),
                    "rule_version": orm.rule_version,
                }
                for orm in orms
            ]
    return []


@router.get("/verifications/{verification_id}", response_model=dict[str, Any])
async def get_verification_detail(
    verification_id: str,
    current_user: AuthenticatedUser = Depends(RequireRole(["SUPERVISOR", "ADMIN", "AUDITOR"])),
) -> dict[str, Any]:
    """Get full details of a verification record including audit event trail."""
    repo = get_repo()
    try:
        val_id = uuid.UUID(verification_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid verification UUID format")

    if isinstance(repo, VerificationRepositoryDB):
        async with repo._session_factory() as session:
            from sqlalchemy import select
            from sqlalchemy.orm import selectinload

            from app.adapters.db.models import VerificationRecordORM

            stmt = (
                select(VerificationRecordORM)
                .options(selectinload(VerificationRecordORM.audit_events))
                .where(VerificationRecordORM.id == val_id)
            )
            res = await session.execute(stmt)
            orm = res.scalar_one_or_none()
            if orm is None:
                raise HTTPException(status_code=404, detail="Verification record not found")
            return {
                "id": str(orm.id),
                "vehicle_registration": orm.vehicle_registration,
                "ocr_confidence": orm.ocr_confidence,
                "status": orm.status,
                "compliance_id": orm.compliance_id,
                "expires_at": orm.expires_at.isoformat() if orm.expires_at else None,
                "source_reference": orm.source_reference,
                "rule_version": orm.rule_version,
                "manual_review_required": orm.manual_review_required,
                "created_at": orm.created_at.isoformat(),
                "updated_at": orm.updated_at.isoformat(),
                "audit_events": [
                    {
                        "id": str(ev.id),
                        "event_type": ev.event_type,
                        "actor": ev.actor,
                        "details": ev.details,
                        "created_at": ev.created_at.isoformat(),
                    }
                    for ev in orm.audit_events
                ],
            }

    result = await repo.get_verification_by_id(val_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Verification record not found")
    return result.model_dump()


@router.post("/verifications/{verification_id}/confirm", response_model=VerificationResult)
async def confirm_supervisor_review(
    verification_id: str,
    payload: SupervisorConfirmRequest,
    current_user: AuthenticatedUser = Depends(RequireRole(["SUPERVISOR", "ADMIN"])),
) -> VerificationResult:
    """Supervisor confirms or corrects plate registration and re-verifies against rule engine."""
    repo = get_repo()
    try:
        val_id = uuid.UUID(verification_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid verification UUID format")

    service = VerificationService(provider=MockComplianceProvider(), repository=repo)
    result = await service.verify(
        vehicle_registration=payload.confirmed_registration,
        ocr_confidence=1.0,
    )

    actor_identity = current_user.user_id if current_user else payload.actor
    await repo.log_audit_event(
        event_type="SUPERVISOR_MANUAL_REVIEW_RESOLVED",
        actor=actor_identity,
        verification_id=val_id,
        details={
            "confirmed_registration": payload.confirmed_registration,
            "notes": payload.notes,
            "resolved_status": result.status,
            "authenticated_actor": actor_identity,
            "actor_roles": current_user.roles if current_user else [],
        },
    )

    return result


@router.get("/metrics/summary", response_model=dict[str, Any])
async def get_metrics_summary(
    current_user: AuthenticatedUser = Depends(RequireRole(["SUPERVISOR", "ADMIN", "AUDITOR"])),
) -> dict[str, Any]:
    """Summary of station metrics, review queues, and system health for supervisor dashboard."""
    repo = get_repo()
    manual_review_count = 0
    total_verifications = 0
    if isinstance(repo, VerificationRepositoryDB):
        async with repo._session_factory() as session:
            from sqlalchemy import func, select

            from app.adapters.db.models import VerificationRecordORM

            stmt_count = select(func.count(VerificationRecordORM.id))
            res_count = await session.execute(stmt_count)
            total_verifications = res_count.scalar() or 0

            stmt_mr = select(func.count(VerificationRecordORM.id)).where(
                VerificationRecordORM.manual_review_required == True
            )
            res_mr = await session.execute(stmt_mr)
            manual_review_count = res_mr.scalar() or 0

    return {
        "status": "operational",
        "total_verifications": total_verifications,
        "manual_review_pending": manual_review_count,
        "active_stations": 1,
        "auth_user": current_user.user_id,
        "auth_roles": current_user.roles,
    }

