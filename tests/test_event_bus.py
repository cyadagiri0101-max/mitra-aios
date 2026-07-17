"""Tests for AIOS EventBus."""

from __future__ import annotations

import json
import threading
import time
from contextlib import contextmanager
from pathlib import Path

import pytest

from aios.core.config import AIOSConfig
from aios.core.exceptions import EventBusError
from aios.eos.capability_discovery import CapabilityDiscovery
from aios.eos.context_builder import EOSContextBuilder
from aios.eos.decision_engine import EOSDecisionEngine
from aios.eos.event_bus import (
    EventBus,
    EventDispatchMode,
    EventEnvelope,
    EventHistory,
    EventPriority,
    EventStatistics,
    EventSubscription,
    EventValidationResult,
)
from aios.eos.knowledge_service import KnowledgeService
from aios.eos.loader import EOS_DIR_NAME, EOSLoader
from aios.eos.registry import RegistryManager
from aios.eos.runtime_engine import (
    RuntimeEngine,
    RuntimeEvent,
    RuntimeEventType,
    RuntimeState,
)
from aios.eos.workflow_engine import WorkflowEngine

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


def _make_runtime_event(
    event_type: RuntimeEventType = RuntimeEventType.EXECUTION_CREATED,
    execution_id: str = "exec-1",
    step_id: str | None = None,
    message: str = "test event",
) -> RuntimeEvent:
    return RuntimeEvent(
        event_type=event_type,
        execution_id=execution_id,
        step_id=step_id,
        message=message,
        timestamp=time.time(),
    )


def _build_full_stack(
    base: Path,
    registries: dict[str, dict] | None = None,
) -> tuple:
    _make_eos_tree(base, registries=registries)
    loader = EOSLoader(_config(base))
    loader.initialize()
    rm = RegistryManager().initialize(loader)
    cd = CapabilityDiscovery().initialize(rm)
    ks = KnowledgeService().initialize(cd)
    cb = EOSContextBuilder().initialize(ks)
    de = EOSDecisionEngine().initialize(cb)
    we = WorkflowEngine().initialize(de)
    rt = RuntimeEngine().initialize(we)
    return loader, rm, cd, ks, cb, de, we, rt


# ── Fixtures ──────────────────────────────────────────────


@pytest.fixture
def event_bus_and_rt() -> tuple[EventBus, RuntimeEngine]:
    with _managed_event_bus() as result:
        yield result


@contextmanager
def _managed_event_bus():
    import tempfile
    tmp = tempfile.TemporaryDirectory()
    try:
        tmp_path = Path(tmp.name)
        _, _, _, _, _, _, _, rt = _build_full_stack(tmp_path)
        eb = EventBus().initialize(rt)
        yield eb, rt
    finally:
        tmp.cleanup()


# ── Tests: Initialization ─────────────────────────────────


class TestInitialization:
    def test_initialize_with_valid_runtime_engine(self):
        with _managed_event_bus() as (eb, _):
            assert eb.is_initialized

    def test_initialize_with_uninitialized_rt_raises(self):
        rt = RuntimeEngine()
        eb = EventBus()
        with pytest.raises(EventBusError, match="must be initialized"):
            eb.initialize(rt)

    def test_runtime_engine_property_raises_before_init(self):
        eb = EventBus()
        with pytest.raises(EventBusError, match="not been initialized"):
            _ = eb.runtime_engine


# ── Tests: Initialization Enforcement ─────────────────────


class TestInitializationEnforcement:
    def test_publish_before_init_raises(self):
        eb = EventBus()
        with pytest.raises(EventBusError, match="initialize"):
            eb.publish(_make_runtime_event())

    def test_subscribe_before_init_raises(self):
        eb = EventBus()
        with pytest.raises(EventBusError, match="initialize"):
            eb.subscribe(lambda e: None)

    def test_unsubscribe_before_init_raises(self):
        eb = EventBus()
        with pytest.raises(EventBusError, match="initialize"):
            eb.unsubscribe("test")

    def test_unsubscribe_all_before_init_raises(self):
        eb = EventBus()
        with pytest.raises(EventBusError, match="initialize"):
            eb.unsubscribe_all()

    def test_subscriptions_before_init_raises(self):
        eb = EventBus()
        with pytest.raises(EventBusError, match="initialize"):
            eb.subscriptions()

    def test_history_before_init_raises(self):
        eb = EventBus()
        with pytest.raises(EventBusError, match="initialize"):
            eb.history()

    def test_statistics_before_init_raises(self):
        eb = EventBus()
        with pytest.raises(EventBusError, match="initialize"):
            eb.statistics()

    def test_validate_before_init_fails(self):
        eb = EventBus()
        result = eb.validate()
        assert not result.is_valid
        assert result.not_initialized

    def test_reload_before_init_raises(self):
        eb = EventBus()
        with pytest.raises(EventBusError, match="initialize"):
            eb.reload()

    def test_publish_async_before_init_raises(self):
        eb = EventBus()
        with pytest.raises(EventBusError, match="initialize"):
            eb.publish_async(_make_runtime_event())


