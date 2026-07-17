"""Tests for PersistenceStore."""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from aios.eos.persistence import PersistenceStore
from aios.eos.runtime_engine import (
    ExecutionMetrics,
    RetryPolicy,
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
    Workflow,
    WorkflowStep,
)


def _make_step(step_id: str = "step_1", action_id: str = "action_1") -> WorkflowStep:
    return WorkflowStep(
        step_id=step_id,
        action_id=action_id,
        title=f"Step {step_id}",
        category="test",
        source="test",
        confidence=1.0,
        dependencies=[],
        execution_mode=ExecutionMode.SEQUENTIAL,
        state=ExecutionState.PENDING,
        estimated_cost=ExecutionCost(token_cost=10, compute_cost=5, total_cost=15),
        estimated_duration=ExecutionDuration(
            setup_seconds=1, execution_seconds=2, teardown_seconds=0.5, total_seconds=3.5,
        ),
    )


def _make_workflow() -> Workflow:
    return Workflow(
        task_description="test workflow",
        strategy=ExecutionMode.SEQUENTIAL,
        steps=[_make_step()],
        execution_mode=ExecutionMode.SEQUENTIAL,
        total_cost=ExecutionCost(token_cost=10, compute_cost=5, total_cost=15),
        total_duration=ExecutionDuration(
            setup_seconds=1, execution_seconds=2, teardown_seconds=0.5, total_seconds=3.5,
        ),
    )


@pytest.fixture
def db_path() -> Path:
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        path = Path(f.name)
    yield path
    if path.exists():
        path.unlink()


@pytest.fixture
def store(db_path: Path) -> PersistenceStore:
    s = PersistenceStore(db_path=str(db_path))
    s.initialize(clear_existing=True)
    return s


class TestInitialization:
    def test_not_initialized_raises(self) -> None:
        store = PersistenceStore(":memory:")
        with pytest.raises(Exception):
            store.save_workflow(_make_workflow())

    def test_initialize_creates_tables(self, store: PersistenceStore) -> None:
        assert store.is_initialized

    def test_initialize_with_clear(self, db_path: Path) -> None:
        store = PersistenceStore(str(db_path))
        store.initialize(clear_existing=True)
        assert store.is_initialized

    def test_double_initialize(self, store: PersistenceStore) -> None:
        store.initialize()
        assert store.is_initialized


class TestWorkflowPersistence:
    def test_save_and_load_workflow(self, store: PersistenceStore) -> None:
        wf = _make_workflow()
        wf_id = store.save_workflow(wf)
        loaded = store.load_workflow(wf_id)
        assert loaded is not None
        assert loaded.task_description == "test workflow"
        assert len(loaded.steps) == 1

    def test_load_nonexistent(self, store: PersistenceStore) -> None:
        assert store.load_workflow("nonexistent") is None

    def test_delete_workflow(self, store: PersistenceStore) -> None:
        wf = _make_workflow()
        wf_id = store.save_workflow(wf)
        assert store.delete_workflow(wf_id)
        assert store.load_workflow(wf_id) is None

    def test_delete_nonexistent(self, store: PersistenceStore) -> None:
        assert not store.delete_workflow("nonexistent")

    def test_list_workflows(self, store: PersistenceStore) -> None:
        wf = _make_workflow()
        store.save_workflow(wf)
        store.save_workflow(_make_workflow())
        workflows = store.list_workflows()
        assert len(workflows) >= 2

    def test_workflow_count(self, store: PersistenceStore) -> None:
        wf = _make_workflow()
        store.save_workflow(wf)
        assert store.workflow_count() >= 1


