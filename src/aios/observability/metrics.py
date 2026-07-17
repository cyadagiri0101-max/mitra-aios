"""Metrics collector for observability."""

from __future__ import annotations

import threading

from aios.core.exceptions import ObservabilityError
from aios.core.logger import get_logger
from aios.observability.models import (
    Metric,
    MetricType,
    ObservabilityValidationResult,
)


class MetricsCollector:
    """Collector for metrics."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.observability.metrics")
        self._metrics: dict[str, Metric] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> MetricsCollector:
        """Initialize the metrics collector."""
        self._initialized = True
        self.logger.info("MetricsCollector initialized")
        return self

    def record_counter(self, name: str, value: float = 1.0, labels: dict | None = None) -> None:
        """Record a counter metric."""
        self._require_initialized()

        with self._lock:
            key = self._make_key(name, labels)
            if key in self._metrics:
                metric = self._metrics[key]
                updated_metric = Metric(
                    name=metric.name,
                    metric_type=MetricType.COUNTER,
                    value=metric.value + value,
                    labels=metric.labels,
                    description=metric.description,
                    unit=metric.unit,
                )
                self._metrics[key] = updated_metric
            else:
                self._metrics[key] = Metric(
                    name=name,
                    metric_type=MetricType.COUNTER,
                    value=value,
                    labels=labels or {},
                )

    def record_gauge(self, name: str, value: float, labels: dict | None = None) -> None:
        """Record a gauge metric."""
        self._require_initialized()

        with self._lock:
            key = self._make_key(name, labels)
            self._metrics[key] = Metric(
                name=name,
                metric_type=MetricType.GAUGE,
                value=value,
                labels=labels or {},
            )

    def record_histogram(self, name: str, value: float, labels: dict | None = None) -> None:
        """Record a histogram metric."""
        self._require_initialized()

        with self._lock:
            key = self._make_key(name, labels)
            if key in self._metrics:
                metric = self._metrics[key]
                updated_metric = Metric(
                    name=metric.name,
                    metric_type=MetricType.HISTOGRAM,
                    value=metric.value + value,
                    labels=metric.labels,
                    description=metric.description,
                    unit=metric.unit,
                )
                self._metrics[key] = updated_metric
            else:
                self._metrics[key] = Metric(
                    name=name,
                    metric_type=MetricType.HISTOGRAM,
                    value=value,
                    labels=labels or {},
                )

    def get_metric(self, name: str, labels: dict | None = None) -> Metric | None:
        """Get a metric by name and labels."""
        self._require_initialized()

        with self._lock:
            key = self._make_key(name, labels)
            return self._metrics.get(key)

    def list_metrics(self) -> list[Metric]:
        """List all metrics."""
        self._require_initialized()

        with self._lock:
            return list(self._metrics.values())

    def count(self) -> int:
        """Count metrics."""
        self._require_initialized()

        with self._lock:
            return len(self._metrics)

    def export_prometheus(self) -> str:
        """Export metrics in Prometheus format."""
        self._require_initialized()

        with self._lock:
            lines = []
            for metric in self._metrics.values():
                label_str = ",".join(f'{k}="{v}"' for k, v in metric.labels.items())
                if label_str:
                    lines.append(f"{metric.name}{{{label_str}}} {metric.value}")
                else:
                    lines.append(f"{metric.name} {metric.value}")
            return "\n".join(lines)

    def validate(self) -> ObservabilityValidationResult:
        """Validate the metrics collector."""
        result = ObservabilityValidationResult()

        with self._lock:
            if not self._metrics:
                result.warnings.append("No metrics recorded")

        return result

    def reload(self) -> MetricsCollector:
        """Reload the metrics collector."""
        self.logger.info("Reloading MetricsCollector")

        with self._lock:
            self._metrics.clear()

        return self

    def _make_key(self, name: str, labels: dict | None) -> str:
        """Make a unique key for a metric."""
        if not labels:
            return name
        label_str = ",".join(f"{k}={v}" for k, v in sorted(labels.items()))
        return f"{name}:{label_str}"

    def _require_initialized(self) -> None:
        """Check if collector is initialized."""
        if not self._initialized:
            raise ObservabilityError("MetricsCollector has not been initialized")