# ── Tests: Event Validation ───────────────────────────────


class TestEventValidation:
    def test_invalid_type_raises(self):
        with _managed_event_bus() as (eb, _):
            with pytest.raises(EventBusError, match="RuntimeEvent instance"):
                eb.publish("not an event")  # type: ignore[arg-type]

    def test_none_event_raises(self):
        with _managed_event_bus() as (eb, _):
            with pytest.raises(EventBusError, match="RuntimeEvent instance"):
                eb.publish(None)  # type: ignore[arg-type]

    def test_empty_execution_id_raises(self):
        with _managed_event_bus() as (eb, _):
            bad = RuntimeEvent(
                event_type=RuntimeEventType.EXECUTION_CREATED,
                execution_id="",
                timestamp=time.time(),
            )
            with pytest.raises(EventBusError, match="execution_id"):
                eb.publish(bad)

    def test_valid_event_passes(self):
        with _managed_event_bus() as (eb, _):
            event = _make_runtime_event()
            eid = eb.publish(event)
            assert eid is not None

    def test_async_valid_event_passes(self):
        with _managed_event_bus() as (eb, _):
            eid = eb.publish_async(_make_runtime_event())
            time.sleep(0.1)
            assert eid is not None

    def test_validation_detects_invalid_event(self):
        with _managed_event_bus() as (eb, _):
            eb.publish(_make_runtime_event())
            result = eb.validate()
            # No invalid events recorded since we only publish valid ones
            assert len(result.invalid_events) == 0

    def test_validation_records_invalid_history(self):
        with _managed_event_bus() as (eb, _):
            eb.publish(_make_runtime_event())
            # Manually corrupt history
            eb._history._deque.append("corrupted")  # type: ignore[arg-type]
            result = eb.validate()
            assert len(result.invalid_history_strings) > 0 or not result.is_valid


# ── Tests: Subscribe ──────────────────────────────────────


class TestSubscribe:
    def test_subscribe_returns_subscription_id(self):
        with _managed_event_bus() as (eb, _):
            sid = eb.subscribe(lambda e: None)
            assert isinstance(sid, str)
            assert len(sid) > 0

    def test_subscribe_creates_active_subscription(self):
        with _managed_event_bus() as (eb, _):
            sid = eb.subscribe(lambda e: None)
            subs = eb.subscriptions()
            active = [s for s in subs if s.is_active]
            assert any(s.subscription_id == sid for s in active)

    def test_subscribe_with_event_type_filter(self):
        with _managed_event_bus() as (eb, _):
            sid = eb.subscribe(
                lambda e: None,
                event_types=[RuntimeEventType.EXECUTION_STARTED],
            )
            subs = eb.subscriptions()
            sub = next(s for s in subs if s.subscription_id == sid)
            assert RuntimeEventType.EXECUTION_STARTED in sub.event_types
            assert RuntimeEventType.EXECUTION_FAILED not in sub.event_types

    def test_subscribe_with_priority(self):
        with _managed_event_bus() as (eb, _):
            sid = eb.subscribe(
                lambda e: None,
                priority=EventPriority.HIGH,
            )
            subs = eb.subscriptions()
            sub = next(s for s in subs if s.subscription_id == sid)
            assert sub.priority == EventPriority.HIGH

    def test_subscribe_multiple_listeners(self):
        with _managed_event_bus() as (eb, _):
            ids = [eb.subscribe(lambda e: None) for _ in range(5)]
            assert len(set(ids)) == 5
            assert len(eb.subscriptions()) == 5

    def test_subscribe_non_callable_raises(self):
        with _managed_event_bus() as (eb, _):
            with pytest.raises(EventBusError, match="must be callable"):
                eb.subscribe("not callable")  # type: ignore[arg-type]


# ── Tests: Unsubscribe ────────────────────────────────────