class TestExecutionPersistence:
    def test_save_and_load_execution(self, store: PersistenceStore) -> None:
        wf = _make_workflow()
        store.save_workflow(wf)
        execution = RuntimeExecution(
            execution_id="exec_1",
            workflow=wf,
            state=RuntimeState.QUEUED,
            steps={
                "step_1": RuntimeStep(
                    step_id="step_1",
                    workflow_step=_make_step(),
                    state=RuntimeState.QUEUED,
                    attempts=0,
                ),
            },
            events=[],
            created_at=100.0,
            retry_policy=RetryPolicy(max_retries=3),
            metrics=ExecutionMetrics(),
        )
        exec_id = store.save_execution(execution)
        loaded = store.load_execution(exec_id)
        assert loaded is not None
        assert loaded.execution_id == "exec_1"
        assert loaded.state == RuntimeState.QUEUED

    def test_load_nonexistent_execution(self, store: PersistenceStore) -> None:
        assert store.load_execution("nonexistent") is None

    def test_delete_execution(self, store: PersistenceStore) -> None:
        wf = _make_workflow()
        store.save_workflow(wf)
        execution = RuntimeExecution(
            execution_id="exec_del", workflow=wf, state=RuntimeState.QUEUED,
            steps={}, events=[], created_at=100.0,
        )
        store.save_execution(execution)
        assert store.delete_execution("exec_del")
        assert store.load_execution("exec_del") is None

    def test_delete_nonexistent_execution(self, store: PersistenceStore) -> None:
        assert not store.delete_execution("nonexistent")

    def test_execution_count(self, store: PersistenceStore) -> None:
        wf = _make_workflow()
        store.save_workflow(wf)
        execution = RuntimeExecution(
            execution_id="exec_cnt", workflow=wf, state=RuntimeState.QUEUED,
            steps={}, events=[], created_at=100.0,
        )
        store.save_execution(execution)
        assert store.execution_count() >= 1

    def test_load_executions_with_state_filter(self, store: PersistenceStore) -> None:
        wf = _make_workflow()
        store.save_workflow(wf)
        e1 = RuntimeExecution(
            execution_id="e1", workflow=wf, state=RuntimeState.COMPLETED,
            steps={}, events=[], created_at=100.0,
        )
        e2 = RuntimeExecution(
            execution_id="e2", workflow=wf, state=RuntimeState.QUEUED,
            steps={}, events=[], created_at=101.0,
        )
        store.save_execution(e1)
        store.save_execution(e2)
        results = store.load_executions(state=RuntimeState.COMPLETED, limit=10)
        ids = [r.execution_id for r in results]
        assert "e1" in ids
        assert "e2" not in ids

    def test_save_execution_with_events(self, store: PersistenceStore) -> None:
        wf = _make_workflow()
        store.save_workflow(wf)
        event = RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_STARTED,
            execution_id="exec_evt",
            message="started",
            timestamp=200.0,
        )
        execution = RuntimeExecution(
            execution_id="exec_evt", workflow=wf, state=RuntimeState.RUNNING,
            steps={}, events=[event], created_at=100.0,
        )
        store.save_execution(execution)
        loaded = store.load_execution("exec_evt")
        assert loaded is not None
        assert len(loaded.events) >= 1
        assert loaded.events[0].message == "started"


class TestEventPersistence:
    def test_save_and_load_events(self, store: PersistenceStore) -> None:
        event = RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_STARTED,
            execution_id="exec_evt2",
            message="started",
            timestamp=100.0,
        )
        event_id = store.save_event("exec_evt2", event)
        assert event_id > 0
        events = store.load_events(execution_id="exec_evt2")
        assert len(events) == 1
        assert events[0].event_type == RuntimeEventType.EXECUTION_STARTED

    def test_load_events_with_filter(self, store: PersistenceStore) -> None:
        e1 = RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_STARTED,
            execution_id="exec_f", message="started", timestamp=100.0,
        )
        e2 = RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_COMPLETED,
            execution_id="exec_f", message="done", timestamp=200.0,
        )
        store.save_event("exec_f", e1)
        store.save_event("exec_f", e2)
        events = store.load_events(event_type=RuntimeEventType.EXECUTION_STARTED)
        assert len(events) == 1
        assert events[0].event_type == RuntimeEventType.EXECUTION_STARTED

    def test_event_count(self, store: PersistenceStore) -> None:
        event = RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_STARTED,
            execution_id="exec_ec", message="started", timestamp=100.0,
        )
        store.save_event("exec_ec", event)
        assert store.event_count() >= 1


class TestClearAndStatistics:
    def test_clear_all(self, store: PersistenceStore) -> None:
        store.save_workflow(_make_workflow())
        store.clear_all()
        assert store.workflow_count() == 0

    def test_statistics(self, store: PersistenceStore) -> None:
        wf = _make_workflow()
        store.save_workflow(wf)
        stats = store.statistics()
        assert stats.total_workflows >= 1
        assert stats.database_size_bytes > 0

    def test_validate(self, store: PersistenceStore) -> None:
        warnings = store.validate()
        assert isinstance(warnings, list)
