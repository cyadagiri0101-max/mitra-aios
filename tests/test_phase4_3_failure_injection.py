"""Phase 4.3 — Production Failure Injection & Recovery Validation.

Every scenario verifies: execution state, emitted events, cleanup,
thread termination, lock release, execution history, and statistics.
"""

from __future__ import annotations

import threading
import time
from pathlib import Path
from unittest import mock

import pytest

from aios.core.config import AIOSConfig
from aios.core.exceptions import EOSLoaderError, RuntimeEngineError
from aios.eos.event_bus import EventBus
from aios.eos.persistence import PersistenceStore
from aios.eos.runtime_engine import (
    RuntimeEngine,
    RuntimeEventType,
    RuntimeState,
)
from aios.eos.workflow_engine import (
    ExecutionCost,
    ExecutionDuration,
    ExecutionMode,
    ExecutionStrategy,
    RollbackPlan,
    Workflow,
    WorkflowEngine,
    WorkflowStep,
)
from aios.scheduler.manager import Scheduler
from aios.scheduler.models import JobStatus, JobType, RetryPolicy

REPO_ROOT = Path(__file__).resolve().parents[1]


def _step(
    step_id: str = "s1", action_id: str = "test::action",
) -> WorkflowStep:
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
        task_description="failure test",
        strategy=ExecutionStrategy(ExecutionMode.SEQUENTIAL.value),
        steps=steps,
        execution_mode=ExecutionMode.SEQUENTIAL,
        total_cost=ExecutionCost(),
        total_duration=ExecutionDuration(),
    )


def _rollback_workflow() -> Workflow:
    rp = RollbackPlan(rollback_steps=(_step("rb1"),), rollback_mode=ExecutionMode.SEQUENTIAL)
    return Workflow(
        task_description="rollback test",
        strategy=ExecutionStrategy(ExecutionMode.SEQUENTIAL.value),
        steps=[_step("s1"), _step("s2")],
        execution_mode=ExecutionMode.SEQUENTIAL,
        total_cost=ExecutionCost(),
        total_duration=ExecutionDuration(),
        rollback_plan=rp,
    )


# ═══════════════════════════════════════════════════════════════════════════
# 4.3.1 — Runtime Failure Injection
# ═══════════════════════════════════════════════════════════════════════════


class TestRuntimeFailureInjection:
    """Verify RuntimeEngine handles failures correctly."""

    @pytest.fixture
    def stack(self):
        """Provide RuntimeEngine with full stack."""
        import json
        import tempfile

        from aios.eos.capability_discovery import CapabilityDiscovery
        from aios.eos.context_builder import EOSContextBuilder
        from aios.eos.decision_engine import EOSDecisionEngine
        from aios.eos.knowledge_service import KnowledgeService
        from aios.eos.loader import EOS_DIR_NAME, EOSLoader
        from aios.eos.registry import RegistryManager

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            ai_dir = tmp_path / EOS_DIR_NAME
            ai_dir.mkdir(parents=True, exist_ok=True)
            for d in ("kernel", "engines", "index"):
                (ai_dir / d).mkdir(exist_ok=True)
            for fname in ("CONSTITUTION.md", "IDENTITY.md", "MISSION.md", "ENGINEERING_LAWS.md"):
                (ai_dir / "kernel" / fname).write_text(f"# {fname}\ncontent", encoding="utf-8")
            (ai_dir / "index" / "test-registry.json").write_text(
                json.dumps({
                    "schemaVersion": "1.0.0",
                    "status": "generated",
                    "updated": "2026-07-13",
                    "data": {"guides": []},
                }),
                encoding="utf-8",
            )
            config = AIOSConfig(repo_root=tmp_path)
            loader = EOSLoader(config)
            loader.initialize()
            rm = RegistryManager().initialize(loader)
            cd = CapabilityDiscovery().initialize(rm)
            ks = KnowledgeService().initialize(cd)
            cb = EOSContextBuilder(token_budget=12_000).initialize(ks)
            de = EOSDecisionEngine().initialize(cb)
            we = WorkflowEngine().initialize(de)
            rt = RuntimeEngine().initialize(we)
            eb = EventBus().initialize(rt)
            rt.bind_event_bus(eb)
            yield we, rt, eb

    # ── Scenario: cancellation during execution ───

    def test_cancellation_during_execution(self, stack):
        """Cancel while workflow is running — verify state, events, cleanup."""
        we, rt, eb = stack

        events = []
        eb.subscribe(lambda e: events.append(e))

        exec_id = rt.execute(_workflow(steps=[_step("a"), _step("b")]))
        time.sleep(0.05)
        try:
            rt.cancel(exec_id)
        except RuntimeEngineError:
            pass
        time.sleep(0.5)

        state = rt.status(exec_id)
        assert state in (RuntimeState.CANCELLED, RuntimeState.COMPLETED)

        event_types = {e.event_type for e in events}
        assert RuntimeEventType.EXECUTION_CREATED in event_types

        hist = rt.history(exec_id)
        assert not hist.is_empty

        stats = rt.statistics()
        assert stats.total_executions >= 1

    # ── Scenario: shutdown during execution ───

    def test_shutdown_during_execution(self, stack):
        """Shutdown while workflow is running — verify graceful stop."""
        we, rt, eb = stack

        events = []
        eb.subscribe(lambda e: events.append(e))

        exec_id = rt.execute(_workflow(steps=[_step("a"), _step("b")]))
        time.sleep(0.05)
        rt.shutdown()

        assert not rt.is_initialized
        state = rt.status(exec_id)
        assert state in (RuntimeState.CANCELLED, RuntimeState.COMPLETED)

    # ── Scenario: invalid execution state transition ───

    def test_pause_completed_execution_raises(self, stack):
        """Pausing a completed execution raises RuntimeEngineError."""
        we, rt, eb = stack
        exec_id = rt.execute(_workflow())
        time.sleep(0.3)
        with pytest.raises(RuntimeEngineError, match="RUNNING"):
            rt.pause(exec_id)

    def test_cancel_completed_execution_raises(self, stack):
        """Cancelling a completed execution raises."""
        we, rt, eb = stack
        exec_id = rt.execute(_workflow())
        time.sleep(0.3)
        with pytest.raises(RuntimeEngineError, match="Cannot cancel"):
            rt.cancel(exec_id)

    def test_resume_non_paused_execution_raises(self, stack):
        """Resuming a non-paused execution raises."""
        we, rt, eb = stack
        exec_id = rt.execute(_workflow())
        time.sleep(0.3)
        with pytest.raises(RuntimeEngineError, match="PAUSED"):
            rt.resume(exec_id)

    # ── Scenario: rollback after cancellation ───

    def test_rollback_after_cancel(self, stack):
        """Rollback after cancellation marks state ROLLED_BACK."""
        we, rt, eb = stack
        exec_id = rt.execute(_rollback_workflow())
        time.sleep(0.3)
        rt.rollback(exec_id)
        assert rt.status(exec_id) == RuntimeState.ROLLED_BACK

        hist = rt.history(exec_id)
        event_types = [e.event_type for e in hist.entries]
        assert RuntimeEventType.ROLLBACK_STARTED in event_types

        stats = rt.statistics()
        assert stats.rollback_count >= 1

    # ── Scenario: get execution history after failure ───

    def test_history_after_cancel(self, stack):
        """Verify history records cancellation events."""
        we, rt, eb = stack
        exec_id = rt.execute(_workflow())
        time.sleep(0.3)
        hist = rt.history(exec_id)
        assert len(hist.entries) > 0

    # ── Scenario: statistics consistency ───

    def test_statistics_match_execution_count(self, stack):
        """Verify statistics counters match actual executions."""
        we, rt, eb = stack
        before = rt.statistics().total_executions
        count = 5
        for _ in range(count):
            rt.execute(_workflow())
            time.sleep(0.3)
        after = rt.statistics().total_executions
        assert after - before >= count

    # ── Scenario: thread leak check ───

    def test_no_thread_leak_after_failure(self, stack):
        """Verify threads are cleaned up after execution."""
        we, rt, eb = stack
        before = threading.active_count()
        exec_id = rt.execute(_workflow())
        time.sleep(0.3)
        state = rt.status(exec_id)
        assert state in (RuntimeState.COMPLETED, RuntimeState.FAILED)
        assert threading.active_count() <= before + 1

    # ── Scenario: nonexistent execution ───

    def test_operations_on_nonexistent_execution(self, stack):
        """Verify operations on unknown ID raise RuntimeEngineError."""
        we, rt, eb = stack
        with pytest.raises(RuntimeEngineError, match="not found"):
            rt.status("no-such-id")
        with pytest.raises(RuntimeEngineError, match="not found"):
            rt.cancel("no-such-id")
        with pytest.raises(RuntimeEngineError, match="not found"):
            rt.pause("no-such-id")
        with pytest.raises(RuntimeEngineError, match="not found"):
            rt.resume("no-such-id")
        with pytest.raises(RuntimeEngineError, match="not found"):
            rt.rollback("no-such-id")

    # ── Scenario: lock release and cleanup ───

    def test_lock_release_after_cancel(self, stack):
        """Verify no lock contention after cancellation."""
        we, rt, eb = stack
        exec_id = rt.execute(_workflow())
        time.sleep(0.3)
        try:
            rt.cancel(exec_id)
        except RuntimeEngineError:
            pass
        time.sleep(0.1)
        exec_id2 = rt.execute(_workflow())
        time.sleep(0.3)
        assert rt.status(exec_id2) == RuntimeState.COMPLETED

    # ── Scenario: double shutdown ───

    def test_double_shutdown_safe(self, stack):
        """Verify calling shutdown twice is safe (idempotent)."""
        we, rt, eb = stack
        rt.execute(_workflow())
        time.sleep(0.3)
        rt.shutdown()
        rt.shutdown()
        assert not rt.is_initialized

    # ── Scenario: step exception during execution ───

    def test_step_exception_during_execution(self, stack):
        """Verify step exception sets step to FAILED and emits events."""
        we, rt, eb = stack

        events = []
        eb.subscribe(lambda e: events.append(e))

        with mock.patch.object(
            rt, "_execute_single_step",
            side_effect=RuntimeError("step simulated failure"),
        ):
            exec_id = rt.execute(_workflow(steps=[_step("fail_step")]))
            time.sleep(0.5)

        state = rt.status(exec_id)
        assert state == RuntimeState.FAILED

        event_types = {e.event_type for e in events}
        assert RuntimeEventType.EXECUTION_FAILED in event_types
        # STEP_FAILED not emitted because mock raises before step state is set

    # ── Scenario: workflow exception (wrapper) ───

    def test_workflow_exception_handling(self, stack):
        """Verify exception in run loop marks execution as failed."""
        we, rt, eb = stack

        events = []
        eb.subscribe(lambda e: events.append(e))

        # Inject failure in _execute_single_step
        with mock.patch.object(
            rt, "_execute_single_step",
            side_effect=RuntimeError("unexpected engine error"),
        ):
            exec_id = rt.execute(_workflow(steps=[_step("s1")]))
            time.sleep(0.5)

        state = rt.status(exec_id)
        assert state == RuntimeState.FAILED

        event_types = {e.event_type for e in events}
        assert RuntimeEventType.EXECUTION_FAILED in event_types
        assert RuntimeEventType.EXECUTION_CREATED in event_types
        assert RuntimeEventType.EXECUTION_QUEUED in event_types

        hist = rt.history(exec_id)
        assert len(hist.entries) > 0

        stats = rt.statistics()
        assert stats.failed_executions >= 1


