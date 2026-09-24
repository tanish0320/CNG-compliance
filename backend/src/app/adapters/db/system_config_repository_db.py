import uuid
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.adapters.db.models import AuditEventORM, SystemConfigORM
from app.core.metrics import CONFIG_CHANGES_TOTAL

logger = structlog.get_logger(__name__)


class SystemConfigRepositoryDB:
    """DB-backed storage and dynamic updating for system configuration parameters."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def get_config(self, key: str) -> dict[str, Any] | None:
        """Fetch a configuration entry by key."""
        async with self._session_factory() as session:
            stmt = select(SystemConfigORM).where(SystemConfigORM.key == key)
            result = await session.execute(stmt)
            orm = result.scalar_one_or_none()
            if orm is None:
                return None
            return {
                "id": str(orm.id),
                "key": orm.key,
                "value": orm.value,
                "description": orm.description,
                "version": orm.version,
                "updated_by": orm.updated_by,
                "created_at": orm.created_at.isoformat(),
                "updated_at": orm.updated_at.isoformat(),
            }

    async def get_all_configs(self) -> list[dict[str, Any]]:
        """Fetch all system configurations."""
        async with self._session_factory() as session:
            stmt = select(SystemConfigORM).order_by(SystemConfigORM.key)
            result = await session.execute(stmt)
            orms = result.scalars().all()
            return [
                {
                    "id": str(orm.id),
                    "key": orm.key,
                    "value": orm.value,
                    "description": orm.description,
                    "version": orm.version,
                    "updated_by": orm.updated_by,
                    "created_at": orm.created_at.isoformat(),
                    "updated_at": orm.updated_at.isoformat(),
                }
                for orm in orms
            ]

    async def set_config(
        self,
        key: str,
        value: dict[str, Any],
        updated_by: str = "supervisor_admin",
        description: str | None = None,
    ) -> dict[str, Any]:
        """Create or update a system configuration entry, incrementing version and audit logging."""
        async with self._session_factory() as session:
            async with session.begin():
                stmt = select(SystemConfigORM).where(SystemConfigORM.key == key).with_for_update()
                result = await session.execute(stmt)
                orm = result.scalar_one_or_none()

                if orm is None:
                    orm = SystemConfigORM(
                        id=uuid.uuid4(),
                        key=key,
                        value=value,
                        description=description,
                        version=1,
                        updated_by=updated_by,
                    )
                    session.add(orm)
                else:
                    orm.value = value
                    if description is not None:
                        orm.description = description
                    orm.version += 1
                    orm.updated_by = updated_by

                # Log audit event for config change
                audit = AuditEventORM(
                    id=uuid.uuid4(),
                    event_type="CONFIG_UPDATED",
                    actor=updated_by,
                    details={
                        "config_key": key,
                        "new_version": orm.version,
                        "new_value": value,
                    },
                )
                session.add(audit)

            CONFIG_CHANGES_TOTAL.inc()
            logger.info("system_config_updated", key=key, version=orm.version, actor=updated_by)

            return {
                "id": str(orm.id),
                "key": orm.key,
                "value": orm.value,
                "description": orm.description,
                "version": orm.version,
                "updated_by": orm.updated_by,
                "created_at": orm.created_at.isoformat(),
                "updated_at": orm.updated_at.isoformat(),
            }
