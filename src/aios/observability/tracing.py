"""Tracing system for observability."""

from __future__ import annotations

import threading
import time
import uuid

from aios.core.exceptions import ObservabilityError
from aios.core.logger import get_logger
from aios.observability.models import (
    ObservabilityValidationResult,
    TraceSpan,
)


class TracingSystem:
    """Tracing system for distributed tracing."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.observability.tracing")
        self._spans: dict[str, TraceSpan] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> TracingSystem:
        """Initialize the tracing system."""
        self._initialized = True
        self.logger.info("TracingSystem initialized")
        return self

    def start_span(
        self,
        operation_name: str,
        parent_span_id: str = "",
        tags: dict | None = None,
    ) -> TraceSpan:
        """Start a new trace span."""
        self._require_initialized()

        span_id = str(uuid.uuid4())

        # If there's a parent span, use its trace_id
        trace_id = str(uuid.uuid4())
        if parent_span_id:
            parent_span = self._spans.get(parent_span_id)
            if parent_span:
                trace_id = parent_span.trace_id

        span = TraceSpan(
            trace_id=trace_id,
            span_id=span_id,
            parent_span_id=parent_span_id,
            operation_name=operation_name,
            start_time=time.time(),
            tags=tags or {},
        )

        with self._lock:
            self._spans[span_id] = span

        self.logger.debug("Started span '%s' (ID: %s)", operation_name, span_id)
        return span

    def finish_span(self, span_id: str, status: str = "ok", tags: dict | None = None) -> bool:
        """Finish a trace span."""
        self._require_initialized()

        with self._lock:
            if span_id not in self._spans:
                return False

            span = self._spans[span_id]
            end_time = time.time()
            duration = end_time - span.start_time

            updated_tags = dict(span.tags)
            if tags:
                updated_tags.update(tags)

            updated_span = TraceSpan(
                trace_id=span.trace_id,
                span_id=span.span_id,
                parent_span_id=span.parent_span_id,
                operation_name=span.operation_name,
                start_time=span.start_time,
                end_time=end_time,
                duration=duration,
                tags=updated_tags,
                logs=span.logs,
                status=status,
            )
            self._spans[span_id] = updated_span

        self.logger.debug("Finished span '%s' (ID: %s)", span.operation_name, span_id)
        return True

    def get_span(self, span_id: str) -> TraceSpan | None:
        """Get a span by ID."""
        self._require_initialized()

        with self._lock:
            return self._spans.get(span_id)

    def list_spans(self, trace_id: str | None = None) -> list[TraceSpan]:
        """List all spans, optionally filtered by trace ID."""
        self._require_initialized()

        with self._lock:
            spans = list(self._spans.values())
            if trace_id:
                spans = [s for s in spans if s.trace_id == trace_id]
            return spans

    def count(self) -> int:
        """Count spans."""
        self._require_initialized()

        with self._lock:
            return len(self._spans)

    def validate(self) -> ObservabilityValidationResult:
        """Validate the tracing system."""
        result = ObservabilityValidationResult()

        with self._lock:
            if not self._spans:
                result.warnings.append("No spans recorded")

        return result

    def reload(self) -> TracingSystem:
        """Reload the tracing system."""
        self.logger.info("Reloading TracingSystem")

        with self._lock:
            self._spans.clear()

        return self

    def _require_initialized(self) -> None:
        """Check if system is initialized."""
        if not self._initialized:
            raise ObservabilityError("TracingSystem has not been initialized")
