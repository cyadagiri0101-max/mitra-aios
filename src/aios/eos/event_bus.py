"""EventBus — thread-safe publish/subscribe messaging for RuntimeEngine events."""

from __future__ import annotations

import collections
import threading
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from enum import StrEnum
from aios.core.exceptions import EventBusError
from aios.core.logger import get_logger
from aios.eos.runtime_engine import RuntimeEngine, RuntimeEvent, RuntimeEventType
from aios.eos.types import HealthStatus

_DEFAULT_MAX_HISTORY = 1000
class EventPriority(StrEnum):
    """Priority level for event dispatch ordering."""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


_PRIORITY_ORDER: dict[EventPriority, int] = {
    EventPriority.CRITICAL: 0,
    EventPriority.HIGH: 1,
    EventPriority.NORMAL: 2,
    EventPriority.LOW: 3,
}


class EventDispatchMode(StrEnum):
    """Dispatch mode for event publishing."""

    SYNC = "sync"
    ASYNC = "async"


@dataclass(slots=True)
class EventSubscription:
    """A registered subscriber on the event bus."""

    subscription_id: str
    callback: Callable[[RuntimeEvent], None]
    event_types: tuple[RuntimeEventType, ...] = ()
    priority: EventPriority = EventPriority.NORMAL
    created_at: float = 0.0
    is_active: bool = True


@dataclass(frozen=True, slots=True)
class EventEnvelope:
    """An event wrapped with dispatch metadata."""

    event_id: str
    runtime_event: RuntimeEvent
    priority: EventPriority = EventPriority.NORMAL
    dispatch_mode: EventDispatchMode = EventDispatchMode.SYNC
    published_at: float = 0.0
    metadata: dict = field(default_factory=dict)


class EventHistory:
    """Bounded event history backed by collections.deque."""

    def __init__(self, max_size: int = _DEFAULT_MAX_HISTORY) -> None:
        self.max_size = max_size
        self._deque: collections.deque[EventEnvelope] = collections.deque(
            maxlen=max_size,
        )

    @property
    def events(self) -> list[EventEnvelope]:
        return list(self._deque)

    def add(self, envelope: EventEnvelope) -> None:
        self._deque.append(envelope)

    def clear(self) -> None:
        self._deque.clear()

    @property
    def is_empty(self) -> bool:
        return len(self._deque) == 0

    @property
    def size(self) -> int:
        return len(self._deque)


@dataclass(frozen=True, slots=True)
class EventStatistics:
    """Summary statistics about event bus activity."""

    total_events: int = 0
    sync_events: int = 0
    async_events: int = 0
    subscriber_count: int = 0
    history_size: int = 0
    average_dispatch_time: float = 0.0
    failed_dispatches: int = 0


@dataclass(slots=True)
class EventValidationResult:
    """Outcome of :meth:`EventBus.validate`."""

    is_valid: bool = True
    not_initialized: bool = False
    inactive_subscriptions: list[str] = field(default_factory=list)
    invalid_events: list[str] = field(default_factory=list)
    invalid_history_strings: list[str] = field(default_factory=list)
    invalid_statistics: bool = False
    inconsistent_counts: bool = False
    duplicate_event_ids: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