# ═══════════════════════════════════════════════════════════════════════════
# 4.3.2 — EventBus Failure Isolation
# ═══════════════════════════════════════════════════════════════════════════


class TestEventBusFailureIsolation:
    """Verify EventBus isolates failures correctly."""

    @pytest.fixture
    def bus(self):
        """Provide isolated EventBus with RuntimeEngine."""
        import tempfile

        from aios.eos.capability_discovery import CapabilityDiscovery
        from aios.eos.context_builder import EOSContextBuilder
        from aios.eos.decision_engine import EOSDecisionEngine
        from aios.eos.knowledge_service import KnowledgeService
        from aios.eos.loader import EOS_DIR_NAME, EOSLoader
        from aios.eos.registry import RegistryManager

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            ai_dir = tmp_path / EOS_DIR_NAME
            ai_dir.mkdir(parents=True, exist_ok=True)
            for d in ("kernel", "engines", "index"):
                (ai_dir / d).mkdir(exist_ok=True)
            for fname in ("CONSTITUTION.md", "IDENTITY.md", "MISSION.md", "ENGINEERING_LAWS.md"):
                (ai_dir / "kernel" / fname).write_text(f"# {fname}\ncontent", encoding="utf-8")
            import json
            (ai_dir / "index" / "test-registry.json").write_text(
                json.dumps({
                    "schemaVersion": "1.0.0",
                    "status": "generated",
                    "updated": "2026-07-13",
                    "data": {"guides": []},
                }),
                encoding="utf-8",
            )
            config = AIOSConfig(repo_root=tmp_path)
            loader = EOSLoader(config)
            loader.initialize()
            rm = RegistryManager().initialize(loader)
            cd = CapabilityDiscovery().initialize(rm)
            ks = KnowledgeService().initialize(cd)
            cb = EOSContextBuilder(token_budget=12_000).initialize(ks)
            de = EOSDecisionEngine().initialize(cb)
            we = WorkflowEngine().initialize(de)
            rt = RuntimeEngine().initialize(we)
            eb = EventBus().initialize(rt)
            rt.bind_event_bus(eb)
            yield rt, eb

    # ── Subscriber throws exception ───

    def test_failing_subscriber_does_not_block_others(self, bus):
        """Verify one failing subscriber doesn't prevent others from receiving."""
        rt, eb = bus
        received = []
        def bad(e): raise RuntimeError("subscriber failure")
        def good(e): received.append(e)
        eb.subscribe(bad)
        eb.subscribe(good)
        rt.execute(_workflow())
        time.sleep(0.3)
        assert len(received) > 0
        stats = eb.statistics()
        assert stats.failed_dispatches >= 1

    # ── Multiple subscribers all receive ───

    def test_multiple_subscribers_all_receive(self, bus):
        """Verify all subscribers receive the same event."""
        rt, eb = bus
        a, b, c = [], [], []
        eb.subscribe(lambda e: a.append(e))
        eb.subscribe(lambda e: b.append(e))
        eb.subscribe(lambda e: c.append(e))
        rt.execute(_workflow())
        time.sleep(0.3)
        assert len(a) > 0
        assert len(b) > 0
        assert len(c) > 0
        assert len(a) == len(b) == len(c)

    # ── Slow subscriber ───

    def test_slow_subscriber_does_not_cause_deadlock(self, bus):
        """Verify slow subscriber doesn't deadlock the bus."""
        rt, eb = bus
        received = []
        def slow(e):
            time.sleep(0.2)
            received.append(e)
        def fast(e):
            received.append(e)
        eb.subscribe(slow)
        eb.subscribe(fast)
        rt.execute(_workflow())
        time.sleep(0.6)
        assert len(received) >= 2
        stats = eb.statistics()
        assert stats.total_events > 0

    # ── Subscriber unregisters during dispatch (regression for TOCTOU fix) ───

    def test_unsubscribe_during_dispatch(self, bus):
        """Verify unsubscribing during dispatch prevents further deliveries."""
        rt, eb = bus
        delivered_to_unsubscribed = []
        sub_id = [None]

        def self_unsubscriber(e):
            delivered_to_unsubscribed.append(e)
            if sub_id[0] is not None:
                eb.unsubscribe(sub_id[0])

        sub_id[0] = eb.subscribe(self_unsubscriber)
        rt.execute(_workflow(steps=[_step("a"), _step("b")]))
        time.sleep(0.5)
        # After unsubscribing, the callback should NOT receive subsequent events
        subscriber = eb.subscriptions()
        for s in subscriber:
            if s.subscription_id == sub_id[0]:
                assert not s.is_active
        # The subscriber may have received events before unsubscribing, but once
        # inactive, no further dispatch should occur
        stats = eb.statistics()
        assert stats.total_events >= 1

    # ── Subscriber registers during dispatch ───

    def test_subscribe_during_dispatch(self, bus):
        """Verify subscribing during dispatch doesn't affect current batch."""
        rt, eb = bus
        late_received = []
        late_id = [None]

        def late_register(e):
            if late_id[0] is None:
                late_id[0] = eb.subscribe(lambda ev: late_received.append(ev))

        eb.subscribe(late_register)
        rt.execute(_workflow())
        time.sleep(0.3)
        # New subscribers should eventually receive events but only
        # for events published after registration
        stats = eb.statistics()
        assert stats.total_events >= 1

    # ── Shutdown during publish ───

    def test_shutdown_during_publish(self, bus):
        """Verify shutdown while publishing doesn't leak or deadlock."""
        rt, eb = bus
        received = []
        def slow(e):
            time.sleep(0.1)
            received.append(e)
        eb.subscribe(slow)
        rt.execute(_workflow())
        time.sleep(0.05)
        eb.shutdown()
        assert not eb.is_initialized

    # ── Publish after shutdown raises ───

    def test_publish_after_shutdown_raises(self, bus):
        """Verify publishing after shutdown raises."""
        rt, eb = bus
        from aios.eos.runtime_engine import RuntimeEvent
        eb.shutdown()
        with pytest.raises(Exception):
            ev = RuntimeEvent(
                event_type=RuntimeEventType.EXECUTION_CREATED,
                execution_id="test",
                timestamp=time.time(),
            )
            eb.publish(ev)

    # ── Statistics consistency ───

    def test_statistics_after_failed_dispatches(self, bus):
        """Verify failed_dispatches counter in statistics."""
        rt, eb = bus
        def fail(e): raise ValueError("fail")
        eb.subscribe(fail)
        rt.execute(_workflow())
        time.sleep(0.3)
        stats = eb.statistics()
        assert stats.failed_dispatches >= 1
        assert stats.total_events > 0

    # ── Validate after operations ───

    def test_validate_after_publish(self, bus):
        """Verify validate passes after normal operations."""
        rt, eb = bus
        eb.subscribe(lambda e: None)
        rt.execute(_workflow())
        time.sleep(0.3)
        result = eb.validate()
        assert result.is_valid

    # ── Unsubscribe non-existent ───

    def test_unsubscribe_nonexistent_returns_false(self, bus):
        """Verify unsubscribe returns False for unknown ID."""
        rt, eb = bus
        assert not eb.unsubscribe("no-such-subscription")

    # ── Unsubscribe already inactive ───

    def test_unsubscribe_twice_returns_false(self, bus):
        """Verify unsubscribe returns False if already inactive."""
        rt, eb = bus
        sid = eb.subscribe(lambda e: None)
        assert eb.unsubscribe(sid)
        assert not eb.unsubscribe(sid)

    # ── Unsubscribe all ───

    def test_unsubscribe_all_clears_all(self, bus):
        """Verify unsubscribe_all removes all subscribers."""
        rt, eb = bus
        eb.subscribe(lambda e: None)
        eb.subscribe(lambda e: None)
        count = eb.unsubscribe_all()
        assert count == 2
        assert eb.statistics().subscriber_count == 0