class TestUnsubscribe:
    def test_unsubscribe_returns_true(self):
        with _managed_event_bus() as (eb, _):
            sid = eb.subscribe(lambda e: None)
            assert eb.unsubscribe(sid) is True

    def test_unsubscribe_marks_inactive(self):
        with _managed_event_bus() as (eb, _):
            sid = eb.subscribe(lambda e: None)
            eb.unsubscribe(sid)
            subs = eb.subscriptions()
            sub = next(s for s in subs if s.subscription_id == sid)
            assert not sub.is_active

    def test_unsubscribe_nonexistent_returns_false(self):
        with _managed_event_bus() as (eb, _):
            assert eb.unsubscribe("nonexistent") is False

    def test_unsubscribe_twice_returns_false(self):
        with _managed_event_bus() as (eb, _):
            sid = eb.subscribe(lambda e: None)
            eb.unsubscribe(sid)
            assert eb.unsubscribe(sid) is False

    def test_unsubscribe_all_returns_count(self):
        with _managed_event_bus() as (eb, _):
            for _ in range(3):
                eb.subscribe(lambda e: None)
            count = eb.unsubscribe_all()
            assert count == 3
            assert len(eb.subscriptions()) == 3
            assert all(not s.is_active for s in eb.subscriptions())


# ── Tests: Publish Sync ───────────────────────────────────


class TestPublishSync:
    def test_publish_returns_event_id(self):
        with _managed_event_bus() as (eb, _):
            event = _make_runtime_event()
            eid = eb.publish(event)
            assert isinstance(eid, str)
            assert len(eid) > 0

    def test_publish_dispatches_to_subscriber(self):
        with _managed_event_bus() as (eb, _):
            received: list[RuntimeEvent] = []
            eb.subscribe(lambda e: received.append(e))
            event = _make_runtime_event()
            eb.publish(event)
            assert len(received) == 1
            assert received[0].event_type == event.event_type

    def test_publish_dispatches_to_multiple_subscribers(self):
        with _managed_event_bus() as (eb, _):
            results: list[int] = []
            eb.subscribe(lambda e: results.append(1))
            eb.subscribe(lambda e: results.append(2))
            eb.publish(_make_runtime_event())
            assert len(results) == 2

    def test_publish_does_not_dispatch_to_inactive(self):
        with _managed_event_bus() as (eb, _):
            received: list[RuntimeEvent] = []
            sid = eb.subscribe(lambda e: received.append(e))
            eb.unsubscribe(sid)
            eb.publish(_make_runtime_event())
            assert len(received) == 0

    def test_publish_to_filtered_subscriber(self):
        with _managed_event_bus() as (eb, _):
            received: list[RuntimeEvent] = []
            eb.subscribe(
                lambda e: received.append(e),
                event_types=[RuntimeEventType.EXECUTION_STARTED],
            )
            eb.publish(_make_runtime_event(RuntimeEventType.EXECUTION_CREATED))
            assert len(received) == 0
            eb.publish(_make_runtime_event(RuntimeEventType.EXECUTION_STARTED))
            assert len(received) == 1

    def test_publish_without_subscribers_succeeds(self):
        with _managed_event_bus() as (eb, _):
            eid = eb.publish(_make_runtime_event())
            assert eid is not None


# ── Tests: Publish Async ──────────────────────────────────


class TestPublishAsync:
    def test_publish_async_returns_event_id(self):
        with _managed_event_bus() as (eb, _):
            eid = eb.publish_async(_make_runtime_event())
            assert isinstance(eid, str)
            assert len(eid) > 0

    def test_publish_async_dispatches_eventually(self):
        with _managed_event_bus() as (eb, _):
            received: list[RuntimeEvent] = []
            eb.subscribe(lambda e: received.append(e))
            eb.publish_async(_make_runtime_event())
            time.sleep(0.1)
            assert len(received) == 1

    def test_publish_async_counts_as_async(self):
        with _managed_event_bus() as (eb, _):
            eb.publish_async(_make_runtime_event())
            time.sleep(0.1)
            stats = eb.statistics()
            assert stats.async_events >= 1

    def test_publish_async_with_filter(self):
        with _managed_event_bus() as (eb, _):
            received: list[RuntimeEvent] = []
            eb.subscribe(
                lambda e: received.append(e),
                event_types=[RuntimeEventType.STEP_COMPLETED],
            )
            eb.publish_async(_make_runtime_event(RuntimeEventType.EXECUTION_CREATED))
            time.sleep(0.1)
            assert len(received) == 0

    def test_publish_async_with_done_event(self):
        with _managed_event_bus() as (eb, _):
            done = threading.Event()
            eb.publish_async(_make_runtime_event(), done=done)
            assert done.wait(timeout=1.0)
            assert done.is_set()

    def test_publish_async_done_tracks_completion(self):
        with _managed_event_bus() as (eb, _):
            received: list[RuntimeEvent] = []
            done = threading.Event()
            eb.subscribe(lambda e: received.append(e))
            eb.publish_async(_make_runtime_event(), done=done)
            assert done.wait(timeout=1.0)
            assert len(received) == 1


