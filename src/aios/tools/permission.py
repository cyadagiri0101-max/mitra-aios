"""Permission management for tool execution."""

from __future__ import annotations

import threading

from aios.core.exceptions import ToolError
from aios.core.logger import get_logger
from aios.tools.models import PermissionLevel, ToolDefinition, ToolValidationResult


class PermissionManager:
    def __init__(self) -> None:
        self.logger = get_logger("aios.tools.permission")
        self._permissions: dict[str, PermissionLevel] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> PermissionManager:
        self._initialized = True
        self.logger.info("PermissionManager initialized")
        return self

    def grant(self, tool_name: str, level: PermissionLevel) -> None:
        self._require_initialized()
        with self._lock:
            self._permissions[tool_name] = level
            self.logger.info("Granted %s permission to '%s'", level.value, tool_name)

    def revoke(self, tool_name: str) -> bool:
        self._require_initialized()
        with self._lock:
            if tool_name in self._permissions:
                del self._permissions[tool_name]
                self.logger.info("Revoked permissions for '%s'", tool_name)
                return True
            return False

    def check(self, tool_def: ToolDefinition, requested: PermissionLevel) -> bool:
        self._require_initialized()
        with self._lock:
            granted = self._permissions.get(tool_def.name, PermissionLevel.NONE)
            return self._level_value(granted) >= self._level_value(requested)

    def require(self, tool_def: ToolDefinition, requested: PermissionLevel) -> None:
        if not self.check(tool_def, requested):
            raise ToolError(
                f"Permission denied for '{tool_def.name}': requires {requested.value}",
                tool_name=tool_def.name,
            )

    def list_permissions(self) -> dict[str, str]:
        self._require_initialized()
        with self._lock:
            return {k: v.value for k, v in self._permissions.items()}

    def validate(self) -> ToolValidationResult:
        result = ToolValidationResult()
        if not self._permissions:
            result.warnings.append("No permissions configured")
        return result

    def reload(self) -> PermissionManager:
        self.logger.info("Reloading PermissionManager")
        with self._lock:
            self._permissions.clear()
        return self

    @staticmethod
    def _level_value(level: PermissionLevel) -> int:
        return {
            PermissionLevel.NONE: 0,
            PermissionLevel.READ: 1,
            PermissionLevel.WRITE: 2,
            PermissionLevel.EXECUTE: 3,
            PermissionLevel.ADMIN: 4,
        }.get(level, 0)

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise ToolError("PermissionManager has not been initialized")
