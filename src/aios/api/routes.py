"""FastAPI route handlers for the AIOS REST API."""

from __future__ import annotations

import time
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from aios.api.agent_routes import router as agent_router
from aios.api.chat_routes import router as chat_router
from aios.api.config_routes import router as config_router
from aios.api.dependencies import get_stack
from aios.api.embedding_routes import router as embedding_router
from aios.api.memory_routes import router as memory_router
from aios.api.plugin_routes import router as plugin_router
from aios.api.rag_routes import router as rag_router
from aios.api.schemas import (
    ContextBuildRequest,
    ContextBuildResponse,
    DiscoverRequest,
    DiscoverResponse,
    ErrorResponse,
    ExecuteAgentRequest,
    ExecuteAgentResponse,
    ExecuteRequest,
    ExecuteResponse,
    KnowledgeSearchRequest,
    KnowledgeSearchResponse,
    LoadRequest,
    LoadResponse,
    MetricResponse,
    PlanRequest,
    PlanResponse,
    PublishEventRequest,
    RegisterToolRequest,
    WorkflowBuildRequest,
    WorkflowBuildResponse,
)
from aios.api.security_routes import router as security_router
from aios.api.stack import EOSStack
from aios.api.tool_routes import router as tool_router
from aios.api.vectorstore_routes import router as vectorstore_router
from aios.api.workflow_routes import router as workflow_router
from aios.eos.decision_engine import ExecutionPlan, ExecutionStrategy
from aios.eos.runtime_engine import RuntimeEvent, RuntimeEventType
from aios.eos.workflow_engine import (
    ExecutionCost,
    ExecutionDuration,
    ExecutionMode,
    ExecutionState,
    Workflow,
    WorkflowStep,
)

router = APIRouter()

router.include_router(chat_router)
router.include_router(agent_router)
router.include_router(workflow_router)
router.include_router(memory_router)
router.include_router(rag_router)
router.include_router(tool_router)
router.include_router(plugin_router)
router.include_router(embedding_router)
router.include_router(vectorstore_router)
router.include_router(config_router)
router.include_router(security_router)


def _http_error(status: int, detail: str) -> HTTPException:
    return HTTPException(
        status_code=status,
        detail=ErrorResponse(detail=detail, status_code=status).__dict__,
    )


# ── Loader ──────────────────────────────────────────────────────


@router.post("/loader/load", response_model=LoadResponse)
async def load_eos(
    req: LoadRequest,
    stack: EOSStack = Depends(get_stack),
) -> LoadResponse:
    eos_path = Path(req.eos_path)
    if not eos_path.exists():
        raise _http_error(404, f"EOS path not found: {req.eos_path}")
    try:
        stack.loader.initialize(eos_path)
        result = stack.loader.load()
        return LoadResponse(
            success=result.success,
            metadata={
                "kernel_files": len(result.kernel_files),
                "registry_files": len(result.registry_files),
                "index_files": len(result.index_files),
            }
            if result.success else None,
            errors=result.errors,
        )
    except Exception as e:
        raise _http_error(500, str(e))


# ── Capability Discovery ────────────────────────────────────────


@router.post("/capabilities/discover", response_model=DiscoverResponse)
async def discover_capabilities(
    req: DiscoverRequest,
    stack: EOSStack = Depends(get_stack),
) -> DiscoverResponse:
    try:
        matches = stack.capability_discovery.discover(
            req.task_description,
            top_k=req.top_k,
        )
        return DiscoverResponse(
            capabilities=[
                {
                    "capability_id": m.capability.capability_id,
                    "name": m.capability.name,
                    "description": m.capability.description,
                    "score": m.score,
                    "action_id": m.capability.action_id,
                    "category": m.capability.category,
                }
                for m in matches
            ],
            total_found=len(matches),
        )
    except Exception as e:
        raise _http_error(500, str(e))


# ── Knowledge Service ───────────────────────────────────────────