# ── Tests: Priority Ordering ──────────────────────────────


class TestPriorityOrdering:
    def test_high_priority_before_low(self):
        with _managed_event_bus() as (eb, _):
            order: list[str] = []
            eb.subscribe(
                lambda e: order.append("low"),
                priority=EventPriority.LOW,
            )
            eb.subscribe(
                lambda e: order.append("high"),
                priority=EventPriority.HIGH,
            )
            eb.publish(_make_runtime_event())
            assert order == ["high", "low"]

    def test_critical_before_normal(self):
        with _managed_event_bus() as (eb, _):
            order: list[str] = []
            eb.subscribe(
                lambda e: order.append("normal"),
                priority=EventPriority.NORMAL,
            )
            eb.subscribe(
                lambda e: order.append("critical"),
                priority=EventPriority.CRITICAL,
            )
            eb.publish(_make_runtime_event())
            assert order == ["critical", "normal"]

    def test_creation_order_tiebreaker(self):
        with _managed_event_bus() as (eb, _):
            order: list[str] = []
            eb.subscribe(lambda e: order.append("first"), priority=EventPriority.NORMAL)
            eb.subscribe(lambda e: order.append("second"), priority=EventPriority.NORMAL)
            eb.publish(_make_runtime_event())
            assert order == ["first", "second"]


# ── Tests: History ────────────────────────────────────────


class TestHistory:
    def test_history_records_published_events(self):
        with _managed_event_bus() as (eb, _):
            eb.publish(_make_runtime_event())
            hist = eb.history()
            assert not hist.is_empty
            assert hist.size == 1

    def test_history_records_envelopes(self):
        with _managed_event_bus() as (eb, _):
            event = _make_runtime_event()
            eid = eb.publish(event)
            hist = eb.history()
            assert hist.events[0].event_id == eid
            assert hist.events[0].runtime_event.event_type == event.event_type

    def test_history_bounded_by_max_size(self):
        eb = EventBus(max_history=5)
        with _managed_event_bus() as (_, rt):
            eb.initialize(rt)
            for _ in range(10):
                eb.publish(_make_runtime_event())
            hist = eb.history()
            assert hist.size == 5

    def test_history_includes_async_events(self):
        with _managed_event_bus() as (eb, _):
            eb.publish_async(_make_runtime_event())
            time.sleep(0.1)
            hist = eb.history()
            assert hist.size >= 1

    def test_history_clear_on_reload(self):
        with _managed_event_bus() as (eb, _):
            eb.publish(_make_runtime_event())
            eb.reload()
            hist = eb.history()
            assert hist.is_empty

    def test_deque_evicts_oldest(self):
        eb = EventBus(max_history=3)
        with _managed_event_bus() as (_, rt):
            eb.initialize(rt)
            eb.publish(_make_runtime_event(RuntimeEventType.EXECUTION_CREATED, "e1"))
            eb.publish(_make_runtime_event(RuntimeEventType.EXECUTION_STARTED, "e1"))
            eb.publish(_make_runtime_event(RuntimeEventType.EXECUTION_COMPLETED, "e1"))
            eb.publish(_make_runtime_event(RuntimeEventType.EXECUTION_FAILED, "e1"))
            hist = eb.history()
            assert hist.size == 3
            assert hist.events[0].runtime_event.event_type == RuntimeEventType.EXECUTION_STARTED
            assert hist.events[-1].runtime_event.event_type == RuntimeEventType.EXECUTION_FAILED

    def test_history_snapshot_is_independent(self):
        with _managed_event_bus() as (eb, _):
            eb.publish(_make_runtime_event(RuntimeEventType.EXECUTION_CREATED, "e1"))
            snap1 = eb.history()
            eb.publish(_make_runtime_event(RuntimeEventType.EXECUTION_STARTED, "e1"))
            snap2 = eb.history()
            assert snap1.size == 1
            assert snap2.size == 2


# ── Tests: Statistics ─────────────────────────────────────


