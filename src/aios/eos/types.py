"""Shared EOS type definitions — dependency-free dataclasses used across eos/ modules.

Extracted from observability.py to break circular import chains.
All four eos/ modules (event_bus, runtime_engine, workflow_engine, observability)
import HealthStatus from here instead of from each other.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from aios.eos.runtime_engine import RuntimeEventType


@dataclass(frozen=True, slots=True)
class EventStreamEntry:
    event_id: str
    event_type: RuntimeEventType
    execution_id: str
    step_id: str | None
    message: str
    timestamp: float
    priority: str
    dispatch_mode: str
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class SystemMetrics:
    uptime_seconds: float = 0.0
    total_events_seen: int = 0
    events_by_type: dict[str, int] = field(default_factory=dict)
    events_by_execution: dict[str, int] = field(default_factory=dict)
    total_executions_started: int = 0
    total_executions_completed: int = 0
    total_executions_failed: int = 0
    total_steps_executed: int = 0
    total_steps_failed: int = 0
    total_retries: int = 0
    average_dispatch_latency: float = 0.0
    peak_dispatch_latency: float = 0.0
    error_rate: float = 0.0
    active_executions: int = 0
    event_rate_per_second: float = 0.0


@dataclass(frozen=True, slots=True)
class HealthStatus:
    healthy: bool = True
    status: str = "healthy"
    event_bus_connected: bool = False
    events_processed: int = 0
    subscriber_active: bool = False
    last_event_time: float = 0.0
    errors_recent: int = 0
    message: str = ""
    initialized: bool = True
    active_executions: int = 0
    total_executions: int = 0
    failed_executions: int = 0
    cancelled_executions: int = 0
    uptime_seconds: float = 0.0
