"""Tool API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from aios.api.auth import get_current_user
from aios.api.dependencies import get_stack
from aios.api.pydantic_schemas import (
    ErrorDetail,
    ToolExecuteRequest,
    ToolExecuteResponse,
    ToolStatisticsResponse,
)
from aios.api.stack import EOSStack

router = APIRouter(prefix="/tools", tags=["tools"])


def _error(status: int, detail: str) -> HTTPException:
    return HTTPException(status_code=status, detail=detail)


@router.post(
    "/execute",
    response_model=ToolExecuteResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def execute_tool(
    req: ToolExecuteRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> ToolExecuteResponse:
    if stack.tool_manager is None:
        raise _error(503, "Tool manager not available")

    try:
        import time

        from aios.tools.models import ToolRequest
        tool_req = ToolRequest(
            tool_name=req.tool_name,
            arguments=req.parameters,
            timeout=req.timeout_seconds,
        )
        start = time.time()
        result = stack.tool_manager.execute(tool_req)
        duration = time.time() - start
        return ToolExecuteResponse(
            tool_name=req.tool_name,
            success=result.success,
            result=result.output if hasattr(result, "output") else result.result,
            error=result.error if hasattr(result, "error") else "",
            duration_seconds=duration,
        )
    except Exception as e:
        raise _error(500, f"Tool execution failed: {e}")


@router.get("/providers")
async def list_providers(
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.tool_manager is None:
        raise _error(503, "Tool manager not available")

    try:
        providers = stack.tool_manager.list_providers()
        return {"providers": providers, "total": len(providers)}
    except Exception as e:
        raise _error(500, f"Failed to list providers: {e}")


@router.delete("/{name}")
async def unregister_tool(
    name: str,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.tool_manager is None:
        raise _error(503, "Tool manager not available")

    try:
        removed = stack.tool_manager.unregister_provider(name)
        if not removed:
            raise _error(404, f"Tool not found: {name}")
        return {"name": name, "status": "unregistered"}
    except HTTPException:
        raise
    except Exception as e:
        raise _error(500, f"Failed to unregister tool: {e}")


@router.get("/statistics", response_model=ToolStatisticsResponse)
async def tool_statistics(
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> ToolStatisticsResponse:
    if stack.tool_manager is None:
        raise _error(503, "Tool manager not available")

    try:
        stats = stack.tool_manager.statistics()
        providers = stack.tool_manager.list_providers()
        return ToolStatisticsResponse(
            total_tools=len(stack.tool_manager.list_tools()),
            total_executions=stats.total_executions if hasattr(stats, "total_executions") else 0,
            successful_executions=stats.successful_executions if hasattr(stats, "successful_executions") else 0,
            failed_executions=stats.failed_executions if hasattr(stats, "failed_executions") else 0,
            providers=providers,
        )
    except Exception as e:
        raise _error(500, f"Failed to get statistics: {e}")