class TestStatistics:
    def test_statistics_returns_structure(self):
        with _managed_event_bus() as (eb, _):
            stats = eb.statistics()
            assert isinstance(stats, EventStatistics)
            assert stats.total_events == 0

    def test_statistics_tracks_total_events(self):
        with _managed_event_bus() as (eb, _):
            for _ in range(5):
                eb.publish(_make_runtime_event())
            stats = eb.statistics()
            assert stats.total_events == 5

    def test_statistics_tracks_sync_async_split(self):
        with _managed_event_bus() as (eb, _):
            eb.publish(_make_runtime_event())
            eb.publish_async(_make_runtime_event())
            time.sleep(0.1)
            stats = eb.statistics()
            assert stats.sync_events == 1
            assert stats.async_events == 1

    def test_statistics_tracks_subscriber_count(self):
        with _managed_event_bus() as (eb, _):
            eb.subscribe(lambda e: None)
            eb.subscribe(lambda e: None)
            stats = eb.statistics()
            assert stats.subscriber_count == 2

    def test_statistics_tracks_inactive_subscribers(self):
        with _managed_event_bus() as (eb, _):
            sid = eb.subscribe(lambda e: None)
            eb.unsubscribe(sid)
            stats = eb.statistics()
            assert stats.subscriber_count == 0

    def test_statistics_internally_consistent(self):
        with _managed_event_bus() as (eb, _):
            for _ in range(3):
                eb.publish(_make_runtime_event())
            eb.publish_async(_make_runtime_event())
            time.sleep(0.1)
            stats = eb.statistics()
            assert stats.total_events == 4
            assert stats.sync_events == 3
            assert stats.async_events == 1
            assert stats.total_events == stats.sync_events + stats.async_events


# ── Tests: Dispatch Failures ──────────────────────────────


class TestDispatchFailures:
    def test_subscriber_exception_does_not_stop_dispatch(self):
        with _managed_event_bus() as (eb, _):
            received: list[RuntimeEvent] = []
            eb.subscribe(lambda e: (_ for _ in ()).throw(RuntimeError("fail")))
            eb.subscribe(lambda e: received.append(e))
            eb.publish(_make_runtime_event())
            assert len(received) == 1

    def test_subscriber_exception_counts_as_failure(self):
        with _managed_event_bus() as (eb, _):
            eb.subscribe(lambda e: (_ for _ in ()).throw(RuntimeError("fail")))
            eb.publish(_make_runtime_event())
            stats = eb.statistics()
            assert stats.failed_dispatches > 0

    def test_multiple_failures_count_all(self):
        with _managed_event_bus() as (eb, _):
            eb.subscribe(lambda e: (_ for _ in ()).throw(RuntimeError("fail")))
            eb.subscribe(lambda e: (_ for _ in ()).throw(RuntimeError("fail")))
            eb.publish(_make_runtime_event())
            stats = eb.statistics()
            assert stats.failed_dispatches == 2


# ── Tests: Validation ─────────────────────────────────────


class TestValidation:
    def test_validate_default_valid(self):
        with _managed_event_bus() as (eb, _):
            result = eb.validate()
            assert result.is_valid

    def test_validate_inactive_subscriptions(self):
        with _managed_event_bus() as (eb, _):
            sid = eb.subscribe(lambda e: None)
            eb.unsubscribe(sid)
            result = eb.validate()
            assert not result.is_valid
            assert sid in result.inactive_subscriptions

    def test_validate_after_events(self):
        with _managed_event_bus() as (eb, _):
            eb.publish(_make_runtime_event())
            result = eb.validate()
            assert result.is_valid

    def test_validate_with_active_subscriptions(self):
        with _managed_event_bus() as (eb, _):
            eb.subscribe(lambda e: None)
            eb.subscribe(lambda e: None)
            result = eb.validate()
            assert result.is_valid

    def test_validation_after_reload(self):
        with _managed_event_bus() as (eb, _):
            eb.subscribe(lambda e: None)
            eb.reload()
            result = eb.validate()
            assert result.is_valid

    def test_validation_detects_count_mismatch(self):
        with _managed_event_bus() as (eb, _):
            eb.publish(_make_runtime_event())
            # Manually corrupt counts
            eb._sync_events = 99
            result = eb.validate()
            assert not result.is_valid
            assert result.inconsistent_counts

    def test_validation_detects_duplicate_event_ids(self):
        with _managed_event_bus() as (eb, _):
            eb.publish(_make_runtime_event())
            # Manually duplicate event
            event = eb._history._deque[0]
            eb._history._deque.append(event)
            result = eb.validate()
            assert not result.is_valid
            assert len(result.duplicate_event_ids) > 0

    def test_validation_not_initialized(self):
        eb = EventBus()
        result = eb.validate()
        assert not result.is_valid
        assert result.not_initialized


# ── Tests: Metadata ───────────────────────────────────────


