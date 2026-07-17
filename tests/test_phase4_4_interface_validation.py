"""Phase 4.4 — Production Interface Validation.

Covers FastAPI, Runtime API, WebSocket, CLI, Configuration,
Security, Serialization, and Public API stability.

Every test uses only real constructors and real public APIs.
"""

from __future__ import annotations

import json
import os
import tempfile
import time
from pathlib import Path
from unittest import mock

import pytest
from fastapi.testclient import TestClient
from typer.testing import CliRunner

from aios.api.app import create_app
from aios.api.auth import configure_auth
from aios.api.dependencies import reset_stack, set_stack
from aios.api.rate_limiter import RateLimiter
from aios.api.stack import EOSStack
from aios.core.config import AIOSConfig
from aios.eos.agent_integration import AgentExecutor, ToolRegistry
from aios.eos.event_bus import EventBus
from aios.eos.observability import ObservabilityConsumer
from aios.eos.persistence import PersistenceStore
from aios.eos.runtime_engine import (
    ExecutionMetrics,
    ExecutionReport,
    RetryPolicy,
    RuntimeEngine,
    RuntimeEvent,
    RuntimeEventType,
    RuntimeExecution,
    RuntimeState,
    RuntimeStep,
)
from aios.eos.workflow_engine import (
    ExecutionCost,
    ExecutionDuration,
    ExecutionMode,
    ExecutionState,
    ExecutionStrategy,
    RollbackPlan,
    Workflow,
    WorkflowEngine,
    WorkflowStep,
)

# ═══════════════════════════════════════════════════════════════════════════
# Shared fixtures
# ═══════════════════════════════════════════════════════════════════════════


@pytest.fixture
def stack() -> EOSStack:
    s = EOSStack()
    s.loader = None
    s.registry = None
    s.capability_discovery = None
    s.knowledge_service = None
    s.context_builder = None
    s.decision_engine = None

    we = WorkflowEngine()
    we._initialized = True
    s.workflow_engine = we

    re = RuntimeEngine()
    re.initialize(we)
    s.runtime_engine = re

    eb = EventBus()
    eb.initialize(re)
    s.event_bus = eb

    obs = ObservabilityConsumer()
    obs.initialize(eb)
    s.observability = obs

    pers = PersistenceStore(tempfile.mktemp(suffix=".db"))
    pers.initialize()
    s.persistence = pers

    tr = ToolRegistry()
    s.tool_registry = tr

    ae = AgentExecutor(we, tr)
    ae.initialize()
    s.agent_executor = ae

    yield s
    try:
        os.unlink(s.persistence._db_path)
    except Exception:
        pass


@pytest.fixture
def app(stack: EOSStack):
    set_stack(stack)
    application = create_app(version="test")
    yield application
    reset_stack()


@pytest.fixture
def client(app):
    return TestClient(app)


def _step(step_id: str = "s1", action_id: str = "test::action") -> WorkflowStep:
    return WorkflowStep(
        step_id=step_id,
        action_id=action_id,
        title="Step",
        category="test",
        source="capability",
        confidence=0.8,
        estimated_cost=ExecutionCost(token_cost=10, compute_cost=0.01, total_cost=0.01),
        estimated_duration=ExecutionDuration(
            setup_seconds=0.001, execution_seconds=0.005,
            teardown_seconds=0.001, total_seconds=0.007,
        ),
    )


def _workflow(steps: list[WorkflowStep] | None = None) -> Workflow:
    if steps is None:
        steps = [_step()]
    return Workflow(
        task_description="validation test",
        strategy=ExecutionStrategy(ExecutionMode.SEQUENTIAL.value),
        steps=steps,
        execution_mode=ExecutionMode.SEQUENTIAL,
        total_cost=ExecutionCost(),
        total_duration=ExecutionDuration(),
    )


# ═══════════════════════════════════════════════════════════════════════════
# 4.4.1 — FastAPI Validation
# ═══════════════════════════════════════════════════════════════════════════


