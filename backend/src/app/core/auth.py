from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core.config import get_settings

security_scheme = HTTPBearer(auto_error=False)


class AuthenticatedUser(BaseModel):
    user_id: str
    roles: list[str]
    station_id: str | None = None
    email: str | None = None
    issuer: str
    audience: str

    def has_role(self, role: str) -> bool:
        return role in self.roles or "ADMIN" in self.roles

    def has_any_role(self, roles: list[str]) -> bool:
        if "ADMIN" in self.roles:
            return True
        return any(r in self.roles for r in roles)


def verify_jwt_token(token: str) -> dict[str, Any]:
    """Validate JWT signature, expiration, issuer, and audience against OIDC configuration."""
    settings = get_settings()

    # In production mode, validate token signature against issuer, audience, and secret/key
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            issuer=settings.oidc_issuer,
            audience=settings.oidc_audience,
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_iss": True,
                "verify_aud": True,
            },
            leeway=10,  # 10s clock-skew handling
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidIssuerError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token issuer",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {exc!s}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(security_scheme)],
) -> AuthenticatedUser:
    """Dependency extracting and validating authenticated user identity from Authorization header."""
    settings = get_settings()

    if credentials is not None and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
        payload = verify_jwt_token(token)

        roles = payload.get("roles", [])
        if isinstance(roles, str):
            roles = [roles]

        return AuthenticatedUser(
            user_id=payload.get("sub", "unknown_user"),
            roles=roles,
            station_id=payload.get("station_id"),
            email=payload.get("email"),
            issuer=payload.get("iss", settings.oidc_issuer),
            audience=payload.get("aud", settings.oidc_audience),
        )

    # Fallback to dev mode ONLY if explicitly enabled
    if settings.enable_dev_auth:
        return AuthenticatedUser(
            user_id="dev_operator_001",
            roles=["PUMP_OPERATOR", "SUPERVISOR", "ADMIN", "AUDITOR"],
            station_id="Station-Alpha-01",
            email="dev_operator@enterprise.internal",
            issuer=settings.oidc_issuer,
            audience=settings.oidc_audience,
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication credentials were not provided or invalid",
        headers={"WWW-Authenticate": "Bearer"},
    )


class RequireRole:
    """Server-side RBAC authorization dependency enforcing role access."""

    def __init__(self, allowed_roles: list[str]) -> None:
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if not current_user.has_any_role(self.allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: User lacks required role(s) {self.allowed_roles}",
            )
        return current_user
