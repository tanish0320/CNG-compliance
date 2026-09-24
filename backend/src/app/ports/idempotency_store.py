from abc import ABC, abstractmethod
from typing import Any

from app.domain.models import VerificationResult


class IdempotencyStore(ABC):
    """Port interface for storing and retrieving idempotency records."""

    @abstractmethod
    async def get(self, key: str) -> tuple[dict[str, Any], VerificationResult] | None:
        """Retrieve stored request payload and response result for an idempotency key."""
        raise NotImplementedError

    @abstractmethod
    async def set(self, key: str, payload: dict[str, Any], result: VerificationResult) -> None:
        """Store request payload and response result for an idempotency key."""
        raise NotImplementedError

    @abstractmethod
    async def clear(self) -> None:
        """Clear all stored idempotency keys (useful for testing)."""
        raise NotImplementedError


class InMemoryIdempotencyStore(IdempotencyStore):
    """In-memory idempotency key store for Phase 1 backend foundation."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[dict[str, Any], VerificationResult]] = {}

    async def get(self, key: str) -> tuple[dict[str, Any], VerificationResult] | None:
        return self._store.get(key)

    async def set(self, key: str, payload: dict[str, Any], result: VerificationResult) -> None:
        self._store[key] = (payload, result)

    async def clear(self) -> None:
        self._store.clear()
