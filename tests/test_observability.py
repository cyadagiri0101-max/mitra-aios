"""Tests for ObservabilityConsumer."""

from __future__ import annotations

import time

import pytest

from aios.eos.event_bus import EventBus
from aios.eos.observability import (
    EventStreamEntry,
    ObservabilityConsumer,
    ObservabilityStatistics,
    SystemMetrics,
)
from aios.eos.runtime_engine import (
    RuntimeEngine,
    RuntimeEvent,
    RuntimeEventType,
)
from aios.eos.workflow_engine import (
    WorkflowEngine,
)


@pytest.fixture
def runtime_engine() -> RuntimeEngine:
    we = WorkflowEngine()
    we._initialized = True
    re = RuntimeEngine()
    re.initialize(we)
    return re


@pytest.fixture
def event_bus(runtime_engine: RuntimeEngine) -> EventBus:
    eb = EventBus()
    eb.initialize(runtime_engine)
    return eb


class TestInitialization:
    def test_initialize(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        assert obs.is_initialized

    def test_initialize_with_uninitialized_eb_raises(self) -> None:
        eb = EventBus()
        obs = ObservabilityConsumer()
        with pytest.raises(Exception):
            obs.initialize(eb)

    def test_not_initialized_raises(self) -> None:
        obs = ObservabilityConsumer()
        with pytest.raises(Exception):
            obs.metrics()

    def test_event_bus_property(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        assert obs.event_bus is event_bus


class TestEventConsumption:
    def test_consumes_events(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        event = RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_STARTED,
            execution_id="exec_1",
            message="started",
            timestamp=time.time(),
        )
        event_bus.publish(event)
        time.sleep(0.05)
        metrics = obs.metrics()
        assert metrics.total_events_seen >= 1

    def test_tracks_event_types(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        event = RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_COMPLETED,
            execution_id="exec_1",
            message="done",
            timestamp=time.time(),
        )
        event_bus.publish(event)
        time.sleep(0.05)
        metrics = obs.metrics()
        assert metrics.events_by_type.get("execution_completed", 0) >= 1

    def test_tracks_executions_started(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        event = RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_STARTED,
            execution_id="exec_1",
            message="started",
            timestamp=time.time(),
        )
        event_bus.publish(event)
        time.sleep(0.05)
        metrics = obs.metrics()
        assert metrics.total_executions_started >= 1

    def test_tracks_executions_completed(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        event = RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_COMPLETED,
            execution_id="exec_1",
            message="done",
            timestamp=time.time(),
        )
        event_bus.publish(event)
        time.sleep(0.05)
        metrics = obs.metrics()
        assert metrics.total_executions_completed >= 1

    def test_tracks_executions_failed(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        event = RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_FAILED,
            execution_id="exec_1",
            message="failed",
            timestamp=time.time(),
        )
        event_bus.publish(event)
        time.sleep(0.05)
        metrics = obs.metrics()
        assert metrics.total_executions_failed >= 1

    def test_tracks_steps_executed(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        event = RuntimeEvent(
            event_type=RuntimeEventType.STEP_COMPLETED,
            execution_id="exec_1",
            step_id="step_1",
            message="step done",
            timestamp=time.time(),
        )
        event_bus.publish(event)
        time.sleep(0.05)
        metrics = obs.metrics()
        assert metrics.total_steps_executed >= 1

    def test_tracks_steps_failed(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        event = RuntimeEvent(
            event_type=RuntimeEventType.STEP_FAILED,
            execution_id="exec_1",
            step_id="step_1",
            message="step failed",
            timestamp=time.time(),
        )
        event_bus.publish(event)
        time.sleep(0.05)
        metrics = obs.metrics()
        assert metrics.total_steps_failed >= 1

    def test_tracks_retries(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        event = RuntimeEvent(
            event_type=RuntimeEventType.STEP_RETRYING,
            execution_id="exec_1",
            step_id="step_1",
            message="retrying",
            timestamp=time.time(),
        )
        event_bus.publish(event)
        time.sleep(0.05)
        metrics = obs.metrics()
        assert metrics.total_retries >= 1

    def test_tracks_errors(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        event = RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_FAILED,
            execution_id="exec_1",
            message="failed",
            timestamp=time.time(),
        )
        event_bus.publish(event)
        time.sleep(0.05)
        metrics = obs.metrics()
        assert metrics.total_executions_failed >= 1

    def test_events_by_execution(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        for i in range(3):
            event = RuntimeEvent(
                event_type=RuntimeEventType.STEP_COMPLETED,
                execution_id="exec_by",
                message=f"step {i}",
                timestamp=time.time(),
            )
            event_bus.publish(event)
        time.sleep(0.05)
        metrics = obs.metrics()
        assert metrics.events_by_execution.get("exec_by", 0) >= 3


class TestMetrics:
    def test_metrics_structure(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        metrics = obs.metrics()
        assert isinstance(metrics, SystemMetrics)
        assert metrics.uptime_seconds >= 0
        assert metrics.total_events_seen >= 0

    def test_uptime_increases(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        m1 = obs.metrics()
        time.sleep(0.05)
        m2 = obs.metrics()
        assert m2.uptime_seconds >= m1.uptime_seconds

    def test_error_rate(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        event_bus.publish(RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_FAILED,
            execution_id="e1", message="fail", timestamp=time.time(),
        ))
        event_bus.publish(RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_COMPLETED,
            execution_id="e2", message="ok", timestamp=time.time(),
        ))
        time.sleep(0.05)
        metrics = obs.metrics()
        assert metrics.error_rate > 0

    def test_event_rate(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        event_bus.publish(RuntimeEvent(
            event_type=RuntimeEventType.STEP_COMPLETED,
            execution_id="e1", message="step", timestamp=time.time(),
        ))
        time.sleep(0.05)
        metrics = obs.metrics()
        assert metrics.event_rate_per_second >= 0


class TestHealth:
    def test_healthy_initially(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        health = obs.health()
        assert health.healthy
        assert health.event_bus_connected

    def test_health_after_events(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        event_bus.publish(RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_STARTED,
            execution_id="e1", message="start", timestamp=time.time(),
        ))
        time.sleep(0.05)
        health = obs.health()
        assert health.events_processed >= 1
        assert health.last_event_time > 0

    def test_health_subscriber_active(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        health = obs.health()
        assert health.subscriber_active


class TestEventStream:
    def test_event_stream(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        event_bus.publish(RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_STARTED,
            execution_id="e1", message="start", timestamp=time.time(),
        ))
        time.sleep(0.05)
        stream = obs.event_stream()
        assert len(stream) >= 1
        assert isinstance(stream[0], EventStreamEntry)

    def test_query_events_by_type(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        event_bus.publish(RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_STARTED,
            execution_id="e1", message="start", timestamp=time.time(),
        ))
        event_bus.publish(RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_COMPLETED,
            execution_id="e1", message="done", timestamp=time.time(),
        ))
        time.sleep(0.05)
        results = obs.query_events(
            event_type=RuntimeEventType.EXECUTION_STARTED,
        )
        assert len(results) == 1

    def test_query_events_by_execution(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        event_bus.publish(RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_STARTED,
            execution_id="query_exec", message="start", timestamp=time.time(),
        ))
        time.sleep(0.05)
        results = obs.query_events(execution_id="query_exec")
        assert len(results) >= 1

    def test_query_events_limit(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        for i in range(5):
            event_bus.publish(RuntimeEvent(
                event_type=RuntimeEventType.STEP_COMPLETED,
                execution_id="e1", message=f"step {i}", timestamp=time.time(),
            ))
        time.sleep(0.05)
        results = obs.query_events(limit=2)
        assert len(results) <= 2


class TestStatistics:
    def test_statistics_structure(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        stats = obs.statistics()
        assert isinstance(stats, ObservabilityStatistics)
        assert stats.subscriber_count >= 1

    def test_statistics_after_events(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        event_bus.publish(RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_STARTED,
            execution_id="e1", message="start", timestamp=time.time(),
        ))
        time.sleep(0.05)
        stats = obs.statistics()
        assert stats.total_events_consumed >= 1


class TestReload:
    def test_reload(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        event_bus.publish(RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_STARTED,
            execution_id="e1", message="start", timestamp=time.time(),
        ))
        time.sleep(0.05)
        obs.reload()
        assert not obs.is_initialized
        with pytest.raises(Exception):
            obs.metrics()

    def test_reload_unsubscribes(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        obs.reload()
        event_bus.publish(RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_STARTED,
            execution_id="e1", message="start", timestamp=time.time(),
        ))
        time.sleep(0.05)
        assert obs._total_events == 0


class TestValidate:
    def test_validate_not_initialized(self) -> None:
        obs = ObservabilityConsumer()
        with pytest.raises(Exception):
            obs.validate()

    def test_validate(self, event_bus: EventBus) -> None:
        obs = ObservabilityConsumer()
        obs.initialize(event_bus)
        warnings = obs.validate()
        assert isinstance(warnings, list)
