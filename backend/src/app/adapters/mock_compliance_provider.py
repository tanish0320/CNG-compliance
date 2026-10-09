import os
import sqlite3
from datetime import UTC, datetime, timedelta

from app.domain.exceptions import ProviderUnavailableError
from app.domain.models import ProviderRecord
from app.ports.compliance_provider import ComplianceProvider


class MockComplianceProvider(ComplianceProvider):
    """
    Compliance provider that first queries the authoritative local SQLite
    government CNG registry (Vahan / PESO records), falling back to synthetic
    rules for development and automated testing.
    """

    def __init__(self, db_path: str | None = None) -> None:
        if db_path is not None:
            self._db_path = db_path
        else:
            candidates = [
                "/app/data/compliance.db",
                "backend/data/compliance.db",
                "data/compliance.db",
                "/data/Projects/CNG/backend/data/compliance.db",
            ]
            self._db_path = None
            for p in candidates:
                if os.path.exists(p):
                    self._db_path = p
                    break

    def _query_government_registry(self, normalized_reg: str) -> ProviderRecord | None:
        # Re-check db path dynamically if not set
        if not self._db_path or not os.path.exists(self._db_path):
            candidates = [
                "/app/data/compliance.db",
                "backend/data/compliance.db",
                "data/compliance.db",
                "/data/Projects/CNG/backend/data/compliance.db",
            ]
            for p in candidates:
                if os.path.exists(p):
                    self._db_path = p
                    break

        if not self._db_path or not os.path.exists(self._db_path):
            return None

        try:
            conn = sqlite3.connect(self._db_path)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM government_cng_registry WHERE registration_no = ?",
                (normalized_reg,),
            )
            row = cur.fetchone()
            conn.close()

            if not row:
                return None

            now = datetime.now(UTC)

            issued_at = None
            if row["last_hydro_test_date"]:
                try:
                    issued_at = datetime.fromisoformat(row["last_hydro_test_date"]).replace(tzinfo=UTC)
                except Exception:
                    pass

            expires_at = None
            if row["next_hydro_test_due"]:
                try:
                    expires_at = datetime.fromisoformat(row["next_hydro_test_due"]).replace(tzinfo=UTC)
                except Exception:
                    pass

            is_valid = (row["compliance_status"] == "COMPLIANT")

            return ProviderRecord(
                vehicle_registration=row["registration_no"],
                compliance_id=row["compliance_plate_no"] or f"CNG-{row['registration_no']}",
                source_reference=f"vahan-peso://government-registry/{row['state_code']}/{row['registration_no']}",
                source_timestamp=now,
                issued_at=issued_at,
                expires_at=expires_at,
                is_valid=is_valid,
            )
        except Exception:
            return None

    async def lookup(self, vehicle_registration: str) -> ProviderRecord | None:
        reg = vehicle_registration.upper().replace(" ", "").replace("-", "")

        # 1. First check authoritative government database
        gov_record = self._query_government_registry(reg)
        if gov_record is not None:
            return gov_record

        # 2. Synthetic test rules fallback
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