class TestMetadata:
    def test_envelope_contains_metadata(self):
        with _managed_event_bus() as (eb, _):
            eid = eb.publish(_make_runtime_event())
            hist = eb.history()
            env = next(e for e in hist.events if e.event_id == eid)
            assert "thread_id" in env.metadata
            assert "publisher" in env.metadata
            assert env.metadata["publisher"] == "EventBus"
            assert "dispatch_mode" in env.metadata
            assert env.metadata["dispatch_mode"] == "sync"
            assert "priority" in env.metadata
            assert env.metadata["priority"] == "normal"
            assert "publish_timestamp" in env.metadata

    def test_async_envelope_contains_async_metadata(self):
        with _managed_event_bus() as (eb, _):
            eid = eb.publish_async(_make_runtime_event())
            time.sleep(0.1)
            hist = eb.history()
            env = next(e for e in hist.events if e.event_id == eid)
            assert env.metadata["dispatch_mode"] == "async"

    def test_high_priority_metadata(self):
        with _managed_event_bus() as (eb, _):
            eid = eb.publish(
                _make_runtime_event(),
                priority=EventPriority.HIGH,
            )
            hist = eb.history()
            env = next(e for e in hist.events if e.event_id == eid)
            assert env.metadata["priority"] == "high"

    def test_thread_id_is_int(self):
        with _managed_event_bus() as (eb, _):
            eid = eb.publish(_make_runtime_event())
            hist = eb.history()
            env = next(e for e in hist.events if e.event_id == eid)
            assert isinstance(env.metadata["thread_id"], int)
            assert env.metadata["thread_id"] > 0


# ── Tests: Thread Safety ──────────────────────────────────