@router.post("/knowledge/search", response_model=KnowledgeSearchResponse)
async def search_knowledge(
    req: KnowledgeSearchRequest,
    stack: EOSStack = Depends(get_stack),
) -> KnowledgeSearchResponse:
    try:
        matches = stack.knowledge_service.search(req.query, top_k=req.top_k)
        return KnowledgeSearchResponse(
            results=[
                {
                    "document_id": m.document.document_id,
                    "title": m.document.title,
                    "content": m.document.content[:500],
                    "score": m.score,
                    "source": m.document.source,
                }
                for m in matches
            ],
            total_found=len(matches),
        )
    except Exception as e:
        raise _http_error(500, str(e))


# ── Context Builder ─────────────────────────────────────────────


@router.post("/context/build", response_model=ContextBuildResponse)
async def build_context(
    req: ContextBuildRequest,
    stack: EOSStack = Depends(get_stack),
) -> ContextBuildResponse:
    try:
        context = stack.context_builder.build(
            req.task_description,
            max_tokens=req.max_tokens,
        )
        return ContextBuildResponse(
            context={
                "task_description": context.task_description,
                "items": [
                    {
                        "item_id": i.item_id,
                        "content": i.content,
                        "source": i.source,
                        "relevance_score": i.relevance_score,
                    }
                    for i in context.items
                ],
                "total_tokens": context.total_tokens,
                "item_count": context.item_count,
            },
            item_count=context.item_count,
        )
    except Exception as e:
        raise _http_error(500, str(e))


# ── Decision Engine ─────────────────────────────────────────────


@router.post("/plan/create", response_model=PlanResponse)
async def create_plan(
    req: PlanRequest,
    stack: EOSStack = Depends(get_stack),
) -> PlanResponse:
    try:
        strategy = ExecutionStrategy(req.strategy)
        plan: ExecutionPlan = stack.decision_engine.create_plan(
            req.task_description,
            strategy=strategy,
        )
        return PlanResponse(
            plan={
                "task_description": plan.task_description,
                "strategy": plan.strategy.value,
                "actions": [
                    {
                        "action_id": a.action_id,
                        "title": a.title,
                        "description": a.description,
                        "confidence": a.confidence,
                        "dependencies": list(a.dependencies),
                        "execution_mode": a.execution_mode.value,
                    }
                    for a in plan.actions
                ],
                "reasoning_trace": {
                    "steps": [
                        {
                            "step": s.step,
                            "rationale": s.rationale,
                            "confidence_factors": s.confidence_factors,
                        }
                        for s in plan.reasoning_trace.steps
                    ]
                }
                if plan.reasoning_trace
                else None,
            },
            action_count=len(plan.actions),
        )
    except Exception as e:
        raise _http_error(500, str(e))


# ── Workflow Engine ─────────────────────────────────────────────


@router.post("/workflow/build", response_model=WorkflowBuildResponse)
async def build_workflow(
    req: WorkflowBuildRequest,
    stack: EOSStack = Depends(get_stack),
) -> WorkflowBuildResponse:
    try:
        plan = ExecutionPlan(
            task_description=req.task_description,
            strategy=ExecutionStrategy(req.strategy),
            actions=[],
        )
        workflow = stack.workflow_engine.build(plan)
        return WorkflowBuildResponse(
            workflow={
                "task_description": workflow.task_description,
                "strategy": workflow.strategy.value,
                "execution_mode": workflow.execution_mode.value,
                "steps": [
                    {
                        "step_id": s.step_id,
                        "action_id": s.action_id,
                        "title": s.title,
                        "confidence": s.confidence,
                    }
                    for s in workflow.steps
                ],
                "step_count": len(workflow.steps),
                "total_cost": {
                    "token_cost": workflow.total_cost.token_cost,
                    "compute_cost": workflow.total_cost.compute_cost,
                    "total_cost": workflow.total_cost.total_cost,
                },
                "total_duration": {
                    "setup_seconds": workflow.total_duration.setup_seconds,
                    "execution_seconds": workflow.total_duration.execution_seconds,
                    "teardown_seconds": workflow.total_duration.teardown_seconds,
                    "total_seconds": workflow.total_duration.total_seconds,
                },
            },
            step_count=len(workflow.steps),
        )
    except Exception as e:
        raise _http_error(500, str(e))


