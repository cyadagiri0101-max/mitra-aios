"""Plugin API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from aios.api.auth import get_current_user
from aios.api.dependencies import get_stack
from aios.api.pydantic_schemas import (
    ErrorDetail,
    PluginInfo,
    PluginInstallRequest,
    PluginInstallResponse,
    PluginStatisticsResponse,
)
from aios.api.stack import EOSStack

router = APIRouter(prefix="/plugins", tags=["plugins"])


def _error(status: int, detail: str) -> HTTPException:
    return HTTPException(status_code=status, detail=detail)


@router.post(
    "/install",
    response_model=PluginInstallResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def install_plugin(
    req: PluginInstallRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> PluginInstallResponse:
    if stack.plugin_manager is None:
        raise _error(503, "Plugin manager not available")

    try:
        from aios.plugins.models import PluginMetadata
        metadata = PluginMetadata(
            name=req.name,
            version=req.version,
            description=req.description,
            entry_point=req.entry_point,
            dependencies=req.dependencies,
        )
        success = stack.plugin_manager.install_plugin(metadata)
        if not success:
            raise _error(400, f"Failed to install plugin: {req.name}")
        return PluginInstallResponse(
            name=req.name,
            version=req.version,
            status="installed",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise _error(500, f"Failed to install plugin: {e}")


@router.post("/uninstall/{name}")
async def uninstall_plugin(
    name: str,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.plugin_manager is None:
        raise _error(503, "Plugin manager not available")

    try:
        success = stack.plugin_manager.uninstall_plugin(name)
        if not success:
            raise _error(404, f"Plugin not found: {name}")
        return {"name": name, "status": "uninstalled"}
    except HTTPException:
        raise
    except Exception as e:
        raise _error(500, f"Failed to uninstall plugin: {e}")


@router.post("/enable/{name}")
async def enable_plugin(
    name: str,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.plugin_manager is None:
        raise _error(503, "Plugin manager not available")

    try:
        success = stack.plugin_manager.enable_plugin(name)
        if not success:
            raise _error(404, f"Plugin not found: {name}")
        return {"name": name, "status": "enabled"}
    except HTTPException:
        raise
    except Exception as e:
        raise _error(500, f"Failed to enable plugin: {e}")


@router.post("/disable/{name}")
async def disable_plugin(
    name: str,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.plugin_manager is None:
        raise _error(503, "Plugin manager not available")

    try:
        success = stack.plugin_manager.disable_plugin(name)
        if not success:
            raise _error(404, f"Plugin not found: {name}")
        return {"name": name, "status": "disabled"}
    except HTTPException:
        raise
    except Exception as e:
        raise _error(500, f"Failed to disable plugin: {e}")


@router.get("/statistics", response_model=PluginStatisticsResponse)
async def plugin_statistics(
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> PluginStatisticsResponse:
    if stack.plugin_manager is None:
        raise _error(503, "Plugin manager not available")

    try:
        stats = stack.plugin_manager.get_statistics()
        return PluginStatisticsResponse(
            total_plugins=stats.total_plugins if hasattr(stats, "total_plugins") else 0,
            enabled_plugins=stats.enabled_plugins if hasattr(stats, "enabled_plugins") else 0,
            disabled_plugins=stats.disabled_plugins if hasattr(stats, "disabled_plugins") else 0,
        )
    except Exception as e:
        raise _error(500, f"Failed to get statistics: {e}")


@router.get("", response_model=list[PluginInfo])
async def list_plugins(
    status: str | None = None,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> list[PluginInfo]:
    if stack.plugin_manager is None:
        raise _error(503, "Plugin manager not available")

    try:
        names = stack.plugin_manager.list_plugins(status=status)
        plugins = []
        for name in names:
            info = stack.plugin_manager.get_plugin(name)
            if info:
                plugins.append(PluginInfo(
                    name=info.name,
                    version=info.version if hasattr(info, "version") else "",
                    description=info.description if hasattr(info, "description") else "",
                    status=info.status if hasattr(info, "status") else "unknown",
                    enabled=info.enabled if hasattr(info, "enabled") else False,
                ))
        return plugins
    except Exception as e:
        raise _error(500, f"Failed to list plugins: {e}")


@router.get("/{name}", response_model=PluginInfo)
async def get_plugin(
    name: str,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> PluginInfo:
    if stack.plugin_manager is None:
        raise _error(503, "Plugin manager not available")

    info = stack.plugin_manager.get_plugin(name)
    if info is None:
        raise _error(404, f"Plugin not found: {name}")

    return PluginInfo(
        name=info.name,
        version=info.version if hasattr(info, "version") else "",
        description=info.description if hasattr(info, "description") else "",
        status=info.status if hasattr(info, "status") else "unknown",
        enabled=info.enabled if hasattr(info, "enabled") else False,
    )
