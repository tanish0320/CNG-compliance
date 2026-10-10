import os
import sqlite3
from datetime import UTC, datetime, timedelta

from app.domain.exceptions import ProviderUnavailableError
from app.domain.models import ProviderRecord, VehicleDetails
from app.ports.compliance_provider import ComplianceProvider


def _levenshtein(s1: str, s2: str) -> int:
    """Compute Levenshtein edit distance between two strings."""
    if len(s1) < len(s2):
        return _levenshtein(s2, s1)
    if len(s2) == 0:
        return len(s1)
    previous_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]


class MockComplianceProvider(ComplianceProvider):
    """
    Compliance provider that first queries the authoritative local SQLite
    government CNG registry (Vahan / PESO records) with fuzzy tolerance,
    falling back to synthetic rules for development and automated testing.
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

            # 1. Exact match
            cur.execute(
                "SELECT * FROM government_cng_registry WHERE registration_no = ?",
                (normalized_reg,),
            )
            row = cur.fetchone()
            is_fuzzy = False

            # 2. Stripped match
            if not row:
                cur.execute(
                    "SELECT * FROM government_cng_registry WHERE REPLACE(REPLACE(registration_no, ' ', ''), '-', '') = ?",
                    (normalized_reg,),
                )
                row = cur.fetchone()

            # 3. Fuzzy Levenshtein match across database (tolerates 1-2 character OCR misreads)
            if not row and len(normalized_reg) >= 5:
                cur.execute("SELECT * FROM government_cng_registry")
                all_rows = cur.fetchall()
                best_row = None
                min_dist = 999
                # Maximum allowed distance: 2 characters (or 3 for plates of length >= 10)
                max_allowed = 3 if len(normalized_reg) >= 10 else 2

                for candidate in all_rows:
                    cand_clean = candidate["registration_no"].upper().replace(" ", "").replace("-", "")
                    # Match state prefix or last 4 digits preference
                    dist = _levenshtein(normalized_reg, cand_clean)
                    if dist < min_dist:
                        min_dist = dist
                        best_row = candidate

                if best_row is not None and min_dist <= max_allowed:
                    row = best_row
                    is_fuzzy = True

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

            details = VehicleDetails(
                registration_no=row["registration_no"],
                formatted_registration=row["formatted_registration"],
                state_code=row["state_code"],
                rto_name=row["rto_name"],
                vehicle_class=row["vehicle_class"],
                maker_model=row["maker_model"],
                fuel_type=row["fuel_type"],
                chassis_no=row["chassis_no"],
                engine_no=row["engine_no"],
                fitment_type=row["fitment_type"],
                kit_serial_no=row["kit_serial_no"],
                kit_manufacturer=row["kit_manufacturer"],
                cylinder_serial_no=row["cylinder_serial_no"],
                cylinder_water_capacity_liters=row["cylinder_water_capacity_liters"],
                last_hydro_test_date=row["last_hydro_test_date"],
                next_hydro_test_due=row["next_hydro_test_due"],
                compliance_plate_no=row["compliance_plate_no"],
                testing_agency=row["testing_agency"],
                compliance_status=row["compliance_status"],
                compliance_reason=row["compliance_reason"],
                fueling_permission=row["fueling_permission"],
                matched_via_fuzzy=is_fuzzy,
            )

            return ProviderRecord(
                vehicle_registration=row["registration_no"],
                compliance_id=row["compliance_plate_no"] or f"CNG-{row['registration_no']}",
                source_reference=f"vahan-peso://government-registry/{row['state_code']}/{row['registration_no']}",
                source_timestamp=now,
                issued_at=issued_at,
                expires_at=expires_at,
                is_valid=is_valid,
                vehicle_details=details,
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