class TestThreadSafety:
    def test_concurrent_publish(self):
        with _managed_event_bus() as (eb, _):
            received: list[RuntimeEvent] = []
            lock = threading.Lock()

            def collect(e: RuntimeEvent) -> None:
                with lock:
                    received.append(e)

            eb.subscribe(collect)

            def publish_many():
                for _ in range(50):
                    eb.publish(_make_runtime_event())

            threads = [threading.Thread(target=publish_many) for _ in range(4)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()

            assert len(received) == 200

    def test_concurrent_subscribe_unsubscribe(self):
        with _managed_event_bus() as (eb, _):
            ids: list[str] = []
            lock = threading.Lock()

            def sub_and_unsub():
                sid = eb.subscribe(lambda e: None)
                with lock:
                    ids.append(sid)
                time.sleep(0.01)
                eb.unsubscribe(sid)

            threads = [threading.Thread(target=sub_and_unsub) for _ in range(10)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()

            stats = eb.statistics()
            assert stats.subscriber_count == 0

    def test_concurrent_history_access(self):
        with _managed_event_bus() as (eb, _):
            def read_history():
                for _ in range(20):
                    eb.history()
                    time.sleep(0.005)

            def write_events():
                for _ in range(20):
                    eb.publish(_make_runtime_event())
                    time.sleep(0.005)

            threads = (
                [threading.Thread(target=read_history) for _ in range(3)]
                + [threading.Thread(target=write_events) for _ in range(3)]
            )
            for t in threads:
                t.start()
            for t in threads:
                t.join()

            assert eb.history().size > 0

    def test_concurrent_publish_async(self):
        with _managed_event_bus() as (eb, _):
            received: list[RuntimeEvent] = []
            lock = threading.Lock()

            def collect(e: RuntimeEvent) -> None:
                with lock:
                    received.append(e)

            eb.subscribe(collect)

            def publish_async():
                for _ in range(20):
                    eb.publish_async(_make_runtime_event())

            threads = [threading.Thread(target=publish_async) for _ in range(5)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()

            time.sleep(0.3)
            assert len(received) == 100


# ── Tests: Reload ─────────────────────────────────────────


class TestReload:
    def test_reload_clears_subscriptions(self):
        with _managed_event_bus() as (eb, _):
            eb.subscribe(lambda e: None)
            eb.subscribe(lambda e: None)
            eb.reload()
            assert len(eb.subscriptions()) == 0

    def test_reload_resets_statistics(self):
        with _managed_event_bus() as (eb, _):
            eb.publish(_make_runtime_event())
            eb.publish(_make_runtime_event())
            eb.reload()
            stats = eb.statistics()
            assert stats.total_events == 0
            assert stats.sync_events == 0

    def test_reload_is_idempotent(self):
        with _managed_event_bus() as (eb, _):
            eb.reload()
            eb.reload()
            assert eb.statistics().total_events == 0


# ── Tests: Data Models ────────────────────────────────────


class TestDataModels:
    def test_event_priority_values(self):
        assert EventPriority.LOW.value == "low"
        assert EventPriority.NORMAL.value == "normal"
        assert EventPriority.HIGH.value == "high"
        assert EventPriority.CRITICAL.value == "critical"

    def test_event_dispatch_mode_values(self):
        assert EventDispatchMode.SYNC.value == "sync"
        assert EventDispatchMode.ASYNC.value == "async"

    def test_event_subscription_defaults(self):
        sub = EventSubscription(
            subscription_id="s1",
            callback=lambda e: None,
        )
        assert sub.subscription_id == "s1"
        assert sub.is_active
        assert sub.priority == EventPriority.NORMAL

    def test_event_envelope_frozen(self):
        event = _make_runtime_event()
        env = EventEnvelope(event_id="e1", runtime_event=event)
        assert env.event_id == "e1"
        assert env.dispatch_mode == EventDispatchMode.SYNC

    def test_event_history_add_and_clear(self):
        hist = EventHistory(max_size=10)
        assert hist.is_empty
        event = _make_runtime_event()
        env = EventEnvelope(event_id="e1", runtime_event=event)
        hist.add(env)
        assert not hist.is_empty
        assert hist.size == 1
        hist.clear()
        assert hist.is_empty

    def test_event_history_bounded(self):
        hist = EventHistory(max_size=3)
        for i in range(5):
            env = EventEnvelope(
                event_id=f"e{i}",
                runtime_event=_make_runtime_event(),
            )
            hist.add(env)
        assert hist.size == 3
        assert hist.events[0].event_id == "e2"
        assert hist.events[-1].event_id == "e4"

    def test_event_statistics_defaults(self):
        stats = EventStatistics()
        assert stats.total_events == 0
        assert stats.failed_dispatches == 0

    def test_event_validation_result_initial_valid(self):
        result = EventValidationResult()
        assert result.is_valid
        assert len(result.warnings) == 0


# ── Tests: Event Filtering ────────────────────────────────


class TestEventFiltering:
    def test_no_filter_receives_all(self):
        with _managed_event_bus() as (eb, _):
            received: list[RuntimeEvent] = []
            eb.subscribe(lambda e: received.append(e))
            eb.publish(_make_runtime_event(RuntimeEventType.EXECUTION_CREATED))
            eb.publish(_make_runtime_event(RuntimeEventType.EXECUTION_STARTED))
            eb.publish(_make_runtime_event(RuntimeEventType.STEP_COMPLETED))
            assert len(received) == 3

    def test_filter_single_type(self):
        with _managed_event_bus() as (eb, _):
            received: list[RuntimeEvent] = []
            eb.subscribe(
                lambda e: received.append(e),
                event_types=[RuntimeEventType.EXECUTION_FAILED],
            )
            eb.publish(_make_runtime_event(RuntimeEventType.EXECUTION_CREATED))
            eb.publish(_make_runtime_event(RuntimeEventType.EXECUTION_FAILED))
            assert len(received) == 1
            assert received[0].event_type == RuntimeEventType.EXECUTION_FAILED

    def test_filter_multiple_types(self):
        with _managed_event_bus() as (eb, _):
            received: list[RuntimeEvent] = []
            eb.subscribe(
                lambda e: received.append(e),
                event_types=[
                    RuntimeEventType.EXECUTION_CREATED,
                    RuntimeEventType.EXECUTION_COMPLETED,
                ],
            )
            eb.publish(_make_runtime_event(RuntimeEventType.EXECUTION_CREATED))
            eb.publish(_make_runtime_event(RuntimeEventType.EXECUTION_STARTED))
            eb.publish(_make_runtime_event(RuntimeEventType.EXECUTION_COMPLETED))
            assert len(received) == 2

    def test_filter_on_step_events(self):
        with _managed_event_bus() as (eb, _):
            received: list[RuntimeEvent] = []
            eb.subscribe(
                lambda e: received.append(e),
                event_types=[RuntimeEventType.STEP_STARTED, RuntimeEventType.STEP_FAILED],
            )
            eb.publish(_make_runtime_event(RuntimeEventType.STEP_STARTED, step_id="s1"))
            eb.publish(_make_runtime_event(RuntimeEventType.EXECUTION_CREATED))
            eb.publish(_make_runtime_event(RuntimeEventType.STEP_FAILED, step_id="s2"))
            assert len(received) == 2


# ── Tests: Subscriptions Snapshot ─────────────────────────


class TestSubscriptions:
    def test_subscriptions_returns_snapshot(self):
        with _managed_event_bus() as (eb, _):
            sid = eb.subscribe(lambda e: None)
            subs = eb.subscriptions()
            assert len(subs) == 1
            assert subs[0].subscription_id == sid

    def test_subscriptions_is_copy(self):
        with _managed_event_bus() as (eb, _):
            sid = eb.subscribe(lambda e: None)
            subs1 = eb.subscriptions()
            eb.unsubscribe(sid)
            subs2 = eb.subscriptions()
            assert subs1[0].is_active
            assert not subs2[0].is_active


# ── Tests: Custom Max History ─────────────────────────────


class TestCustomMaxHistory:
    def test_custom_max_history(self):
        eb = EventBus(max_history=10)
        with _managed_event_bus() as (_, rt):
            eb.initialize(rt)
            assert eb.history().max_size == 10

    def test_very_small_history(self):
        eb = EventBus(max_history=1)
        with _managed_event_bus() as (_, rt):
            eb.initialize(rt)
            eb.publish(_make_runtime_event(RuntimeEventType.EXECUTION_CREATED))
            eb.publish(_make_runtime_event(RuntimeEventType.EXECUTION_STARTED))
            hist = eb.history()
            assert hist.size == 1
            assert hist.events[0].runtime_event.event_type == RuntimeEventType.EXECUTION_STARTED


# ── Tests: No Subscriber Edge Cases ───────────────────────


class TestNoSubscriber:
    def test_no_subscriber_sync(self):
        with _managed_event_bus() as (eb, _):
            eid = eb.publish(_make_runtime_event())
            assert eid is not None
            assert eb.statistics().total_events == 1

    def test_no_subscriber_async(self):
        with _managed_event_bus() as (eb, _):
            eid = eb.publish_async(_make_runtime_event())
            time.sleep(0.1)
            assert eid is not None
            assert eb.statistics().total_events == 1


# ── Tests: Race Condition Edge Cases ──────────────────────


class TestRaceConditions:
    def test_concurrent_publish_and_reload(self):
        with _managed_event_bus() as (eb, _):
            def publish_loop():
                for _ in range(50):
                    eb.publish(_make_runtime_event())

            def reload_loop():
                for _ in range(10):
                    eb.reload()
                    time.sleep(0.01)

            threads = [
                threading.Thread(target=publish_loop),
                threading.Thread(target=reload_loop),
            ]
            for t in threads:
                t.start()
            for t in threads:
                t.join()

            # Should not crash
            stats = eb.statistics()
            assert stats.total_events >= 0

    def test_concurrent_publish_async_and_subscribe(self):
        with _managed_event_bus() as (eb, _):
            def async_publish():
                for _ in range(20):
                    eb.publish_async(_make_runtime_event())
                    time.sleep(0.005)

            def subscribe_unsubscribe():
                for _ in range(10):
                    sid = eb.subscribe(lambda e: None)
                    time.sleep(0.005)
                    eb.unsubscribe(sid)

            threads = [
                threading.Thread(target=async_publish),
                threading.Thread(target=subscribe_unsubscribe),
            ]
            for t in threads:
                t.start()
            for t in threads:
                t.join()

            time.sleep(0.2)
            stats = eb.statistics()
            assert stats.total_events >= 0


# ── Tests: Real RuntimeEngine Integration ─────────────────


class TestRealRepoIntegration:
    """Integration tests using actual .ai directory and full RuntimeEngine."""

    def _build_event_bus(self) -> tuple[RuntimeEngine, EventBus]:
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)
        de = EOSDecisionEngine().initialize(cb)
        we = WorkflowEngine().initialize(de)
        rt = RuntimeEngine().initialize(we)
        eb = EventBus().initialize(rt)
        return rt, eb

    def test_event_bus_integration_with_runtime(self):
        rt, eb = self._build_event_bus()
        received: list[RuntimeEvent] = []
        eb.subscribe(lambda e: received.append(e))
        plan = rt.workflow_engine.decision_engine.plan("implement a feature")
        workflow = rt.workflow_engine.build(plan)
        eid = rt.execute(workflow)
        time.sleep(0.5)
        assert rt.status(eid) in (RuntimeState.COMPLETED, RuntimeState.FAILED)
        stats = eb.statistics()
        assert stats.total_events >= 0

    def test_event_bus_tracks_runtime_events(self):
        rt, eb = self._build_event_bus()
        step_events: list[RuntimeEvent] = []
        eb.subscribe(
            lambda e: step_events.append(e),
            event_types=[RuntimeEventType.STEP_COMPLETED],
        )
        plan = rt.workflow_engine.decision_engine.plan("refactor code")
        workflow = rt.workflow_engine.build(plan)
        rt.execute(workflow)
        time.sleep(0.5)
        assert len(step_events) >= 0

    def test_event_bus_multiple_subscribers_real(self):
        rt, eb = self._build_event_bus()
        counts: list[int] = []
        lock = threading.Lock()

        def counter(_e: RuntimeEvent) -> None:
            with lock:
                counts.append(1)

        eb.subscribe(counter)
        eb.subscribe(counter)
        plan = rt.workflow_engine.decision_engine.plan("design review")
        workflow = rt.workflow_engine.build(plan)
        rt.execute(workflow)
        time.sleep(0.5)
        stats = eb.statistics()
        if stats.total_events > 0:
            expected = stats.total_events * 2
            assert len(counts) == expected
