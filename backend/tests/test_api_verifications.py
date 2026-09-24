import asyncio
import uuid

from fastapi.testclient import TestClient

from app.api.routes.verification import set_idempotency_store, set_verification_repository
from app.core.database import init_db
from app.main import app
from app.ports.idempotency_store import InMemoryIdempotencyStore


def setup_function() -> None:
    """Clear idempotency store and ensure database tables exist before each test."""
    from app.core.config import get_settings
    settings = get_settings()
    settings.enable_dev_auth = True

    asyncio.run(init_db())
    store = InMemoryIdempotencyStore()
    set_idempotency_store(store)
    set_verification_repository(None)


def test_api_valid_verification() -> None:
    key = str(uuid.uuid4())
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/verifications",
            json={"vehicle_registration": "DL 01 AB 1234"},
            headers={"Idempotency-Key": key},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "VALID"
        assert data["vehicle_registration"] == "DL01AB1234"
        assert "id" in data


def test_api_missing_idempotency_key() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/verifications",
            json={"vehicle_registration": "DL 01 AB 1234"},
        )
        assert response.status_code in (400, 422)


def test_api_empty_idempotency_key() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/verifications",
            json={"vehicle_registration": "DL 01 AB 1234"},
            headers={"Idempotency-Key": "   "},
        )
        assert response.status_code == 400


def test_api_duplicate_idempotency_key_replay() -> None:
    key = str(uuid.uuid4())
    payload = {"vehicle_registration": "DL 01 AB 1234"}

    with TestClient(app) as client:
        resp1 = client.post("/api/v1/verifications", json=payload, headers={"Idempotency-Key": key})
        assert resp1.status_code == 200
        res1_data = resp1.json()

        resp2 = client.post("/api/v1/verifications", json=payload, headers={"Idempotency-Key": key})
        assert resp2.status_code == 200
        res2_data = resp2.json()

        # Replayed response must be identical, including verification ID
        assert res1_data["id"] == res2_data["id"]
        assert res1_data["status"] == res2_data["status"]


def test_api_idempotency_conflict() -> None:
    key = str(uuid.uuid4())
    payload1 = {"vehicle_registration": "DL 01 AB 1234"}
    payload2 = {"vehicle_registration": "MH 12 DE 5678"}

    with TestClient(app) as client:
        resp1 = client.post("/api/v1/verifications", json=payload1, headers={"Idempotency-Key": key})
        assert resp1.status_code == 200

        resp2 = client.post("/api/v1/verifications", json=payload2, headers={"Idempotency-Key": key})
        assert resp2.status_code == 409
        assert "reused with different request payload" in resp2.json()["detail"]


def test_api_low_ocr_confidence() -> None:
    key = str(uuid.uuid4())
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/verifications",
            json={"vehicle_registration": "DL 01 AB 1234", "ocr_confidence": 0.5},
            headers={"Idempotency-Key": key},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "MANUAL_REVIEW"
        assert data["manual_review_required"] is True


def test_api_malformed_registration() -> None:
    key = str(uuid.uuid4())
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/verifications",
            json={"vehicle_registration": "BAD!@#$"},
            headers={"Idempotency-Key": key},
        )
        assert response.status_code == 400
        assert "Invalid vehicle registration format" in response.json()["detail"]
