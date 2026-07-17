"""Tests for AIOS Observability."""

from __future__ import annotations

import time

import pytest

from aios.core.exceptions import ObservabilityError
from aios.observability.audit import AuditLogger
from aios.observability.health import HealthChecker
from aios.observability.manager import ObservabilityManager
from aios.observability.metrics import MetricsCollector
from aios.observability.models import (
    AuditLogEntry,
    HealthCheck,
    HealthStatus,
    Metric,
    MetricType,
    ObservabilityStatistics,
    ObservabilityValidationResult,
    TraceSpan,
)
from aios.observability.tracing import TracingSystem

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class TestModels:
    def test_metric_creation(self):
        metric = Metric(
            name="test_counter",
            metric_type=MetricType.COUNTER,
            value=10.0,
            labels={"env": "prod"},
            description="Test counter",
            unit="requests",
        )
        assert metric.name == "test_counter"
        assert metric.metric_type == MetricType.COUNTER
        assert metric.value == 10.0
        assert metric.labels == {"env": "prod"}

    def test_trace_span_creation(self):
        span = TraceSpan(
            trace_id="trace1",
            span_id="span1",
            operation_name="test_op",
            start_time=1000.0,
            end_time=1001.0,
            duration=1.0,
            tags={"key": "value"},
            status="ok",
        )
        assert span.trace_id == "trace1"
        assert span.span_id == "span1"
        assert span.operation_name == "test_op"
        assert span.duration == 1.0

    def test_audit_log_entry_creation(self):
        entry = AuditLogEntry(
            timestamp=1000.0,
            actor="user1",
            action="login",
            resource="auth",
            details={"ip": "127.0.0.1"},
            result="success",
        )
        assert entry.actor == "user1"
        assert entry.action == "login"
        assert entry.result == "success"

    def test_health_check_creation(self):
        check = HealthCheck(
            name="database",
            status=HealthStatus.HEALTHY,
            message="Connected",
            timestamp=1000.0,
        )
        assert check.name == "database"
        assert check.status == HealthStatus.HEALTHY
        assert check.message == "Connected"

    def test_observability_statistics_creation(self):
        stats = ObservabilityStatistics(
            total_metrics=100,
            total_traces=50,
            total_audit_logs=200,
            total_health_checks=10,
        )
        assert stats.total_metrics == 100
        assert stats.total_traces == 50

    def test_metric_type_enum(self):
        assert MetricType.COUNTER.value == "counter"
        assert MetricType.GAUGE.value == "gauge"
        assert MetricType.HISTOGRAM.value == "histogram"
        assert MetricType.SUMMARY.value == "summary"

    def test_health_status_enum(self):
        assert HealthStatus.HEALTHY.value == "healthy"
        assert HealthStatus.DEGRADED.value == "degraded"
        assert HealthStatus.UNHEALTHY.value == "unhealthy"
        assert HealthStatus.UNKNOWN.value == "unknown"


# ---------------------------------------------------------------------------
# MetricsCollector
# ---------------------------------------------------------------------------


class TestMetricsCollector:
    def test_initialize(self):
        collector = MetricsCollector()
        assert collector.is_initialized is False
        collector.initialize()
        assert collector.is_initialized is True

    def test_record_counter(self):
        collector = MetricsCollector().initialize()
        collector.record_counter("test_counter", 5.0)
        metric = collector.get_metric("test_counter")
        assert metric is not None
        assert metric.value == 5.0
        assert metric.metric_type == MetricType.COUNTER

    def test_record_counter_increment(self):
        collector = MetricsCollector().initialize()
        collector.record_counter("test_counter", 5.0)
        collector.record_counter("test_counter", 3.0)
        metric = collector.get_metric("test_counter")
        assert metric.value == 8.0

    def test_record_gauge(self):
        collector = MetricsCollector().initialize()
        collector.record_gauge("test_gauge", 42.0)
        metric = collector.get_metric("test_gauge")
        assert metric is not None
        assert metric.value == 42.0
        assert metric.metric_type == MetricType.GAUGE

    def test_record_histogram(self):
        collector = MetricsCollector().initialize()
        collector.record_histogram("test_histogram", 1.5)
        metric = collector.get_metric("test_histogram")
        assert metric is not None
        assert metric.metric_type == MetricType.HISTOGRAM

    def test_record_with_labels(self):
        collector = MetricsCollector().initialize()
        collector.record_counter("test_counter", 1.0, labels={"env": "prod"})
        metric = collector.get_metric("test_counter", labels={"env": "prod"})
        assert metric is not None
        assert metric.labels == {"env": "prod"}

    def test_list_metrics(self):
        collector = MetricsCollector().initialize()
        collector.record_counter("counter1", 1.0)
        collector.record_gauge("gauge1", 2.0)
        metrics = collector.list_metrics()
        assert len(metrics) == 2

    def test_count(self):
        collector = MetricsCollector().initialize()
        collector.record_counter("counter1", 1.0)
        collector.record_counter("counter2", 2.0)
        assert collector.count() == 2

    def test_export_prometheus(self):
        collector = MetricsCollector().initialize()
        collector.record_counter("test_counter", 10.0)
        output = collector.export_prometheus()
        assert "test_counter" in output
        assert "10.0" in output

    def test_validate(self):
        collector = MetricsCollector().initialize()
        result = collector.validate()
        assert isinstance(result, ObservabilityValidationResult)

    def test_reload(self):
        collector = MetricsCollector().initialize()
        collector.record_counter("test_counter", 1.0)
        collector.reload()
        assert collector.count() == 0

    def test_uninitialized_raises(self):
        collector = MetricsCollector()
        with pytest.raises(ObservabilityError):
            collector.record_counter("test_counter", 1.0)


