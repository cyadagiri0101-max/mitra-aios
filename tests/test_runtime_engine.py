"""Tests for AIOS RuntimeEngine."""

from __future__ import annotations

import json
import tempfile
import threading
import time
from pathlib import Path

import pytest

from aios.core.config import AIOSConfig
from aios.core.exceptions import RuntimeEngineError
from aios.eos.capability_discovery import CapabilityDiscovery
from aios.eos.context_builder import EOSContextBuilder
from aios.eos.decision_engine import (
    EOSDecisionEngine,
    ExecutionStrategy,
)
from aios.eos.knowledge_service import KnowledgeService
from aios.eos.loader import EOS_DIR_NAME, EOSLoader
from aios.eos.registry import RegistryManager
from aios.eos.runtime_engine import (
    CancellationToken,
    ExecutionHistory,
    ExecutionMetrics,
    ExecutionProgress,
    ExecutionReport,
    RetryPolicy,
    RuntimeContext,
    RuntimeEngine,
    RuntimeEvent,
    RuntimeEventType,
    RuntimeExecution,
    RuntimeSnapshot,
    RuntimeState,
    RuntimeStatistics,
    RuntimeStep,
    RuntimeValidationResult,
)
from aios.eos.workflow_engine import (
    ExecutionCost,
    ExecutionDuration,
    ExecutionMode,
    RollbackPlan,
    Workflow,
    WorkflowEngine,
    WorkflowStep,
)

REPO_ROOT = Path(__file__).resolve().parents[1]


def _make_eos_tree(
    base: Path,
    *,
    registries: dict[str, dict] | None = None,
) -> Path:
    ai_dir = base / EOS_DIR_NAME
    ai_dir.mkdir(parents=True, exist_ok=True)

    for d in ("kernel", "engines", "index"):
        (ai_dir / d).mkdir(exist_ok=True)

    for fname in ("CONSTITUTION.md", "IDENTITY.md", "MISSION.md", "ENGINEERING_LAWS.md"):
        (ai_dir / "kernel" / fname).write_text(f"# {fname}\ncontent", encoding="utf-8")

    if registries is not None:
        for name, data in registries.items():
            path = ai_dir / "index" / f"{name}-registry.json"
            path.write_text(json.dumps(data), encoding="utf-8")

    return ai_dir


def _config(repo_root: Path) -> AIOSConfig:
    return AIOSConfig(repo_root=repo_root)


def _make_entry(
    entry_id: str = "test::item",
    title: str = "Test Item",
    path: str = "test.md",
    category: str = "test",
    status: str = "Active",
    version: str = "1.0.0",
    owner: str = "Test",
    last_updated: str = "2026-07-13",
    resolved_links: tuple[str, ...] = (),
) -> dict:
    return {
        "id": entry_id,
        "title": title,
        "path": path,
        "category": category,
        "status": status,
        "version": version,
        "owner": owner,
        "last_updated": last_updated,
        "resolved_links": list(resolved_links),
    }


def _make_registry(data_key: str, entries: list[dict]) -> dict:
    return {
        "schemaVersion": "1.0.0",
        "status": "generated",
        "updated": "2026-07-13",
        "owner": "EOS Governance Council",
        "description": f"Test {data_key} registry.",
        "data": {data_key: entries},
    }


def _make_wf_step(
    step_id: str = "step_test::action",
    action_id: str = "test::action",
    title: str = "Test Action",
    category: str = "test",
    source: str = "capability",
    confidence: float = 0.8,
    dependencies: tuple[str, ...] = (),
    execution_mode: ExecutionMode = ExecutionMode.SEQUENTIAL,
) -> WorkflowStep:
    return WorkflowStep(
        step_id=step_id,
        action_id=action_id,
        title=title,
        category=category,
        source=source,
        confidence=confidence,
        dependencies=dependencies,
        execution_mode=execution_mode,
        estimated_cost=ExecutionCost(token_cost=100, compute_cost=0.1, total_cost=0.1),
        estimated_duration=ExecutionDuration(
            setup_seconds=0.1, execution_seconds=1.0,
            teardown_seconds=0.1, total_seconds=1.2,
        ),
    )