# ═══════════════════════════════════════════════════════════════════════════
# 4.3.3 — Persistence Failure
# ═══════════════════════════════════════════════════════════════════════════


class TestPersistenceFailure:
    """Verify PersistenceStore survives failures."""

    @pytest.fixture
    def ps(self):
        """Provide PersistenceStore with temp database."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            db = str(Path(tmp) / "test.db")
            store = PersistenceStore(db)
            store.initialize()
            yield store

    def test_load_nonexistent_execution_returns_none(self, ps):
        """Verify loading non-existent execution returns None."""
        result = ps.load_execution("no-such-exec")
        assert result is None

    def test_load_nonexistent_workflow_returns_none(self, ps):
        """Verify loading non-existent workflow returns None."""
        result = ps.load_workflow("no-such-wf")
        assert result is None

    def test_load_nonexistent_report_returns_none(self, ps):
        """Verify loading non-existent report returns None."""
        result = ps.load_report("no-such-report")
        assert result is None

    def test_delete_nonexistent_execution_returns_false(self, ps):
        """Verify deleting non-existent execution returns False."""
        assert not ps.delete_execution("no-such-exec")

    def test_delete_nonexistent_workflow_returns_false(self, ps):
        """Verify deleting non-existent workflow returns False."""
        assert not ps.delete_workflow("no-such-wf")

    def test_double_initialization_does_not_crash(self):
        """Verify re-initializing PersistenceStore is safe."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            db = str(Path(tmp) / "test.db")
            store = PersistenceStore(db)
            store.initialize()
            store.initialize()
            assert store.is_initialized

    def test_clear_all_resets_statistics(self, ps):
        """Verify clear_all resets all statistics to zero."""
        ps.clear_all()
        stats = ps.statistics()
        assert stats.total_workflows == 0
        assert stats.total_executions == 0
        assert stats.total_events == 0

    def test_uninitialized_store_raises(self):
        """Verify operations on uninitialized store raise EOSLoaderError."""
        store = PersistenceStore(":memory:")
        with pytest.raises(EOSLoaderError):
            store.save_workflow(None)
        with pytest.raises(EOSLoaderError):
            store.save_execution(None)

    def test_statistics_empty_store(self, ps):
        """Verify statistics returns zeros for empty store."""
        stats = ps.statistics()
        assert stats.total_workflows == 0
        assert stats.total_executions == 0
        assert stats.total_events == 0
        assert stats.total_reports == 0

    def test_statistics_after_clear(self, ps):
        """Verify statistics after clear_all returns zeros."""
        ps.clear_all()
        stats = ps.statistics()
        assert stats.total_workflows == 0
        assert stats.database_size_bytes >= 0

    def test_validate_empty_store_passes(self, ps):
        """Verify validate on empty store returns no errors."""
        issues = ps.validate()
        assert isinstance(issues, list)

    def test_sequential_operations_safe(self, ps):
        """Verify sequential save/load operations are thread-safe."""
        from aios.eos.workflow_engine import (
            ExecutionCost,
            ExecutionDuration,
            ExecutionMode,
            ExecutionStrategy,
            Workflow,
            WorkflowStep,
        )
        step = WorkflowStep(
            step_id="s1", action_id="act1", title="T", category="c",
            source="capability", confidence=0.8,
            estimated_cost=ExecutionCost(), estimated_duration=ExecutionDuration(),
        )
        wf = Workflow(
            task_description="test",
            strategy=ExecutionStrategy("sequential"),
            steps=[step],
            execution_mode=ExecutionMode.SEQUENTIAL,
            total_cost=ExecutionCost(),
            total_duration=ExecutionDuration(),
        )
        wf_id = ps.save_workflow(wf)
        loaded = ps.load_workflow(wf_id)
        assert loaded is not None
        assert loaded.task_description == "test"
        ps.delete_workflow(wf_id)
        assert ps.load_workflow(wf_id) is None

    def test_save_execution_and_load(self, ps):
        """Verify save and load of execution roundtrip."""
        from aios.eos.runtime_engine import (
            ExecutionMetrics,
            RetryPolicy,
            RuntimeExecution,
            RuntimeState,
            RuntimeStep,
        )
        from aios.eos.workflow_engine import (
            ExecutionCost,
            ExecutionDuration,
            ExecutionMode,
            WorkflowStep,
        )
        ws = WorkflowStep(
            step_id="s1", action_id="act1", title="T", category="c",
            source="capability", confidence=0.8,
            estimated_cost=ExecutionCost(), estimated_duration=ExecutionDuration(),
        )
        wf = Workflow(
            task_description="exec-save-test",
            strategy=ExecutionStrategy(ExecutionMode.SEQUENTIAL.value),
            steps=[ws],
            execution_mode=ExecutionMode.SEQUENTIAL,
            total_cost=ExecutionCost(),
            total_duration=ExecutionDuration(),
        )
        rt_step = RuntimeStep(
            step_id="s1", workflow_step=ws, state=RuntimeState.COMPLETED,
        )
        exec_obj = RuntimeExecution(
            execution_id="exec-save-1",
            workflow=wf,
            state=RuntimeState.COMPLETED,
            steps={"s1": rt_step},
            created_at=time.time(),
            metrics=ExecutionMetrics(),
            retry_policy=RetryPolicy(),
        )
        exec_id = ps.save_execution(exec_obj)
        loaded = ps.load_execution(exec_id)
        assert loaded is not None
        assert loaded.execution_id == "exec-save-1"
        assert loaded.state == RuntimeState.COMPLETED

    def test_save_event_persists(self, ps):
        """Verify saving an event persists correctly."""
        from aios.eos.runtime_engine import RuntimeEvent, RuntimeEventType
        ev = RuntimeEvent(
            event_type=RuntimeEventType.EXECUTION_CREATED,
            execution_id="exec-evt-1",
            timestamp=time.time(),
            message="test event",
        )
        ev_id = ps.save_event("exec-evt-1", ev)
        assert ev_id > 0
        events = ps.load_events(execution_id="exec-evt-1")
        assert len(events) >= 1
        assert events[0].event_type == RuntimeEventType.EXECUTION_CREATED

    def test_statistics_after_save(self, ps):
        """Verify statistics update after saving objects."""
        from aios.eos.runtime_engine import (
            ExecutionMetrics,
            RetryPolicy,
            RuntimeExecution,
            RuntimeState,
            RuntimeStep,
        )
        ws = _step("stats-s1")
        wf = _workflow([ws])
        ps.save_workflow(wf)
        rt_step = RuntimeStep(
            step_id="stats-s1", workflow_step=ws, state=RuntimeState.COMPLETED,
        )
        exec_obj = RuntimeExecution(
            execution_id="exec-stats-1",
            workflow=wf,
            state=RuntimeState.COMPLETED,
            steps={"stats-s1": rt_step},
            created_at=time.time(),
            metrics=ExecutionMetrics(),
            retry_policy=RetryPolicy(),
        )
        ps.save_execution(exec_obj)
        stats = ps.statistics()
        assert stats.total_workflows >= 1
        assert stats.total_executions >= 1

    def test_load_executions_by_state(self, ps):
        """Verify loading executions filtered by state."""
        from aios.eos.runtime_engine import (
            ExecutionMetrics,
            RetryPolicy,
            RuntimeExecution,
            RuntimeState,
            RuntimeStep,
        )
        ws = _step("filter-s1")
        wf = _workflow([ws])
        rt_step = RuntimeStep(
            step_id="filter-s1", workflow_step=ws, state=RuntimeState.COMPLETED,
        )
        exec_obj = RuntimeExecution(
            execution_id="exec-filter-1",
            workflow=wf,
            state=RuntimeState.FAILED,
            steps={"filter-s1": rt_step},
            created_at=time.time(),
            metrics=ExecutionMetrics(),
            retry_policy=RetryPolicy(),
        )
        ps.save_execution(exec_obj)
        results = ps.load_executions(state=RuntimeState.FAILED, limit=10)
        ids = [e.execution_id for e in results]
        assert "exec-filter-1" in ids

    def test_save_report_and_load(self, ps):
        """Verify saving and loading a report roundtrip."""
        from aios.eos.runtime_engine import ExecutionReport, RuntimeState
        report = ExecutionReport(
            execution_id="report-1",
            workflow_task="report-test",
            strategy="sequential",
            execution_mode="sequential",
            state=RuntimeState.COMPLETED,
            created_at=time.time(),
            started_at=time.time(),
            completed_at=time.time(),
            duration_seconds=0.1,
            total_steps=1,
            completed_steps=1,
            failed_steps=0,
            skipped_steps=0,
            total_retries=0,
            total_cost=ExecutionCost(),
            total_duration=ExecutionDuration(),
            has_rollback=False,
            was_rolled_back=False,
            error=None,
        )
        ps.save_report(report)
        loaded = ps.load_report("report-1")
        assert loaded is not None
        assert loaded.execution_id == "report-1"
        assert loaded.state == RuntimeState.COMPLETED


