"""Tests for the AIOS REST API."""

from __future__ import annotations

import os
import tempfile
import time

import pytest
from fastapi.testclient import TestClient

from aios.api.app import create_app
from aios.api.dependencies import set_stack
from aios.api.stack import EOSStack
from aios.eos.agent_integration import AgentExecutor, ToolRegistry
from aios.eos.event_bus import EventBus
from aios.eos.observability import ObservabilityConsumer
from aios.eos.persistence import PersistenceStore
from aios.eos.runtime_engine import RuntimeEngine
from aios.eos.workflow_engine import (
    WorkflowEngine,
)


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
    return application


@pytest.fixture
def client(app):
    return TestClient(app)


class TestHealth:
    def test_health_endpoint(self, client) -> None:
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert "healthy" in data
        assert "layers" in data

    def test_health_layers(self, client) -> None:
        response = client.get("/api/v1/health")
        layers = response.json()["layers"]
        assert "event_bus" in layers
        assert "runtime_engine" in layers


class TestEventBus:
    def test_publish_event(self, client) -> None:
        response = client.post(
            "/api/v1/events/publish",
            json={
                "event_type": "execution_started",
                "execution_id": "api_test_1",
                "message": "API test event",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "event_id" in data
        assert data["event_type"] == "execution_started"

    def test_event_history(self, client) -> None:
        client.post(
            "/api/v1/events/publish",
            json={
                "event_type": "execution_started",
                "execution_id": "api_test_2",
                "message": "test",
            },
        )
        time.sleep(0.05)
        response = client.get("/api/v1/events/history?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        assert data["total"] >= 1

    def test_event_statistics(self, client) -> None:
        client.post(
            "/api/v1/events/publish",
            json={
                "event_type": "execution_completed",
                "execution_id": "api_test_3",
                "message": "done",
            },
        )
        time.sleep(0.05)
        response = client.get("/api/v1/events/statistics")
        assert response.status_code == 200
        data = response.json()
        assert "total_events" in data


class TestObservability:
    def test_metrics(self, client) -> None:
        client.post(
            "/api/v1/events/publish",
            json={
                "event_type": "execution_started",
                "execution_id": "obs_test_1",
                "message": "test",
            },
        )
        time.sleep(0.05)
        response = client.get("/api/v1/observability/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data
        assert data["metrics"]["total_events_seen"] >= 1

    def test_health(self, client) -> None:
        response = client.get("/api/v1/observability/health")
        assert response.status_code == 200
        data = response.json()
        assert "healthy" in data

    def test_events_endpoint(self, client) -> None:
        client.post(
            "/api/v1/events/publish",
            json={
                "event_type": "step_completed",
                "execution_id": "obs_test_2",
                "step_id": "step_1",
                "message": "step done",
            },
        )
        time.sleep(0.05)
        response = client.get(
            "/api/v1/observability/events?event_type=step_completed",
        )
        assert response.status_code == 200
        data = response.json()
        assert "entries" in data


class TestRuntime:
    def test_runtime_status_nonexistent(self, client) -> None:
        response = client.get("/api/v1/runtime/status/nonexistent")
        assert response.status_code == 404

    def test_runtime_statistics(self, client) -> None:
        response = client.get("/api/v1/runtime/statistics")
        assert response.status_code == 200
        data = response.json()
        assert "total_executions" in data


class TestTools:
    def test_list_tools(self, client) -> None:
        response = client.get("/api/v1/tools")
        assert response.status_code == 200
        data = response.json()
        assert "tools" in data

    def test_get_nonexistent_tool(self, client) -> None:
        response = client.get("/api/v1/tools/nonexistent")
        assert response.status_code == 404


class TestPersistence:
    def test_persistence_statistics(self, client) -> None:
        response = client.get("/api/v1/persistence/statistics")
        assert response.status_code == 200
        data = response.json()
        assert "database_size_bytes" in data