class EventBus:
    """Thread-safe publish/subscribe event bus for RuntimeEngine events.

    Consumes RuntimeEvents produced by RuntimeEngine.
    Does not access filesystem, registries, or any layer below RuntimeEngine.
    """

    def __init__(self, max_history: int = _DEFAULT_MAX_HISTORY) -> None:
        self.logger = get_logger("aios.eos.event_bus")
        self._runtime_engine: RuntimeEngine | None = None
        self._subscriptions: dict[str, EventSubscription] = {}
        self._history = EventHistory(max_size=max_history)
        self._total_events: int = 0
        self._sync_events: int = 0
        self._async_events: int = 0
        self._failed_dispatches: int = 0
        self._dispatch_time_sum: float = 0.0
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def runtime_engine(self) -> RuntimeEngine:
        if self._runtime_engine is None:
            raise EventBusError("EventBus has not been initialized")
        return self._runtime_engine

    def initialize(self, runtime_engine: RuntimeEngine) -> EventBus:
        """Bind to an initialized RuntimeEngine."""
        if not runtime_engine.is_initialized:
            raise EventBusError(
                "RuntimeEngine must be initialized before passing to EventBus",
            )

        with self._lock:
            self._runtime_engine = runtime_engine
            self._subscriptions.clear()
            self._history.clear()
            self._total_events = 0
            self._sync_events = 0
            self._async_events = 0
            self._failed_dispatches = 0
            self._dispatch_time_sum = 0.0

        self._initialized = True
        self.logger.info("EventBus initialized")
        return self

    # ── Initialization Guard ─────────────────────────────

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise EventBusError(
                "EventBus has not been initialized — call initialize() first",
            )

    # ── Event Validation ─────────────────────────────────

    @staticmethod
    def _validate_event(runtime_event: RuntimeEvent) -> None:
        if not isinstance(runtime_event, RuntimeEvent):
            raise EventBusError("Event must be a RuntimeEvent instance")
        if not isinstance(runtime_event.event_type, RuntimeEventType):
            raise EventBusError("RuntimeEvent must have a valid event_type")
        if not isinstance(runtime_event.execution_id, str) or not runtime_event.execution_id:
            raise EventBusError("RuntimeEvent must have a non-empty execution_id")
        if runtime_event.timestamp is None:
            raise EventBusError("RuntimeEvent must have a timestamp")

    # ── Subscribe ────────────────────────────────────────

    def subscribe(
        self,
        callback: Callable[[RuntimeEvent], None],
        event_types: list[RuntimeEventType] | None = None,
        priority: EventPriority = EventPriority.NORMAL,
    ) -> str:
        """Register a subscriber. Returns subscription ID."""
        self._require_initialized()

        if not callable(callback):
            raise EventBusError("Callback must be callable")

        subscription_id = str(uuid.uuid4())
        types_tuple = tuple(event_types) if event_types else ()

        subscription = EventSubscription(
            subscription_id=subscription_id,
            callback=callback,
            event_types=types_tuple,
            priority=priority,
            created_at=time.time(),
            is_active=True,
        )

        with self._lock:
            self._subscriptions[subscription_id] = subscription

        self.logger.info(
            "Subscribed %s — priority=%s, types=%d",
            subscription_id,
            priority.value,
            len(types_tuple),
        )
        return subscription_id

    def unsubscribe(self, subscription_id: str) -> bool:
        """Unsubscribe a listener. Safe if already removed."""
        self._require_initialized()

        with self._lock:
            sub = self._subscriptions.get(subscription_id)
            if sub is None:
                return False
            if not sub.is_active:
                return False
            sub.is_active = False

        self.logger.info("Unsubscribed: %s", subscription_id)
        return True

    def unsubscribe_all(self) -> int:
        """Unsubscribe all listeners. Returns count removed."""
        self._require_initialized()

        count = 0
        with self._lock:
            for sub in self._subscriptions.values():
                if sub.is_active:
                    sub.is_active = False
                    count += 1
        self.logger.info("Unsubscribed all — %d removed", count)
        return count

    def subscriptions(self) -> list[EventSubscription]:
        """Return a snapshot of all subscriptions."""
        self._require_initialized()

        with self._lock:
            return [
                EventSubscription(
                    subscription_id=s.subscription_id,
                    callback=s.callback,
                    event_types=s.event_types,
                    priority=s.priority,
                    created_at=s.created_at,
                    is_active=s.is_active,
                )
                for s in self._subscriptions.values()
            ]

    # ── Publish ──────────────────────────────────────────

    def publish(
        self,
        runtime_event: RuntimeEvent,
        priority: EventPriority = EventPriority.NORMAL,
    ) -> str:
        """Publish a RuntimeEvent synchronously. Returns event ID."""
        self._require_initialized()
        self._validate_event(runtime_event)

        envelope = self._build_envelope(runtime_event, priority, EventDispatchMode.SYNC)

        with self._lock:
            self._total_events += 1
            self._sync_events += 1
            self._history.add(envelope)

        self._dispatch(envelope)
        return envelope.event_id

    def publish_async(
        self,
        runtime_event: RuntimeEvent,
        priority: EventPriority = EventPriority.NORMAL,
        done: threading.Event | None = None,
    ) -> str:
        """Publish a RuntimeEvent asynchronously. Returns event ID.

        If *done* is provided, it will be set when dispatch completes.
        Does not block by default.
        """
        self._require_initialized()
        self._validate_event(runtime_event)

        envelope = self._build_envelope(runtime_event, priority, EventDispatchMode.ASYNC)

        with self._lock:
            self._total_events += 1
            self._async_events += 1
            self._history.add(envelope)

        thread = threading.Thread(
            target=self._dispatch_and_signal,
            args=(envelope, done),
            daemon=True,
        )
        thread.start()

        return envelope.event_id

    # ── History ──────────────────────────────────────────

    def history(self) -> EventHistory:
        """Return a snapshot of event history."""
        self._require_initialized()

        with self._lock:
            hist = EventHistory(max_size=self._history.max_size)
            for env in self._history.events:
                hist.add(env)
            return hist

    # ── Statistics ───────────────────────────────────────

    def statistics(self) -> EventStatistics:
        """Return summary statistics about the event bus."""
        self._require_initialized()

        with self._lock:
            avg_time = (
                self._dispatch_time_sum / self._total_events
                if self._total_events > 0
                else 0.0
            )
            active_count = sum(
                1 for s in self._subscriptions.values() if s.is_active
            )

            return EventStatistics(
                total_events=self._total_events,
                sync_events=self._sync_events,
                async_events=self._async_events,
                subscriber_count=active_count,
                history_size=self._history.size,
                average_dispatch_time=round(avg_time, 6),
                failed_dispatches=self._failed_dispatches,
            )

    # ── Validation ───────────────────────────────────────

    def validate(self) -> EventValidationResult:
        """Validate event bus integrity."""
        result = EventValidationResult()

        if not self._initialized:
            result.not_initialized = True
            result.is_valid = False
            return result

        self._check_inactive_subscriptions(result)
        self._check_invalid_history(result)
        self._check_statistics(result)
        self._check_counts(result)

        if result.inactive_subscriptions:
            result.is_valid = False
        if result.invalid_events:
            result.is_valid = False
        if result.invalid_history_strings:
            result.is_valid = False
        if result.invalid_statistics:
            result.is_valid = False
        if result.inconsistent_counts:
            result.is_valid = False
        if result.duplicate_event_ids:
            result.is_valid = False

        self.logger.info(
            "Validation: valid=%s, inactive=%d, events=%d",
            result.is_valid,
            len(result.inactive_subscriptions),
            len(result.invalid_events),
        )
        return result

    def reload(self) -> EventBus:
        """Clear all subscriptions and history, reset statistics."""
        self._require_initialized()

        self.logger.info("Reloading EventBus")
        with self._lock:
            self._subscriptions.clear()
            self._history.clear()
            self._total_events = 0
            self._sync_events = 0
            self._async_events = 0
            self._failed_dispatches = 0
            self._dispatch_time_sum = 0.0
        return self

    def health(self) -> HealthStatus:
        """Check EventBus health.

        Returns:
            HealthStatus: Bus health with dispatch and subscriber metrics.
        """
        with self._lock:
            if not self._initialized:
                return HealthStatus(
                    healthy=False,
                    status="not_initialized",
                    initialized=False,
                    event_bus_connected=False,
                    events_processed=0,
                    errors_recent=0,
                    message="EventBus not initialized",
                )

            subscriber_count = len(self._subscriptions)
            error_rate = (self._failed_dispatches / self._total_events * 100) if self._total_events > 0 else 0.0

            is_healthy = error_rate < 5.0  # Healthy if error rate below 5%
            status = "healthy" if is_healthy else "degraded"

            message = f"Subscribers: {subscriber_count}, Events: {self._total_events}, Failed: {self._failed_dispatches}, Error rate: {error_rate:.2f}%"

            return HealthStatus(
                healthy=is_healthy,
                status=status,
                initialized=True,
                event_bus_connected=True,
                events_processed=self._total_events,
                subscriber_active=subscriber_count > 0,
                errors_recent=self._failed_dispatches,
                message=message,
            )

    def shutdown(self) -> None:
        """Gracefully shutdown the EventBus.

        Clears all subscriptions and history. Idempotent—safe to call multiple times.
        """
        with self._lock:
            if not self._initialized:
                return

            # Cancel any pending async dispatches
            if hasattr(self, '_dispatch_tasks'):
                for task in getattr(self, '_dispatch_tasks', []):
                    if not task.done():
                        task.cancel()

            # Clear all subscribers and history
            self._subscriptions.clear()
            self._history.clear()
            self._total_events = 0
            self._sync_events = 0
            self._async_events = 0
            self._failed_dispatches = 0
            self._dispatch_time_sum = 0.0

            self._initialized = False

        self.logger.info("EventBus shutdown complete")

    # ── Internal ─────────────────────────────────────────

    def _build_envelope(
        self,
        runtime_event: RuntimeEvent,
        priority: EventPriority,
        dispatch_mode: EventDispatchMode,
    ) -> EventEnvelope:
        now = time.time()
        return EventEnvelope(
            event_id=str(uuid.uuid4()),
            runtime_event=runtime_event,
            priority=priority,
            dispatch_mode=dispatch_mode,
            published_at=now,
            metadata={
                "thread_id": threading.get_native_id(),
                "publisher": "EventBus",
                "dispatch_mode": dispatch_mode.value,
                "priority": priority.value,
                "publish_timestamp": now,
            },
        )

    def _dispatch_and_signal(
        self,
        envelope: EventEnvelope,
        done: threading.Event | None,
    ) -> None:
        self._dispatch(envelope)
        if done is not None:
            done.set()

    def _dispatch(self, envelope: EventEnvelope) -> None:
        """Dispatch an event to matching subscribers."""
        start = time.monotonic()
        runtime_event = envelope.runtime_event

        with self._lock:
            candidates = [
                s
                for s in self._subscriptions.values()
                if s.is_active
                and (
                    not s.event_types
                    or runtime_event.event_type in s.event_types
                )
            ]

        candidates.sort(
            key=lambda s: (
                _PRIORITY_ORDER.get(s.priority, 99),
                s.created_at,
            ),
        )

        for sub in candidates:
            if not sub.is_active:
                continue
            try:
                sub.callback(runtime_event)
            except Exception as e:
                self.logger.error(
                    "Subscriber %s failed: %s", sub.subscription_id, e,
                )
                with self._lock:
                    self._failed_dispatches += 1

        elapsed = time.monotonic() - start
        with self._lock:
            self._dispatch_time_sum += elapsed

    # ── Validation Checks ────────────────────────────────

    def _check_inactive_subscriptions(
        self, result: EventValidationResult,
    ) -> None:
        with self._lock:
            for sub in self._subscriptions.values():
                if not sub.is_active:
                    result.inactive_subscriptions.append(sub.subscription_id)

    def _check_invalid_history(
        self, result: EventValidationResult,
    ) -> None:
        seen_ids: set[str] = set()
        with self._lock:
            for envelope in self._history.events:
                if not isinstance(envelope, EventEnvelope):
                    result.invalid_history_strings.append("Corrupted history entry")
                    continue
                if not isinstance(envelope.runtime_event, RuntimeEvent):
                    result.invalid_events.append(
                        f"Envelope {envelope.event_id} has invalid RuntimeEvent",
                    )
                if envelope.event_id in seen_ids:
                    result.duplicate_event_ids.append(envelope.event_id)
                seen_ids.add(envelope.event_id)

    def _check_statistics(self, result: EventValidationResult) -> None:
        stats = self.statistics()
        if stats.failed_dispatches < 0:
            result.invalid_statistics = True
        if stats.average_dispatch_time < 0:
            result.invalid_statistics = True
        if stats.subscriber_count < 0:
            result.invalid_statistics = True
        if stats.history_size < 0:
            result.invalid_statistics = True

    def _check_counts(self, result: EventValidationResult) -> None:
        with self._lock:
            if self._total_events != self._sync_events + self._async_events:
                result.inconsistent_counts = True
                result.warnings.append(
                    f"total_events ({self._total_events}) != "
                    f"sync_events ({self._sync_events}) + "
                    f"async_events ({self._async_events})",
                )
            if not (0 <= self._history.size <= self._history.max_size):
                result.inconsistent_counts = True
                result.warnings.append(
                    f"history.size ({self._history.size}) out of bounds "
                    f"[0, {self._history.max_size}]",
                )
