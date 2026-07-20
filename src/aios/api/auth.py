"""Authentication and authorization hooks for AIOS API."""

from __future__ import annotations

from typing import Any

from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from aios.core.logger import get_logger

logger = get_logger("aios.api.auth")

security_scheme = HTTPBearer(auto_error=False)

_AUTH_ENABLED: bool = False
_TOKEN_VALIDATOR: Any = None


def configure_auth(enabled: bool = False, token_validator: Any = None) -> None:
    global _AUTH_ENABLED, _TOKEN_VALIDATOR
    _AUTH_ENABLED = enabled
    _TOKEN_VALIDATOR = token_validator
    logger.info("Auth configured: enabled=%s", enabled)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(security_scheme),
) -> dict[str, Any]:
    if not _AUTH_ENABLED:
        return {"principal": "anonymous", "authenticated": False}

    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    token = credentials.credentials

    if _TOKEN_VALIDATOR is not None:
        result = _TOKEN_VALIDATOR(token)
        if result is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return result

    return {"principal": "authenticated_user", "authenticated": True}


async def require_auth(
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if _AUTH_ENABLED and not user.get("authenticated", False):
        raise HTTPException(status_code=401, detail="Authentication required")
    return user