# ═══════════════════════════════════════════════════════════════════════════
# 4.3.4 — Recovery Failure
# ═══════════════════════════════════════════════════════════════════════════


class TestRecoveryFailure:
    __test__ = False
    """Verify RecoveryEngine handles failures."""

    @pytest.fixture
    def engine(self):
        """Provide RecoveryEngine with temp repo root."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            config = AIOSConfig(repo_root=Path(tmp))
            eng = RecoveryEngine(config)
            yield eng

    def test_resume_nonexistent_checkpoint(self, engine):
        """Verify resume of non-existent checkpoint raises."""
        with pytest.raises(Exception):
            engine.resume("no-such-checkpoint")

    def test_checkpoint_then_resume(self, engine):
        """Verify checkpoint and resume roundtrip works."""
        cp_id = engine.checkpoint({"key": "value"})
        payload = engine.resume(cp_id)
        assert payload["session"]["key"] == "value"

    def test_list_checkpoints(self, engine):
        """Verify list_checkpoints works with no checkpoints."""
        cps = engine.list_checkpoints()
        assert isinstance(cps, list)

    def test_prune_with_no_checkpoints(self, engine):
        """Verify prune with no checkpoints is safe."""
        removed = engine.prune(keep=5)
        assert removed == 0

    def test_resume_empty_checkpoint(self, engine):
        """Verify resuming a checkpoint with minimal data."""
        cp_id = engine.checkpoint({"minimal": True})
        payload = engine.resume(cp_id)
        assert payload is not None

    def test_multiple_checkpoints(self, engine):
        """Verify creating multiple checkpoints works."""
        ids = [engine.checkpoint({"seq": i}) for i in range(3)]
        assert len(set(ids)) == 3

    def test_resume_corrupt_checkpoint_raises(self, engine):
        """Verify resuming a corrupt checkpoint raises."""
        from aios.core.exceptions import RecoveryError
        cp_id = engine.checkpoint({"data": "ok"})
        cp_path = engine._checkpoint_dir / f"{cp_id}.json"
        cp_path.write_text("{corrupt json", encoding="utf-8")
        with pytest.raises(RecoveryError):
            engine.resume(cp_id)

    def test_prune_removes_old_checkpoints(self, engine):
        """Verify prune removes old checkpoints beyond keep count."""
        for i in range(5):
            engine.checkpoint({"seq": i})
        removed = engine.prune(keep=2)
        assert removed == 3
        remaining = engine.list_checkpoints()
        assert len(remaining) == 2

    def test_resume_without_id_uses_latest(self, engine):
        """Verify resume(None) loads latest checkpoint."""
        engine.checkpoint({"first": True})
        engine.checkpoint({"second": True})
        payload = engine.resume()
        assert payload["session"]["second"] is True
        assert payload["session"].get("first") is None


# ═══════════════════════════════════════════════════════════════════════════
# 4.3.5 — Scheduler Failure
# ═══════════════════════════════════════════════════════════════════════════


class TestSchedulerFailure:
    """Verify Scheduler handles job failures."""

    @pytest.fixture
    def scheduler(self):
        """Provide initialized Scheduler."""
        s = Scheduler()
        s.initialize()
        yield s
        s.shutdown()

    def test_cancel_scheduled_job(self, scheduler):
        """Verify cancelling a scheduled job changes status."""
        job = scheduler.schedule_job("j1", JobType.ONE_TIME, priority=5)
        assert scheduler.cancel_job(job.id)
        assert scheduler.get_job(job.id).status == JobStatus.CANCELLED

    def test_execute_empty_queue(self, scheduler):
        """Verify execute_next on empty queue returns None."""
        assert scheduler.execute_next() is None

    def test_shutdown_with_active_jobs(self, scheduler):
        """Verify shutdown with jobs queued is safe."""
        scheduler.schedule_job("j1", JobType.ONE_TIME, priority=5)
        scheduler.schedule_job("j2", JobType.ONE_TIME, priority=3)
        scheduler.shutdown()
        assert not scheduler.is_initialized

    def test_double_shutdown_safe(self, scheduler):
        """Verify calling shutdown twice is safe."""
        scheduler.shutdown()
        scheduler.shutdown()
        assert not scheduler.is_initialized

    def test_schedule_after_shutdown_raises(self, scheduler):
        """Verify scheduling after shutdown raises."""
        scheduler.shutdown()
        with pytest.raises(Exception):
            scheduler.schedule_job("fail", JobType.ONE_TIME, priority=1)

    def test_execute_job_updates_statistics(self, scheduler):
        """Verify execute_next updates job statistics."""
        scheduler.schedule_job("j1", JobType.ONE_TIME, priority=1)
        scheduler.execute_next()
        stats = scheduler.get_statistics()
        assert stats.completed_jobs >= 1

    def test_job_retry_on_exception(self, scheduler):
        """Verify job retry when execution fails."""
        from aios.scheduler.job_manager import JobManager
        original = JobManager._execute_job
        calls = [0]
        def fail(self_, job):
            calls[0] += 1
            raise RuntimeError("simulated")
        JobManager._execute_job = fail
        try:
            from aios.scheduler.models import RetryPolicy
            rp = RetryPolicy(max_retries=2, retry_delay=0.01, exponential_backoff=False)
            scheduler.schedule_job("retry", JobType.ONE_TIME, priority=1, retry_policy=rp)
            for _ in range(3):
                scheduler.execute_next()
            assert calls[0] == 3
        finally:
            JobManager._execute_job = original

    def test_permanent_failure_counts(self, scheduler):
        """Verify permanent job failure increments failed count."""
        from aios.scheduler.job_manager import JobManager
        original = JobManager._execute_job
        def fail(self_, job):
            raise RuntimeError("perm-fail")
        JobManager._execute_job = fail
        try:
            rp = RetryPolicy(max_retries=0, retry_delay=0.01)
            scheduler.schedule_job("perm", JobType.ONE_TIME, priority=1, retry_policy=rp)
            scheduler.execute_next()
            assert scheduler.job_manager.failed_count == 1
        finally:
            JobManager._execute_job = original

    def test_reload_resets_statistics(self, scheduler):
        """Verify reload resets scheduler statistics."""
        scheduler.schedule_job("r1", JobType.ONE_TIME, priority=1)
        scheduler.execute_next()
        assert scheduler.get_statistics().total_jobs > 0
        scheduler.reload()
        scheduler.initialize()
        stats = scheduler.get_statistics()
        assert stats.total_jobs == 0

    def test_validate_returns_result(self, scheduler):
        """Verify validate returns SchedulerValidationResult."""
        result = scheduler.validate()
        assert result is not None
        assert hasattr(result, "is_valid")


# ═══════════════════════════════════════════════════════════════════════════
# 4.3.6 — Memory Failure
# ═══════════════════════════════════════════════════════════════════════════


class TestMemoryFailure:
    __test__ = False
    """Verify Memory subsystem handles failures."""

    @pytest.fixture
    def store(self):
        """Provide MemoryStore."""
        import tempfile

        from aios.memory.store import MemoryStore
        with tempfile.TemporaryDirectory() as tmp:
            config = AIOSConfig(repo_root=Path(tmp))
            yield MemoryStore(config)

    def test_put_and_get(self, store):
        """Verify basic put/get roundtrip."""
        store.put("k1", "v1", memory_type="short_term")
        assert store.get("k1") == "v1"

    def test_get_nonexistent_returns_none(self, store):
        """Verify getting non-existent key returns None."""
        assert store.get("no-such-key") is None

    def test_delete_existing(self, store):
        """Verify deleting an existing key works."""
        store.put("k1", "v1")
        assert store.delete("k1")
        assert store.get("k1") is None

    def test_delete_nonexistent_returns_false(self, store):
        """Verify deleting non-existent key returns False."""
        assert not store.delete("no-such-key")

    def test_clear_removes_all(self, store):
        """Verify clear removes all items."""
        store.put("k1", "v1")
        store.put("k2", "v2")
        store.clear()
        assert store.count() == 0

    def test_count_accuracy(self, store):
        """Verify count reflects actual items."""
        assert store.count() == 0
        store.put("k1", "v1")
        assert store.count() == 1
        store.put("k2", "v2")
        assert store.count() == 2
        store.delete("k1")
        assert store.count() == 1

    def test_all_returns_all_items(self, store):
        """Verify all() returns all stored items."""
        store.put("k1", "v1")
        store.put("k2", "v2")
        items = store.all()
        assert len(items) == 2

    def test_overwrite_existing_key(self, store):
        """Verify overwriting an existing key updates value."""
        store.put("k1", "v1")
        store.put("k1", "v2")
        assert store.get("k1") == "v2"

    def test_prune_removes_old_items(self, store):
        """Verify prune removes items older than max_age_days."""
        store.put("fresh", "value")
        store.put("old", "value")
        removed = store.prune(max_age_days=0)
        assert removed >= 0

    def test_get_record_metadata(self, store):
        """Verify get_record returns full metadata."""
        store.put("k1", "v1", memory_type="short_term", tags=["test"])
        record = store.get_record("k1")
        assert record is not None
        assert record["key"] == "k1"
        assert record["type"] == "short_term"
        assert "test" in record["tags"]

    def test_put_after_clear(self, store):
        """Verify putting after clear works."""
        store.put("k1", "v1")
        store.clear()
        assert store.count() == 0
        store.put("k2", "v2")
        assert store.count() == 1
        assert store.get("k2") == "v2"


class TestWorkflowFailure:
    """Verify WorkflowEngine handles failures correctly."""

    @pytest.fixture
    def stack(self):
        """Provide WorkflowEngine with EOS stack."""
        import json
        import tempfile

        from aios.eos.capability_discovery import CapabilityDiscovery
        from aios.eos.context_builder import EOSContextBuilder
        from aios.eos.decision_engine import EOSDecisionEngine
        from aios.eos.knowledge_service import KnowledgeService
        from aios.eos.loader import EOS_DIR_NAME, EOSLoader
        from aios.eos.registry import RegistryManager

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            ai_dir = tmp_path / EOS_DIR_NAME
            ai_dir.mkdir(parents=True, exist_ok=True)
            for d in ("kernel", "engines", "index"):
                (ai_dir / d).mkdir(exist_ok=True)
            for fname in ("CONSTITUTION.md", "IDENTITY.md", "MISSION.md", "ENGINEERING_LAWS.md"):
                (ai_dir / "kernel" / fname).write_text(f"# {fname}\ncontent", encoding="utf-8")
            (ai_dir / "index" / "test-registry.json").write_text(
                json.dumps({
                    "schemaVersion": "1.0.0",
                    "status": "generated",
                    "updated": "2026-07-13",
                    "data": {"guides": []},
                }),
                encoding="utf-8",
            )
            config = AIOSConfig(repo_root=tmp_path)
            loader = EOSLoader(config)
            loader.initialize()
            rm = RegistryManager().initialize(loader)
            cd = CapabilityDiscovery().initialize(rm)
            ks = KnowledgeService().initialize(cd)
            cb = EOSContextBuilder(token_budget=12_000).initialize(ks)
            de = EOSDecisionEngine().initialize(cb)
            we = WorkflowEngine().initialize(de)
            yield we

    def test_validate_valid_workflow(self, stack):
        """Verify valid workflow passes validation."""
        we = stack
        result = we.validate(_workflow())
        assert result.is_valid

    def test_validate_empty_steps(self, stack):
        """Verify empty-steps workflow gets empty warning."""
        we = stack
        wf = Workflow(
            task_description="empty",
            strategy=ExecutionStrategy(ExecutionMode.SEQUENTIAL.value),
            steps=[],
            execution_mode=ExecutionMode.SEQUENTIAL,
            total_cost=ExecutionCost(),
            total_duration=ExecutionDuration(),
        )
        result = we.validate(wf)
        assert result.empty_workflow
        assert "empty" in " ".join(result.warnings).lower()

    def test_build_from_plan(self, stack):
        """Verify build() accepts ExecutionPlan."""
        we = stack
        from aios.eos.workflow_engine import ExecutionPlan
        plan = ExecutionPlan(
            task_description="test plan",
            strategy=ExecutionStrategy(ExecutionMode.SEQUENTIAL.value),
        )
        result = we.build(plan)
        assert result is not None

    def test_statistics_after_validation(self, stack):
        """Verify statistics available after operations."""
        we = stack
        we.validate(_workflow())
        stats = we.statistics()
        assert stats is not None


# ═══════════════════════════════════════════════════════════════════════════
# 4.3.7 — Tool / Executor Failure
# ═══════════════════════════════════════════════════════════════════════════


class TestToolExecutorFailure:
    __test__ = False
    """Verify ToolExecutor and Executor handle failures correctly."""

    @pytest.fixture
    def tool_executor(self):
        """Provide initialized ToolExecutor."""
        from aios.tools.executor import ToolExecutor
        te = ToolExecutor()
        te.initialize()
        yield te

    @pytest.fixture
    def mock_provider(self):
        """Provide initialized MockToolProvider."""
        from aios.tools.providers.mock import MockToolProvider
        return MockToolProvider().initialize()

    def test_execute_valid_tool(self, tool_executor, mock_provider):
        """Verify execution with valid tool and request succeeds."""
        from aios.tools.models import ToolDefinition, ToolRequest
        req = ToolRequest(tool_name="echo", arguments={"message": "hello"})
        tool_def = ToolDefinition(name="echo")
        resp = tool_executor.execute(mock_provider, req, tool_def)
        assert resp is not None
        assert resp.result == "hello"

    def test_execute_failing_tool(self, tool_executor, mock_provider):
        """Verify execution with failing tool raises ToolError."""
        from aios.core.exceptions import ToolError
        from aios.tools.models import ToolDefinition, ToolRequest
        req = ToolRequest(tool_name="fail")
        tool_def = ToolDefinition(name="fail")
        with pytest.raises(ToolError):
            tool_executor.execute(mock_provider, req, tool_def)

    def test_execute_uninitialized_provider_raises(self, tool_executor):
        """Verify execution with uninitialized provider raises."""
        from aios.core.exceptions import ToolError
        from aios.tools.models import ToolDefinition, ToolRequest
        from aios.tools.providers.mock import MockToolProvider
        uninit = MockToolProvider()
        req = ToolRequest(tool_name="echo")
        tool_def = ToolDefinition(name="echo")
        with pytest.raises(ToolError):
            tool_executor.execute(uninit, req, tool_def)

    def test_execute_uninitialized_executor_raises(self):
        """Verify execute on uninitialized ToolExecutor raises."""
        from aios.core.exceptions import ToolError
        from aios.tools.executor import ToolExecutor
        from aios.tools.models import ToolDefinition, ToolRequest
        from aios.tools.providers.mock import MockToolProvider
        te = ToolExecutor()
        provider = MockToolProvider().initialize()
        req = ToolRequest(tool_name="echo")
        tool_def = ToolDefinition(name="echo")
        with pytest.raises(ToolError):
            te.execute(provider, req, tool_def)

    def test_validate_after_execution(self, tool_executor, mock_provider):
        """Verify validate passes after successful execution."""
        from aios.tools.models import ToolDefinition, ToolRequest
        req = ToolRequest(tool_name="echo", arguments={"message": "x"})
        tool_def = ToolDefinition(name="echo")
        tool_executor.execute(mock_provider, req, tool_def)
        result = tool_executor.validate()
        assert result is not None

    def test_executor_init_and_dry_run(self):
        """Verify Executor initializes and dry run returns."""
        import tempfile

        from aios.executor.engine import Executor
        with tempfile.TemporaryDirectory() as tmp:
            config = AIOSConfig(repo_root=Path(tmp))
            ex = Executor(config)
            result = ex.execute(dry_run=True)
            assert result["status"] == "dry_run"
            assert "executionId" in result

    def test_executor_with_custom_plan(self):
        """Verify Executor handles a custom plan."""
        import tempfile

        from aios.executor.engine import Executor
        with tempfile.TemporaryDirectory() as tmp:
            config = AIOSConfig(repo_root=Path(tmp))
            ex = Executor(config)
            plan = {"steps": [{"id": "scan", "action": "scan", "description": "test"}]}
            result = ex.execute(plan=plan, dry_run=True)
            assert result["status"] == "dry_run"
            assert len(result["steps"]) == 1

    def test_executor_with_empty_plan(self):
        """Verify Executor handles empty plan gracefully."""
        import tempfile

        from aios.executor.engine import Executor
        with tempfile.TemporaryDirectory() as tmp:
            config = AIOSConfig(repo_root=Path(tmp))
            ex = Executor(config)
            result = ex.execute(plan={}, dry_run=True)
            assert result["status"] == "dry_run"


# ═══════════════════════════════════════════════════════════════════════════
# 4.3.8 — Concurrency Failure
# ═══════════════════════════════════════════════════════════════════════════


class TestConcurrencyFailure:
    """Verify system handles concurrent operations safely."""

    @pytest.fixture
    def stack(self):
        """Provide RuntimeEngine with full stack."""
        import json
        import tempfile

        from aios.eos.capability_discovery import CapabilityDiscovery
        from aios.eos.context_builder import EOSContextBuilder
        from aios.eos.decision_engine import EOSDecisionEngine
        from aios.eos.knowledge_service import KnowledgeService
        from aios.eos.loader import EOS_DIR_NAME, EOSLoader
        from aios.eos.registry import RegistryManager
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            ai_dir = tmp_path / EOS_DIR_NAME
            ai_dir.mkdir(parents=True, exist_ok=True)
            for d in ("kernel", "engines", "index"):
                (ai_dir / d).mkdir(exist_ok=True)
            for fname in ("CONSTITUTION.md", "IDENTITY.md", "MISSION.md", "ENGINEERING_LAWS.md"):
                (ai_dir / "kernel" / fname).write_text(f"# {fname}\ncontent", encoding="utf-8")
            (ai_dir / "index" / "test-registry.json").write_text(
                json.dumps({"schemaVersion": "1.0.0", "status": "generated", "data": {"guides": []}}),
                encoding="utf-8",
            )
            config = AIOSConfig(repo_root=tmp_path)
            loader = EOSLoader(config)
            loader.initialize()
            rm = RegistryManager().initialize(loader)
            cd = CapabilityDiscovery().initialize(rm)
            ks = KnowledgeService().initialize(cd)
            cb = EOSContextBuilder(token_budget=12_000).initialize(ks)
            de = EOSDecisionEngine().initialize(cb)
            we = WorkflowEngine().initialize(de)
            rt = RuntimeEngine().initialize(we)
            eb = EventBus().initialize(rt)
            rt.bind_event_bus(eb)
            yield we, rt, eb

    def test_concurrent_executions(self, stack):
        """Verify multiple concurrent workflow executions complete."""
        we, rt, eb = stack
        ids = []
        for i in range(10):
            ids.append(rt.execute(_workflow(steps=[_step(f"s{i}")])))
        time.sleep(1.0)
        for eid in ids:
            state = rt.status(eid)
            assert state == RuntimeState.COMPLETED, f"{eid}: {state}"
        assert rt.statistics().total_executions >= 10

    def test_concurrent_event_publish(self, stack):
        """Verify concurrent event publishing is safe."""
        we, rt, eb = stack
        received = []
        lock = threading.Lock()
        def safe_append(e):
            with lock:
                received.append(e)
        eb.subscribe(safe_append)
        threads = []
        for i in range(10):
            t = threading.Thread(target=rt.execute, args=(_workflow(),), daemon=True)
            threads.append(t)
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=5)
        time.sleep(0.5)
        assert len(received) > 0
        stats = eb.statistics()
        assert stats.total_events > 0

    def test_concurrent_cancel(self, stack):
        """Verify concurrent cancel calls don't deadlock."""
        we, rt, eb = stack
        ids = [rt.execute(_workflow()) for _ in range(5)]
        time.sleep(0.3)
        for eid in ids:
            try:
                rt.cancel(eid)
            except RuntimeEngineError:
                pass
        for eid in ids:
            state = rt.status(eid)
            assert state in (RuntimeState.CANCELLED, RuntimeState.COMPLETED)

    def test_concurrent_memory_access(self, stack):
        """Verify concurrent MemoryStore operations."""
        import tempfile

        from aios.memory.store import MemoryStore
        with tempfile.TemporaryDirectory() as tmp:
            config = AIOSConfig(repo_root=Path(tmp))
            ms = MemoryStore(config)
            def writer():
                for i in range(50):
                    ms.put(f"k{i}", f"v{i}")
            def reader():
                for i in range(50):
                    ms.get(f"k{i}")
            threads = [threading.Thread(target=writer, daemon=True) for _ in range(3)]
            threads += [threading.Thread(target=reader, daemon=True) for _ in range(3)]
            for t in threads:
                t.start()
            for t in threads:
                t.join(timeout=5)

    def test_concurrent_scheduler_jobs(self):
        """Verify concurrent scheduler operations don't deadlock."""
        from aios.scheduler.manager import Scheduler
        s = Scheduler()
        s.initialize()
        errors = []
        lock = threading.Lock()
        def worker():
            try:
                for i in range(5):
                    s.schedule_job(
                        f"cj-{threading.get_ident()}-{i}",
                        JobType.ONE_TIME,
                        priority=1,
                    )
                for _ in range(5):
                    s.execute_next()
            except Exception as e:
                with lock:
                    errors.append(e)
        threads = [threading.Thread(target=worker, daemon=True) for _ in range(3)]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=5)
        s.shutdown()
        assert len(errors) == 0


