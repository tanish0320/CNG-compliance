from datetime import UTC, datetime, timedelta

import jwt
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import get_settings
from app.main import app


def create_test_token(
    user_id: str = "user_123",
    roles: list[str] | None = None,
    issuer: str | None = None,
    audience: str | None = None,
    expires_in_seconds: int = 3600,
    secret_key: str | None = None,
) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "roles": roles or ["PUMP_OPERATOR"],
        "iss": issuer or settings.oidc_issuer,
        "aud": audience or settings.oidc_audience,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_in_seconds)).timestamp()),
    }
    key = secret_key or settings.jwt_secret_key
    return jwt.encode(payload, key, algorithm=settings.jwt_algorithm)


@pytest.mark.asyncio
async def test_auth_valid_token_succeeds() -> None:
    token = create_test_token(user_id="operator_01", roles=["PUMP_OPERATOR"])
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post(
            "/api/v1/verifications",
            headers={
                "Authorization": f"Bearer {token}",
                "Idempotency-Key": "auth-key-001",
            },
            json={"vehicle_registration": "DL01AB1111", "ocr_confidence": 0.95},
        )
        assert res.status_code == 200
        assert res.json()["vehicle_registration"] == "DL01AB1111"


@pytest.mark.asyncio
async def test_auth_expired_token_fails() -> None:
    token = create_test_token(user_id="operator_01", expires_in_seconds=-60)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post(
            "/api/v1/verifications",
            headers={
                "Authorization": f"Bearer {token}",
                "Idempotency-Key": "auth-key-002",
            },
            json={"vehicle_registration": "DL01AB1111"},
        )
        assert res.status_code == 401
        assert "expired" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_auth_invalid_signature_fails() -> None:
    token = create_test_token(secret_key="wrong-bogus-secret-key-1234567")
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post(
            "/api/v1/verifications",
            headers={
                "Authorization": f"Bearer {token}",
                "Idempotency-Key": "auth-key-003",
            },
            json={"vehicle_registration": "DL01AB1111"},
        )
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_auth_wrong_issuer_fails() -> None:
    token = create_test_token(issuer="https://untrusted-fake-issuer.com")
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post(
            "/api/v1/verifications",
            headers={
                "Authorization": f"Bearer {token}",
                "Idempotency-Key": "auth-key-004",
            },
            json={"vehicle_registration": "DL01AB1111"},
        )
        assert res.status_code == 401
        assert "issuer" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_auth_wrong_audience_fails() -> None:
    token = create_test_token(audience="wrong-app-client")
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post(
            "/api/v1/verifications",
            headers={
                "Authorization": f"Bearer {token}",
                "Idempotency-Key": "auth-key-005",
            },
            json={"vehicle_registration": "DL01AB1111"},
        )
        assert res.status_code == 401
        assert "audience" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_auth_missing_token_returns_401_in_prod_mode() -> None:
    settings = get_settings()
    # Ensure dev auth mode is disabled
    old_dev = settings.enable_dev_auth
    settings.enable_dev_auth = False
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            res = await client.post(
                "/api/v1/verifications",
                headers={"Idempotency-Key": "auth-key-006"},
                json={"vehicle_registration": "DL01AB1111"},
            )
            assert res.status_code == 401
    finally:
        settings.enable_dev_auth = old_dev


@pytest.mark.asyncio
async def test_rbac_operator_denied_supervisor_endpoint() -> None:
    token = create_test_token(user_id="op_1", roles=["PUMP_OPERATOR"])
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get(
            "/api/v1/supervisor/queue",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 403
        assert "lacks required role" in res.json()["detail"]


@pytest.mark.asyncio
async def test_rbac_auditor_read_only_allowed_and_write_denied() -> None:
    auditor_token = create_test_token(user_id="auditor_01", roles=["AUDITOR"])
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Read queue allowed
        q_res = await client.get(
            "/api/v1/supervisor/queue",
            headers={"Authorization": f"Bearer {auditor_token}"},
        )
        assert q_res.status_code == 200

        # Confirm manual review modification denied for Auditor!
        c_res = await client.post(
            "/api/v1/supervisor/verifications/00000000-0000-0000-0000-000000000001/confirm",
            headers={"Authorization": f"Bearer {auditor_token}"},
            json={"confirmed_registration": "DL01AB1234"},
        )
        assert c_res.status_code == 403


@pytest.mark.asyncio
async def test_supervisor_authorized_operation_succeeds() -> None:
    sup_token = create_test_token(user_id="supervisor_leader", roles=["SUPERVISOR"])
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get(
            "/api/v1/supervisor/queue",
            headers={"Authorization": f"Bearer {sup_token}"},
        )
        assert res.status_code == 200
