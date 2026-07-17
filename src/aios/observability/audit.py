"""Audit log system for observability."""

from __future__ import annotations

import threading
import time

from aios.core.exceptions import ObservabilityError
from aios.core.logger import get_logger
from aios.observability.models import (
    AuditLogEntry,
    ObservabilityValidationResult,
)


class AuditLogger:
    """Audit logger for recording system events."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.observability.audit")
        self._entries: list[AuditLogEntry] = []
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> AuditLogger:
        """Initialize the audit logger."""
        self._initialized = True
        self.logger.info("AuditLogger initialized")
        return self

    def log(
        self,
        actor: str,
        action: str,
        resource: str,
        details: dict | None = None,
        result: str = "success",
    ) -> AuditLogEntry:
        """Log an audit event."""
        self._require_initialized()

        entry = AuditLogEntry(
            timestamp=time.time(),
            actor=actor,
            action=action,
            resource=resource,
            details=details or {},
            result=result,
        )

        with self._lock:
            self._entries.append(entry)

        self.logger.info("Audit: %s performed %s on %s (%s)", actor, action, resource, result)
        return entry

    def list_entries(
        self,
        actor: str | None = None,
        action: str | None = None,
        limit: int = 100,
    ) -> list[AuditLogEntry]:
        """List audit log entries, optionally filtered."""
        self._require_initialized()

        with self._lock:
            entries = list(self._entries)
            if actor:
                entries = [e for e in entries if e.actor == actor]
            if action:
                entries = [e for e in entries if e.action == action]
            return entries[-limit:]

    def count(self) -> int:
        """Count audit log entries."""
        self._require_initialized()

        with self._lock:
            return len(self._entries)

    def validate(self) -> ObservabilityValidationResult:
        """Validate the audit logger."""
        result = ObservabilityValidationResult()

        with self._lock:
            if not self._entries:
                result.warnings.append("No audit log entries")

        return result

    def reload(self) -> AuditLogger:
        """Reload the audit logger."""
        self.logger.info("Reloading AuditLogger")

        with self._lock:
            self._entries.clear()

        return self

    def _require_initialized(self) -> None:
        """Check if logger is initialized."""
        if not self._initialized:
            raise ObservabilityError("AuditLogger has not been initialized")
