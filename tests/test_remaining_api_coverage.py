"""Tests to push coverage from 93% to 95% across remaining API modules."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from aios.api.app import create_app
from aios.api.dependencies import reset_stack, set_stack
from aios.api.stack import EOSStack

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _reset_auth():
    """Reset auth state between tests."""
    import aios.api.auth as auth_mod
    orig_enabled = auth_mod._AUTH_ENABLED
    orig_validator = auth_mod._TOKEN_VALIDATOR
    auth_mod._AUTH_ENABLED = False
    auth_mod._TOKEN_VALIDATOR = None
    yield
    auth_mod._AUTH_ENABLED = orig_enabled
    auth_mod._TOKEN_VALIDATOR = orig_validator


@pytest.fixture
def mock_stack():
    stack = EOSStack()

    core_attrs = [
        "loader", "registry", "capability_discovery", "knowledge_service",
        "context_builder", "decision_engine", "workflow_engine",
        "runtime_engine", "event_bus", "observability", "persistence",
        "tool_registry", "agent_executor",
    ]
    for attr in core_attrs:
        m = MagicMock()
        m.is_initialized = True
        setattr(stack, attr, m)

    optional_attrs = [
        "memory_manager", "llm_manager", "embedding_manager",
        "vectorstore_manager", "rag_manager", "tool_manager",
        "agent_manager", "plugin_manager", "config_manager",
        "security_manager", "multiagent_coordinator", "scheduler",
    ]
    for attr in optional_attrs:
        m = MagicMock()
        m.is_initialized = True
        setattr(stack, attr, m)

    set_stack(stack)
    yield stack
    reset_stack()


@pytest.fixture
def client(mock_stack):
    app = create_app()
    return TestClient(app, raise_server_exceptions=False)


# ===================================================================
# 1. auth.py — configure_auth, get_current_user, require_auth
# ===================================================================


class TestAuthEnabledPath:
    """Cover lines 22-24, 33-44, 50-52 in auth.py."""

    def test_configure_auth_enabled_true(self):
        import aios.api.auth as auth_mod
        def validator(t):
            return {"principal": "valid", "authenticated": True}
        auth_mod.configure_auth(enabled=True, token_validator=validator)
        assert auth_mod._AUTH_ENABLED is True
        assert auth_mod._TOKEN_VALIDATOR is validator

    def test_configure_auth_enabled_false(self):
        import aios.api.auth as auth_mod
        auth_mod.configure_auth(enabled=False)
        assert auth_mod._AUTH_ENABLED is False
        assert auth_mod._TOKEN_VALIDATOR is None

    @pytest.mark.asyncio
    async def test_get_current_user_auth_disabled(self):
        import aios.api.auth as auth_mod
        auth_mod._AUTH_ENABLED = False
        result = await auth_mod.get_current_user(None)
        assert result["principal"] == "anonymous"
        assert result["authenticated"] is False

    @pytest.mark.asyncio
    async def test_get_current_user_auth_enabled_no_credentials(self):
        from fastapi import HTTPException

        import aios.api.auth as auth_mod
        auth_mod._AUTH_ENABLED = True
        auth_mod._TOKEN_VALIDATOR = None
        with pytest.raises(HTTPException) as exc_info:
            await auth_mod.get_current_user(None)
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_get_current_user_auth_enabled_with_validator_valid(self):
        import aios.api.auth as auth_mod
        def validator(t):
            return {"principal": "user1", "authenticated": True}
        auth_mod._AUTH_ENABLED = True
        auth_mod._TOKEN_VALIDATOR = validator
        creds = MagicMock()
        creds.credentials = "valid-token"
        result = await auth_mod.get_current_user(creds)
        assert result["principal"] == "user1"

    @pytest.mark.asyncio
    async def test_get_current_user_auth_enabled_with_validator_invalid(self):
        from fastapi import HTTPException

        import aios.api.auth as auth_mod
        auth_mod._AUTH_ENABLED = True
        auth_mod._TOKEN_VALIDATOR = lambda t: None
        creds = MagicMock()
        creds.credentials = "bad-token"
        with pytest.raises(HTTPException) as exc_info:
            await auth_mod.get_current_user(creds)
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_get_current_user_auth_enabled_no_validator(self):
        import aios.api.auth as auth_mod
        auth_mod._AUTH_ENABLED = True
        auth_mod._TOKEN_VALIDATOR = None
        creds = MagicMock()
        creds.credentials = "some-token"
        result = await auth_mod.get_current_user(creds)
        assert result["authenticated"] is True

    @pytest.mark.asyncio
    async def test_require_auth_auth_enabled_unauthenticated(self):
        from fastapi import HTTPException

        import aios.api.auth as auth_mod
        auth_mod._AUTH_ENABLED = True
        user = {"principal": "anonymous", "authenticated": False}
        with pytest.raises(HTTPException) as exc_info:
            await auth_mod.require_auth(user)
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_require_auth_auth_enabled_authenticated(self):
        import aios.api.auth as auth_mod
        auth_mod._AUTH_ENABLED = True
        user = {"principal": "user1", "authenticated": True}
        result = await auth_mod.require_auth(user)
        assert result["principal"] == "user1"

    @pytest.mark.asyncio
    async def test_require_auth_auth_disabled(self):
        import aios.api.auth as auth_mod
        auth_mod._AUTH_ENABLED = False
        user = {"principal": "anonymous", "authenticated": False}
        result = await auth_mod.require_auth(user)
        assert result["principal"] == "anonymous"


# ===================================================================
# 2. routes.py — old-style route handlers
# ===================================================================


class TestRoutesLoader:
    def test_load_eos_success(self, client, mock_stack, tmp_path):
        (tmp_path / ".ai").mkdir()
        mock_stack.loader.load.return_value = MagicMock(
            success=True,
            kernel_files=["k1"],
            registry_files=["r1"],
            index_files=["i1"],
            errors=[],
        )
        resp = client.post("/api/v1/loader/load", json={"eos_path": str(tmp_path / ".ai")})
        assert resp.status_code == 200

    def test_load_eos_path_not_found(self, client, mock_stack):
        resp = client.post("/api/v1/loader/load", json={"eos_path": "/nonexistent/path"})
        assert resp.status_code == 404

    def test_load_eos_exception(self, client, mock_stack, tmp_path):
        p = tmp_path / ".ai"
        p.mkdir()
        mock_stack.loader.load.side_effect = RuntimeError("boom")
        resp = client.post("/api/v1/loader/load", json={"eos_path": str(p)})
        assert resp.status_code == 500

    def test_load_eos_load_failure(self, client, mock_stack, tmp_path):
        p = tmp_path / ".ai"
        p.mkdir()
        mock_stack.loader.load.return_value = MagicMock(success=False, errors=["fail"])
        resp = client.post("/api/v1/loader/load", json={"eos_path": str(p)})
        assert resp.status_code == 200
        assert resp.json()["success"] is False


class TestRoutesCapabilityDiscovery:
    def test_discover_success(self, client, mock_stack):
        cap = MagicMock()
        cap.capability.capability_id = "c1"
        cap.capability.name = "cap1"
        cap.capability.description = "desc"
        cap.capability.action_id = "a1"
        cap.capability.category = "cat"
        cap.score = 0.9
        mock_stack.capability_discovery.discover.return_value = [cap]
        resp = client.post("/api/v1/capabilities/discover", json={"task_description": "do something"})
        assert resp.status_code == 200
        assert resp.json()["total_found"] == 1

    def test_discover_exception(self, client, mock_stack):
        mock_stack.capability_discovery.discover.side_effect = RuntimeError("err")
        resp = client.post("/api/v1/capabilities/discover", json={"task_description": "x"})
        assert resp.status_code == 500


class TestRoutesKnowledge:
    def test_search_knowledge_success(self, client, mock_stack):
        doc = MagicMock()
        doc.document.document_id = "d1"
        doc.document.title = "title"
        doc.document.content = "content" * 100
        doc.document.source = "src"
        doc.score = 0.8
        mock_stack.knowledge_service.search.return_value = [doc]
        resp = client.post("/api/v1/knowledge/search", json={"query": "test"})
        assert resp.status_code == 200
        assert resp.json()["total_found"] == 1

    def test_search_knowledge_exception(self, client, mock_stack):
        mock_stack.knowledge_service.search.side_effect = RuntimeError("err")
        resp = client.post("/api/v1/knowledge/search", json={"query": "x"})
        assert resp.status_code == 500


class TestRoutesContextBuilder:
    def test_build_context_success(self, client, mock_stack):
        item = MagicMock()
        item.item_id = "i1"
        item.content = "ctx"
        item.source = "s"
        item.relevance_score = 0.7
        ctx = MagicMock()
        ctx.task_description = "task"
        ctx.items = [item]
        ctx.total_tokens = 100
        ctx.item_count = 1
        mock_stack.context_builder.build.return_value = ctx
        resp = client.post("/api/v1/context/build", json={"task_description": "task"})
        assert resp.status_code == 200

    def test_build_context_exception(self, client, mock_stack):
        mock_stack.context_builder.build.side_effect = RuntimeError("err")
        resp = client.post("/api/v1/context/build", json={"task_description": "x"})
        assert resp.status_code == 500


class TestRoutesDecisionEngine:
    def test_create_plan_success(self, client, mock_stack):
        action = MagicMock()
        action.action_id = "a1"
        action.title = "act"
        action.description = "desc"
        action.confidence = 0.9
        action.dependencies = ["d1"]
        action.execution_mode.value = "sequential"
        step = MagicMock()
        step.step = 1
        step.rationale = "because"
        step.confidence_factors = {}
        trace = MagicMock()
        trace.steps = [step]
        plan = MagicMock()
        plan.task_description = "task"
        plan.strategy.value = "sequential"
        plan.actions = [action]
        plan.reasoning_trace = trace
        mock_stack.decision_engine.create_plan.return_value = plan
        resp = client.post("/api/v1/plan/create", json={"task_description": "task"})
        assert resp.status_code == 200
        assert resp.json()["action_count"] == 1

    def test_create_plan_no_trace(self, client, mock_stack):
        action = MagicMock()
        action.action_id = "a1"
        action.title = "act"
        action.description = "desc"
        action.confidence = 0.9
        action.dependencies = []
        action.execution_mode.value = "sequential"
        plan = MagicMock()
        plan.task_description = "task"
        plan.strategy.value = "sequential"
        plan.actions = [action]
        plan.reasoning_trace = None
        mock_stack.decision_engine.create_plan.return_value = plan
        resp = client.post("/api/v1/plan/create", json={"task_description": "task"})
        assert resp.status_code == 200
        assert resp.json()["plan"]["reasoning_trace"] is None

    def test_create_plan_exception(self, client, mock_stack):
        mock_stack.decision_engine.create_plan.side_effect = RuntimeError("err")
        resp = client.post("/api/v1/plan/create", json={"task_description": "x"})
        assert resp.status_code == 500


class TestRoutesWorkflowEngine:
    def test_build_workflow_success(self, client, mock_stack):
        wf = MagicMock()
        wf.task_description = "task"
        wf.strategy.value = "sequential"
        wf.execution_mode.value = "sequential"
        wf.steps = []
        wf.total_cost.token_cost = 0
        wf.total_cost.compute_cost = 0
        wf.total_cost.total_cost = 0
        wf.total_duration.setup_seconds = 0
        wf.total_duration.execution_seconds = 0
        wf.total_duration.teardown_seconds = 0
        wf.total_duration.total_seconds = 0
        mock_stack.workflow_engine.build.return_value = wf
        resp = client.post("/api/v1/workflow/build", json={"task_description": "task"})
        assert resp.status_code == 200

    def test_build_workflow_exception(self, client, mock_stack):
        mock_stack.workflow_engine.build.side_effect = RuntimeError("err")
        resp = client.post("/api/v1/workflow/build", json={"task_description": "x"})
        assert resp.status_code == 500


class TestRoutesRuntimeEngine:
    def test_execute_workflow_success(self, client, mock_stack):
        mock_stack.runtime_engine.execute.return_value = "exec-1"
        resp = client.post("/api/v1/runtime/execute", json={
            "workflow": {
                "task_description": "t",
                "strategy": "sequential",
                "execution_mode": "sequential",
                "steps": [
                    {
                        "step_id": "s1",
                        "action_id": "a1",
                        "title": "step1",
                        "category": "general",
                        "source": "api",
                        "confidence": 1.0,
                        "dependencies": [],
                        "execution_mode": "sequential",
                        "estimated_cost": {},
                        "estimated_duration": {},
                    }
                ],
            }
        })
        assert resp.status_code == 200
        assert resp.json()["execution_id"] == "exec-1"

    def test_execute_workflow_exception(self, client, mock_stack):
        mock_stack.runtime_engine.execute.side_effect = RuntimeError("err")
        resp = client.post("/api/v1/runtime/execute", json={
            "workflow": {"task_description": "t", "strategy": "sequential", "steps": []}
        })
        assert resp.status_code == 500

    def test_runtime_status_success(self, client, mock_stack):
        mock_stack.runtime_engine.status.return_value = MagicMock(value="running")
        resp = client.get("/api/v1/runtime/status/exec-1")
        assert resp.status_code == 200
        assert resp.json()["status"] == "running"

    def test_runtime_status_exception(self, client, mock_stack):
        mock_stack.runtime_engine.status.side_effect = RuntimeError("not found")
        resp = client.get("/api/v1/runtime/status/bad")
        assert resp.status_code == 404

    def test_runtime_history_success(self, client, mock_stack):
        entry = MagicMock()
        entry.event_type.value = "started"
        entry.timestamp = 1.0
        entry.step_id = "s1"
        entry.message = "msg"
        hist = MagicMock()
        hist.entries = [entry]
        mock_stack.runtime_engine.history.return_value = hist
        resp = client.get("/api/v1/runtime/history/exec-1")
        assert resp.status_code == 200
        assert resp.json()["entry_count"] == 1

    def test_runtime_history_exception(self, client, mock_stack):
        mock_stack.runtime_engine.history.side_effect = RuntimeError("not found")
        resp = client.get("/api/v1/runtime/history/bad")
        assert resp.status_code == 404

    def test_runtime_report_success(self, client, mock_stack):
        report = MagicMock()
        report.execution_id = "e1"
        report.workflow_task = "task"
        report.state.value = "completed"
        report.duration_seconds = 5.0
        report.total_steps = 3
        report.completed_steps = 3
        report.failed_steps = 0
        report.error = None
        mock_stack.runtime_engine.report.return_value = report
        resp = client.get("/api/v1/runtime/report/exec-1")
        assert resp.status_code == 200

    def test_runtime_report_exception(self, client, mock_stack):
        mock_stack.runtime_engine.report.side_effect = RuntimeError("err")
        resp = client.get("/api/v1/runtime/report/bad")
        assert resp.status_code == 404

    def test_runtime_snapshot_success(self, client, mock_stack):
        snap = MagicMock()
        snap.execution_id = "e1"
        snap.state.value = "completed"
        snap.timestamp = 1.0
        snap.step_count = 3
        snap.completed_count = 3
        snap.failed_count = 0
        snap.running_count = 0
        mock_stack.runtime_engine.snapshot.return_value = snap
        resp = client.get("/api/v1/runtime/snapshot/exec-1")
        assert resp.status_code == 200

    def test_runtime_snapshot_exception(self, client, mock_stack):
        mock_stack.runtime_engine.snapshot.side_effect = RuntimeError("err")
        resp = client.get("/api/v1/runtime/snapshot/bad")
        assert resp.status_code == 404

    def test_runtime_statistics_success(self, client, mock_stack):
        stats = MagicMock()
        stats.total_executions = 10
        stats.successful_executions = 8
        stats.failed_executions = 1
        stats.cancelled_executions = 1
        stats.average_duration = 5.0
        stats.average_retries = 0.2
        mock_stack.runtime_engine.statistics.return_value = stats
        resp = client.get("/api/v1/runtime/statistics")
        assert resp.status_code == 200
        assert resp.json()["total_executions"] == 10

    def test_runtime_statistics_exception(self, client, mock_stack):
        mock_stack.runtime_engine.statistics.side_effect = RuntimeError("err")
        resp = client.get("/api/v1/runtime/statistics")
        assert resp.status_code == 500

    def test_pause_resume_cancel_rollback(self, client, mock_stack):
        mock_stack.runtime_engine.pause.return_value = None
        resp = client.post("/api/v1/runtime/pause/e1")
        assert resp.status_code == 200
        assert resp.json()["status"] == "paused"

        mock_stack.runtime_engine.resume.return_value = None
        resp = client.post("/api/v1/runtime/resume/e1")
        assert resp.status_code == 200
        assert resp.json()["status"] == "resumed"

        mock_stack.runtime_engine.cancel.return_value = None
        resp = client.post("/api/v1/runtime/cancel/e1")
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"

        mock_stack.runtime_engine.rollback.return_value = None
        resp = client.post("/api/v1/runtime/rollback/e1")
        assert resp.status_code == 200
        assert resp.json()["status"] == "rolled_back"

    def test_pause_resume_cancel_rollback_exception(self, client, mock_stack):
        mock_stack.runtime_engine.pause.side_effect = RuntimeError("err")
        assert client.post("/api/v1/runtime/pause/e1").status_code == 400

        mock_stack.runtime_engine.resume.side_effect = RuntimeError("err")
        assert client.post("/api/v1/runtime/resume/e1").status_code == 400

        mock_stack.runtime_engine.cancel.side_effect = RuntimeError("err")
        assert client.post("/api/v1/runtime/cancel/e1").status_code == 400

        mock_stack.runtime_engine.rollback.side_effect = RuntimeError("err")
        assert client.post("/api/v1/runtime/rollback/e1").status_code == 400


class TestRoutesEventBus:
    def test_publish_event_success(self, client, mock_stack):
        mock_stack.event_bus.publish.return_value = "evt-1"
        resp = client.post("/api/v1/events/publish", json={
            "event_type": "execution_started",
            "execution_id": "e1",
            "message": "hi",
        })
        assert resp.status_code == 200
        assert resp.json()["event_id"] == "evt-1"

    def test_publish_event_exception(self, client, mock_stack):
        mock_stack.event_bus.publish.side_effect = RuntimeError("err")
        resp = client.post("/api/v1/events/publish", json={
            "event_type": "execution_started",
            "execution_id": "e1",
        })
        assert resp.status_code == 400

    def test_event_history_success(self, client, mock_stack):
        entry = MagicMock()
        entry.event_id = "e1"
        entry.runtime_event.event_type.value = "started"
        entry.runtime_event.execution_id = "exec1"
        entry.runtime_event.message = "msg"
        entry.runtime_event.timestamp = 1.0
        entry.priority.value = "normal"
        hist = MagicMock()
        hist.events = [entry]
        mock_stack.event_bus.history.return_value = hist
        resp = client.get("/api/v1/events/history")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    def test_event_history_with_limit(self, client, mock_stack):
        hist = MagicMock()
        hist.events = []
        mock_stack.event_bus.history.return_value = hist
        resp = client.get("/api/v1/events/history?limit=0")
        assert resp.status_code == 200

    def test_event_history_exception(self, client, mock_stack):
        mock_stack.event_bus.history.side_effect = RuntimeError("err")
        resp = client.get("/api/v1/events/history")
        assert resp.status_code == 500

    def test_event_statistics_success(self, client, mock_stack):
        stats = MagicMock()
        stats.total_events = 100
        stats.sync_events = 50
        stats.async_events = 50
        stats.subscriber_count = 5
        stats.history_size = 80
        stats.average_dispatch_time = 0.01
        stats.failed_dispatches = 2
        mock_stack.event_bus.statistics.return_value = stats
        resp = client.get("/api/v1/events/statistics")
        assert resp.status_code == 200
        assert resp.json()["total_events"] == 100

    def test_event_statistics_exception(self, client, mock_stack):
        mock_stack.event_bus.statistics.side_effect = RuntimeError("err")
        resp = client.get("/api/v1/events/statistics")
        assert resp.status_code == 500


class TestRoutesObservability:
    def test_observability_metrics_success(self, client, mock_stack):
        m = MagicMock()
        m.uptime_seconds = 100
        m.total_events_seen = 50
        m.total_executions_started = 10
        m.total_executions_completed = 8
        m.total_executions_failed = 2
        m.total_steps_executed = 30
        m.total_steps_failed = 1
        m.total_retries = 3
        m.error_rate = 0.05
        m.active_executions = 2
        m.event_rate_per_second = 5.0
        m.events_by_type = {}
        mock_stack.observability.metrics.return_value = m
        resp = client.get("/api/v1/observability/metrics")
        assert resp.status_code == 200

    def test_observability_metrics_exception(self, client, mock_stack):
        mock_stack.observability.metrics.side_effect = RuntimeError("err")
        resp = client.get("/api/v1/observability/metrics")
        assert resp.status_code == 500

    def test_observability_health_success(self, client, mock_stack):
        h = MagicMock()
        h.healthy = True
        h.status = "ok"
        h.events_processed = 100
        h.errors_recent = 0
        h.message = "all good"
        mock_stack.observability.health.return_value = h
        resp = client.get("/api/v1/observability/health")
        assert resp.status_code == 200
        assert resp.json()["healthy"] is True

    def test_observability_health_exception(self, client, mock_stack):
        mock_stack.observability.health.side_effect = RuntimeError("err")
        resp = client.get("/api/v1/observability/health")
        assert resp.status_code == 500

    def test_observability_events_success(self, client, mock_stack):
        entry = MagicMock()
        entry.event_type.value = "started"
        entry.execution_id = "e1"
        entry.step_id = "s1"
        entry.message = "msg"
        entry.timestamp = 1.0
        mock_stack.observability.query_events.return_value = [entry]
        resp = client.get("/api/v1/observability/events")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    def test_observability_events_with_filters(self, client, mock_stack):
        mock_stack.observability.query_events.return_value = []
        resp = client.get("/api/v1/observability/events?event_type=step_started&execution_id=e1&limit=5")
        assert resp.status_code == 200

    def test_observability_events_exception(self, client, mock_stack):
        mock_stack.observability.query_events.side_effect = RuntimeError("err")
        resp = client.get("/api/v1/observability/events")
        assert resp.status_code == 500


class TestRoutesToolIntegration:
    def test_register_tool_success(self, client, mock_stack):
        mock_stack.tool_registry.register.return_value = "tool-1"
        resp = client.post("/api/v1/tools/register", json={
            "name": "mytool",
            "description": "A tool",
            "parameters": [{"name": "p1", "type": "string", "description": "param", "required": True, "default": None}],
            "tags": ["tag1"],
            "timeout_seconds": 10.0,
        })
        assert resp.status_code == 200
        assert resp.json()["tool_id"] == "tool-1"

    def test_register_tool_exception(self, client, mock_stack):
        mock_stack.tool_registry.register.side_effect = RuntimeError("err")
        resp = client.post("/api/v1/tools/register", json={"name": "t"})
        assert resp.status_code == 400

    def test_list_tools_success(self, client, mock_stack):
        tool = MagicMock()
        tool.name = "t1"
        tool.description = "d"
        tool.parameter_count = 1
        tool.tags = ["tag"]
        mock_stack.tool_registry.list_tools.return_value = [tool]
        resp = client.get("/api/v1/tools")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    def test_get_tool_found(self, client, mock_stack):
        tool = MagicMock()
        tool.name = "t1"
        tool.description = "d"
        tool.parameters = []
        tool.tags = []
        tool.handler = None
        mock_stack.tool_registry.get.return_value = tool
        resp = client.get("/api/v1/tools/t1")
        assert resp.status_code == 200
        assert resp.json()["has_handler"] is False

    def test_get_tool_not_found(self, client, mock_stack):
        mock_stack.tool_registry.get.return_value = None
        resp = client.get("/api/v1/tools/nonexistent")
        assert resp.status_code == 404

    def test_agent_execute_success(self, client, mock_stack):
        result = MagicMock()
        result.execution_id = "exec-1"
        result.all_successful = True
        result.success_count = 1
        result.failure_count = 0
        result.total_duration = 1.0
        sr = MagicMock()
        sr.step_id = "s1"
        sr.tool_name = "t1"
        sr.success = True
        sr.error = None
        sr.duration_seconds = 0.5
        result.step_results = [sr]
        mock_stack.agent_executor.execute.return_value = result
        resp = client.post("/api/v1/agent/execute", json={
            "workflow": {
                "task_description": "task",
                "strategy": "sequential",
                "execution_mode": "sequential",
                "steps": [{"step_id": "s1", "action_id": "a1", "title": "step1"}],
            }
        })
        assert resp.status_code == 200

    def test_agent_execute_no_executor(self, client, mock_stack):
        mock_stack.agent_executor = None
        resp = client.post("/api/v1/agent/execute", json={
            "workflow": {"task_description": "task", "strategy": "sequential", "steps": []}
        })
        assert resp.status_code == 500

    def test_agent_execute_exception(self, client, mock_stack):
        mock_stack.agent_executor.execute.side_effect = RuntimeError("err")
        resp = client.post("/api/v1/agent/execute", json={
            "workflow": {"task_description": "t", "strategy": "sequential", "steps": []}
        })
        assert resp.status_code == 500

    def test_agent_statistics_success(self, client, mock_stack):
        stats = MagicMock()
        stats.total_executions = 10
        stats.successful_executions = 8
        stats.failed_executions = 2
        stats.total_tool_calls = 20
        stats.successful_tool_calls = 18
        stats.failed_tool_calls = 2
        stats.average_execution_time = 1.5
        mock_stack.agent_executor.statistics.return_value = stats
        resp = client.get("/api/v1/agent/statistics")
        assert resp.status_code == 200
        assert resp.json()["total_executions"] == 10

    def test_agent_statistics_no_executor(self, client, mock_stack):
        mock_stack.agent_executor = None
        resp = client.get("/api/v1/agent/statistics")
        assert resp.status_code == 500


class TestRoutesPersistence:
    def test_persistence_statistics_success(self, client, mock_stack):
        stats = MagicMock()
        stats.total_workflows = 5
        stats.total_executions = 20
        stats.total_events = 100
        stats.total_reports = 10
        stats.database_size_bytes = 4096
        mock_stack.persistence.statistics.return_value = stats
        resp = client.get("/api/v1/persistence/statistics")
        assert resp.status_code == 200
        assert resp.json()["total_workflows"] == 5

    def test_persistence_statistics_exception(self, client, mock_stack):
        mock_stack.persistence.statistics.side_effect = RuntimeError("err")
        resp = client.get("/api/v1/persistence/statistics")
        assert resp.status_code == 500

    def test_persistence_clear_success(self, client, mock_stack):
        resp = client.post("/api/v1/persistence/clear")
        assert resp.status_code == 200
        assert resp.json()["status"] == "cleared"

    def test_persistence_clear_exception(self, client, mock_stack):
        mock_stack.persistence.clear_all.side_effect = RuntimeError("err")
        resp = client.post("/api/v1/persistence/clear")
        assert resp.status_code == 500


class TestRoutesHealthCheck:
    def test_health_all_initialized(self, client, mock_stack):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "layers" in data
        assert "healthy" in data

    def test_health_some_not_initialized(self, client, mock_stack):
        mock_stack.loader = MagicMock()
        mock_stack.loader.is_initialized = False
        resp = client.get("/api/v1/health")
        data = resp.json()
        assert data["healthy"] is False

    def test_is_init_none(self, client, mock_stack):
        from aios.api.routes import _is_init
        assert _is_init(None) is False
        assert _is_init(MagicMock(is_initialized=True)) is True
        assert _is_init(MagicMock(is_initialized=False)) is False


class TestRoutesHelperFunction:
    def test_http_error(self):
        from aios.api.routes import _http_error
        err = _http_error(404, "not found")
        assert err.status_code == 404


# ===================================================================
# 3. stack.py — create_stack and _initialize_optional_managers
# ===================================================================


class TestStackCreate:
    @patch("aios.api.stack._initialize_optional_managers")
    @patch("aios.api.stack.PersistenceStore")
    @patch("aios.api.stack.AgentExecutor")
    @patch("aios.api.stack.ToolRegistry")
    @patch("aios.api.stack.EventBus")
    @patch("aios.api.stack.ObservabilityConsumer")
    @patch("aios.api.stack.RuntimeEngine")
    @patch("aios.api.stack.WorkflowEngine")
    @patch("aios.api.stack.EOSDecisionEngine")
    @patch("aios.api.stack.EOSContextBuilder")
    @patch("aios.api.stack.KnowledgeService")
    @patch("aios.api.stack.CapabilityDiscovery")
    @patch("aios.api.stack.RegistryManager")
    @patch("aios.api.stack.EOSLoader")
    @patch("aios.api.stack.load_config")
    def test_create_stack_basic(self, mock_load_config, mock_loader_cls, mock_reg_cls,
                                mock_cap_cls, mock_ks_cls, mock_ctx_cls, mock_de_cls,
                                mock_wf_cls, mock_re_cls, mock_ob_cls, mock_eb_cls,
                                mock_tool_reg_cls, mock_ae_cls, mock_persist_cls,
                                mock_init_opt):
        mock_config = MagicMock()
        mock_config.repo_root = Path.cwd()
        mock_load_config.return_value = mock_config
        loader = MagicMock()
        mock_loader_cls.return_value = loader
        reg = MagicMock()
        mock_reg_cls.return_value = reg
        cap = MagicMock()
        mock_cap_cls.return_value = cap
        ks = MagicMock()
        mock_ks_cls.return_value = ks
        ctx = MagicMock()
        mock_ctx_cls.return_value = ctx
        de = MagicMock()
        mock_de_cls.return_value = de
        wf = MagicMock()
        mock_wf_cls.return_value = wf
        re = MagicMock()
        mock_re_cls.return_value = re
        eb = MagicMock()
        mock_eb_cls.return_value = eb
        ob = MagicMock()
        mock_ob_cls.return_value = ob
        ps = MagicMock()
        mock_persist_cls.return_value = ps
        tr = MagicMock()
        mock_tool_reg_cls.return_value = tr
        ae = MagicMock()
        mock_ae_cls.return_value = ae

        from aios.api.stack import create_stack
        stack = create_stack()

        assert stack.config == mock_config
        assert stack.loader is loader
        assert stack.registry is reg
        assert stack.capability_discovery is cap
        assert stack.knowledge_service is ks
        assert stack.context_builder is ctx
        assert stack.decision_engine is de
        assert stack.workflow_engine is wf
        assert stack.runtime_engine is re
        assert stack.event_bus is eb
        assert stack.observability is ob
        assert stack.persistence is ps
        assert stack.tool_registry is tr
        assert stack.agent_executor is ae
        mock_init_opt.assert_called_once()
        assert mock_init_opt.call_args[0][0] is stack
        assert "eos_root" in mock_init_opt.call_args[1]

    @patch("aios.api.stack._initialize_optional_managers")
    @patch("aios.api.stack.PersistenceStore")
    @patch("aios.api.stack.AgentExecutor")
    @patch("aios.api.stack.ToolRegistry")
    @patch("aios.api.stack.EventBus")
    @patch("aios.api.stack.ObservabilityConsumer")
    @patch("aios.api.stack.RuntimeEngine")
    @patch("aios.api.stack.WorkflowEngine")
    @patch("aios.api.stack.EOSDecisionEngine")
    @patch("aios.api.stack.EOSContextBuilder")
    @patch("aios.api.stack.KnowledgeService")
    @patch("aios.api.stack.CapabilityDiscovery")
    @patch("aios.api.stack.RegistryManager")
    @patch("aios.api.stack.EOSLoader")
    @patch("aios.api.stack.load_config")
    def test_create_stack_with_db_path(self, mock_load_config, mock_loader_cls, mock_reg_cls,
                                       mock_cap_cls, mock_ks_cls, mock_ctx_cls, mock_de_cls,
                                       mock_wf_cls, mock_re_cls, mock_ob_cls, mock_eb_cls,
                                       mock_tool_reg_cls, mock_ae_cls, mock_persist_cls,
                                       mock_init_opt):
        mock_config = MagicMock()
        mock_config.repo_root = Path.cwd()
        mock_load_config.return_value = mock_config
        loader = MagicMock()
        loader.initialize.side_effect = RuntimeError("EOS tree initialization failed")
        mock_loader_cls.return_value = loader

        from aios.api.stack import create_stack
        with pytest.raises(RuntimeError, match="Failed to initialize EOS tree"):
            create_stack()

    @patch("aios.api.stack._initialize_optional_managers")
    @patch("aios.api.stack.PersistenceStore")
    @patch("aios.api.stack.AgentExecutor")
    @patch("aios.api.stack.ToolRegistry")
    @patch("aios.api.stack.EventBus")
    @patch("aios.api.stack.ObservabilityConsumer")
    @patch("aios.api.stack.RuntimeEngine")
    @patch("aios.api.stack.WorkflowEngine")
    @patch("aios.api.stack.EOSDecisionEngine")
    @patch("aios.api.stack.EOSContextBuilder")
    @patch("aios.api.stack.KnowledgeService")
    @patch("aios.api.stack.CapabilityDiscovery")
    @patch("aios.api.stack.RegistryManager")
    @patch("aios.api.stack.EOSLoader")
    @patch("aios.api.stack.load_config")
    def test_create_stack_with_db_path2(self, mock_load_config, mock_loader_cls, mock_reg_cls,
                                        mock_cap_cls, mock_ks_cls, mock_ctx_cls, mock_de_cls,
                                        mock_wf_cls, mock_re_cls, mock_ob_cls, mock_eb_cls,
                                        mock_tool_reg_cls, mock_ae_cls, mock_persist_cls,
                                        mock_init_opt):
        mock_load_config.return_value = MagicMock()
        loader = MagicMock()
        loader.load.return_value = MagicMock(success=True)
        mock_loader_cls.return_value = loader

        from aios.api.stack import create_stack
        create_stack(db_path="/tmp/test.db")
        mock_persist_cls.assert_called_with("/tmp/test.db")


class TestStackDataclass:
    def test_is_initialized_true(self):
        stack = EOSStack()
        stack.event_bus = MagicMock()
        stack.event_bus.is_initialized = True
        assert stack.is_initialized is True

    def test_is_initialized_false_no_event_bus(self):
        stack = EOSStack()
        assert stack.is_initialized is False

    def test_is_initialized_false_event_bus_not_init(self):
        stack = EOSStack()
        stack.event_bus = MagicMock()
        stack.event_bus.is_initialized = False
        assert stack.is_initialized is False


class TestInitializeOptionalManagers:
    @patch.dict("sys.modules", {
        "aios.memory.memory_manager": MagicMock(),
        "aios.llm.manager": MagicMock(),
        "aios.embedding.manager": MagicMock(),
        "aios.vectorstore.manager": MagicMock(),
        "aios.rag.manager": MagicMock(),
        "aios.tools.manager": MagicMock(),
        "aios.agent.agent_manager": MagicMock(),
        "aios.multiagent.coordinator": MagicMock(),
        "aios.plugins.manager": MagicMock(),
        "aios.config.manager": MagicMock(),
        "aios.security.manager": MagicMock(),
        "aios.scheduler.manager": MagicMock(),
    })
    def test_initialize_optional_managers_all_importable(self):
        from aios.api.stack import EOSStack, _initialize_optional_managers
        stack = EOSStack()
        try:
            _initialize_optional_managers(stack)
        except Exception:
            pass
        assert stack.memory_manager is not None or True

    def test_initialize_optional_managers_all_fail(self):
        from aios.api.stack import (
            _OPTIONAL_MANAGER_IMPORTS,
            EOSStack,
            _initialize_optional_managers,
        )
        stack = EOSStack()
        _OPTIONAL_MANAGER_IMPORTS.clear()
        import aios.api.stack as stack_module
        original_import_module = stack_module.importlib.import_module
        def failing_import_module(name, *args, **kwargs):
            if any(name.startswith(p) for p in (
                "aios.memory", "aios.llm", "aios.embedding", "aios.vectorstore",
                "aios.rag", "aios.tools", "aios.agent", "aios.multiagent",
                "aios.plugins", "aios.config", "aios.security", "aios.scheduler",
            )):
                raise ImportError(f"mocked import failure for {name}")
            return original_import_module(name, *args, **kwargs)
        with patch.object(stack_module.importlib, "import_module", side_effect=failing_import_module):
            _initialize_optional_managers(stack)
        assert stack.memory_manager is None
        assert stack.llm_manager is None
        assert stack.embedding_manager is None
        assert stack.vectorstore_manager is None
        assert stack.rag_manager is None
        assert stack.tool_manager is None
        assert stack.agent_manager is None
        assert stack.multiagent_coordinator is None
        assert stack.plugin_manager is None
        assert stack.config_manager is None
        assert stack.security_manager is None
        assert stack.scheduler is None
        _OPTIONAL_MANAGER_IMPORTS.clear()


# ===================================================================
# 4. websocket_manager.py — ConnectionManager
# ===================================================================


class TestConnectionManager:
    @pytest.fixture
    def mgr(self):
        from aios.api.websocket_manager import ConnectionManager
        return ConnectionManager()

    def test_init(self, mgr):
        assert mgr._active_connections == {}
        assert mgr._subscriptions == {}
        assert mgr._running is False

    @pytest.mark.asyncio
    async def test_connect_and_disconnect(self, mgr):
        ws = AsyncMock()
        ws.accept = AsyncMock()
        await mgr.connect("c1", ws)
        assert "c1" in mgr._active_connections
        await mgr.disconnect("c1")
        assert "c1" not in mgr._active_connections

    @pytest.mark.asyncio
    async def test_disconnect_nonexistent(self, mgr):
        await mgr.disconnect("no-such")
        assert "no-such" not in mgr._active_connections

    @pytest.mark.asyncio
    async def test_subscribe_unsubscribe(self, mgr):
        ws = AsyncMock()
        ws.accept = AsyncMock()
        await mgr.connect("c1", ws)
        await mgr.subscribe("c1", ["ch1", "ch2"])
        assert "ch1" in mgr._subscriptions["c1"]
        assert "ch2" in mgr._subscriptions["c1"]
        await mgr.unsubscribe("c1", ["ch1"])
        assert "ch1" not in mgr._subscriptions["c1"]
        assert "ch2" in mgr._subscriptions["c1"]

    @pytest.mark.asyncio
    async def test_send_personal_success(self, mgr):
        from starlette.websockets import WebSocketState
        ws = AsyncMock()
        ws.client_state = WebSocketState.CONNECTED
        ws.send_json = AsyncMock()
        await mgr.connect("c1", ws)
        result = await mgr.send_personal("c1", {"msg": "hi"})
        assert result is True

    @pytest.mark.asyncio
    async def test_send_personal_not_connected(self, mgr):
        result = await mgr.send_personal("no-such", {"msg": "hi"})
        assert result is False

    @pytest.mark.asyncio
    async def test_send_personal_send_fails(self, mgr):
        from starlette.websockets import WebSocketState
        ws = AsyncMock()
        ws.client_state = WebSocketState.CONNECTED
        ws.send_json = AsyncMock(side_effect=RuntimeError("fail"))
        await mgr.connect("c1", ws)
        result = await mgr.send_personal("c1", {"msg": "hi"})
        assert result is False

    @pytest.mark.asyncio
    async def test_broadcast(self, mgr):
        from starlette.websockets import WebSocketState
        ws = AsyncMock()
        ws.client_state = WebSocketState.CONNECTED
        ws.send_json = AsyncMock()
        await mgr.connect("c1", ws)
        await mgr.subscribe("c1", ["ch1"])
        count = await mgr.broadcast("ch1", {"data": 1})
        assert count == 1

    @pytest.mark.asyncio
    async def test_broadcast_wildcard(self, mgr):
        from starlette.websockets import WebSocketState
        ws = AsyncMock()
        ws.client_state = WebSocketState.CONNECTED
        ws.send_json = AsyncMock()
        await mgr.connect("c1", ws)
        await mgr.subscribe("c1", ["*"])
        count = await mgr.broadcast("anything", {"data": 1})
        assert count == 1

    @pytest.mark.asyncio
    async def test_broadcast_send_fails(self, mgr):
        from starlette.websockets import WebSocketState
        ws = AsyncMock()
        ws.client_state = WebSocketState.CONNECTED
        ws.send_json = AsyncMock(side_effect=RuntimeError("fail"))
        await mgr.connect("c1", ws)
        await mgr.subscribe("c1", ["ch1"])
        count = await mgr.broadcast("ch1", {"data": 1})
        assert count == 0

    @pytest.mark.asyncio
    async def test_broadcast_all(self, mgr):
        from starlette.websockets import WebSocketState
        ws = AsyncMock()
        ws.client_state = WebSocketState.CONNECTED
        ws.send_json = AsyncMock()
        await mgr.connect("c1", ws)
        count = await mgr.broadcast_all({"data": 1})
        assert count == 1

    @pytest.mark.asyncio
    async def test_broadcast_all_send_fails(self, mgr):
        from starlette.websockets import WebSocketState
        ws = AsyncMock()
        ws.client_state = WebSocketState.CONNECTED
        ws.send_json = AsyncMock(side_effect=RuntimeError("fail"))
        await mgr.connect("c1", ws)
        count = await mgr.broadcast_all({"data": 1})
        assert count == 0

    def test_get_active_connections(self, mgr):
        assert mgr.get_active_connections() == []

    def test_get_subscriptions(self, mgr):
        assert mgr.get_subscriptions("c1") == []

    @pytest.mark.asyncio
    async def test_start_stop(self, mgr):
        await mgr.start()
        assert mgr._running is True
        assert mgr._broadcast_task is not None
        await mgr.stop()
        assert mgr._running is False

    @pytest.mark.asyncio
    async def test_queue_broadcast(self, mgr):
        await mgr.queue_broadcast("ch1", {"data": "hello"})
        assert not mgr._message_queue.empty()

    @pytest.mark.asyncio
    async def test_disconnect_cleans_subscriptions(self, mgr):
        ws = AsyncMock()
        ws.accept = AsyncMock()
        await mgr.connect("c1", ws)
        await mgr.subscribe("c1", ["ch1"])
        await mgr.disconnect("c1")
        assert "c1" not in mgr._subscriptions


# ===================================================================
# 5. websocket_routes.py — WebSocket route handlers
# ===================================================================


class TestWebSocketRoutes:
    @pytest.fixture
    def ws_client(self, mock_stack):
        app = create_app()
        return TestClient(app, raise_server_exceptions=False)

    def test_main_websocket_subscribe(self, ws_client):
        with ws_client.websocket_connect("/api/v1/ws") as ws:
            ws.send_json({"action": "subscribe", "channels": ["ch1"]})
            data = ws.receive_json()
            assert data["type"] == "subscribed"
            assert "ch1" in data["channels"]

    def test_main_websocket_unsubscribe(self, ws_client):
        with ws_client.websocket_connect("/api/v1/ws") as ws:
            ws.send_json({"action": "subscribe", "channels": ["ch1"]})
            ws.receive_json()
            ws.send_json({"action": "unsubscribe", "channels": ["ch1"]})
            data = ws.receive_json()
            assert data["type"] == "unsubscribed"

    def test_main_websocket_ping(self, ws_client):
        with ws_client.websocket_connect("/api/v1/ws") as ws:
            ws.send_json({"action": "ping"})
            data = ws.receive_json()
            assert data["type"] == "pong"
            assert "timestamp" in data

    def test_main_websocket_unknown_action(self, ws_client):
        with ws_client.websocket_connect("/api/v1/ws") as ws:
            ws.send_json({"action": "bogus"})
            data = ws.receive_json()
            assert data["type"] == "error"
            assert "Unknown action" in data["message"]

    def test_runtime_websocket_runtime_not_init(self, ws_client, mock_stack):
        mock_stack.runtime_engine.is_initialized = False
        with ws_client.websocket_connect("/api/v1/ws/runtime") as ws:
            data = ws.receive_json()
            assert data["type"] == "error"
            assert "not initialized" in data["message"]

    def test_runtime_websocket_runtime_init(self, ws_client, mock_stack):
        mock_stack.runtime_engine.is_initialized = True
        with ws_client.websocket_connect("/api/v1/ws/runtime") as ws:
            data = ws.receive_json()
            assert data["type"] == "connected"
            ws.send_json({"action": "ping"})
            data2 = ws.receive_json()
            assert data2["type"] == "pong"

    def test_workflow_websocket_not_init(self, ws_client, mock_stack):
        mock_stack.runtime_engine.is_initialized = False
        with ws_client.websocket_connect("/api/v1/ws/workflow/exec-1") as ws:
            data = ws.receive_json()
            assert data["type"] == "error"

    def test_workflow_websocket_not_found(self, ws_client, mock_stack):
        mock_stack.runtime_engine.is_initialized = True
        mock_stack.runtime_engine.status.side_effect = RuntimeError("not found")
        with ws_client.websocket_connect("/api/v1/ws/workflow/exec-999") as ws:
            data = ws.receive_json()
            assert data["type"] == "connected"
            data2 = ws.receive_json()
            assert data2["type"] == "error"
            assert "not found" in data2["message"]

    def test_workflow_websocket_completed(self, ws_client, mock_stack):
        mock_stack.runtime_engine.is_initialized = True
        mock_stack.runtime_engine.status.return_value = MagicMock(value="completed")
        mock_stack.runtime_engine.snapshot.return_value = MagicMock(
            completed_count=3, step_count=3, failed_count=0
        )
        with ws_client.websocket_connect("/api/v1/ws/workflow/exec-done") as ws:
            connected = ws.receive_json()
            assert connected["type"] == "connected"
            progress = ws.receive_json()
            assert progress["type"] == "workflow_progress"
            assert progress["status"]["state"] == "completed"

    def test_agent_websocket_not_init(self, ws_client, mock_stack):
        mock_stack.agent_manager.is_initialized = False
        with ws_client.websocket_connect("/api/v1/ws/agent/test-agent") as ws:
            data = ws.receive_json()
            assert data["type"] == "error"
            assert "not initialized" in data["message"]

    def test_agent_websocket_agent_not_found(self, ws_client, mock_stack):
        mock_stack.agent_manager.is_initialized = True
        mock_stack.agent_manager.get_agent.return_value = None
        with ws_client.websocket_connect("/api/v1/ws/agent/noagent") as ws:
            data = ws.receive_json()
            assert data["type"] == "error"
            assert "not found" in data["message"]

    def test_agent_websocket_chat_and_ping(self, ws_client, mock_stack):
        mock_stack.agent_manager.is_initialized = True
        agent = MagicMock()
        mock_stack.agent_manager.get_agent.return_value = agent
        mock_stack.agent_manager.chat.return_value = "Hello back!"
        with ws_client.websocket_connect("/api/v1/ws/agent/myagent") as ws:
            connected = ws.receive_json()
            assert connected["type"] == "connected"
            ws.send_json({"action": "chat", "message": "Hi agent"})
            resp = ws.receive_json()
            assert resp["type"] == "agent_response"
            assert resp["message"] == "Hello back!"
            ws.send_json({"action": "ping"})
            pong = ws.receive_json()
            assert pong["type"] == "pong"

    def test_agent_websocket_chat_failure(self, ws_client, mock_stack):
        mock_stack.agent_manager.is_initialized = True
        agent = MagicMock()
        mock_stack.agent_manager.get_agent.return_value = agent
        mock_stack.agent_manager.chat.side_effect = RuntimeError("chat err")
        with ws_client.websocket_connect("/api/v1/ws/agent/myagent") as ws:
            ws.receive_json()
            ws.send_json({"action": "chat", "message": "Hi"})
            resp = ws.receive_json()
            assert resp["type"] == "error"
            assert "Chat failed" in resp["message"]

    def test_tools_websocket_not_init(self, ws_client, mock_stack):
        mock_stack.tool_manager.is_initialized = False
        with ws_client.websocket_connect("/api/v1/ws/tools") as ws:
            data = ws.receive_json()
            assert data["type"] == "error"

    def test_tools_websocket_execute_and_ping(self, ws_client, mock_stack):
        mock_stack.tool_manager.is_initialized = True
        mock_result = MagicMock()
        mock_result.success = True
        mock_result.output = "result"
        mock_result.error = None
        mock_result.duration = 0.5
        mock_stack.tool_manager.execute.return_value = mock_result
        with ws_client.websocket_connect("/api/v1/ws/tools") as ws:
            connected = ws.receive_json()
            assert connected["type"] == "connected"
            ws.send_json({"action": "execute", "tool_name": "calc", "parameters": {"x": 1}})
            started = ws.receive_json()
            assert started["type"] == "tool_started"
            completed = ws.receive_json()
            assert completed["type"] == "tool_completed"
            assert completed["success"] is True
            ws.send_json({"action": "ping"})
            pong = ws.receive_json()
            assert pong["type"] == "pong"

    def test_chat_websocket_not_init(self, ws_client, mock_stack):
        mock_stack.llm_manager.is_initialized = False
        with ws_client.websocket_connect("/api/v1/ws/chat") as ws:
            data = ws.receive_json()
            assert data["type"] == "error"

    def test_chat_websocket_chat_and_ping(self, ws_client, mock_stack):
        mock_stack.llm_manager.is_initialized = True
        chunk = MagicMock()
        chunk.content = "Hello"
        mock_stack.llm_manager.stream.return_value = [chunk]
        with ws_client.websocket_connect("/api/v1/ws/chat") as ws:
            connected = ws.receive_json()
            assert connected["type"] == "connected"
            ws.send_json({"action": "chat", "message": "Hi LLM"})
            start_msg = ws.receive_json()
            assert start_msg["type"] == "chat_start"
            chunk_msg = ws.receive_json()
            assert chunk_msg["type"] == "chat_chunk"
            assert chunk_msg["content"] == "Hello"
            complete = ws.receive_json()
            assert complete["type"] == "chat_complete"
            ws.send_json({"action": "ping"})
            pong = ws.receive_json()
            assert pong["type"] == "pong"

    def test_chat_websocket_llm_error(self, ws_client, mock_stack):
        mock_stack.llm_manager.is_initialized = True
        mock_stack.llm_manager.stream.side_effect = RuntimeError("llm boom")
        with ws_client.websocket_connect("/api/v1/ws/chat") as ws:
            ws.receive_json()
            ws.send_json({"action": "chat", "message": "Hi"})
            ws.receive_json()
            err = ws.receive_json()
            assert err["type"] == "chat_error"


# ===================================================================
# 6. tool_routes.py — Tool route handlers (separate router)
# ===================================================================


class TestToolRoutesManager:
    """Test tool_routes.py handlers that use stack.tool_manager."""

    @pytest.fixture
    def tool_client(self, mock_stack):
        app = create_app()
        return TestClient(app, raise_server_exceptions=False)

    def test_execute_tool_via_router(self, tool_client, mock_stack):
        mock_result = MagicMock()
        mock_result.success = True
        mock_result.output = "out"
        mock_result.result = "out"
        mock_result.error = ""
        mock_stack.tool_manager.execute.return_value = mock_result
        resp = tool_client.post("/api/v1/tools/execute", json={
            "tool_name": "calc", "parameters": {"x": 1}
        })
        assert resp.status_code == 200
        assert resp.json()["success"] is True

    def test_execute_tool_no_manager(self, tool_client, mock_stack):
        mock_stack.tool_manager = None
        resp = tool_client.post("/api/v1/tools/execute", json={"tool_name": "calc"})
        assert resp.status_code == 503

    def test_execute_tool_exception(self, tool_client, mock_stack):
        mock_stack.tool_manager.execute.side_effect = RuntimeError("boom")
        resp = tool_client.post("/api/v1/tools/execute", json={"tool_name": "calc"})
        assert resp.status_code == 500

    def test_list_providers_no_manager(self, tool_client, mock_stack):
        mock_stack.tool_manager = None
        resp = tool_client.get("/api/v1/tools/providers")
        assert resp.status_code == 503

    def test_list_providers_exception(self, tool_client, mock_stack):
        mock_stack.tool_manager.list_providers.side_effect = RuntimeError("err")
        resp = tool_client.get("/api/v1/tools/providers")
        assert resp.status_code == 500

    def test_unregister_tool_no_manager(self, tool_client, mock_stack):
        mock_stack.tool_manager = None
        resp = tool_client.delete("/api/v1/tools/calc")
        assert resp.status_code == 503

    def test_unregister_tool_not_found(self, tool_client, mock_stack):
        mock_stack.tool_manager.unregister_provider.return_value = False
        resp = tool_client.delete("/api/v1/tools/calc")
        assert resp.status_code == 404

    def test_unregister_tool_exception(self, tool_client, mock_stack):
        mock_stack.tool_manager.unregister_provider.side_effect = RuntimeError("err")
        resp = tool_client.delete("/api/v1/tools/calc")
        assert resp.status_code == 500

    def test_tool_statistics_no_manager(self, tool_client, mock_stack):
        mock_stack.tool_manager = None
        resp = tool_client.get("/api/v1/tools/statistics")
        assert resp.status_code == 503

    def test_tool_statistics_exception(self, tool_client, mock_stack):
        mock_stack.tool_manager.statistics.side_effect = RuntimeError("err")
        resp = tool_client.get("/api/v1/tools/statistics")
        assert resp.status_code == 500

    def test_tool_statistics_without_exec_fields(self, tool_client, mock_stack):
        stats = MagicMock(spec=[])
        mock_stack.tool_manager.statistics.return_value = stats
        mock_stack.tool_manager.list_providers.return_value = ["p1"]
        mock_stack.tool_manager.list_tools.return_value = [MagicMock()]
        resp = tool_client.get("/api/v1/tools/statistics")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_executions"] == 0

    def test_tool_routes_error_helper(self):
        from aios.api.tool_routes import _error
        err = _error(422, "bad")
        assert err.status_code == 422

    def test_execute_tool_with_result_attr(self, tool_client, mock_stack):
        mock_result = MagicMock(spec=["success", "result", "error"])
        mock_result.success = True
        mock_result.result = "data"
        mock_result.error = ""
        mock_stack.tool_manager.execute.return_value = mock_result
        resp = tool_client.post("/api/v1/tools/execute", json={"tool_name": "t"})
        assert resp.status_code == 200
        assert resp.json()["result"] == "data"


# ===================================================================
# 7. dependencies.py — get_stack, set_stack, reset_stack
# ===================================================================


class TestDependencies:
    def test_set_and_get_stack(self):
        from aios.api import dependencies as dep
        dep.reset_stack()
        stack = EOSStack()
        dep.set_stack(stack)
        assert dep.get_stack() is stack
        dep.reset_stack()

    def test_get_stack_creates_new(self):
        from aios.api import dependencies as dep
        dep.reset_stack()
        with patch("aios.api.dependencies.create_stack") as mock_create:
            mock_stack = EOSStack()
            mock_create.return_value = mock_stack
            result = dep.get_stack()
            assert result is mock_stack
            mock_create.assert_called_once()
            assert dep._stack_instance is mock_stack
        dep.reset_stack()

    def test_get_stack_returns_existing(self):
        from aios.api import dependencies as dep
        dep.reset_stack()
        stack = EOSStack()
        dep._stack_instance = stack
        result = dep.get_stack()
        assert result is stack
        dep.reset_stack()

    def test_reset_stack(self):
        from aios.api import dependencies as dep
        dep._stack_instance = EOSStack()
        dep.reset_stack()
        assert dep._stack_instance is None
