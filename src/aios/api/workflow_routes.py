"""Workflow API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from aios.api.auth import get_current_user
from aios.api.dependencies import get_stack
from aios.api.pydantic_schemas import (
    ErrorDetail,
    WorkflowExecuteRequest,
    WorkflowExecuteResponse,
    WorkflowListResponse,
    WorkflowStatusResponse,
)
from aios.api.stack import EOSStack
from aios.eos.decision_engine import ExecutionPlan, ExecutionStrategy

router = APIRouter(prefix="/workflows", tags=["workflows"])


def _error(status: int, detail: str) -> HTTPException:
    return HTTPException(status_code=status, detail=detail)


@router.post(
    "/execute",
    response_model=WorkflowExecuteResponse,
    responses={400: {"model": ErrorDetail}, 500: {"model": ErrorDetail}},
)
async def execute_workflow(
    req: WorkflowExecuteRequest,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> WorkflowExecuteResponse:
    if stack.workflow_engine is None or stack.runtime_engine is None:
        raise _error(503, "Workflow engine not available")

    try:
        plan = ExecutionPlan(
            task_description=req.task_description,
            strategy=ExecutionStrategy(req.strategy),
            actions=[],
        )
        workflow = stack.workflow_engine.build(plan)
        execution_id = stack.runtime_engine.execute(workflow)
        return WorkflowExecuteResponse(
            execution_id=execution_id,
            status="queued",
            workflow_id=workflow.workflow_id if hasattr(workflow, "workflow_id") else "",
        )
    except Exception as e:
        raise _error(500, f"Workflow execution failed: {e}")


@router.get("/status/{execution_id}", response_model=WorkflowStatusResponse)
async def workflow_status(
    execution_id: str,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> WorkflowStatusResponse:
    if stack.runtime_engine is None:
        raise _error(503, "Runtime engine not available")

    try:
        state = stack.runtime_engine.status(execution_id)
        snap = stack.runtime_engine.snapshot(execution_id)
        return WorkflowStatusResponse(
            execution_id=execution_id,
            status=state.value,
            progress=snap.completed_count / snap.step_count if snap.step_count > 0 else 0.0,
            current_step="",
            completed_steps=snap.completed_count,
            total_steps=snap.step_count,
        )
    except Exception as e:
        raise _error(404, f"Workflow not found: {e}")


@router.post("/cancel/{execution_id}")
async def cancel_workflow(
    execution_id: str,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.runtime_engine is None:
        raise _error(503, "Runtime engine not available")

    try:
        stack.runtime_engine.cancel(execution_id)
        return {"execution_id": execution_id, "status": "cancelled"}
    except Exception as e:
        raise _error(400, f"Failed to cancel workflow: {e}")


@router.post("/pause/{execution_id}")
async def pause_workflow(
    execution_id: str,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.runtime_engine is None:
        raise _error(503, "Runtime engine not available")

    try:
        stack.runtime_engine.pause(execution_id)
        return {"execution_id": execution_id, "status": "paused"}
    except Exception as e:
        raise _error(400, f"Failed to pause workflow: {e}")


@router.post("/resume/{execution_id}")
async def resume_workflow(
    execution_id: str,
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.runtime_engine is None:
        raise _error(503, "Runtime engine not available")

    try:
        stack.runtime_engine.resume(execution_id)
        return {"execution_id": execution_id, "status": "resumed"}
    except Exception as e:
        raise _error(400, f"Failed to resume workflow: {e}")


@router.get("", response_model=WorkflowListResponse)
async def list_workflows(
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> WorkflowListResponse:
    if stack.runtime_engine is None:
        raise _error(503, "Runtime engine not available")

    try:
        stats = stack.runtime_engine.statistics()
        return WorkflowListResponse(
            workflows=[],
            total=stats.total_executions if hasattr(stats, "total_executions") else 0,
        )
    except Exception as e:
        raise _error(500, f"Failed to list workflows: {e}")


@router.get("/statistics")
async def workflow_statistics(
    stack: EOSStack = Depends(get_stack),
    _user: dict = Depends(get_current_user),
) -> dict:
    if stack.runtime_engine is None:
        raise _error(503, "Runtime engine not available")

    try:
        stats = stack.runtime_engine.statistics()
        return {
            "total_executions": stats.total_executions,
            "successful_executions": stats.successful_executions,
            "failed_executions": stats.failed_executions,
            "cancelled_executions": stats.cancelled_executions,
            "average_duration": stats.average_duration,
            "average_retries": stats.average_retries,
        }
    except Exception as e:
        raise _error(500, f"Failed to get statistics: {e}")
