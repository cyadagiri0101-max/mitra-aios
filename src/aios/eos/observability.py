"""Observability — telemetry consumer on top of EventBus.

Subscribes to RuntimeEvents and tracks metrics, health status,
and provides event stream querying.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict
from dataclasses import dataclass

from aios.core.exceptions import EventBusError
from aios.core.logger import get_logger
from aios.eos.event_bus import EventBus, EventPriority
from aios.eos.runtime_engine import RuntimeEvent, RuntimeEventType
from aios.eos.types import EventStreamEntry, HealthStatus, SystemMetrics


@dataclass(frozen=True, slots=True)
class ObservabilityStatistics:
    total_events_consumed: int = 0
    total_execution_events: int = 0
    total_step_events: int = 0
    total_rollback_events: int = 0
    total_errors: int = 0
    subscriber_count: int = 0
    event_types_seen: int = 0
    peak_dispatch_time: float = 0.0
    average_dispatch_time: float = 0.0


class ObservabilityConsumer:
    """Consumes RuntimeEvents from EventBus and tracks system metrics.

    Must be initialized with an EventBus. Subscribes to all RuntimeEventTypes
    and maintains thread-safe counters and timing data.
    """

    def __init__(self, max_stream_size: int = 10000) -> None:
        self.logger = get_logger("aios.eos.observability")
        self._event_bus: EventBus | None = None
        self._subscription_id: str | None = None
        self._stream: list[EventStreamEntry] = []
        self._max_stream_size = max_stream_size
        self._start_time: float = 0.0
        self._lock = threading.Lock()
        self._initialized: bool = False

        self._events_by_type: dict[str, int] = defaultdict(int)
        self._events_by_execution: dict[str, int] = defaultdict(int)
        self._executions_started: int = 0
        self._executions_completed: int = 0
        self._executions_failed: int = 0
        self._steps_executed: int = 0
        self._steps_failed: int = 0
        self._total_retries: int = 0
        self._total_events: int = 0
        self._last_event_time: float = 0.0
        self._errors: int = 0

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def event_bus(self) -> EventBus:
        if self._event_bus is None:
            raise EventBusError("ObservabilityConsumer has not been initialized")
        return self._event_bus

    def initialize(self, event_bus: EventBus) -> ObservabilityConsumer:
        if not event_bus.is_initialized:
            raise EventBusError(
                "EventBus must be initialized before passing to ObservabilityConsumer",
            )

        with self._lock:
            self._event_bus = event_bus
            self._start_time = time.time()
            self._stream.clear()
            self._events_by_type.clear()
            self._events_by_execution.clear()
            self._executions_started = 0
            self._executions_completed = 0
            self._executions_failed = 0
            self._steps_executed = 0
            self._steps_failed = 0
            self._total_retries = 0
            self._total_events = 0
            self._last_event_time = 0.0
            self._errors = 0

        self._subscription_id = event_bus.subscribe(
            callback=self._on_event,
            event_types=None,
            priority=EventPriority.LOW,
        )

        self._initialized = True
        self.logger.info("ObservabilityConsumer initialized")
        return self

    def _on_event(self, runtime_event: RuntimeEvent) -> None:
        try:
            with self._lock:
                self._total_events += 1
                event_type_str = runtime_event.event_type.value
                self._events_by_type[event_type_str] += 1
                self._events_by_execution[runtime_event.execution_id] += 1
                self._last_event_time = time.time()

                entry = EventStreamEntry(
                    event_id="",
                    event_type=runtime_event.event_type,
                    execution_id=runtime_event.execution_id,
                    step_id=runtime_event.step_id,
                    message=runtime_event.message,
                    timestamp=runtime_event.timestamp,
                    priority="low",
                    dispatch_mode="sync",
                    metadata=runtime_event.metadata,
                )
                self._stream.append(entry)
                if len(self._stream) > self._max_stream_size:
                    self._stream.pop(0)

                self._classify_event(runtime_event)
        except Exception as e:
            self.logger.error("ObservabilityConsumer error: %s", e)

    def _classify_event(self, event: RuntimeEvent) -> None:
        et = event.event_type
        if et in (
            RuntimeEventType.EXECUTION_STARTED,
        ):
            self._executions_started += 1
        elif et in (
            RuntimeEventType.EXECUTION_COMPLETED,
        ):
            self._executions_completed += 1
        elif et in (
            RuntimeEventType.EXECUTION_FAILED,
        ):
            self._executions_failed += 1
            self._errors += 1
        elif et in (
            RuntimeEventType.STEP_COMPLETED,
        ):
            self._steps_executed += 1
        elif et in (
            RuntimeEventType.STEP_FAILED,
        ):
            self._steps_failed += 1
            self._errors += 1
        elif et in (
            RuntimeEventType.STEP_RETRYING,
        ):
            self._total_retries += 1

    # ── Metrics ───────────────────────────────────────────

    def metrics(self) -> SystemMetrics:
        self._require_initialized()
        with self._lock:
            uptime = time.time() - self._start_time
            total = self._total_events
            error_count = self._errors
            error_rate = (error_count / total * 100) if total > 0 else 0.0
            event_rate = (total / uptime) if uptime > 0 else 0.0

            avg_latency = 0.0
            peak_latency = 0.0

            active = (
                self._executions_started
                - self._executions_completed
                - self._executions_failed
            )

            return SystemMetrics(
                uptime_seconds=round(uptime, 3),
                total_events_seen=total,
                events_by_type=dict(self._events_by_type),
                events_by_execution=dict(self._events_by_execution),
                total_executions_started=self._executions_started,
                total_executions_completed=self._executions_completed,
                total_executions_failed=self._executions_failed,
                total_steps_executed=self._steps_executed,
                total_steps_failed=self._steps_failed,
                total_retries=self._total_retries,
                average_dispatch_latency=round(avg_latency, 6),
                peak_dispatch_latency=round(peak_latency, 6),
                error_rate=round(error_rate, 2),
                active_executions=max(0, active),
                event_rate_per_second=round(event_rate, 2),
            )

    def health(self) -> HealthStatus:
        self._require_initialized()
        with self._lock:
            connected = self._event_bus is not None and self._event_bus.is_initialized
            subscriber_active = self._subscription_id is not None
            time_since_last_event = (
                time.time() - self._last_event_time if self._last_event_time > 0 else float("inf")
            )

            issues: list[str] = []
            if not connected:
                issues.append("EventBus not connected")
            if not subscriber_active:
                issues.append("No active subscription")
            if self._errors > 10:
                issues.append(f"High error rate: {self._errors} errors")
            if self._total_events > 0 and time_since_last_event > 300:
                issues.append(f"No events received for {time_since_last_event:.0f}s")

            healthy = len(issues) == 0
            return HealthStatus(
                healthy=healthy,
                status="healthy" if healthy else "degraded",
                event_bus_connected=connected,
                events_processed=self._total_events,
                subscriber_active=subscriber_active,
                last_event_time=self._last_event_time,
                errors_recent=self._errors,
                message="; ".join(issues) if issues else "All systems operational",
            )

    # ── Event Stream ──────────────────────────────────────

    def query_events(
        self,
        event_type: RuntimeEventType | None = None,
        execution_id: str | None = None,
        step_id: str | None = None,
        limit: int = 100,
    ) -> list[EventStreamEntry]:
        self._require_initialized()
        with self._lock:
            results = list(self._stream)
        if event_type:
            results = [e for e in results if e.event_type == event_type]
        if execution_id:
            results = [e for e in results if e.execution_id == execution_id]
        if step_id:
            results = [e for e in results if e.step_id == step_id]
        return results[-limit:]

    def event_stream(self) -> list[EventStreamEntry]:
        self._require_initialized()
        with self._lock:
            return list(self._stream)

    # ── Statistics / Validation / Reload ──────────────────

    def statistics(self) -> ObservabilityStatistics:
        self._require_initialized()
        with self._lock:
            execution_events = sum(
                v for k, v in self._events_by_type.items()
                if k.startswith("execution_")
            )
            step_events = sum(
                v for k, v in self._events_by_type.items()
                if k.startswith("step_")
            )
            rollback_events = sum(
                v for k, v in self._events_by_type.items()
                if k.startswith("rollback_")
            )
            avg_time = 0.0
            peak_time = 0.0

            return ObservabilityStatistics(
                total_events_consumed=self._total_events,
                total_execution_events=execution_events,
                total_step_events=step_events,
                total_rollback_events=rollback_events,
                total_errors=self._errors,
                subscriber_count=1 if self._subscription_id else 0,
                event_types_seen=len(self._events_by_type),
                peak_dispatch_time=round(peak_time, 6),
                average_dispatch_time=round(avg_time, 6),
            )

    def validate(self) -> list[str]:
        self._require_initialized()
        warnings: list[str] = []
        sub_id = None
        start_time = 0.0
        with self._lock:
            sub_id = self._subscription_id
            start_time = self._start_time
        if sub_id is None:
            warnings.append("No subscription active")
        stats = self.statistics()
        if stats.total_errors > stats.total_events_consumed * 0.5:
            warnings.append("Error rate exceeds 50%")
        if start_time == 0:
            warnings.append("Consumer has not been started")
        return warnings

    def reload(self) -> ObservabilityConsumer:
        self.logger.info("Reloading ObservabilityConsumer")
        if self._event_bus is not None and self._subscription_id is not None:
            try:
                self._event_bus.unsubscribe(self._subscription_id)
            except Exception:
                pass
        with self._lock:
            self._event_bus = None
            self._subscription_id = None
            self._stream.clear()
            self._events_by_type.clear()
            self._events_by_execution.clear()
            self._executions_started = 0
            self._executions_completed = 0
            self._executions_failed = 0
            self._steps_executed = 0
            self._steps_failed = 0
            self._total_retries = 0
            self._total_events = 0
            self._last_event_time = 0.0
            self._errors = 0
            self._initialized = False
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise EventBusError(
                "ObservabilityConsumer has not been initialized — call initialize() first",
            )