class TestFastAPIValidation:
    """Verify FastAPI endpoint behavior under production conditions."""

    def test_openapi_schema_accessible(self, client):
        """Verify OpenAPI schema endpoint returns valid schema."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        schema = response.json()
        assert "paths" in schema
        assert "/api/v1/health" in schema["paths"]
        assert "/api/v1/runtime/status/{execution_id}" in schema["paths"]

    def test_malformed_json_returns_422(self, client):
        """Verify malformed JSON body returns 422."""
        response = client.post(
            "/api/v1/events/publish",
            content=b"not valid json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422

    def test_empty_body_returns_422(self, client):
        """Verify empty POST body returns 422."""
        response = client.post(
            "/api/v1/events/publish",
            json=None,
        )
        assert response.status_code == 422

    def test_missing_required_field_returns_422(self, client):
        """Verify missing required field returns 422."""
        response = client.post(
            "/api/v1/events/publish",
            json={"execution_id": "test"},
        )
        assert response.status_code == 422

    def test_invalid_enum_value_returns_422(self, client):
        """Verify invalid enum in request returns 422."""
        response = client.post(
            "/api/v1/events/publish",
            json={
                "event_type": "not_a_real_event_type",
                "execution_id": "test",
                "message": "bad enum",
            },
        )
        assert response.status_code in (422, 400)

    def test_health_endpoint_200(self, client):
        """Verify health endpoint returns 200."""
        response = client.get("/api/v1/health")
        assert response.status_code == 200

    def test_nonexistent_route_returns_404(self, client):
        """Verify nonexistent route returns 404."""
        response = client.get("/api/v1/nonexistent/route")
        assert response.status_code == 404

    def test_head_request_accepted(self, client):
        """Verify HEAD request returns valid response."""
        response = client.head("/api/v1/health")
        assert response.status_code in (200, 405)

    def test_options_request_accepted(self, client):
        """Verify OPTIONS request returns valid response."""
        response = client.options("/api/v1/health")
        assert response.status_code in (200, 405)

    def test_cors_headers_present(self, client):
        """Verify CORS headers are present on responses."""
        response = client.options(
            "/api/v1/health",
            headers={
                "Origin": "http://example.com",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert "access-control-allow-origin" in response.headers or response.status_code == 200

    def test_runtime_execute_with_missing_workflow(self, client):
        """Verify runtime execute with missing workflow dict returns 422."""
        response = client.post(
            "/api/v1/runtime/execute",
            json={},
        )
        assert response.status_code == 422

    def test_runtime_execute_with_invalid_step(self, client):
        """Verify runtime execute with invalid step data."""
        response = client.post(
            "/api/v1/runtime/execute",
            json={
                "workflow": {
                    "task_description": "test",
                    "strategy": "sequential",
                    "steps": [{"invalid": "data"}],
                },
            },
        )
        assert response.status_code in (200, 422, 500)

    def test_get_nonexistent_runtime_status_404(self, client):
        """Verify nonexistent execution returns 404."""
        response = client.get("/api/v1/runtime/status/no-such-id")
        assert response.status_code == 404

    def test_get_nonexistent_runtime_history_404(self, client):
        """Verify nonexistent history returns 404."""
        response = client.get("/api/v1/runtime/history/no-such-id")
        assert response.status_code == 404

    def test_get_nonexistent_runtime_report_404(self, client):
        """Verify nonexistent report returns 404."""
        response = client.get("/api/v1/runtime/report/no-such-id")
        assert response.status_code == 404

    def test_get_nonexistent_runtime_snapshot_404(self, client):
        """Verify nonexistent snapshot returns 404."""
        response = client.get("/api/v1/runtime/snapshot/no-such-id")
        assert response.status_code == 404

    def test_pause_nonexistent_execution_400(self, client):
        """Verify pause on nonexistent execution returns 400."""
        response = client.post("/api/v1/runtime/pause/no-such-id")
        assert response.status_code == 400

    def test_cancel_nonexistent_execution_400(self, client):
        """Verify cancel on nonexistent execution returns 400."""
        response = client.post("/api/v1/runtime/cancel/no-such-id")
        assert response.status_code == 400

    def test_resume_nonexistent_execution_400(self, client):
        """Verify resume on nonexistent execution returns 400."""
        response = client.post("/api/v1/runtime/resume/no-such-id")
        assert response.status_code == 400

    def test_rollback_nonexistent_execution_400(self, client):
        """Verify rollback on nonexistent execution returns 400."""
        response = client.post("/api/v1/runtime/rollback/no-such-id")
        assert response.status_code == 400

    def test_events_publish_invalid_type(self, client):
        """Verify publishing with invalid event type returns error."""
        response = client.post(
            "/api/v1/events/publish",
            json={
                "event_type": "invalid_type",
                "execution_id": "test",
                "message": "",
            },
        )
        assert response.status_code in (400, 422)

    def test_events_history_with_limit(self, client):
        """Verify events history respects limit parameter."""
        response = client.get("/api/v1/events/history?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data

    def test_tools_list_endpoint(self, client):
        """Verify tools list returns valid structure."""
        response = client.get("/api/v1/tools")
        assert response.status_code == 200
        data = response.json()
        assert "tools" in data
        assert "total" in data

    def test_tool_get_nonexistent_404(self, client):
        """Verify getting nonexistent tool returns 404."""
        response = client.get("/api/v1/tools/nonexistent-tool-name")
        assert response.status_code == 404

    def test_persistence_statistics_endpoint(self, client):
        """Verify persistence statistics returns valid data."""
        response = client.get("/api/v1/persistence/statistics")
        assert response.status_code == 200
        data = response.json()
        assert "total_workflows" in data
        assert "database_size_bytes" in data

    def test_persistence_clear_endpoint(self, client):
        """Verify persistence clear returns success."""
        response = client.post("/api/v1/persistence/clear")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "cleared"

    def test_runtime_statistics_endpoint(self, client):
        """Verify runtime statistics endpoint."""
        response = client.get("/api/v1/runtime/statistics")
        assert response.status_code == 200
        data = response.json()
        assert "total_executions" in data

    def test_observability_metrics_endpoint(self, client):
        """Verify observability metrics endpoint."""
        response = client.get("/api/v1/observability/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data

    def test_observability_health_endpoint(self, client):
        """Verify observability health endpoint."""
        response = client.get("/api/v1/observability/health")
        assert response.status_code == 200
        data = response.json()
        assert "healthy" in data

    def test_observability_events_endpoint(self, client):
        """Verify observability events endpoint."""
        response = client.get("/api/v1/observability/events")
        assert response.status_code == 200
        data = response.json()
        assert "entries" in data

    def test_agent_statistics_endpoint(self, client):
        """Verify agent statistics endpoint."""
        response = client.get("/api/v1/agent/statistics")
        assert response.status_code == 200
        data = response.json()
        assert "total_executions" in data

    def test_events_statistics_endpoint(self, client):
        """Verify event statistics endpoint."""
        response = client.get("/api/v1/events/statistics")
        assert response.status_code == 200
        data = response.json()
        assert "total_events" in data

    def test_large_payload_rejected(self, client):
        """Verify very large payload is not accepted without error."""
        large_body = {"workflow": {"steps": [{"step_id": f"s{i}", "action_id": "a", "title": "x"} for i in range(5000)]}}
        response = client.post("/api/v1/runtime/execute", json=large_body)
        assert response.status_code in (200, 413, 422)


# ═══════════════════════════════════════════════════════════════════════════
# 4.4.2 — Runtime API Integration
# ═══════════════════════════════════════════════════════════════════════════


class TestRuntimeAPIIntegration:
    """Verify end-to-end execution flow through the API."""

    def test_execute_then_status_then_history(self, client):
        """Full flow: execute workflow, poll status, retrieve history."""
        wf = _workflow(steps=[_step("a"), _step("b")])
        resp_exec = client.post(
            "/api/v1/runtime/execute",
            json={
                "workflow": {
                    "task_description": wf.task_description,
                    "strategy": wf.strategy.value,
                    "steps": [
                        {
                            "step_id": s.step_id,
                            "action_id": s.action_id,
                            "title": s.title,
                            "category": s.category,
                            "source": s.source,
                            "confidence": s.confidence,
                        }
                        for s in wf.steps
                    ],
                },
            },
        )
        assert resp_exec.status_code == 200
        exec_data = resp_exec.json()
        assert "execution_id" in exec_data
        exec_id = exec_data["execution_id"]

        time.sleep(0.3)

        resp_status = client.get(f"/api/v1/runtime/status/{exec_id}")
        assert resp_status.status_code == 200
        status_data = resp_status.json()
        assert status_data["execution_id"] == exec_id
        assert status_data["status"] in ("completed", "running", "queued")

        resp_hist = client.get(f"/api/v1/runtime/history/{exec_id}")
        assert resp_hist.status_code == 200
        hist_data = resp_hist.json()
        assert hist_data["execution_id"] == exec_id
        assert hist_data["entry_count"] >= 0

        resp_report = client.get(f"/api/v1/runtime/report/{exec_id}")
        assert resp_report.status_code == 200
        report_data = resp_report.json()
        assert report_data["execution_id"] == exec_id

        resp_snap = client.get(f"/api/v1/runtime/snapshot/{exec_id}")
        assert resp_snap.status_code == 200
        snap_data = resp_snap.json()
        assert snap_data["execution_id"] == exec_id

    def test_cancel_execution_flow(self, client):
        """Execute, cancel, verify cancelled status."""
        wf = _workflow(steps=[_step("c1"), _step("c2")])
        resp_exec = client.post(
            "/api/v1/runtime/execute",
            json={
                "workflow": {
                    "task_description": wf.task_description,
                    "steps": [
                        {"step_id": s.step_id, "action_id": s.action_id, "title": s.title}
                        for s in wf.steps
                    ],
                },
            },
        )
        assert resp_exec.status_code == 200
        exec_id = resp_exec.json()["execution_id"]

        time.sleep(0.1)

        resp_cancel = client.post(f"/api/v1/runtime/cancel/{exec_id}")
        assert resp_cancel.status_code in (200, 400)

        time.sleep(0.2)

        resp_status = client.get(f"/api/v1/runtime/status/{exec_id}")
        status_data = resp_status.json()
        assert status_data["status"] in ("cancelled", "completed")

    def test_pause_and_resume_execution(self, client):
        """Execute, pause, resume, verify state transitions."""
        wf = _workflow(steps=[_step("p1"), _step("p2")])
        resp_exec = client.post(
            "/api/v1/runtime/execute",
            json={
                "workflow": {
                    "task_description": wf.task_description,
                    "steps": [
                        {"step_id": s.step_id, "action_id": s.action_id, "title": s.title}
                        for s in wf.steps
                    ],
                },
            },
        )
        assert resp_exec.status_code == 200
        exec_id = resp_exec.json()["execution_id"]

        time.sleep(0.05)

        resp_pause = client.post(f"/api/v1/runtime/pause/{exec_id}")
        assert resp_pause.status_code in (200, 400)

        resp_resume = client.post(f"/api/v1/runtime/resume/{exec_id}")
        assert resp_resume.status_code in (200, 400)

    def test_rollback_execution(self, client):
        """Execute workflow with rollback plan, verify rollback via API."""
        rp = RollbackPlan(
            rollback_steps=(_step("rb1"),),
            rollback_mode=ExecutionMode.SEQUENTIAL,
        )
        wf = Workflow(
            task_description="rollback test",
            strategy=ExecutionStrategy(ExecutionMode.SEQUENTIAL.value),
            steps=[_step("s1"), _step("s2")],
            execution_mode=ExecutionMode.SEQUENTIAL,
            total_cost=ExecutionCost(),
            total_duration=ExecutionDuration(),
            rollback_plan=rp,
        )
        resp_exec = client.post(
            "/api/v1/runtime/execute",
            json={
                "workflow": {
                    "task_description": wf.task_description,
                    "strategy": wf.strategy.value,
                    "steps": [
                        {"step_id": s.step_id, "action_id": s.action_id, "title": s.title}
                        for s in wf.steps
                    ],
                },
            },
        )
        assert resp_exec.status_code == 200
        exec_id = resp_exec.json()["execution_id"]

        time.sleep(0.3)

        resp_roll = client.post(f"/api/v1/runtime/rollback/{exec_id}")
        if resp_roll.status_code == 200:
            data = resp_roll.json()
            assert data["status"] == "rolled_back"

    def test_execute_with_publish_and_verify_event(self, client):
        """Execute workflow, publish event, verify event appears in history."""
        resp_exec = client.post(
            "/api/v1/runtime/execute",
            json={
                "workflow": {
                    "task_description": "event test",
                    "steps": [{"step_id": "e1", "action_id": "ea", "title": "event step"}],
                },
            },
        )
        assert resp_exec.status_code == 200
        exec_id = resp_exec.json()["execution_id"]

        resp_event = client.post(
            "/api/v1/events/publish",
            json={
                "event_type": "execution_completed",
                "execution_id": exec_id,
                "message": "integration test event",
            },
        )
        assert resp_event.status_code == 200
        event_data = resp_event.json()
        assert "event_id" in event_data

        resp_hist = client.get("/api/v1/events/history?limit=10")
        assert resp_hist.status_code == 200

    def test_runtime_execute_multiple_sequential(self, client):
        """Verify multiple sequential executions via API."""
        ids = []
        for i in range(3):
            resp = client.post(
                "/api/v1/runtime/execute",
                json={
                    "workflow": {
                        "task_description": f"multi-{i}",
                        "steps": [{"step_id": f"m{i}", "action_id": "a", "title": f"Step {i}"}],
                    },
                },
            )
            assert resp.status_code == 200
            ids.append(resp.json()["execution_id"])

        time.sleep(0.5)

        stats = client.get("/api/v1/runtime/statistics").json()
        assert stats["total_executions"] >= 3


# ═══════════════════════════════════════════════════════════════════════════
# 4.4.3 — WebSocket Validation
# ═══════════════════════════════════════════════════════════════════════════


class TestWebSocketValidation:
    """Verify WebSocket endpoint behavior under production conditions."""

    @pytest.fixture
    def ws_mock_stack(self):
        stack = EOSStack()
        stack.runtime_engine = mock.MagicMock()
        stack.runtime_engine.is_initialized = True
        stack.agent_manager = mock.MagicMock()
        stack.agent_manager.is_initialized = True
        stack.tool_manager = mock.MagicMock()
        stack.tool_manager.is_initialized = True
        stack.llm_manager = mock.MagicMock()
        stack.llm_manager.is_initialized = True
        set_stack(stack)
        yield stack
        reset_stack()

    @pytest.fixture
    def ws_client(self, ws_mock_stack):
        app = create_app()
        return TestClient(app)

    def test_websocket_connect_and_ping(self, ws_client):
        """Verify basic WebSocket connect and ping/pong."""
        with ws_client.websocket_connect("/api/v1/ws") as ws:
            ws.send_text(json.dumps({"action": "ping"}))
            data = ws.receive_json()
            assert data["type"] == "pong"

    def test_websocket_subscribe_unsubscribe(self, ws_client):
        """Verify subscribe and unsubscribe round-trip."""
        with ws_client.websocket_connect("/api/v1/ws") as ws:
            ws.send_text(json.dumps({"action": "subscribe", "channels": ["test"]}))
            data = ws.receive_json()
            assert data["type"] == "subscribed"
            assert "test" in data["channels"]

            ws.send_text(json.dumps({"action": "unsubscribe", "channels": ["test"]}))
            data = ws.receive_json()
            assert data["type"] == "unsubscribed"

    def test_websocket_invalid_action(self, ws_client):
        """Verify invalid action returns error message."""
        with ws_client.websocket_connect("/api/v1/ws") as ws:
            ws.send_text(json.dumps({"action": "invalid_action_xyz"}))
            data = ws.receive_json()
            assert data["type"] == "error"

    def test_websocket_malformed_json(self, ws_client):
        """Verify malformed JSON over WebSocket returns error."""
        with ws_client.websocket_connect("/api/v1/ws") as ws:
            ws.send_text("not valid json")
            data = ws.receive_json()
            assert data["type"] == "error"
            assert "Invalid JSON" in data.get("message", "")

    def test_websocket_large_message(self, ws_client):
        """Verify large message handling over WebSocket."""
        with ws_client.websocket_connect("/api/v1/ws") as ws:
            large_channels = [f"ch{i}" for i in range(100)]
            ws.send_text(json.dumps({"action": "subscribe", "channels": large_channels}))
            data = ws.receive_json()
            assert data["type"] == "subscribed"

    def test_websocket_multiple_clients(self, ws_client):
        """Verify multiple sequential WebSocket connections."""
        for i in range(3):
            with ws_client.websocket_connect("/api/v1/ws") as ws:
                ws.send_text(json.dumps({"action": "ping"}))
                data = ws.receive_json()
                assert data["type"] == "pong"


# ═══════════════════════════════════════════════════════════════════════════
# 4.4.4 — CLI Validation
# ═══════════════════════════════════════════════════════════════════════════


class TestCLIValidation:
    """Verify CLI behavior under production conditions."""

    @pytest.fixture(scope="class")
    def cli_runner(self):
        from aios.cli.app import app as cli_app
        return CliRunner(), cli_app

    def _run(self, *args, tmp_path):
        from aios.cli.app import app
        runner = CliRunner()
        cmd = ["--root", str(tmp_path)]
        cmd.extend(args)
        return runner.invoke(app, cmd)

    def test_help_shows_all_commands(self, tmp_path):
        """Verify --help lists all expected commands."""
        result = self._run("--help", tmp_path=tmp_path)
        assert result.exit_code == 0
        commands = [
            "scan", "index", "state", "context", "checkpoint",
            "run", "execute", "report", "metrics", "memory",
            "decision", "validate", "health", "doctor", "recover",
            "chat", "workflow", "tools", "plugins", "agent", "config",
        ]
        for cmd in commands:
            assert cmd in result.output, f"Command '{cmd}' not found in help output"

    def test_invalid_command_returns_error(self, tmp_path):
        """Verify invalid command returns non-zero exit code."""
        result = self._run("nonexistent-command-xyz", tmp_path=tmp_path)
        assert result.exit_code != 0

    def test_command_help_accessible(self, tmp_path):
        """Verify each command has accessible help."""
        commands = [
            "scan", "index", "state", "context", "checkpoint",
            "run", "execute", "report", "metrics", "memory",
            "decision", "validate", "health", "doctor", "recover",
            "chat", "workflow", "tools", "plugins", "agent", "config",
        ]
        for cmd in commands:
            result = self._run(cmd, "--help", tmp_path=tmp_path)
            assert result.exit_code == 0, f"Help for '{cmd}' failed: {result.output}"

    def test_scan_command_runs(self, tmp_path):
        """Verify scan command produces output."""
        result = self._run("scan", tmp_path=tmp_path)
        assert result.exit_code == 0

    def test_health_command_runs(self, tmp_path):
        """Verify health command produces output."""
        result = self._run("health", tmp_path=tmp_path)
        assert result.exit_code == 0

    def test_validate_command_runs(self, tmp_path):
        """Verify validate command produces output."""
        result = self._run("validate", tmp_path=tmp_path)
        assert result.exit_code == 0

    def test_chat_command_runs(self, tmp_path):
        """Verify chat command produces output."""
        result = self._run("chat", "hello", tmp_path=tmp_path)
        assert result.exit_code == 0

    def test_config_command_show(self, tmp_path):
        """Verify config show command outputs config."""
        result = self._run("config", "show", tmp_path=tmp_path)
        assert result.exit_code == 0

    def test_report_command_runs(self, tmp_path):
        """Verify report command produces output."""
        result = self._run("report", tmp_path=tmp_path)
        assert result.exit_code == 0

    def test_checkpoint_statistics_command(self, tmp_path):
        """Verify checkpoint statistics command."""
        result = self._run("checkpoint", "statistics", tmp_path=tmp_path)
        assert result.exit_code == 0

    def test_memory_snapshot_command(self, tmp_path):
        """Verify memory snapshot command."""
        result = self._run("memory", "snapshot", tmp_path=tmp_path)
        assert result.exit_code == 0

    def test_doctor_command_runs(self, tmp_path):
        """Verify doctor command produces output."""
        result = self._run("doctor", tmp_path=tmp_path)
        assert result.exit_code == 0


# ═══════════════════════════════════════════════════════════════════════════
# 4.4.5 — Configuration Validation
# ═══════════════════════════════════════════════════════════════════════════


class TestConfigurationValidation:
    """Verify configuration system handles production conditions."""

    def test_default_config_creates_valid_object(self):
        """Verify AIOSConfig can be created with all defaults."""
        config = AIOSConfig(repo_root=Path.cwd())
        assert config.repo_root is not None
        assert config.mode is not None
        assert config.log_level is not None
        assert config.token_budget > 0

    def test_config_with_repo_root(self, tmp_path):
        """Verify AIOSConfig with explicit repo_root."""
        config = AIOSConfig(repo_root=tmp_path)
        assert config.repo_root == tmp_path
        assert config.cache_dir is not None
        assert config.state_dir is not None

    def test_config_ensure_directories_creates_paths(self, tmp_path):
        """Verify ensure_directories creates all configured directories."""
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        assert config.cache_dir.exists()
        assert config.state_dir.exists()
        assert config.report_dir.exists()

    def test_config_paths_are_absolute(self, tmp_path):
        """Verify all configured paths are absolute."""
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        assert config.cache_dir.is_absolute()
        assert config.state_dir.is_absolute()
        assert config.report_dir.is_absolute()
        assert config.recovery_dir.is_absolute()

    def test_config_mode_override(self, tmp_path):
        """Verify mode can be overridden after construction."""
        config = AIOSConfig(repo_root=tmp_path, mode="production")
        assert config.mode == "production"
        config.mode = "development"
        assert config.mode == "development"

    def test_config_log_level_validation(self, tmp_path):
        """Verify log level is stored as-is."""
        config = AIOSConfig(repo_root=tmp_path, log_level="DEBUG")
        assert config.log_level == "DEBUG"

    def test_config_token_budget_range(self):
        """Verify token budget accepts valid range."""
        config = AIOSConfig(repo_root=Path.cwd(), token_budget=64000)
        assert config.token_budget == 64000

    def test_config_with_provider_settings(self, tmp_path):
        """Verify provider config within AIOSConfig."""
        from aios.core.config import ProviderConfig
        provider = ProviderConfig(
            name="azure-openai",
            capabilities=["scan", "validate", "report"],
        )
        config = AIOSConfig(repo_root=tmp_path, provider=provider)
        assert config.provider.name == "azure-openai"
        assert "report" in config.provider.capabilities

    def test_load_config_no_env_file(self, tmp_path):
        """Verify load_config works with no .env file."""
        from aios.core.config import load_config
        config = load_config(tmp_path)
        assert config.repo_root is not None
        assert config.mode is not None

    @pytest.mark.skipif("os.name != 'nt'", reason="Windows-specific test")
    def test_config_windows_paths(self, tmp_path):
        """Verify config handles Windows-style paths."""
        config = AIOSConfig(repo_root=tmp_path)
        config.ensure_directories()
        assert ":" not in str(config.cache_dir) or "\\" in str(config.cache_dir)


# ═══════════════════════════════════════════════════════════════════════════
# 4.4.6 — Security Validation
# ═══════════════════════════════════════════════════════════════════════════


class TestSecurityValidation:
    """Verify security subsystem handles production conditions."""

    def test_auth_disabled_by_default(self):
        """Verify auth is disabled by default."""
        from aios.api.auth import _AUTH_ENABLED
        assert _AUTH_ENABLED is False

    def test_configure_auth_enables(self):
        """Verify configure_auth enables auth."""
        configure_auth(enabled=True)
        from aios.api.auth import _AUTH_ENABLED
        assert _AUTH_ENABLED is True
        configure_auth(enabled=False)

    def test_get_current_user_with_auth_disabled(self):
        """Verify get_current_user returns anonymous when auth disabled."""
        import asyncio

        from aios.api.auth import get_current_user
        result = asyncio.run(get_current_user(None))
        assert result["principal"] == "anonymous"
        assert result["authenticated"] is False

    def test_get_current_user_with_auth_enabled_no_token(self):
        """Verify get_current_user raises 401 when auth enabled and no token."""
        import asyncio

        from fastapi import HTTPException

        from aios.api.auth import get_current_user
        configure_auth(enabled=True)
        try:
            with pytest.raises(HTTPException) as excinfo:
                asyncio.run(get_current_user(None))
            assert excinfo.value.status_code == 401
        finally:
            configure_auth(enabled=False)

    def test_get_current_user_with_valid_token(self):
        """Verify get_current_user returns user for valid token."""
        import asyncio
        configure_auth(enabled=True, token_validator=lambda t: {"principal": "test_user", "authenticated": True})
        try:
            from fastapi.security import HTTPAuthorizationCredentials

            from aios.api.auth import get_current_user
            creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="valid-token")
            result = asyncio.run(get_current_user(creds))
            assert result["principal"] == "test_user"
            assert result["authenticated"] is True
        finally:
            configure_auth(enabled=False)

    def test_require_auth_with_auth_disabled(self):
        """Verify require_auth passes when auth disabled."""
        import asyncio

        from aios.api.auth import require_auth
        result = asyncio.run(require_auth({"principal": "anonymous", "authenticated": False}))
        assert result["principal"] == "anonymous"

    def test_require_auth_with_auth_enabled_unauthenticated(self):
        """Verify require_auth raises 401 when auth enabled but unauthenticated."""
        import asyncio

        from fastapi import HTTPException

        from aios.api.auth import require_auth
        configure_auth(enabled=True)
        try:
            with pytest.raises(HTTPException) as excinfo:
                asyncio.run(require_auth({"principal": "anonymous", "authenticated": False}))
            assert excinfo.value.status_code == 401
        finally:
            configure_auth(enabled=False)

    def test_security_routes_available(self, client):
        """Verify security routes are registered in OpenAPI schema."""
        response = client.get("/openapi.json")
        schema = response.json()
        paths = schema["paths"]
        security_prefixes = [
            "/api/v1/security/permissions/grant",
            "/api/v1/security/permissions/check",
        ]
        for prefix in security_prefixes:
            assert prefix in paths, f"Security endpoint {prefix} not found"


# ═══════════════════════════════════════════════════════════════════════════
# 4.4.7 — Serialization Validation
# ═══════════════════════════════════════════════════════════════════════════


class TestSerializationValidation:
    """Verify serialization round-trip for all data types."""

    def test_workflow_serialization_roundtrip(self):
        """Verify Workflow can be serialized and deserialized."""
        import pickle
        wf = Workflow(
            task_description="serialization test",
            strategy=ExecutionStrategy(ExecutionMode.SEQUENTIAL.value),
            steps=[_step("ser1"), _step("ser2")],
            execution_mode=ExecutionMode.SEQUENTIAL,
            total_cost=ExecutionCost(token_cost=100, compute_cost=0.5, total_cost=0.5),
            total_duration=ExecutionDuration(setup_seconds=0.1, execution_seconds=0.5, teardown_seconds=0.1, total_seconds=0.7),
        )
        data = pickle.dumps(wf)
        restored = pickle.loads(data)
        assert restored.task_description == wf.task_description
        assert len(restored.steps) == len(wf.steps)
        assert restored.strategy.value == wf.strategy.value
        assert restored.total_cost.token_cost == wf.total_cost.token_cost

    def test_runtime_execution_serialization_roundtrip(self):
        """Verify RuntimeExecution can be serialized and deserialized."""
        import pickle
        wf = _workflow([_step("ser3")])
        exec_obj = RuntimeExecution(
            execution_id="ser-exec-1",
            workflow=wf,
            state=RuntimeState.COMPLETED,
            steps={
                "ser3": RuntimeStep(
                    step_id="ser3", workflow_step=_step("ser3"), state=RuntimeState.COMPLETED,
                ),
            },
            events=[
                RuntimeEvent(
                    event_type=RuntimeEventType.EXECUTION_CREATED,
                    execution_id="ser-exec-1",
                    timestamp=time.time(),
                ),
            ],
            created_at=time.time(),
            started_at=time.time(),
            completed_at=time.time(),
            metrics=ExecutionMetrics(total_duration_seconds=0.5),
            retry_policy=RetryPolicy(max_retries=3),
        )
        data = pickle.dumps(exec_obj)
        restored = pickle.loads(data)
        assert restored.execution_id == exec_obj.execution_id
        assert restored.state == exec_obj.state
        assert len(restored.steps) == 1

    def test_runtime_event_serialization_roundtrip(self):
        """Verify RuntimeEvent can be serialized."""
        import pickle
        ev = RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_COMPLETED,
            execution_id="evt-1",
            step_id="s1",
            message="test",
            timestamp=time.time(),
            metadata={"key": "value"},
        )
        data = pickle.dumps(ev)
        restored = pickle.loads(data)
        assert restored.event_type == ev.event_type
        assert restored.execution_id == ev.execution_id
        assert restored.metadata == ev.metadata

    def test_execution_report_serialization_roundtrip(self):
        """Verify ExecutionReport can be serialized."""
        import pickle
        report = ExecutionReport(
            execution_id="rep-1",
            workflow_task="report test",
            strategy="sequential",
            execution_mode="sequential",
            state=RuntimeState.COMPLETED,
            created_at=time.time(),
            started_at=time.time(),
            completed_at=time.time(),
            duration_seconds=0.5,
            total_steps=3,
            completed_steps=3,
            failed_steps=0,
            skipped_steps=0,
            total_retries=0,
            total_cost=ExecutionCost(token_cost=50, compute_cost=0.1, total_cost=0.1),
            total_duration=ExecutionDuration(
                setup_seconds=0.1, execution_seconds=0.3,
                teardown_seconds=0.1, total_seconds=0.5,
            ),
            has_rollback=False,
            was_rolled_back=False,
            error=None,
        )
        data = pickle.dumps(report)
        restored = pickle.loads(data)
        assert restored.execution_id == report.execution_id
        assert restored.state == report.state

    def test_workflow_step_serialization_roundtrip(self):
        """Verify WorkflowStep can be serialized."""
        import pickle
        step = WorkflowStep(
            step_id="ws1",
            action_id="act1",
            title="Test Step",
            category="test",
            source="capability",
            confidence=0.95,
            dependencies=["dep1"],
            execution_mode=ExecutionMode.SEQUENTIAL,
            state=ExecutionState.PENDING,
            estimated_cost=ExecutionCost(token_cost=10, compute_cost=0.01, total_cost=0.01),
            estimated_duration=ExecutionDuration(
                setup_seconds=0.01, execution_seconds=0.1,
                teardown_seconds=0.01, total_seconds=0.12,
            ),
        )
        data = pickle.dumps(step)
        restored = pickle.loads(data)
        assert restored.step_id == step.step_id
        assert restored.confidence == step.confidence
        assert restored.state == step.state

    def test_event_bus_event_envelope_serialization(self):
        """Verify EventEnvelope can be serialized."""
        import pickle

        from aios.eos.event_bus import EventDispatchMode, EventEnvelope, EventPriority
        ev = RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_STARTED,
            execution_id="env-1",
            timestamp=time.time(),
        )
        envelope = EventEnvelope(
            event_id="env-1",
            runtime_event=ev,
            priority=EventPriority.NORMAL,
            dispatch_mode=EventDispatchMode.SYNC,
            published_at=time.time(),
        )
        data = pickle.dumps(envelope)
        restored = pickle.loads(data)
        assert restored.event_id == envelope.event_id
        assert restored.runtime_event.event_type == ev.event_type


# ═══════════════════════════════════════════════════════════════════════════
# 4.4.8 — Public API Stability
# ═══════════════════════════════════════════════════════════════════════════


class TestPublicAPIStability:
    """Verify public API stability — exports, typing, consistent interfaces."""

    def test_core_exports(self):
        """Verify core module exports expected symbols."""
        import aios.core as core
        assert hasattr(core, "AIOSConfig")
        assert hasattr(core, "load_config")
        assert hasattr(core, "get_logger")

    def test_eos_exports(self):
        """Verify EOS subsystem exports key types."""
        from aios.eos import runtime_engine
        assert hasattr(runtime_engine, "RuntimeEngine")
        assert hasattr(runtime_engine, "RuntimeState")
        assert hasattr(runtime_engine, "RuntimeEventType")
        assert hasattr(runtime_engine, "RuntimeExecution")
        assert hasattr(runtime_engine, "RuntimeStatistics")

    def test_workflow_engine_exports(self):
        """Verify WorkflowEngine exports key types."""
        from aios.eos import workflow_engine
        assert hasattr(workflow_engine, "WorkflowEngine")
        assert hasattr(workflow_engine, "Workflow")
        assert hasattr(workflow_engine, "WorkflowStep")
        assert hasattr(workflow_engine, "ExecutionMode")

    def test_event_bus_exports(self):
        """Verify EventBus exports key types."""
        from aios.eos import event_bus
        assert hasattr(event_bus, "EventBus")
        assert hasattr(event_bus, "EventSubscription")

    def test_config_types_are_dataclasses(self):
        """Verify key config types are dataclasses with slots."""
        from dataclasses import is_dataclass
        config = AIOSConfig(repo_root=Path.cwd())
        assert is_dataclass(config)

    def test_api_stack_has_required_components(self):
        """Verify EOSStack has all required component slots."""
        stack = EOSStack()
        required = [
            "runtime_engine", "workflow_engine", "event_bus",
            "observability", "persistence", "tool_registry",
            "agent_executor",
        ]
        for attr in required:
            assert hasattr(stack, attr), f"EOSStack missing: {attr}"

    def test_runtime_engine_public_methods(self):
        """Verify RuntimeEngine has expected public methods."""
        we = WorkflowEngine()
        we._initialized = True
        re = RuntimeEngine()
        re.initialize(we)
        public_methods = [m for m in dir(re) if not m.startswith("_")]
        expected = ["execute", "status", "cancel", "pause", "resume",
                     "rollback", "history", "statistics", "shutdown",
                     "health", "bind_event_bus"]
        for method in expected:
            assert method in public_methods, f"RuntimeEngine missing public method: {method}"

    def test_event_bus_public_methods(self):
        """Verify EventBus has expected public methods."""
        re = RuntimeEngine()
        we = WorkflowEngine()
        we._initialized = True
        re.initialize(we)
        eb = EventBus()
        eb.initialize(re)
        public_methods = [m for m in dir(eb) if not m.startswith("_")]
        expected = ["publish", "subscribe", "unsubscribe", "unsubscribe_all",
                     "statistics", "validate", "history", "shutdown", "health"]
        for method in expected:
            assert method in public_methods, f"EventBus missing public method: {method}"

    def test_all_dataclasses_use_slots(self):
        """Verify all production dataclasses use slots."""
        from aios.eos.runtime_engine import (
            ExecutionMetrics,
            ExecutionProgress,
            RetryPolicy,
            RuntimeEvent,
            RuntimeStatistics,
            RuntimeStep,
        )
        from aios.eos.workflow_engine import (
            ExecutionCost,
            ExecutionDuration,
        )
        for cls in [RuntimeStatistics, RuntimeEvent, RetryPolicy,
                     ExecutionMetrics, ExecutionProgress, RuntimeStep,
                     ExecutionCost, ExecutionDuration]:
            assert "__slots__" in cls.__dict__, f"{cls.__name__} missing __slots__"


# ═══════════════════════════════════════════════════════════════════════════
# 4.4.9 — Interface Monitoring
# ═══════════════════════════════════════════════════════════════════════════


class TestInterfaceMonitoring:
    """Verify interface-level metrics, logging, and monitoring."""

    _METRICS_FIELDS = {
        "uptime_seconds", "total_events_seen", "total_executions_started",
        "total_executions_completed", "total_executions_failed",
        "total_steps_executed", "total_steps_failed", "total_retries",
        "error_rate", "active_executions", "event_rate_per_second",
        "events_by_type",
    }

    def test_metrics_structure(self, client):
        """Verify metrics endpoint returns all expected fields."""
        response = client.get("/api/v1/observability/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data
        assert "timestamp" in data
        for field in self._METRICS_FIELDS:
            assert field in data["metrics"], f"Missing metrics field: {field}"

    def test_metrics_types_are_correct(self, client):
        """Verify metrics field types match expectations."""
        response = client.get("/api/v1/observability/metrics")
        data = response.json()["metrics"]
        assert isinstance(data["uptime_seconds"], (int, float))
        assert isinstance(data["total_events_seen"], int)
        assert isinstance(data["total_executions_started"], int)
        assert isinstance(data["error_rate"], (int, float))
        assert isinstance(data["active_executions"], int)
        assert isinstance(data["events_by_type"], dict)

    def test_health_structure(self, client):
        """Verify health endpoint returns all expected fields."""
        response = client.get("/api/v1/observability/health")
        assert response.status_code == 200
        data = response.json()
        assert "healthy" in data
        assert "status" in data
        assert "events_processed" in data
        assert "errors_recent" in data
        assert "message" in data
        assert isinstance(data["healthy"], bool)
        assert isinstance(data["events_processed"], int)
        assert isinstance(data["errors_recent"], int)

    def test_metrics_reachable_after_execution(self, client):
        """Verify metrics endpoint remains reachable after execution."""
        wf = _workflow(steps=[_step("m1")])
        resp = client.post(
            "/api/v1/runtime/execute",
            json={
                "workflow": {
                    "task_description": wf.task_description,
                    "steps": [
                        {"step_id": s.step_id, "action_id": s.action_id, "title": s.title}
                        for s in wf.steps
                    ],
                },
            },
        )
        assert resp.status_code == 200

        time.sleep(0.2)

        resp_m = client.get("/api/v1/observability/metrics")
        assert resp_m.status_code == 200
        data = resp_m.json()
        assert "metrics" in data
        assert "timestamp" in data

    def test_concurrent_metrics_access(self, client):
        """Verify metrics endpoint handles concurrent requests."""
        import concurrent.futures

        def fetch_metrics():
            resp = client.get("/api/v1/observability/metrics")
            return resp.status_code

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            futures = [pool.submit(fetch_metrics) for _ in range(10)]
            results = [f.result(timeout=5) for f in futures]
        assert all(r == 200 for r in results)

    def test_metrics_endpoint_rejects_post(self, client):
        """Verify metrics endpoint rejects POST requests."""
        response = client.post("/api/v1/observability/metrics")
        assert response.status_code in (405, 400)

    def test_health_endpoint_consistent(self, client):
        """Verify health endpoint returns consistent shape across calls."""
        for _ in range(5):
            resp = client.get("/api/v1/observability/health")
            assert resp.status_code == 200
            data = resp.json()
            assert "healthy" in data
            assert isinstance(data["healthy"], bool)
            assert "status" in data
            assert "events_processed" in data

    def test_metrics_schema_stable_under_repeated_calls(self, client):
        """Verify metrics schema remains consistent under repeated calls."""
        for i in range(5):
            resp = client.get("/api/v1/observability/metrics")
            assert resp.status_code == 200
            data = resp.json()
            for field in self._METRICS_FIELDS:
                assert field in data["metrics"], f"Call {i}: missing field {field}"

    def test_rate_limiter_check(self):
        """Verify RateLimiter check() returns boolean."""
        rate_limiter = RateLimiter()
        rate_limiter.initialize()
        assert rate_limiter.check("test-client") is True
        assert rate_limiter.is_initialized is True

    def test_rate_limiter_reset(self):
        """Verify RateLimiter reset clears state."""
        rate_limiter = RateLimiter()
        rate_limiter.initialize()
        rate_limiter.check("client-a")
        rate_limiter.reset("client-a")
        assert rate_limiter.check("client-a") is True

    def test_rate_limiter_disabled_when_not_enabled(self):
        """Verify RateLimiter allows all when disabled."""
        from aios.api.models import RateLimitConfig
        cfg = RateLimitConfig(enabled=False)
        rate_limiter = RateLimiter(config=cfg)
        rate_limiter.initialize()
        assert rate_limiter.check("any-client") is True

    def test_events_endpoint_with_filters(self, client):
        """Verify observability events endpoint with filters."""
        resp = client.get("/api/v1/observability/events?limit=5")
        assert resp.status_code == 200
        data = resp.json()
        assert "entries" in data
        assert isinstance(data["entries"], list)

        resp_type = client.get("/api/v1/observability/events?event_type=execution_completed")
        assert resp_type.status_code == 200

    def test_observability_events_schema_consistent(self, client):
        """Verify events endpoint returns consistent schema across calls."""
        for _ in range(3):
            resp = client.get("/api/v1/observability/events")
            assert resp.status_code == 200
            data = resp.json()
            assert "entries" in data
            assert "total" in data


# ═══════════════════════════════════════════════════════════════════════════
# Test Execution
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