def _make_workflow(
    steps: list[WorkflowStep] | None = None,
    mode: ExecutionMode = ExecutionMode.SEQUENTIAL,
    strategy: ExecutionStrategy = ExecutionStrategy.SEQUENTIAL,
    task: str = "test task",
) -> Workflow:
    if steps is None:
        steps = [_make_wf_step()]
    return Workflow(
        task_description=task,
        strategy=strategy,
        steps=steps,
        execution_mode=mode,
        total_cost=ExecutionCost(
            token_cost=sum(s.estimated_cost.token_cost for s in steps),
            compute_cost=sum(s.estimated_cost.compute_cost for s in steps),
            total_cost=sum(s.estimated_cost.total_cost for s in steps),
        ),
        total_duration=ExecutionDuration(
            setup_seconds=sum(s.estimated_duration.setup_seconds for s in steps),
            execution_seconds=sum(s.estimated_duration.execution_seconds for s in steps),
            teardown_seconds=sum(s.estimated_duration.teardown_seconds for s in steps),
            total_seconds=sum(s.estimated_duration.total_seconds for s in steps),
        ),
        rollback_plan=RollbackPlan(
            rollback_steps=tuple(reversed(steps)),
            rollback_mode=ExecutionMode.SEQUENTIAL,
        ),
    )


def _build_full_stack(
    base: Path,
    registries: dict[str, dict] | None = None,
    token_budget: int = 12_000,
) -> tuple[
    EOSLoader,
    RegistryManager,
    CapabilityDiscovery,
    KnowledgeService,
    EOSContextBuilder,
    EOSDecisionEngine,
    WorkflowEngine,
]:
    _make_eos_tree(base, registries=registries)
    loader = EOSLoader(_config(base))
    loader.initialize()
    rm = RegistryManager().initialize(loader)
    cd = CapabilityDiscovery().initialize(rm)
    ks = KnowledgeService().initialize(cd)
    cb = EOSContextBuilder(token_budget=token_budget).initialize(ks)
    de = EOSDecisionEngine().initialize(cb)
    we = WorkflowEngine().initialize(de)
    return loader, rm, cd, ks, cb, de, we


# ── Fixtures ──────────────────────────────────────────────


@pytest.fixture
def runtime_and_we() -> tuple[RuntimeEngine, WorkflowEngine]:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        _, _, _, _, _, _, we = _build_full_stack(tmp_path)
        rt = RuntimeEngine().initialize(we)
        yield rt, we


# ── Tests: Initialization ─────────────────────────────────


class TestInitialization:
    def test_initialize_with_valid_workflow_engine(self, runtime_and_we):
        rt, _ = runtime_and_we
        assert rt.is_initialized

    def test_initialize_with_uninitialized_we_raises(self):
        we = WorkflowEngine()
        rt = RuntimeEngine()
        with pytest.raises(RuntimeEngineError, match="must be initialized"):
            rt.initialize(we)

    def test_workflow_engine_property_raises_before_init(self):
        rt = RuntimeEngine()
        with pytest.raises(RuntimeEngineError, match="not been initialized"):
            _ = rt.workflow_engine


# ── Tests: Execute ────────────────────────────────────────