# ── Runtime Engine ──────────────────────────────────────────────


@router.post("/runtime/execute", response_model=ExecuteResponse)
async def execute_workflow(
    req: ExecuteRequest,
    stack: EOSStack = Depends(get_stack),
) -> ExecuteResponse:
    try:
        wf_data = req.workflow
        steps = [
            WorkflowStep(
                step_id=s["step_id"],
                action_id=s["action_id"],
                title=s["title"],
                category=s.get("category", "general"),
                source=s.get("source", "api"),
                confidence=s.get("confidence", 1.0),
                dependencies=s.get("dependencies", []),
                execution_mode=ExecutionMode(s.get("execution_mode", "sequential")),
                state=ExecutionState.PENDING,
                estimated_cost=ExecutionCost(
                    token_cost=s.get("estimated_cost", {}).get("token_cost", 0),
                    compute_cost=s.get("estimated_cost", {}).get("compute_cost", 0),
                    total_cost=s.get("estimated_cost", {}).get("total_cost", 0),
                ),
                estimated_duration=ExecutionDuration(
                    setup_seconds=s.get("estimated_duration", {}).get("setup_seconds", 0),
                    execution_seconds=s.get("estimated_duration", {}).get("execution_seconds", 0),
                    teardown_seconds=s.get("estimated_duration", {}).get("teardown_seconds", 0),
                    total_seconds=s.get("estimated_duration", {}).get("total_seconds", 0),
                ),
            )
            for s in wf_data.get("steps", [])
        ]
        workflow = Workflow(
            task_description=wf_data.get("task_description", ""),
            strategy=ExecutionStrategy(wf_data.get("strategy", "sequential")),
            steps=steps,
            execution_mode=ExecutionMode(wf_data.get("execution_mode", "sequential")),
            total_cost=ExecutionCost(),
            total_duration=ExecutionDuration(),
        )
        execution_id = stack.runtime_engine.execute(workflow)
        return ExecuteResponse(
            execution_id=execution_id,
            status="queued",
        )
    except Exception as e:
        raise _http_error(500, str(e))


@router.get("/runtime/status/{execution_id}")
async def runtime_status(
    execution_id: str,
    stack: EOSStack = Depends(get_stack),
) -> dict:
    try:
        state = stack.runtime_engine.status(execution_id)
        return {"execution_id": execution_id, "status": state.value}
    except Exception as e:
        raise _http_error(404, str(e))


@router.get("/runtime/history/{execution_id}")
async def runtime_history(
    execution_id: str,
    stack: EOSStack = Depends(get_stack),
) -> dict:
    try:
        history = stack.runtime_engine.history(execution_id)
        return {
            "execution_id": execution_id,
            "entries": [
                {
                    "event_type": e.event_type.value,
                    "timestamp": e.timestamp,
                    "step_id": e.step_id,
                    "message": e.message,
                }
                for e in history.entries
            ],
            "entry_count": len(history.entries),
        }
    except Exception as e:
        raise _http_error(404, str(e))


@router.get("/runtime/report/{execution_id}")
async def runtime_report(
    execution_id: str,
    stack: EOSStack = Depends(get_stack),
) -> dict:
    try:
        report = stack.runtime_engine.report(execution_id)
        return {
            "execution_id": report.execution_id,
            "workflow_task": report.workflow_task,
            "state": report.state.value,
            "duration_seconds": report.duration_seconds,
            "total_steps": report.total_steps,
            "completed_steps": report.completed_steps,
            "failed_steps": report.failed_steps,
            "error": report.error,
        }
    except Exception as e:
        raise _http_error(404, str(e))


@router.get("/runtime/snapshot/{execution_id}")
async def runtime_snapshot(
    execution_id: str,
    stack: EOSStack = Depends(get_stack),
) -> dict:
    try:
        snap = stack.runtime_engine.snapshot(execution_id)
        return {
            "execution_id": snap.execution_id,
            "state": snap.state.value,
            "timestamp": snap.timestamp,
            "step_count": snap.step_count,
            "completed_count": snap.completed_count,
            "failed_count": snap.failed_count,
            "running_count": snap.running_count,
        }
    except Exception as e:
        raise _http_error(404, str(e))


