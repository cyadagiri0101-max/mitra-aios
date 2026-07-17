"""Policy engine for security."""

from __future__ import annotations

import threading

from aios.core.exceptions import SecurityError
from aios.core.logger import get_logger
from aios.security.models import (
    Policy,
    SecurityValidationResult,
)


class PolicyEngine:
    """Engine for managing security policies."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.security.policy")
        self._policies: dict[str, Policy] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> PolicyEngine:
        """Initialize the policy engine."""
        self._initialized = True
        self.logger.info("PolicyEngine initialized")
        return self

    def create_policy(self, name: str, description: str = "", metadata: dict | None = None) -> Policy:
        """Create a new policy."""
        self._require_initialized()

        policy = Policy(
            name=name,
            description=description,
            permissions=(),
            metadata=metadata or {},
        )

        with self._lock:
            self._policies[name] = policy

        self.logger.info("Created policy: %s", name)
        return policy

    def get_policy(self, name: str) -> Policy | None:
        """Get a policy by name."""
        self._require_initialized()

        with self._lock:
            return self._policies.get(name)

    def delete_policy(self, name: str) -> bool:
        """Delete a policy."""
        self._require_initialized()

        with self._lock:
            if name in self._policies:
                del self._policies[name]
                self.logger.info("Deleted policy: %s", name)
                return True
            return False

    def list_policies(self) -> list[Policy]:
        """List all policies."""
        self._require_initialized()

        with self._lock:
            return list(self._policies.values())

    def count(self) -> int:
        """Count policies."""
        self._require_initialized()

        with self._lock:
            return len(self._policies)

    def validate(self) -> SecurityValidationResult:
        """Validate the policy engine."""
        result = SecurityValidationResult()

        with self._lock:
            if not self._policies:
                result.warnings.append("No policies created")

        return result

    def reload(self) -> PolicyEngine:
        """Reload the policy engine."""
        self.logger.info("Reloading PolicyEngine")

        with self._lock:
            self._policies.clear()

        return self

    def _require_initialized(self) -> None:
        """Check if engine is initialized."""
        if not self._initialized:
            raise SecurityError("PolicyEngine has not been initialized", component="PolicyEngine")
