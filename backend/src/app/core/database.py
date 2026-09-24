from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""


_async_engine: AsyncEngine | None = None
_async_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine(db_url: str | None = None) -> AsyncEngine:
    """Get or create the singleton SQLAlchemy async engine."""
    global _async_engine
    if _async_engine is None or db_url is not None:
        settings = get_settings()
        url = db_url or settings.database_url

        kwargs: dict[str, Any] = {}
        if url.startswith("sqlite"):
            from sqlalchemy.pool import StaticPool
            kwargs["connect_args"] = {"check_same_thread": False}
            if ":memory:" in url:
                kwargs["poolclass"] = StaticPool
        else:
            kwargs["pool_size"] = settings.db_pool_size
            kwargs["max_overflow"] = settings.db_max_overflow

        engine = create_async_engine(url, echo=False, **kwargs)
        if db_url is None:
            _async_engine = engine
        return engine

    return _async_engine


def get_session_factory(db_url: str | None = None) -> async_sessionmaker[AsyncSession]:
    """Get or create the async session factory."""
    global _async_session_factory
    if _async_session_factory is None or db_url is not None:
        engine = get_engine(db_url)
        factory = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
        if db_url is None:
            _async_session_factory = factory
        return factory

    return _async_session_factory


async def init_db(db_url: str | None = None) -> None:
    """Initialize database schema tables."""
    engine = get_engine(db_url)
    async with engine.begin() as conn:
        from app.adapters.db.models import Base as ModelsBase
        await conn.run_sync(ModelsBase.metadata.create_all)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an async database session."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
