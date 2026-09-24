from abc import ABC, abstractmethod

from app.domain.models import ProviderRecord


class ComplianceProvider(ABC):
    """Port for an authorized CNG compliance data provider."""

    @abstractmethod
    async def lookup(self, vehicle_registration: str) -> ProviderRecord | None:
        """Return the normalized provider record, or None when not found."""
        raise NotImplementedError
