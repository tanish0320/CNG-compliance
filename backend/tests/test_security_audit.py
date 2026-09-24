import pytest
from httpx import ASGITransport, AsyncClient
from test_auth import create_test_token

from app.main import app


@pytest.mark.asyncio
async def test_security_operator_role_escalation_prevented() -> None:
    operator_token = create_test_token(user_id="operator_malicious", roles=["PUMP_OPERATOR"])
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Operator attempts to access supervisor manual review queue
        res_queue = await client.get(
            "/api/v1/supervisor/queue",
            headers={"Authorization": f"Bearer {operator_token}"},
        )
        assert res_queue.status_code == 403
        assert "lacks required role" in res_queue.json()["detail"]

        # Operator attempts to modify dynamic system configuration
        res_config = await client.put(
            "/api/v1/config",
            headers={"Authorization": f"Bearer {operator_token}"},
            json={"key": "ocr_confidence_threshold", "value": {"threshold": 0.1}},
        )
        assert res_config.status_code == 403


@pytest.mark.asyncio
async def test_security_auditor_read_only_isolation() -> None:
    auditor_token = create_test_token(user_id="auditor_inspector", roles=["AUDITOR"])
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Auditor is permitted to view supervisor metrics summary
        res_summary = await client.get(
            "/api/v1/supervisor/metrics/summary",
            headers={"Authorization": f"Bearer {auditor_token}"},
        )
        assert res_summary.status_code == 200

        # Auditor is forbidden from executing case resolution write operation
        res_confirm = await client.post(
            "/api/v1/supervisor/verifications/00000000-0000-0000-0000-000000000001/confirm",
            headers={"Authorization": f"Bearer {auditor_token}"},
            json={"confirmed_registration": "DL01AB1234"},
        )
        assert res_confirm.status_code == 403


@pytest.mark.asyncio
async def test_security_tampered_token_rejected() -> None:
    valid_token = create_test_token(user_id="user_valid")
    tampered_token = valid_token[:-4] + "xxxx"
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post(
            "/api/v1/verifications",
            headers={
                "Authorization": f"Bearer {tampered_token}",
                "Idempotency-Key": "tamper-key-01",
            },
            json={"vehicle_registration": "DL01AB1234"},
        )
        assert res.status_code == 401
