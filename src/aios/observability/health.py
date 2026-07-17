"""Health check system for observability."""

from __future__ import annotations

import threading
import time

from aios.core.exceptions import ObservabilityError
from aios.core.logger import get_logger
from aios.observability.models import (
    HealthCheck,
    HealthStatus,
    ObservabilityValidationResult,
)


class HealthChecker:
    """Health checker for system components."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.observability.health")
        self._checks: dict[str, HealthCheck] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> HealthChecker:
        """Initialize the health checker."""
        self._initialized = True
        self.logger.info("HealthChecker initialized")
        return self

    def register_check(self, name: str, status: HealthStatus = HealthStatus.UNKNOWN, message: str = "") -> HealthCheck:
        """Register a health check."""
        self._require_initialized()

        check = HealthCheck(
            name=name,
            status=status,
            message=message,
            timestamp=time.time(),
        )

        with self._lock:
            self._checks[name] = check

        self.logger.info("Registered health check: %s", name)
        return check

    def update_check(self, name: str, status: HealthStatus, message: str = "", details: dict | None = None) -> bool:
        """Update a health check."""
        self._require_initialized()

        with self._lock:
            if name not in self._checks:
                return False

            check = self._checks[name]
            updated_check = HealthCheck(
                name=check.name,
                status=status,
                message=message,
                details=details or {},
                timestamp=time.time(),
            )
            self._checks[name] = updated_check

        self.logger.info("Updated health check '%s': %s", name, status.value)
        return True

    def get_check(self, name: str) -> HealthCheck | None:
        """Get a health check by name."""
        self._require_initialized()

        with self._lock:
            return self._checks.get(name)

    def list_checks(self) -> list[HealthCheck]:
        """List all health checks."""
        self._require_initialized()

        with self._lock:
            return list(self._checks.values())

    def overall_status(self) -> HealthStatus:
        """Get overall system health status."""
        self._require_initialized()

        with self._lock:
            if not self._checks:
                return HealthStatus.UNKNOWN

            statuses = [check.status for check in self._checks.values()]

            if HealthStatus.UNHEALTHY in statuses:
                return HealthStatus.UNHEALTHY
            elif HealthStatus.DEGRADED in statuses:
                return HealthStatus.DEGRADED
            elif all(s == HealthStatus.HEALTHY for s in statuses):
                return HealthStatus.HEALTHY
            else:
                return HealthStatus.UNKNOWN

    def count(self) -> int:
        """Count health checks."""
        self._require_initialized()

        with self._lock:
            return len(self._checks)

    def validate(self) -> ObservabilityValidationResult:
        """Validate the health checker."""
        result = ObservabilityValidationResult()

        with self._lock:
            if not self._checks:
                result.warnings.append("No health checks registered")

        return result

    def reload(self) -> HealthChecker:
        """Reload the health checker."""
        self.logger.info("Reloading HealthChecker")

        with self._lock:
            self._checks.clear()

        return self

    def _require_initialized(self) -> None:
        """Check if checker is initialized."""
        if not self._initialized:
            raise ObservabilityError("HealthChecker has not been initialized")
