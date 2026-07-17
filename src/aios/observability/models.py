"""Data models for observability."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class MetricType(StrEnum):
    """Metric types."""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"


class HealthStatus(StrEnum):
    """Health check status."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass(frozen=True, slots=True)
class Metric:
    """Metric model."""
    name: str = ""
    metric_type: MetricType = MetricType.COUNTER
    value: float = 0.0
    labels: dict = field(default_factory=dict)
    description: str = ""
    unit: str = ""


@dataclass(frozen=True, slots=True)
class TraceSpan:
    """Trace span model."""
    trace_id: str = ""
    span_id: str = ""
    parent_span_id: str = ""
    operation_name: str = ""
    start_time: float = 0.0
    end_time: float = 0.0
    duration: float = 0.0
    tags: dict = field(default_factory=dict)
    logs: list[dict] = field(default_factory=list)
    status: str = "ok"


@dataclass(frozen=True, slots=True)
class AuditLogEntry:
    """Audit log entry model."""
    timestamp: float = 0.0
    actor: str = ""
    action: str = ""
    resource: str = ""
    details: dict = field(default_factory=dict)
    result: str = "success"


@dataclass(frozen=True, slots=True)
class HealthCheck:
    """Health check model."""
    name: str = ""
    status: HealthStatus = HealthStatus.UNKNOWN
    message: str = ""
    details: dict = field(default_factory=dict)
    timestamp: float = 0.0


@dataclass(frozen=True, slots=True)
class ProfileResult:
    """Profile result model."""
    function_name: str = ""
    call_count: int = 0
    total_time: float = 0.0
    average_time: float = 0.0
    min_time: float = 0.0
    max_time: float = 0.0


@dataclass(slots=True)
class ObservabilityStatistics:
    """Observability statistics."""
    total_metrics: int = 0
    total_traces: int = 0
    total_audit_logs: int = 0
    total_health_checks: int = 0
    total_profiles: int = 0


@dataclass(slots=True)
class ObservabilityValidationResult:
    """Observability validation result."""
    is_valid: bool = True
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
