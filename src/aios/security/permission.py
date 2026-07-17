"""Permission engine for security."""

from __future__ import annotations

import threading

from aios.core.exceptions import SecurityError
from aios.core.logger import get_logger
from aios.security.models import (
    Permission,
    PermissionLevel,
    SecurityValidationResult,
)


class PermissionEngine:
    """Engine for managing permissions."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.security.permission")
        self._permissions: dict[str, Permission] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> PermissionEngine:
        """Initialize the permission engine."""
        self._initialized = True
        self.logger.info("PermissionEngine initialized")
        return self

    def grant(self, principal: str, resource: str, level: PermissionLevel) -> Permission:
        """Grant a permission."""
        self._require_initialized()

        perm_key = f"{principal}:{resource}"
        permission = Permission(
            resource=resource,
            level=level,
            principal=principal,
        )

        with self._lock:
            self._permissions[perm_key] = permission

        self.logger.info("Granted %s permission on '%s' to '%s'", level.value, resource, principal)
        return permission

    def revoke(self, principal: str, resource: str) -> bool:
        """Revoke a permission."""
        self._require_initialized()

        perm_key = f"{principal}:{resource}"

        with self._lock:
            if perm_key in self._permissions:
                del self._permissions[perm_key]
                self.logger.info("Revoked permission on '%s' from '%s'", resource, principal)
                return True
            return False

    def check(self, principal: str, resource: str, required_level: PermissionLevel) -> bool:
        """Check if a principal has the required permission level."""
        self._require_initialized()

        perm_key = f"{principal}:{resource}"

        with self._lock:
            permission = self._permissions.get(perm_key)
            if not permission:
                return False

            return self._level_value(permission.level) >= self._level_value(required_level)

    def require(self, principal: str, resource: str, required_level: PermissionLevel) -> None:
        """Require a permission, raising an error if not granted."""
        if not self.check(principal, resource, required_level):
            raise SecurityError(
                f"Permission denied: '{principal}' lacks {required_level.value} on '{resource}'",
                component="PermissionEngine",
            )

    def list_permissions(self, principal: str | None = None) -> list[Permission]:
        """List all permissions, optionally filtered by principal."""
        self._require_initialized()

        with self._lock:
            permissions = list(self._permissions.values())
            if principal:
                permissions = [p for p in permissions if p.principal == principal]
            return permissions

    def count(self) -> int:
        """Count permissions."""
        self._require_initialized()

        with self._lock:
            return len(self._permissions)

    def validate(self) -> SecurityValidationResult:
        """Validate the permission engine."""
        result = SecurityValidationResult()

        with self._lock:
            if not self._permissions:
                result.warnings.append("No permissions granted")

        return result

    def reload(self) -> PermissionEngine:
        """Reload the permission engine."""
        self.logger.info("Reloading PermissionEngine")

        with self._lock:
            self._permissions.clear()

        return self

    def _level_value(self, level: PermissionLevel) -> int:
        """Convert permission level to numeric value."""
        return {
            PermissionLevel.NONE: 0,
            PermissionLevel.READ: 1,
            PermissionLevel.WRITE: 2,
            PermissionLevel.EXECUTE: 3,
            PermissionLevel.ADMIN: 4,
        }.get(level, 0)

    def _require_initialized(self) -> None:
        """Check if engine is initialized."""
        if not self._initialized:
            raise SecurityError("PermissionEngine has not been initialized", component="PermissionEngine")
