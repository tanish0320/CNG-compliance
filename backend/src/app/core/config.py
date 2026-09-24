from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration sourced from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "local"
    log_level: str = "INFO"
    compliance_provider: str = "mock"
    ocr_provider: str = "mock"
    compliance_api_base_url: str = ""
    compliance_api_key: str = ""
    ocr_confidence_threshold: float = 0.85
    database_url: str = "sqlite+aiosqlite:///:memory:"
    db_pool_size: int = 20
    db_max_overflow: int = 10

    # Enterprise OIDC & Auth Settings
    oidc_issuer: str = "https://auth.cng-compliance.enterprise.internal/auth/realms/cng"
    oidc_audience: str = "cng-compliance-api"
    oidc_jwks_uri: str = ""
    jwt_secret_key: str = "dev-secret-key-change-in-production-12345678"
    jwt_algorithm: str = "HS256"
    enable_dev_auth: bool = False  # Production default MUST be False!


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()