@router.get("/runtime/statistics")
async def runtime_statistics(
    stack: EOSStack = Depends(get_stack),
) -> dict:
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
        raise _http_error(500, str(e))


@router.post("/runtime/pause/{execution_id}")
async def pause_execution(
    execution_id: str,
    stack: EOSStack = Depends(get_stack),
) -> dict:
    try:
        stack.runtime_engine.pause(execution_id)
        return {"execution_id": execution_id, "status": "paused"}
    except Exception as e:
        raise _http_error(400, str(e))


@router.post("/runtime/resume/{execution_id}")
async def resume_execution(
    execution_id: str,
    stack: EOSStack = Depends(get_stack),
) -> dict:
    try:
        stack.runtime_engine.resume(execution_id)
        return {"execution_id": execution_id, "status": "resumed"}
    except Exception as e:
        raise _http_error(400, str(e))


@router.post("/runtime/cancel/{execution_id}")
async def cancel_execution(
    execution_id: str,
    stack: EOSStack = Depends(get_stack),
) -> dict:
    try:
        stack.runtime_engine.cancel(execution_id)
        return {"execution_id": execution_id, "status": "cancelled"}
    except Exception as e:
        raise _http_error(400, str(e))


@router.post("/runtime/rollback/{execution_id}")
async def rollback_execution(
    execution_id: str,
    stack: EOSStack = Depends(get_stack),
) -> dict:
    try:
        stack.runtime_engine.rollback(execution_id)
        return {"execution_id": execution_id, "status": "rolled_back"}
    except Exception as e:
        raise _http_error(400, str(e))


# ── Event Bus ──────────────────────────────────────────────────


@router.post("/events/publish")
async def publish_event(
    req: PublishEventRequest,
    stack: EOSStack = Depends(get_stack),
) -> dict:
    try:
        event = RuntimeEvent(
            event_type=RuntimeEventType(req.event_type),
            execution_id=req.execution_id,
            step_id=req.step_id,
            message=req.message,
            timestamp=time.time(),
            metadata=req.metadata,
        )
        event_id = stack.event_bus.publish(event)
        return {"event_id": event_id, "event_type": req.event_type}
    except Exception as e:
        raise _http_error(400, str(e))


@router.get("/events/history")
async def event_history(
    limit: int = 100,
    stack: EOSStack = Depends(get_stack),
) -> dict:
    try:
        hist = stack.event_bus.history()
        events = hist.events[-limit:] if limit else hist.events
        return {
            "events": [
                {
                    "event_id": e.event_id,
                    "event_type": e.runtime_event.event_type.value,
                    "execution_id": e.runtime_event.execution_id,
                    "message": e.runtime_event.message,
                    "timestamp": e.runtime_event.timestamp,
                    "priority": e.priority.value,
                }
                for e in events
            ],
            "total": len(events),
        }
    except Exception as e:
        raise _http_error(500, str(e))


@router.get("/events/statistics")
async def event_statistics(
    stack: EOSStack = Depends(get_stack),
) -> dict:
    try:
        stats = stack.event_bus.statistics()
        return {
            "total_events": stats.total_events,
            "sync_events": stats.sync_events,
            "async_events": stats.async_events,
            "subscriber_count": stats.subscriber_count,
            "history_size": stats.history_size,
            "average_dispatch_time": stats.average_dispatch_time,
            "failed_dispatches": stats.failed_dispatches,
        }
    except Exception as e:
        raise _http_error(500, str(e))


# ── Observability ──────────────────────────────────────────────