# ---------------------------------------------------------------------------
# TracingSystem
# ---------------------------------------------------------------------------


class TestTracingSystem:
    def test_initialize(self):
        system = TracingSystem()
        assert system.is_initialized is False
        system.initialize()
        assert system.is_initialized is True

    def test_start_span(self):
        system = TracingSystem().initialize()
        span = system.start_span("test_operation")
        assert span.operation_name == "test_operation"
        assert span.span_id != ""
        assert span.start_time > 0

    def test_start_span_with_parent(self):
        system = TracingSystem().initialize()
        parent = system.start_span("parent_op")
        child = system.start_span("child_op", parent_span_id=parent.span_id)
        assert child.parent_span_id == parent.span_id

    def test_finish_span(self):
        system = TracingSystem().initialize()
        span = system.start_span("test_operation")
        time.sleep(0.01)
        assert system.finish_span(span.span_id) is True
        finished = system.get_span(span.span_id)
        assert finished.end_time > 0
        assert finished.duration > 0

    def test_finish_nonexistent_span(self):
        system = TracingSystem().initialize()
        assert system.finish_span("nonexistent") is False

    def test_get_span(self):
        system = TracingSystem().initialize()
        span = system.start_span("test_operation")
        retrieved = system.get_span(span.span_id)
        assert retrieved is not None
        assert retrieved.span_id == span.span_id

    def test_list_spans(self):
        system = TracingSystem().initialize()
        system.start_span("op1")
        system.start_span("op2")
        spans = system.list_spans()
        assert len(spans) == 2

    def test_list_spans_by_trace(self):
        system = TracingSystem().initialize()
        parent = system.start_span("parent")
        system.start_span("child", parent_span_id=parent.span_id)
        system.start_span("other")

        trace_spans = system.list_spans(trace_id=parent.trace_id)
        assert len(trace_spans) == 2

    def test_count(self):
        system = TracingSystem().initialize()
        system.start_span("op1")
        system.start_span("op2")
        assert system.count() == 2

    def test_validate(self):
        system = TracingSystem().initialize()
        result = system.validate()
        assert isinstance(result, ObservabilityValidationResult)

    def test_reload(self):
        system = TracingSystem().initialize()
        system.start_span("test")
        system.reload()
        assert system.count() == 0

    def test_uninitialized_raises(self):
        system = TracingSystem()
        with pytest.raises(ObservabilityError):
            system.start_span("test")


# ---------------------------------------------------------------------------
# AuditLogger
# ---------------------------------------------------------------------------


