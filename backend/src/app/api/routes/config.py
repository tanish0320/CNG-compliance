from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.adapters.db.system_config_repository_db import SystemConfigRepositoryDB
from app.core.auth import AuthenticatedUser, RequireRole
from app.core.database import get_session_factory

router = APIRouter(prefix="/config", tags=["config"])

_override_config_repo: SystemConfigRepositoryDB | None = None


def get_config_repo() -> SystemConfigRepositoryDB:
    if _override_config_repo is not None:
        return _override_config_repo
    return SystemConfigRepositoryDB(get_session_factory())


def set_config_repo(repo: SystemConfigRepositoryDB | None) -> None:
    global _override_config_repo
    _override_config_repo = repo


class ConfigUpdateRequest(BaseModel):
    key: str = Field(..., min_length=1, max_length=100)
    value: dict[str, Any]
    description: str | None = None
    actor: str = Field(default="supervisor_admin")


@router.get("", response_model=list[dict[str, Any]])
async def list_configs(
    current_user: AuthenticatedUser = Depends(RequireRole(["ADMIN", "SUPERVISOR"])),
) -> list[dict[str, Any]]:
    """Get all active dynamic system configurations."""
    repo = get_config_repo()
    return await repo.get_all_configs()


@router.get("/{key}", response_model=dict[str, Any])
async def get_config_by_key(
    key: str,
    current_user: AuthenticatedUser = Depends(RequireRole(["ADMIN", "SUPERVISOR"])),
) -> dict[str, Any]:
    """Get a single dynamic configuration entry by key."""
    repo = get_config_repo()
    config = await repo.get_config(key)
    if config is None:
        raise HTTPException(status_code=404, detail=f"Configuration '{key}' not found")
    return config


@router.put("", response_model=dict[str, Any])
async def update_config(
    payload: ConfigUpdateRequest,
    current_user: AuthenticatedUser = Depends(RequireRole(["ADMIN"])),
) -> dict[str, Any]:
    """Update or create a dynamic configuration entry, with audit logging."""
    if not payload.key.strip():
        raise HTTPException(status_code=400, detail="Key cannot be empty")
    repo = get_config_repo()
    updated_by = current_user.user_id if current_user else payload.actor
    return await repo.set_config(
        key=payload.key,
        value=payload.value,
        updated_by=updated_by,
        description=payload.description,
    )