@router.get("/observability/metrics", response_model=MetricResponse)
async def observability_metrics(
    stack: EOSStack = Depends(get_stack),
) -> MetricResponse:
    try:
        metrics = stack.observability.metrics()
        return MetricResponse(
            metrics={
                "uptime_seconds": metrics.uptime_seconds,
                "total_events_seen": metrics.total_events_seen,
                "total_executions_started": metrics.total_executions_started,
                "total_executions_completed": metrics.total_executions_completed,
                "total_executions_failed": metrics.total_executions_failed,
                "total_steps_executed": metrics.total_steps_executed,
                "total_steps_failed": metrics.total_steps_failed,
                "total_retries": metrics.total_retries,
                "error_rate": metrics.error_rate,
                "active_executions": metrics.active_executions,
                "event_rate_per_second": metrics.event_rate_per_second,
                "events_by_type": metrics.events_by_type,
            },
            timestamp=time.time(),
        )
    except Exception as e:
        raise _http_error(500, str(e))


@router.get("/observability/health")
async def observability_health(
    stack: EOSStack = Depends(get_stack),
) -> dict:
    try:
        health = stack.observability.health()
        return {
            "healthy": health.healthy,
            "status": health.status,
            "events_processed": health.events_processed,
            "errors_recent": health.errors_recent,
            "message": health.message,
        }
    except Exception as e:
        raise _http_error(500, str(e))


@router.get("/observability/events")
async def observability_events(
    event_type: str | None = None,
    execution_id: str | None = None,
    limit: int = 100,
    stack: EOSStack = Depends(get_stack),
) -> dict:
    try:
        rt_type = RuntimeEventType(event_type) if event_type else None
        entries = stack.observability.query_events(
            event_type=rt_type,
            execution_id=execution_id,
            limit=limit,
        )
        return {
            "entries": [
                {
                    "event_type": e.event_type.value,
                    "execution_id": e.execution_id,
                    "step_id": e.step_id,
                    "message": e.message,
                    "timestamp": e.timestamp,
                }
                for e in entries
            ],
            "total": len(entries),
        }
    except Exception as e:
        raise _http_error(500, str(e))


# ── Agent / Tool Integration ────────────────────────────────────


@router.post("/tools/register")
async def register_tool(
    req: RegisterToolRequest,
    stack: EOSStack = Depends(get_stack),
) -> dict:
    try:
        from aios.eos.agent_integration import ToolDefinition, ToolParameter

        params = tuple(
            ToolParameter(
                name=p.get("name", ""),
                type=p.get("type", "string"),
                description=p.get("description", ""),
                required=p.get("required", True),
                default=p.get("default"),
            )
            for p in req.parameters
        )
        tool = ToolDefinition(
            name=req.name,
            description=req.description,
            parameters=params,
            handler=None,
            tags=tuple(req.tags),
            timeout_seconds=req.timeout_seconds,
        )
        tool_id = stack.tool_registry.register(tool)
        return {"tool_id": tool_id, "name": req.name}
    except Exception as e:
        raise _http_error(400, str(e))


@router.get("/tools")
async def list_tools(
    stack: EOSStack = Depends(get_stack),
) -> dict:
    registry = stack.tool_registry
    if registry is None:
        raise _http_error(503, "Tool registry not available")
    tools = registry.list_tools()
    return {
        "tools": [
            {
                "name": t.name,
                "description": t.description,
                "parameter_count": t.parameter_count,
                "tags": list(t.tags),
            }
            for t in tools
        ],
        "total": len(tools),
    }


@router.get("/tools/{name}")
async def get_tool(
    name: str,
    stack: EOSStack = Depends(get_stack),
) -> dict:
    registry = stack.tool_registry
    if registry is None:
        raise _http_error(503, "Tool registry not available")
    tool = registry.get(name)
    if tool is None:
        raise _http_error(404, f"Tool not found: {name}")
    return {
        "name": tool.name,
        "description": tool.description,
        "parameters": [
            {
                "name": p.name,
                "type": p.type,
                "description": p.description,
                "required": p.required,
            }
            for p in tool.parameters
        ],
        "tags": list(tool.tags),
        "has_handler": tool.handler is not None,
    }