class TestAuditLogger:
    def test_initialize(self):
        logger = AuditLogger()
        assert logger.is_initialized is False
        logger.initialize()
        assert logger.is_initialized is True

    def test_log(self):
        logger = AuditLogger().initialize()
        entry = logger.log("user1", "login", "auth")
        assert entry.actor == "user1"
        assert entry.action == "login"
        assert entry.resource == "auth"
        assert entry.result == "success"

    def test_log_with_details(self):
        logger = AuditLogger().initialize()
        entry = logger.log("user1", "login", "auth", details={"ip": "127.0.0.1"})
        assert entry.details == {"ip": "127.0.0.1"}

    def test_list_entries(self):
        logger = AuditLogger().initialize()
        logger.log("user1", "login", "auth")
        logger.log("user2", "logout", "auth")
        entries = logger.list_entries()
        assert len(entries) == 2

    def test_list_entries_by_actor(self):
        logger = AuditLogger().initialize()
        logger.log("user1", "login", "auth")
        logger.log("user2", "login", "auth")
        entries = logger.list_entries(actor="user1")
        assert len(entries) == 1
        assert entries[0].actor == "user1"

    def test_list_entries_by_action(self):
        logger = AuditLogger().initialize()
        logger.log("user1", "login", "auth")
        logger.log("user1", "logout", "auth")
        entries = logger.list_entries(action="login")
        assert len(entries) == 1
        assert entries[0].action == "login"

    def test_list_entries_with_limit(self):
        logger = AuditLogger().initialize()
        for i in range(10):
            logger.log("user1", f"action{i}", "resource")
        entries = logger.list_entries(limit=5)
        assert len(entries) == 5

    def test_count(self):
        logger = AuditLogger().initialize()
        logger.log("user1", "login", "auth")
        logger.log("user2", "login", "auth")
        assert logger.count() == 2

    def test_validate(self):
        logger = AuditLogger().initialize()
        result = logger.validate()
        assert isinstance(result, ObservabilityValidationResult)

    def test_reload(self):
        logger = AuditLogger().initialize()
        logger.log("user1", "login", "auth")
        logger.reload()
        assert logger.count() == 0

    def test_uninitialized_raises(self):
        logger = AuditLogger()
        with pytest.raises(ObservabilityError):
            logger.log("user1", "login", "auth")


# ---------------------------------------------------------------------------
# HealthChecker
# ---------------------------------------------------------------------------


class TestHealthChecker:
    def test_initialize(self):
        checker = HealthChecker()
        assert checker.is_initialized is False
        checker.initialize()
        assert checker.is_initialized is True

    def test_register_check(self):
        checker = HealthChecker().initialize()
        check = checker.register_check("database", HealthStatus.HEALTHY, "Connected")
        assert check.name == "database"
        assert check.status == HealthStatus.HEALTHY

    def test_update_check(self):
        checker = HealthChecker().initialize()
        checker.register_check("database")
        assert checker.update_check("database", HealthStatus.UNHEALTHY, "Connection failed") is True
        check = checker.get_check("database")
        assert check.status == HealthStatus.UNHEALTHY

    def test_update_nonexistent_check(self):
        checker = HealthChecker().initialize()
        assert checker.update_check("nonexistent", HealthStatus.HEALTHY) is False

    def test_get_check(self):
        checker = HealthChecker().initialize()
        checker.register_check("database")
        check = checker.get_check("database")
        assert check is not None
        assert check.name == "database"

    def test_list_checks(self):
        checker = HealthChecker().initialize()
        checker.register_check("database")
        checker.register_check("cache")
        checks = checker.list_checks()
        assert len(checks) == 2

    def test_overall_status_healthy(self):
        checker = HealthChecker().initialize()
        checker.register_check("database", HealthStatus.HEALTHY)
        checker.register_check("cache", HealthStatus.HEALTHY)
        assert checker.overall_status() == HealthStatus.HEALTHY

    def test_overall_status_degraded(self):
        checker = HealthChecker().initialize()
        checker.register_check("database", HealthStatus.HEALTHY)
        checker.register_check("cache", HealthStatus.DEGRADED)
        assert checker.overall_status() == HealthStatus.DEGRADED

    def test_overall_status_unhealthy(self):
        checker = HealthChecker().initialize()
        checker.register_check("database", HealthStatus.HEALTHY)
        checker.register_check("cache", HealthStatus.UNHEALTHY)
        assert checker.overall_status() == HealthStatus.UNHEALTHY

    def test_overall_status_empty(self):
        checker = HealthChecker().initialize()
        assert checker.overall_status() == HealthStatus.UNKNOWN

    def test_count(self):
        checker = HealthChecker().initialize()
        checker.register_check("database")
        checker.register_check("cache")
        assert checker.count() == 2

    def test_validate(self):
        checker = HealthChecker().initialize()
        result = checker.validate()
        assert isinstance(result, ObservabilityValidationResult)

    def test_reload(self):
        checker = HealthChecker().initialize()
        checker.register_check("database")
        checker.reload()
        assert checker.count() == 0

    def test_uninitialized_raises(self):
        checker = HealthChecker()
        with pytest.raises(ObservabilityError):
            checker.register_check("database")


# ---------------------------------------------------------------------------
# ObservabilityManager
# ---------------------------------------------------------------------------


