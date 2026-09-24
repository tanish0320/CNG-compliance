import pytest
from httpx import ASGITransport, AsyncClient
from test_auth import create_test_token

from app.adapters.db.verification_repository_db import VerificationRepositoryDB
from app.api.routes.supervisor import set_repo
from app.core.database import get_session_factory
from app.main import app


@pytest.mark.asyncio
async def test_supervisor_queue_and_detail_endpoints() -> None:
    set_repo(VerificationRepositoryDB(get_session_factory()))
    op_headers = {"Authorization": f"Bearer {create_test_token(user_id='op_1', roles=['PUMP_OPERATOR'])}", "Idempotency-Key": "sup-key-001"}
    sup_headers = {"Authorization": f"Bearer {create_test_token(user_id='sup_1', roles=['SUPERVISOR'])}"}

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # 1. Create a low-confidence verification to force manual review
        v_res = await client.post(
            "/api/v1/verifications",
            headers=op_headers,
            json={"vehicle_registration": "DL01AB9999", "ocr_confidence": 0.40},
        )
        assert v_res.status_code == 200
        val_id = v_res.json()["id"]

        # 2. Check supervisor manual review queue
        q_res = await client.get("/api/v1/supervisor/queue", headers=sup_headers)
        assert q_res.status_code == 200
        queue_items = q_res.json()
        assert any(item["id"] == val_id for item in queue_items)

        # 3. Check supervisor verification detail view
        d_res = await client.get(f"/api/v1/supervisor/verifications/{val_id}", headers=sup_headers)
        assert d_res.status_code == 200
        detail = d_res.json()
        assert detail["vehicle_registration"] == "DL01AB9999"
        assert detail["manual_review_required"] is True

        # 4. Supervisor confirms/resolves manual review case
        c_res = await client.post(
            f"/api/v1/supervisor/verifications/{val_id}/confirm",
            headers=sup_headers,
            json={"confirmed_registration": "DL01AB9999", "actor": "supervisor_test_user"},
        )
        assert c_res.status_code == 200
        conf_result = c_res.json()
        assert conf_result["status"] in ["VALID", "EXPIRED", "EXPIRING_SOON", "INVALID"]

        # 5. Check metrics summary endpoint
        m_res = await client.get("/api/v1/supervisor/metrics/summary", headers=sup_headers)
        assert m_res.status_code == 200
        summary = m_res.json()
        assert summary["status"] == "operational"