class TestExecute:
    def test_execute_returns_execution_id(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow()
        eid = rt.execute(wf)
        assert isinstance(eid, str)
        assert len(eid) > 0

    def test_execute_creates_execution_in_queued(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow()
        eid = rt.execute(wf)
        state = rt.status(eid)
        assert state in (RuntimeState.QUEUED, RuntimeState.RUNNING, RuntimeState.COMPLETED)

    def test_execute_empty_workflow(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow(steps=[], task="empty task")
        eid = rt.execute(wf)
        time.sleep(0.3)
        state = rt.status(eid)
        assert state == RuntimeState.COMPLETED

    def test_execute_single_step_workflow(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow(steps=[_make_wf_step("step_a", "action_a")])
        eid = rt.execute(wf)
        time.sleep(0.3)
        assert rt.status(eid) == RuntimeState.COMPLETED

    def test_execute_multiple_sequential_steps(self, runtime_and_we):
        rt, _ = runtime_and_we
        steps = [
            _make_wf_step("step_a", "action_a"),
            _make_wf_step("step_b", "action_b", dependencies=("step_a",)),
            _make_wf_step("step_c", "action_c", dependencies=("step_b",)),
        ]
        wf = _make_workflow(steps=steps, mode=ExecutionMode.SEQUENTIAL)
        eid = rt.execute(wf)
        time.sleep(0.5)
        assert rt.status(eid) == RuntimeState.COMPLETED


# ── Tests: Execute Step (standalone) ──────────────────────


class TestExecuteStep:
    def test_execute_step_standalone(self, runtime_and_we):
        rt, _ = runtime_and_we
        step = _make_wf_step("step_standalone", "action_standalone")
        result = rt.execute_step(step)
        assert isinstance(result, RuntimeStep)
        assert result.state == RuntimeState.COMPLETED

    def test_execute_step_returns_step_with_timestamps(self, runtime_and_we):
        rt, _ = runtime_and_we
        step = _make_wf_step("step_ts", "action_ts")
        result = rt.execute_step(step)
        assert result.started_at is not None
        assert result.completed_at is not None
        assert result.completed_at >= result.started_at


# ── Tests: Pause/Resume ───────────────────────────────────


class TestPauseResume:
    def test_pause_running_execution(self, runtime_and_we):
        rt, _ = runtime_and_we
        steps = [
            _make_wf_step(f"step_{i}", f"action_{i}",
                          dependencies=(f"step_{i-1}",) if i > 0 else ())
            for i in range(25)
        ]
        wf = _make_workflow(steps=steps, mode=ExecutionMode.SEQUENTIAL)
        eid = rt.execute(wf)
        time.sleep(0.02)
        execution = rt.pause(eid)
        assert execution.state == RuntimeState.PAUSED

    def test_pause_non_running_raises(self, runtime_and_we):
        rt, _ = runtime_and_we
        with pytest.raises(RuntimeEngineError):
            rt.pause("nonexistent")

    def test_resume_paused_execution(self, runtime_and_we):
        rt, _ = runtime_and_we
        steps = [
            _make_wf_step(f"step_{i}", f"action_{i}",
                          dependencies=(f"step_{i-1}",) if i > 0 else ())
            for i in range(25)
        ]
        wf = _make_workflow(steps=steps, mode=ExecutionMode.SEQUENTIAL)
        eid = rt.execute(wf)
        time.sleep(0.02)
        rt.pause(eid)
        execution = rt.resume(eid)
        assert execution.state == RuntimeState.RUNNING

    def test_resume_non_paused_raises(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow(steps=[_make_wf_step()])
        eid = rt.execute(wf)
        time.sleep(0.3)
        with pytest.raises(RuntimeEngineError, match="PAUSED"):
            rt.resume(eid)


# ── Tests: Cancel ─────────────────────────────────────────


class TestCancel:
    def test_cancel_running_execution(self, runtime_and_we):
        rt, _ = runtime_and_we
        steps = [
            _make_wf_step(f"step_{i}", f"action_{i}",
                          dependencies=(f"step_{i-1}",) if i > 0 else ())
            for i in range(25)
        ]
        wf = _make_workflow(steps=steps, mode=ExecutionMode.SEQUENTIAL)
        eid = rt.execute(wf)
        time.sleep(0.02)
        execution = rt.cancel(eid)
        assert execution.state == RuntimeState.CANCELLED

    def test_cancel_completed_execution_raises(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow(steps=[_make_wf_step()])
        eid = rt.execute(wf)
        time.sleep(0.3)
        with pytest.raises(RuntimeEngineError):
            rt.cancel(eid)


# ── Tests: Rollback ───────────────────────────────────────


class TestRollback:
    def test_rollback_completed_execution(self, runtime_and_we):
        rt, _ = runtime_and_we
        steps = [
            _make_wf_step("step_a", "action_a"),
            _make_wf_step("step_b", "action_b", dependencies=("step_a",)),
        ]
        wf = _make_workflow(steps=steps)
        eid = rt.execute(wf)
        time.sleep(0.5)
        execution = rt.rollback(eid)
        assert execution.state == RuntimeState.ROLLED_BACK

    def test_rollback_failed_execution(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow(steps=[_make_wf_step()])
        eid = rt.execute(wf)
        time.sleep(0.3)
        rt.rollback(eid)
        assert rt.status(eid) == RuntimeState.ROLLED_BACK

    def test_rollback_invalid_state_raises(self, runtime_and_we):
        rt, _ = runtime_and_we
        with pytest.raises(RuntimeEngineError):
            rt.rollback("nonexistent")

    def test_rollback_without_plan_raises(self, runtime_and_we):
        rt, _ = runtime_and_we
        steps = [_make_wf_step("step_a", "action_a")]
        wf = Workflow(
            task_description="no rollback",
            strategy=ExecutionStrategy.SEQUENTIAL,
            steps=steps,
            execution_mode=ExecutionMode.SEQUENTIAL,
            total_cost=ExecutionCost(),
            total_duration=ExecutionDuration(),
            rollback_plan=None,
        )
        eid = rt.execute(wf)
        time.sleep(0.3)
        with pytest.raises(RuntimeEngineError, match="no rollback plan"):
            rt.rollback(eid)

    def test_rollback_records_events(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow(steps=[_make_wf_step()])
        eid = rt.execute(wf)
        time.sleep(0.3)
        rt.rollback(eid)
        hist = rt.history(eid)
        event_types = [e.event_type for e in hist.entries]
        assert RuntimeEventType.ROLLBACK_STARTED in event_types
        assert RuntimeEventType.EXECUTION_ROLLED_BACK in event_types


# ── Tests: Status ─────────────────────────────────────────


class TestStatus:
    def test_status_returns_state(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow(steps=[_make_wf_step()])
        eid = rt.execute(wf)
        time.sleep(0.3)
        assert rt.status(eid) == RuntimeState.COMPLETED

    def test_status_invalid_id_raises(self, runtime_and_we):
        rt, _ = runtime_and_we
        with pytest.raises(RuntimeEngineError, match="not found"):
            rt.status("nonexistent")

    def test_status_queued_immediately(self, runtime_and_we):
        rt, _ = runtime_and_we
        steps = [
            _make_wf_step("step_a", "action_a"),
            _make_wf_step("step_b", "action_b"),
        ]
        wf = _make_workflow(steps=steps, mode=ExecutionMode.SEQUENTIAL)
        eid = rt.execute(wf)
        status = rt.status(eid)
        assert status in (
            RuntimeState.QUEUED, RuntimeState.RUNNING, RuntimeState.COMPLETED,
        )


# ── Tests: History ────────────────────────────────────────


class TestHistory:
    def test_history_returns_execution_history(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow(steps=[_make_wf_step()])
        eid = rt.execute(wf)
        time.sleep(0.3)
        hist = rt.history(eid)
        assert isinstance(hist, ExecutionHistory)
        assert not hist.is_empty

    def test_history_records_events(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow(steps=[_make_wf_step()])
        eid = rt.execute(wf)
        time.sleep(0.3)
        hist = rt.history(eid)
        event_types = {e.event_type for e in hist.entries}
        assert RuntimeEventType.EXECUTION_CREATED in event_types
        assert RuntimeEventType.EXECUTION_QUEUED in event_types

    def test_history_invalid_id(self, runtime_and_we):
        rt, _ = runtime_and_we
        with pytest.raises(RuntimeEngineError):
            rt.history("nonexistent")


# ── Tests: Reports ────────────────────────────────────────


class TestReport:
    def test_report_returns_execution_report(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow(steps=[_make_wf_step()])
        eid = rt.execute(wf)
        time.sleep(0.3)
        rep = rt.report(eid)
        assert isinstance(rep, ExecutionReport)
        assert rep.execution_id == eid

    def test_report_contains_correct_fields(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow(
            steps=[_make_wf_step("step_a", "action_a")],
            task="my test task",
        )
        eid = rt.execute(wf)
        time.sleep(0.3)
        rep = rt.report(eid)
        assert rep.workflow_task == "my test task"
        assert rep.total_steps == 1
        assert rep.completed_steps == 1
        assert rep.duration_seconds >= 0

    def test_report_with_rollback(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow(steps=[_make_wf_step()])
        eid = rt.execute(wf)
        time.sleep(0.3)
        rt.rollback(eid)
        rep = rt.report(eid)
        assert rep.was_rolled_back
        assert rep.has_rollback

    def test_report_invalid_id(self, runtime_and_we):
        rt, _ = runtime_and_we
        with pytest.raises(RuntimeEngineError):
            rt.report("nonexistent")


# ── Tests: Snapshots ──────────────────────────────────────


class TestSnapshot:
    def test_snapshot_returns_runtime_snapshot(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow(steps=[_make_wf_step()])
        eid = rt.execute(wf)
        time.sleep(0.3)
        snap = rt.snapshot(eid)
        assert isinstance(snap, RuntimeSnapshot)
        assert snap.execution_id == eid

    def test_snapshot_contains_correct_fields(self, runtime_and_we):
        rt, _ = runtime_and_we
        steps = [
            _make_wf_step("step_a", "action_a"),
            _make_wf_step("step_b", "action_b"),
        ]
        wf = _make_workflow(steps=steps)
        eid = rt.execute(wf)
        time.sleep(0.5)
        snap = rt.snapshot(eid)
        assert snap.step_count == 2
        assert snap.completed_count == 2
        assert snap.state == RuntimeState.COMPLETED

    def test_snapshot_invalid_id(self, runtime_and_we):
        rt, _ = runtime_and_we
        with pytest.raises(RuntimeEngineError):
            rt.snapshot("nonexistent")


# ── Tests: Validation ─────────────────────────────────────


class TestValidation:
    def test_validate_valid_execution(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow(steps=[_make_wf_step()])
        eid = rt.execute(wf)
        time.sleep(0.3)
        result = rt.validate(eid)
        assert result.is_valid

    def test_validate_missing_execution(self, runtime_and_we):
        rt, _ = runtime_and_we
        result = rt.validate("nonexistent")
        assert not result.is_valid
        assert result.missing_execution

    def test_validate_invalid_metrics(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow(steps=[_make_wf_step()])
        eid = rt.execute(wf)
        time.sleep(0.3)
        execution = rt._get_execution(eid)
        execution.metrics.max_step_duration = -1.0
        execution.metrics.min_step_duration = 5.0
        result = rt.validate(eid)
        assert not result.is_valid
        assert result.invalid_metrics

    def test_validate_invalid_id_returns_not_valid(self, runtime_and_we):
        rt, _ = runtime_and_we
        result = rt.validate("does-not-exist")
        assert not result.is_valid
        assert result.missing_execution


# ── Tests: Statistics ─────────────────────────────────────


class TestStatistics:
    def test_statistics_returns_structure(self, runtime_and_we):
        rt, _ = runtime_and_we
        stats = rt.statistics()
        assert isinstance(stats, RuntimeStatistics)
        assert stats.total_executions == 0
        assert stats.successful_executions == 0

    def test_statistics_tracks_executions(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow(steps=[_make_wf_step()])
        rt.execute(wf)
        time.sleep(0.3)
        stats = rt.statistics()
        assert stats.total_executions >= 1
        assert stats.cache_size >= 1

    def test_statistics_tracks_success(self, runtime_and_we):
        rt, _ = runtime_and_we
        for _ in range(3):
            wf = _make_workflow(steps=[_make_wf_step()])
            rt.execute(wf)
            time.sleep(0.3)
        stats = rt.statistics()
        assert stats.total_executions >= 3
        assert stats.successful_executions >= 3

    def test_statistics_averages(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow(
            steps=[
                _make_wf_step("step_a", "action_a"),
                _make_wf_step("step_b", "action_b"),
            ],
        )
        rt.execute(wf)
        time.sleep(0.5)
        stats = rt.statistics()
        assert stats.average_workflow_size > 0
        assert stats.average_duration >= 0


# ── Tests: Reload ─────────────────────────────────────────


class TestReload:
    def test_reload_clears_executions(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow(steps=[_make_wf_step()])
        rt.execute(wf)
        time.sleep(0.3)
        rt.reload()
        stats = rt.statistics()
        assert stats.total_executions == 0
        assert stats.cache_size == 0

    def test_reload_resets_statistics(self, runtime_and_we):
        rt, _ = runtime_and_we
        for _ in range(3):
            wf = _make_workflow(steps=[_make_wf_step()])
            rt.execute(wf)
            time.sleep(0.3)
        rt.reload()
        stats = rt.statistics()
        assert stats.total_executions == 0
        assert stats.successful_executions == 0
        assert stats.failed_executions == 0

    def test_reload_is_idempotent(self, runtime_and_we):
        rt, _ = runtime_and_we
        rt.reload()
        rt.reload()
        stats = rt.statistics()
        assert stats.total_executions == 0


# ── Tests: Retry ──────────────────────────────────────────


class TestRetry:
    def test_retry_policy_defaults(self):
        policy = RetryPolicy()
        assert policy.max_retries == 3
        assert policy.base_delay_seconds == 1.0
        assert policy.backoff_multiplier == 2.0
        assert not policy.is_disabled

    def test_retry_disabled_when_zero(self):
        policy = RetryPolicy(max_retries=0)
        assert policy.is_disabled

    def test_cancellation_token(self):
        token = CancellationToken()
        assert not token.is_cancelled
        token.cancel()
        assert token.is_cancelled


# ── Tests: Thread Safety ──────────────────────────────────


class TestThreadSafety:
    def test_concurrent_execute(self, runtime_and_we):
        rt, _ = runtime_and_we
        ids: list[str] = []
        lock = threading.Lock()

        def execute_workflow():
            wf = _make_workflow(steps=[_make_wf_step()])
            eid = rt.execute(wf)
            with lock:
                ids.append(eid)

        threads = [threading.Thread(target=execute_workflow) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        time.sleep(0.5)
        assert len(ids) == 10
        stats = rt.statistics()
        assert stats.total_executions >= 10

    def test_concurrent_status_queries(self, runtime_and_we):
        rt, _ = runtime_and_we
        wf = _make_workflow(steps=[_make_wf_step()])
        eid = rt.execute(wf)
        time.sleep(0.05)

        errors: list[Exception] = []
        lock = threading.Lock()

        def query_status():
            try:
                for _ in range(20):
                    rt.status(eid)
                    time.sleep(0.01)
            except Exception as e:
                with lock:
                    errors.append(e)

        threads = [threading.Thread(target=query_status) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0


# ── Tests: RuntimeState ───────────────────────────────────


class TestRuntimeState:
    def test_all_states_defined(self):
        assert RuntimeState.NOT_STARTED.value == "not_started"
        assert RuntimeState.QUEUED.value == "queued"
        assert RuntimeState.RUNNING.value == "running"
        assert RuntimeState.WAITING.value == "waiting"
        assert RuntimeState.PAUSED.value == "paused"
        assert RuntimeState.COMPLETED.value == "completed"
        assert RuntimeState.FAILED.value == "failed"
        assert RuntimeState.ROLLED_BACK.value == "rolled_back"
        assert RuntimeState.CANCELLED.value == "cancelled"
        assert RuntimeState.SKIPPED.value == "skipped"

    def test_state_count(self):
        assert len(RuntimeState) == 10


# ── Tests: Data Models ────────────────────────────────────


class TestDataModels:
    def test_execution_progress(self):
        p = ExecutionProgress(total_steps=10, completed_steps=4)
        assert p.finished_steps == 4
        assert p.percentage == 0.0

    def test_execution_metrics_defaults(self):
        m = ExecutionMetrics()
        assert m.total_duration_seconds == 0.0
        assert m.total_retries == 0

    def test_runtime_step_defaults(self):
        wf_step = _make_wf_step()
        rs = RuntimeStep(step_id="test", workflow_step=wf_step)
        assert rs.state == RuntimeState.NOT_STARTED
        assert rs.attempts == 0

    def test_runtime_execution_has_id(self):
        wf = _make_workflow()
        ex = RuntimeExecution(execution_id="test-id", workflow=wf)
        assert ex.execution_id == "test-id"
        assert ex.state == RuntimeState.NOT_STARTED

    def test_runtime_context_frozen(self):
        wf = _make_workflow()
        ctx = RuntimeContext(
            execution_id="id", workflow=wf, state=RuntimeState.RUNNING,
            step_count=1, completed_count=0, failed_count=0,
            retry_policy=RetryPolicy(),
        )
        assert ctx.execution_id == "id"
        assert ctx.state == RuntimeState.RUNNING

    def test_runtime_snapshot(self):
        snap = RuntimeSnapshot(
            execution_id="id", state=RuntimeState.COMPLETED,
            timestamp=100.0, step_count=1, completed_count=1,
            failed_count=0, running_count=0, queued_count=0,
            step_ids=("s1",), step_states=(RuntimeState.COMPLETED,),
        )
        assert snap.step_count == 1
        assert snap.completed_count == 1

    def test_execution_history_empty(self):
        hist = ExecutionHistory(execution_id="id")
        assert hist.is_empty

    def test_execution_report_defaults(self):
        rep = ExecutionReport(
            execution_id="id", workflow_task="task",
            strategy="sequential", execution_mode="sequential",
            state=RuntimeState.COMPLETED,
            created_at=0.0, started_at=1.0, completed_at=2.0,
            duration_seconds=1.0, total_steps=1,
            completed_steps=1, failed_steps=0, skipped_steps=0,
            total_retries=0, total_cost=ExecutionCost(),
            total_duration=ExecutionDuration(),
            has_rollback=False, was_rolled_back=False, error=None,
        )
        assert rep.execution_id == "id"
        assert rep.duration_seconds == 1.0

    def test_runtime_statistics(self):
        stats = RuntimeStatistics(
            total_executions=10, successful_executions=8,
            failed_executions=1, cancelled_executions=1,
            rollback_count=1, average_duration=5.0,
            average_retries=0.5, average_workflow_size=3.0,
            cache_size=10,
        )
        assert stats.total_executions == 10
        assert stats.successful_executions == 8

    def test_runtime_validation_initial_valid(self):
        result = RuntimeValidationResult()
        assert result.is_valid
        assert not result.missing_execution

    def test_runtime_event_creation(self):
        event = RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_STARTED,
            execution_id="e1",
        )
        assert event.event_type == RuntimeEventType.EXECUTION_STARTED
        assert event.execution_id == "e1"


# ── Tests: Real Repository Integration ────────────────────


class TestRealRepo:
    """Integration tests using the actual .ai directory in the repo."""

    def _build_stack(self) -> tuple[WorkflowEngine, RuntimeEngine]:
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)
        de = EOSDecisionEngine().initialize(cb)
        we = WorkflowEngine().initialize(de)
        rt = RuntimeEngine().initialize(we)
        return we, rt

    def test_execute_real_workflow(self):
        we, rt = self._build_stack()
        plan = we.decision_engine.plan("implement a feature")
        workflow = we.build(plan)
        eid = rt.execute(workflow)
        time.sleep(0.5)
        assert rt.status(eid) == RuntimeState.COMPLETED

    def test_rollback_real_workflow(self):
        we, rt = self._build_stack()
        plan = we.decision_engine.plan("implement a feature")
        workflow = we.build(plan)
        eid = rt.execute(workflow)
        time.sleep(0.5)
        execution = rt.rollback(eid)
        assert execution.state == RuntimeState.ROLLED_BACK

    def test_status_real_workflow(self):
        we, rt = self._build_stack()
        plan = we.decision_engine.plan("refactor codebase")
        workflow = we.build(plan)
        eid = rt.execute(workflow)
        time.sleep(0.5)
        assert rt.status(eid) == RuntimeState.COMPLETED

    def test_statistics_real_workflow(self):
        we, rt = self._build_stack()
        plan = we.decision_engine.plan("design review")
        workflow = we.build(plan)
        rt.execute(workflow)
        time.sleep(0.5)
        stats = rt.statistics()
        assert stats.total_executions >= 1
        assert stats.successful_executions >= 1
        assert stats.average_workflow_size > 0

    def test_snapshot_real_workflow(self):
        we, rt = self._build_stack()
        plan = we.decision_engine.plan("implement a feature")
        workflow = we.build(plan)
        eid = rt.execute(workflow)
        time.sleep(0.5)
        snap = rt.snapshot(eid)
        assert snap.step_count > 0
        assert snap.completed_count > 0

    def test_history_real_workflow(self):
        we, rt = self._build_stack()
        plan = we.decision_engine.plan("implement a feature")
        workflow = we.build(plan)
        eid = rt.execute(workflow)
        time.sleep(0.5)
        hist = rt.history(eid)
        assert not hist.is_empty
        assert len(hist.entries) >= 2

    def test_report_real_workflow(self):
        we, rt = self._build_stack()
        plan = we.decision_engine.plan("implement a feature")
        workflow = we.build(plan)
        eid = rt.execute(workflow)
        time.sleep(0.5)
        rep = rt.report(eid)
        assert rep.total_steps > 0
        assert rep.completed_steps > 0
        assert rep.duration_seconds >= 0
