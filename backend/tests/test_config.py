import pytest
from httpx import ASGITransport, AsyncClient
from test_auth import create_test_token

from app.adapters.db.system_config_repository_db import SystemConfigRepositoryDB
from app.api.routes.config import set_config_repo
from app.core.database import get_session_factory
from app.main import app


@pytest.mark.asyncio
async def test_dynamic_config_api_and_audit() -> None:
    set_config_repo(SystemConfigRepositoryDB(get_session_factory()))
    admin_headers = {"Authorization": f"Bearer {create_test_token(user_id='admin_user', roles=['ADMIN'])}"}

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # 1. Create/Update a dynamic configuration
        put_res = await client.put(
            "/api/v1/config",
            headers=admin_headers,
            json={
                "key": "ocr_confidence_threshold",
                "value": {"threshold": 0.85},
                "description": "Updated OCR threshold",
                "actor": "admin_test",
            },
        )
        assert put_res.status_code == 200
        config_data = put_res.json()
        assert config_data["key"] == "ocr_confidence_threshold"
        assert config_data["value"]["threshold"] == 0.85

        # 2. Get specific configuration by key
        get_res = await client.get("/api/v1/config/ocr_confidence_threshold", headers=admin_headers)
        assert get_res.status_code == 200
        fetched = get_res.json()
        assert fetched["value"]["threshold"] == 0.85

        # 3. List all configurations
        list_res = await client.get("/api/v1/config", headers=admin_headers)
        assert list_res.status_code == 200
        configs = list_res.json()
        assert any(c["key"] == "ocr_confidence_threshold" for c in configs)
