from datetime import UTC, datetime, timedelta

from app.domain.exceptions import ProviderUnavailableError
from app.domain.models import ProviderRecord
from app.ports.compliance_provider import ComplianceProvider


class MockComplianceProvider(ComplianceProvider):
    """Synthetic provider used only for development and tests."""

    async def lookup(self, vehicle_registration: str) -> ProviderRecord | None:
        reg = vehicle_registration.upper().replace(" ", "").replace("-", "")

        if reg.endswith(("0000", "NOTFOUND")):
            return None

        if reg.endswith("TIMEOUT"):
            raise TimeoutError("Compliance provider connection timed out")

        if reg.endswith(("UNAVAILABLE", "ERROR")):
            raise ProviderUnavailableError("Compliance provider service unavailable")

        now = datetime.now(UTC)

        if reg.endswith("EXPIRED"):
            return ProviderRecord(
                vehicle_registration=vehicle_registration,
                compliance_id=f"CNG-{reg}",
                source_reference="mock://authorized-provider/sample",
                source_timestamp=now,
                issued_at=now - timedelta(days=400),
                expires_at=now - timedelta(days=35),
                is_valid=True,
            )

        if reg.endswith(("EXPIRING", "EXPIRINGSOON")):
            return ProviderRecord(
                vehicle_registration=vehicle_registration,
                compliance_id=f"CNG-{reg}",
                source_reference="mock://authorized-provider/sample",
                source_timestamp=now,
                issued_at=now - timedelta(days=340),
                expires_at=now + timedelta(days=15),
                is_valid=True,
            )

        if reg.endswith("INVALID"):
            return ProviderRecord(
                vehicle_registration=vehicle_registration,
                compliance_id=f"CNG-{reg}",
                source_reference="mock://authorized-provider/sample",
                source_timestamp=now,
                issued_at=now - timedelta(days=100),
                expires_at=now + timedelta(days=265),
                is_valid=False,
            )

        return ProviderRecord(
            vehicle_registration=vehicle_registration,
            compliance_id=f"CNG-{reg}",
            source_reference="mock://authorized-provider/sample",
            source_timestamp=now,
            issued_at=now - timedelta(days=90),
            expires_at=now + timedelta(days=275),
            is_valid=True,
        )
