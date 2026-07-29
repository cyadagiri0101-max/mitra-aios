"""Observability Manager - main facade for the observability system."""

from __future__ import annotations

import threading
from typing import Any

from aios.core.exceptions import ObservabilityError
from aios.core.logger import get_logger
from aios.observability.audit import AuditLogger
from aios.observability.health import HealthChecker
from aios.observability.metrics import MetricsCollector
from aios.observability.models import (
    AuditLogEntry,
    HealthCheck,
    HealthStatus,
    MetricType,
    ObservabilityStatistics,
    ObservabilityValidationResult,
    TraceSpan,
)
from aios.observability.tracing import TracingSystem


class ObservabilityManager:
    """Main facade for the observability system."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.observability.manager")
        self._lock = threading.Lock()
        self._initialized: bool = False

        # Initialize components
        self._metrics = MetricsCollector()
        self._tracing = TracingSystem()
        self._audit = AuditLogger()
        self._health = HealthChecker()

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def metrics(self) -> MetricsCollector:
        return self._metrics

    @property
    def tracing(self) -> TracingSystem:
        return self._tracing

    @property
    def audit(self) -> AuditLogger:
        return self._audit

    @property
    def health(self) -> HealthChecker:
        return self._health

    def initialize(self) -> ObservabilityManager:
        """Initialize the observability manager and all components."""
        with self._lock:
            if self._initialized:
                return self

            self._metrics.initialize()
            self._tracing.initialize()
            self._audit.initialize()
            self._health.initialize()

            self._initialized = True
            self.logger.info("ObservabilityManager initialized")

        return self

    def record_metric(self, name: str, value: float, metric_type: MetricType = MetricType.COUNTER, labels: dict | None = None) -> None:
        """Record a metric."""
        self._require_initialized()

        if metric_type == MetricType.COUNTER:
            self._metrics.record_counter(name, value, labels)
        elif metric_type == MetricType.GAUGE:
            self._metrics.record_gauge(name, value, labels)
        elif metric_type == MetricType.HISTOGRAM:
            self._metrics.record_histogram(name, value, labels)

    def start_trace(self, operation_name: str, parent_span_id: str = "", tags: dict | None = None) -> TraceSpan:
        """Start a trace span."""
        self._require_initialized()
        return self._tracing.start_span(operation_name, parent_span_id, tags)

    def finish_trace(self, span_id: str, status: str = "ok", tags: dict | None = None) -> bool:
        """Finish a trace span."""
        self._require_initialized()
        return self._tracing.finish_span(span_id, status, tags)

    def log_audit(self, actor: str, action: str, resource: str, details: dict | None = None, result: str = "success") -> AuditLogEntry:
        """Log an audit event."""
        self._require_initialized()
        return self._audit.log(actor, action, resource, details, result)

    def register_health_check(self, name: str, status: HealthStatus = HealthStatus.UNKNOWN, message: str = "") -> HealthCheck:
        """Register a health check."""
        self._require_initialized()
        return self._health.register_check(name, status, message)

    def update_health_check(self, name: str, status: HealthStatus, message: str = "", details: dict | None = None) -> bool:
        """Update a health check."""
        self._require_initialized()
        return self._health.update_check(name, status, message, details)

    def get_overall_health(self) -> HealthStatus:
        """Get overall system health."""
        self._require_initialized()
        return self._health.overall_status()

    def export_metrics(self) -> str:
        """Export metrics in Prometheus format."""
        self._require_initialized()
        return self._metrics.export_prometheus()

    def get_statistics(self) -> ObservabilityStatistics:
        """Get observability statistics."""
        self._require_initialized()

        return ObservabilityStatistics(
            total_metrics=self._metrics.count(),
            total_traces=self._tracing.count(),
            total_audit_logs=self._audit.count(),
            total_health_checks=self._health.count(),
        )

    def validate(self) -> ObservabilityValidationResult:
        """Validate the observability manager."""
        self._require_initialized()

        result = ObservabilityValidationResult()

        # Validate all components
        components: list[Any] = [self._metrics, self._tracing, self._audit, self._health]
        for component in components:
            component_result = component.validate()
            result.warnings.extend(component_result.warnings)
            result.errors.extend(component_result.errors)
            if not component_result.is_valid:
                result.is_valid = False

        return result

    def reload(self) -> ObservabilityManager:
        """Reload the observability manager."""
        self.logger.info("Reloading ObservabilityManager")

        with self._lock:
            self._metrics.reload()
            self._tracing.reload()
            self._audit.reload()
            self._health.reload()
            self._initialized = False

        return self

    def shutdown(self) -> None:
        """Shutdown the observability manager."""
        self.logger.info("Shutting down ObservabilityManager")

        with self._lock:
            self._initialized = False

    def _require_initialized(self) -> None:
        """Check if manager is initialized."""
        if not self._initialized:
            raise ObservabilityError("ObservabilityManager has not been initialized")
