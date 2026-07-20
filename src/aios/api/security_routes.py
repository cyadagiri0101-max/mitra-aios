"""Security API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from aios.api.auth import get_current_user
from aios.api.dependencies import get_stack
from aios.api.pydantic_schemas import (
    ErrorDetail,
    SecurityEncryptRequest,
    SecurityEncryptResponse,
    SecurityPermissionRequest,
    SecurityPermissionResponse,
    SecuritySecretRequest,
    SecuritySecretResponse,
    SecurityStatisticsResponse,
    SecurityTokenRequest,
    SecurityTokenResponse,
)
from aios.api.stack import EOSStack

router = APIRouter(prefix="/security", tags=["security"])


def _error(status: int, detail: str) -> HTTPException:
    return HTTPException(status_code=status, detail=detail)


@router.post(
    "/permissions/grant",
    response_model=SecurityPermissionResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def grant_permission(
    req: SecurityPermissionRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> SecurityPermissionResponse:
    if stack.security_manager is None:
        raise _error(503, "Security manager not available")

    try:
        stack.security_manager.grant_permission(
            principal=req.principal,
            resource=req.resource,
            level=req.level,
        )
        return SecurityPermissionResponse(
            principal=req.principal,
            resource=req.resource,
            level=req.level,
            granted=True,
        )
    except Exception:
        raise _error(500, "Failed to grant permission")


@router.post(
    "/permissions/check",
    response_model=SecurityPermissionResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def check_permission(
    req: SecurityPermissionRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> SecurityPermissionResponse:
    if stack.security_manager is None:
        raise _error(503, "Security manager not available")

    try:
        granted = stack.security_manager.check_permission(
            principal=req.principal,
            resource=req.resource,
            level=req.level,
        )
        return SecurityPermissionResponse(
            principal=req.principal,
            resource=req.resource,
            level=req.level,
            granted=granted,
        )
    except Exception:
        raise _error(500, "Failed to check permission")


@router.post(
    "/secrets/store",
    response_model=SecuritySecretResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def store_secret(
    req: SecuritySecretRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> SecuritySecretResponse:
    if stack.security_manager is None:
        raise _error(503, "Security manager not available")

    try:
        stack.security_manager.store_secret(
            name=req.name,
            value=req.value,
        )
        return SecuritySecretResponse(
            name=req.name,
            stored=True,
        )
    except Exception:
        raise _error(500, "Failed to store secret")


@router.get(
    "/secrets/{name}",
    response_model=SecuritySecretResponse,
    responses={404: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def retrieve_secret(
    name: str,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> SecuritySecretResponse:
    if stack.security_manager is None:
        raise _error(503, "Security manager not available")

    try:
        value = stack.security_manager.retrieve_secret(name)
        if value is None:
            raise _error(404, f"Secret not found: {name}")
        return SecuritySecretResponse(
            name=name,
            stored=True,
            retrieved_value=value,
        )
    except HTTPException:
        raise
    except Exception:
        raise _error(500, "Failed to retrieve secret")


@router.post(
    "/tokens/create",
    response_model=SecurityTokenResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def create_token(
    req: SecurityTokenRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> SecurityTokenResponse:
    if stack.security_manager is None:
        raise _error(503, "Security manager not available")

    try:
        token = stack.security_manager.create_token(
            principal=req.principal,
            token_type=req.token_type,
            expires_in=req.expires_in,
        )
        return SecurityTokenResponse(
            token=token.value if hasattr(token, "value") else str(token),
            token_type=req.token_type,
            expires_at=token.expires_at if hasattr(token, "expires_at") else 0.0,
            principal=req.principal,
        )
    except Exception:
        raise _error(500, "Failed to create token")


@router.post(
    "/tokens/validate",
    responses={400: {"model": ErrorDetail}, 401: {"model": ErrorDetail}},
)
async def validate_token(
    token: str,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.security_manager is None:
        raise _error(503, "Security manager not available")

    try:
        result = stack.security_manager.validate_token(token)
        if result is None:
            raise _error(401, "Invalid token")
        return {
            "valid": True,
            "principal": result.principal if hasattr(result, "principal") else "",
            "token_type": result.token_type if hasattr(result, "token_type") else "",
        }
    except HTTPException:
        raise
    except Exception:
        raise _error(500, "Failed to validate token")


@router.post(
    "/encrypt",
    response_model=SecurityEncryptResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def encrypt(
    req: SecurityEncryptRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> SecurityEncryptResponse:
    if stack.security_manager is None:
        raise _error(503, "Security manager not available")

    try:
        result = stack.security_manager.encrypt(req.data)
        return SecurityEncryptResponse(result=result, operation="encrypt")
    except Exception:
        raise _error(500, "Encryption failed")


@router.post(
    "/decrypt",
    response_model=SecurityEncryptResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def decrypt(
    req: SecurityEncryptRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> SecurityEncryptResponse:
    if stack.security_manager is None:
        raise _error(503, "Security manager not available")

    try:
        result = stack.security_manager.decrypt(req.data)
        return SecurityEncryptResponse(result=result, operation="decrypt")
    except Exception:
        raise _error(500, "Decryption failed")


@router.get("/statistics", response_model=SecurityStatisticsResponse)
async def security_statistics(
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> SecurityStatisticsResponse:
    if stack.security_manager is None:
        raise _error(503, "Security manager not available")

    try:
        stats = stack.security_manager.get_statistics()
        return SecurityStatisticsResponse(
            total_permissions=stats.total_permissions if hasattr(stats, "total_permissions") else 0,
            total_secrets=stats.total_secrets if hasattr(stats, "total_secrets") else 0,
            total_credentials=stats.total_credentials if hasattr(stats, "total_credentials") else 0,
            total_tokens=stats.total_tokens if hasattr(stats, "total_tokens") else 0,
        )
    except Exception:
        raise _error(500, "Failed to get statistics")