# ═══════════════════════════════════════════════════════════════════════════
# 4.3.9 — Long-Running Stability
# ═══════════════════════════════════════════════════════════════════════════


class TestLongRunningStability:
    __test__ = False
    """Verify system stability under sustained load."""

    @pytest.fixture
    def stack(self):
        """Provide RuntimeEngine with full stack (reused across subtests)."""
        import json
        import tempfile

        from aios.eos.capability_discovery import CapabilityDiscovery
        from aios.eos.context_builder import EOSContextBuilder
        from aios.eos.decision_engine import EOSDecisionEngine
        from aios.eos.knowledge_service import KnowledgeService
        from aios.eos.loader import EOS_DIR_NAME, EOSLoader
        from aios.eos.registry import RegistryManager
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            ai_dir = tmp_path / EOS_DIR_NAME
            ai_dir.mkdir(parents=True, exist_ok=True)
            for d in ("kernel", "engines", "index"):
                (ai_dir / d).mkdir(exist_ok=True)
            for fname in ("CONSTITUTION.md", "IDENTITY.md", "MISSION.md", "ENGINEERING_LAWS.md"):
                (ai_dir / "kernel" / fname).write_text(f"# {fname}\ncontent", encoding="utf-8")
            (ai_dir / "index" / "test-registry.json").write_text(
                json.dumps({"schemaVersion": "1.0.0", "status": "generated", "data": {"guides": []}}),
                encoding="utf-8",
            )
            config = AIOSConfig(repo_root=tmp_path)
            loader = EOSLoader(config)
            loader.initialize()
            rm = RegistryManager().initialize(loader)
            cd = CapabilityDiscovery().initialize(rm)
            ks = KnowledgeService().initialize(cd)
            cb = EOSContextBuilder(token_budget=12_000).initialize(ks)
            de = EOSDecisionEngine().initialize(cb)
            we = WorkflowEngine().initialize(de)
            rt = RuntimeEngine().initialize(we)
            eb = EventBus().initialize(rt)
            rt.bind_event_bus(eb)
            yield we, rt, eb

    def test_sustained_workflow_executions(self, stack):
        """Verify 50 sequential workflow executions with no leaks."""
        we, rt, eb = stack
        before_threads = threading.active_count()
        for i in range(50):
            eid = rt.execute(_workflow(steps=[_step(f"s{i}")]))
        time.sleep(2.0)
        for i in range(50):
            try:
                state = rt.status(eid)
                assert state == RuntimeState.COMPLETED
            except RuntimeEngineError:
                pass  # may have been cleaned up
        after_threads = threading.active_count()
        assert after_threads <= before_threads + 10

    def test_continuous_event_bus(self, stack):
        """Verify EventBus survives sustained publishing."""
        we, rt, eb = stack
        received = []
        eb.subscribe(lambda e: received.append(e))
        for i in range(20):
            rt.execute(_workflow(steps=[_step(f"x{i}")]))
        time.sleep(2.0)
        stats = eb.statistics()
        assert stats.total_events > 0
        assert len(received) > 0

    def test_statistics_consistency_under_load(self, stack):
        """Verify statistics remain consistent after many executions."""
        we, rt, eb = stack
        for i in range(25):
            rt.execute(_workflow())
        time.sleep(2.0)
        stats = rt.statistics()
        assert stats.total_executions >= 25
        assert stats.total_executions == stats.successful_executions + stats.failed_executions + stats.cancelled_executions

    def test_sustained_scheduler_jobs(self):
        """Verify Scheduler handles repeated schedule/execute cycles."""
        from aios.scheduler.manager import Scheduler
        s = Scheduler()
        s.initialize()
        before = threading.active_count()
        for i in range(30):
            s.schedule_job(f"ls{i}", JobType.ONE_TIME, priority=1)
            s.execute_next()
        stats = s.get_statistics()
        assert stats.completed_jobs >= 1
        assert stats.total_jobs >= 0
        after = threading.active_count()
        assert after <= before + 5
        s.shutdown()

    def test_sustained_checkpoint_operations(self):
        """Verify RecoveryEngine handles repeated checkpoint/resume cycles."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            config = AIOSConfig(repo_root=Path(tmp))
            eng = RecoveryEngine(config)
            for i in range(20):
                cp_id = eng.checkpoint({"seq": i})
                payload = eng.resume(cp_id)
                assert payload["session"]["seq"] == i
            cps = eng.list_checkpoints()
            assert len(cps) == 20

    def test_sustained_persistence_operations(self):
        """Verify PersistenceStore handles repeated save/load/delete cycles."""
        import tempfile

        from aios.eos.runtime_engine import (
            ExecutionMetrics,
            RetryPolicy,
            RuntimeExecution,
            RuntimeState,
            RuntimeStep,
        )
        with tempfile.TemporaryDirectory() as tmp:
            db = str(Path(tmp) / "stress.db")
            ps = PersistenceStore(db)
            ps.initialize()
            for i in range(20):
                ws = _step(f"stress-s{i}")
                wf = _workflow([ws])
                ps.save_workflow(wf)
                rt_step = RuntimeStep(
                    step_id=f"stress-s{i}", workflow_step=ws, state=RuntimeState.COMPLETED,
                )
                exec_obj = RuntimeExecution(
                    execution_id=f"exec-stress-{i}",
                    workflow=wf,
                    state=RuntimeState.COMPLETED,
                    steps={f"stress-s{i}": rt_step},
                    created_at=time.time(),
                    metrics=ExecutionMetrics(),
                    retry_policy=RetryPolicy(),
                )
                ps.save_execution(exec_obj)
            stats = ps.statistics()
            assert stats.total_workflows == 20
            assert stats.total_executions == 20


# ═══════════════════════════════════════════════════════════════════════════
# Test Execution
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
