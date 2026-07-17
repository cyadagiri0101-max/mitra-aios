"""Config API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from aios.api.auth import get_current_user
from aios.api.dependencies import get_stack
from aios.api.pydantic_schemas import (
    ConfigDeleteRequest,
    ConfigExportResponse,
    ConfigGetResponse,
    ConfigSetRequest,
    ConfigStatisticsResponse,
    ErrorDetail,
)
from aios.api.stack import EOSStack

router = APIRouter(prefix="/config", tags=["config"])


def _error(status: int, detail: str) -> HTTPException:
    return HTTPException(status_code=status, detail=detail)


@router.post(
    "/set",
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def set_config(
    req: ConfigSetRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.config_manager is None:
        raise _error(503, "Config manager not available")

    try:
        stack.config_manager.set(req.key, req.value)
        return {"key": req.key, "status": "set"}
    except Exception as e:
        raise _error(500, f"Failed to set config: {e}")


@router.post(
    "/delete",
    responses={400: {"model": ErrorDetail}, 404: {"model": ErrorDetail}},
)
async def delete_config(
    req: ConfigDeleteRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.config_manager is None:
        raise _error(503, "Config manager not available")

    try:
        deleted = stack.config_manager.delete(req.key)
        if not deleted:
            raise _error(404, f"Config key not found: {req.key}")
        return {"key": req.key, "status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise _error(500, f"Failed to delete config: {e}")


@router.post("/validate")
async def validate_config(
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.config_manager is None:
        raise _error(503, "Config manager not available")

    try:
        result = stack.config_manager.validate()
        return {
            "is_valid": result.is_valid,
            "warnings": result.warnings,
            "errors": result.errors,
        }
    except Exception as e:
        raise _error(500, f"Validation failed: {e}")


@router.post("/reload")
async def reload_config(
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.config_manager is None:
        raise _error(503, "Config manager not available")

    try:
        stack.config_manager.reload()
        return {"status": "reloaded"}
    except Exception as e:
        raise _error(500, f"Reload failed: {e}")


@router.get("/export/{fmt}", response_model=ConfigExportResponse)
async def export_config(
    fmt: str,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> ConfigExportResponse:
    if stack.config_manager is None:
        raise _error(503, "Config manager not available")

    try:
        if fmt == "json":
            content = stack.config_manager.export_json()
        elif fmt == "yaml":
            content = stack.config_manager.export_yaml()
        elif fmt == "toml":
            content = stack.config_manager.export_toml()
        else:
            raise _error(400, f"Unsupported format: {fmt}")

        return ConfigExportResponse(format=fmt, content=content)
    except HTTPException:
        raise
    except Exception as e:
        raise _error(500, f"Export failed: {e}")


@router.get("/statistics", response_model=ConfigStatisticsResponse)
async def config_statistics(
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> ConfigStatisticsResponse:
    if stack.config_manager is None:
        raise _error(503, "Config manager not available")

    try:
        stats = stack.config_manager.statistics()
        return ConfigStatisticsResponse(
            total_keys=stats.total_keys if hasattr(stats, "total_keys") else 0,
            sources_loaded=stats.sources_loaded if hasattr(stats, "sources_loaded") else 0,
            validation_errors=stats.validation_errors if hasattr(stats, "validation_errors") else 0,
        )
    except Exception as e:
        raise _error(500, f"Failed to get statistics: {e}")


@router.get("/{key:path}", response_model=ConfigGetResponse)
async def get_config(
    key: str,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> ConfigGetResponse:
    if stack.config_manager is None:
        raise _error(503, "Config manager not available")

    try:
        value = stack.config_manager.get(key)
        return ConfigGetResponse(
            key=key,
            value=value,
            exists=stack.config_manager.exists(key),
        )
    except Exception as e:
        raise _error(500, f"Failed to get config: {e}")