class TestObservabilityManager:
    def test_initialize(self):
        manager = ObservabilityManager()
        assert manager.is_initialized is False
        manager.initialize()
        assert manager.is_initialized is True

    def test_double_initialize(self):
        manager = ObservabilityManager().initialize()
        manager.initialize()
        assert manager.is_initialized is True

    def test_record_metric(self):
        manager = ObservabilityManager().initialize()
        manager.record_metric("test_counter", 5.0, MetricType.COUNTER)
        stats = manager.get_statistics()
        assert stats.total_metrics == 1

    def test_start_and_finish_trace(self):
        manager = ObservabilityManager().initialize()
        span = manager.start_trace("test_operation")
        assert manager.finish_trace(span.span_id) is True

    def test_log_audit(self):
        manager = ObservabilityManager().initialize()
        entry = manager.log_audit("user1", "login", "auth")
        assert entry.actor == "user1"

    def test_register_health_check(self):
        manager = ObservabilityManager().initialize()
        check = manager.register_health_check("database", HealthStatus.HEALTHY)
        assert check.name == "database"

    def test_update_health_check(self):
        manager = ObservabilityManager().initialize()
        manager.register_health_check("database")
        assert manager.update_health_check("database", HealthStatus.UNHEALTHY) is True

    def test_get_overall_health(self):
        manager = ObservabilityManager().initialize()
        manager.register_health_check("database", HealthStatus.HEALTHY)
        assert manager.get_overall_health() == HealthStatus.HEALTHY

    def test_export_metrics(self):
        manager = ObservabilityManager().initialize()
        manager.record_metric("test_counter", 10.0)
        output = manager.export_metrics()
        assert "test_counter" in output

    def test_get_statistics(self):
        manager = ObservabilityManager().initialize()
        manager.record_metric("counter1", 1.0)
        manager.start_trace("op1")
        manager.log_audit("user1", "login", "auth")
        manager.register_health_check("database")

        stats = manager.get_statistics()
        assert isinstance(stats, ObservabilityStatistics)
        assert stats.total_metrics == 1
        assert stats.total_traces == 1
        assert stats.total_audit_logs == 1
        assert stats.total_health_checks == 1

    def test_validate(self):
        manager = ObservabilityManager().initialize()
        result = manager.validate()
        assert isinstance(result, ObservabilityValidationResult)

    def test_reload(self):
        manager = ObservabilityManager().initialize()
        manager.record_metric("counter1", 1.0)
        manager.reload()
        assert manager.is_initialized is False

    def test_shutdown(self):
        manager = ObservabilityManager().initialize()
        manager.shutdown()
        assert manager.is_initialized is False

    def test_uninitialized_raises(self):
        manager = ObservabilityManager()
        with pytest.raises(ObservabilityError):
            manager.record_metric("counter1", 1.0)

    def test_components_accessible(self):
        manager = ObservabilityManager().initialize()
        assert manager.metrics is not None
        assert manager.tracing is not None
        assert manager.audit is not None
        assert manager.health is not None


# ---------------------------------------------------------------------------
# Integration
# ---------------------------------------------------------------------------


class TestIntegration:
    def test_full_observability_workflow(self):
        manager = ObservabilityManager().initialize()

        # Record metrics
        manager.record_metric("http_requests", 100.0, MetricType.COUNTER, labels={"method": "GET"})
        manager.record_metric("response_time", 0.5, MetricType.GAUGE)

        # Start and finish traces
        span1 = manager.start_trace("http_request", tags={"path": "/api/users"})
        time.sleep(0.01)
        manager.finish_trace(span1.span_id, status="ok")

        span2 = manager.start_trace("database_query", parent_span_id=span1.span_id)
        time.sleep(0.005)
        manager.finish_trace(span2.span_id, status="ok")

        # Log audit events
        manager.log_audit("user1", "login", "auth", details={"ip": "127.0.0.1"})
        manager.log_audit("user1", "access_resource", "data")

        # Register health checks
        manager.register_health_check("database", HealthStatus.HEALTHY, "Connected")
        manager.register_health_check("cache", HealthStatus.HEALTHY, "Available")
        manager.register_health_check("queue", HealthStatus.DEGRADED, "High latency")

        # Get overall health
        overall = manager.get_overall_health()
        assert overall == HealthStatus.DEGRADED

        # Export metrics
        prometheus_output = manager.export_metrics()
        assert "http_requests" in prometheus_output

        # Get statistics
        stats = manager.get_statistics()
        assert stats.total_metrics == 2
        assert stats.total_traces == 2
        assert stats.total_audit_logs == 2
        assert stats.total_health_checks == 3

        # Validate
        validation = manager.validate()
        assert validation.is_valid is True

        manager.shutdown()