@router.post("/agent/execute", response_model=ExecuteAgentResponse)
async def agent_execute(
    req: ExecuteAgentRequest,
    stack: EOSStack = Depends(get_stack),
) -> ExecuteAgentResponse:
    try:
        wf_data = req.workflow
        steps = [
            WorkflowStep(
                step_id=s["step_id"],
                action_id=s["action_id"],
                title=s["title"],
                category=s.get("category", "general"),
                source=s.get("source", "api"),
                confidence=s.get("confidence", 1.0),
                dependencies=s.get("dependencies", []),
                execution_mode=ExecutionMode(s.get("execution_mode", "sequential")),
                state=ExecutionState.PENDING,
                estimated_cost=ExecutionCost(),
                estimated_duration=ExecutionDuration(),
            )
            for s in wf_data.get("steps", [])
        ]
        workflow = Workflow(
            task_description=wf_data.get("task_description", ""),
            strategy=ExecutionStrategy(wf_data.get("strategy", "sequential")),
            steps=steps,
            execution_mode=ExecutionMode(wf_data.get("execution_mode", "sequential")),
            total_cost=ExecutionCost(),
            total_duration=ExecutionDuration(),
        )
        if stack.agent_executor is None:
            raise _http_error(500, "AgentExecutor not initialized")

        result = stack.agent_executor.execute(workflow)
        return ExecuteAgentResponse(
            execution_id=result.execution_id,
            all_successful=result.all_successful,
            summary={
                "success_count": result.success_count,
                "failure_count": result.failure_count,
                "total_duration": result.total_duration,
                "step_results": [
                    {
                        "step_id": r.step_id,
                        "tool_name": r.tool_name,
                        "success": r.success,
                        "error": r.error,
                        "duration_seconds": r.duration_seconds,
                    }
                    for r in result.step_results
                ],
            },
        )
    except Exception as e:
        raise _http_error(500, str(e))


@router.get("/agent/statistics")
async def agent_statistics(
    stack: EOSStack = Depends(get_stack),
) -> dict:
    if stack.agent_executor is None:
        raise _http_error(500, "AgentExecutor not initialized")
    stats = stack.agent_executor.statistics()
    return {
        "total_executions": stats.total_executions,
        "successful_executions": stats.successful_executions,
        "failed_executions": stats.failed_executions,
        "total_tool_calls": stats.total_tool_calls,
        "successful_tool_calls": stats.successful_tool_calls,
        "failed_tool_calls": stats.failed_tool_calls,
        "average_execution_time": stats.average_execution_time,
    }


# ── Persistence ────────────────────────────────────────────────


@router.get("/persistence/statistics")
async def persistence_statistics(
    stack: EOSStack = Depends(get_stack),
) -> dict:
    try:
        store = stack.persistence
        if store is None:
            raise _http_error(503, "Persistence store not available")
        stats = store.statistics()
        return {
            "total_workflows": stats.total_workflows,
            "total_executions": stats.total_executions,
            "total_events": stats.total_events,
            "total_reports": stats.total_reports,
            "database_size_bytes": stats.database_size_bytes,
        }
    except Exception as e:
        raise _http_error(500, str(e))


@router.post("/persistence/clear")
async def persistence_clear(
    stack: EOSStack = Depends(get_stack),
) -> dict:
    try:
        store = stack.persistence
        if store is None:
            raise _http_error(503, "Persistence store not available")
        store.clear_all()
        return {"status": "cleared"}
    except Exception as e:
        raise _http_error(500, str(e))


# ── Health ──────────────────────────────────────────────────────


@router.get("/health")
async def health_check(stack: EOSStack = Depends(get_stack)) -> dict:
    layers = {
        "loader": _is_init(stack.loader),
        "registry": _is_init(stack.registry),
        "capability_discovery": _is_init(stack.capability_discovery),
        "knowledge_service": _is_init(stack.knowledge_service),
        "context_builder": _is_init(stack.context_builder),
        "decision_engine": _is_init(stack.decision_engine),
        "workflow_engine": _is_init(stack.workflow_engine),
        "runtime_engine": _is_init(stack.runtime_engine),
        "event_bus": _is_init(stack.event_bus),
        "observability": _is_init(stack.observability),
        "persistence": _is_init(stack.persistence),
    }

    return {
        "healthy": all(layers.values()),
        "layers": layers,
    }


def _is_init(obj: object) -> bool:
    return obj is not None and getattr(obj, "is_initialized", False)
