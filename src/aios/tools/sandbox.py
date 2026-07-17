"""Sandbox for isolated tool execution."""

from __future__ import annotations

import threading

from aios.core.exceptions import ToolError
from aios.core.logger import get_logger
from aios.tools.config import SandboxConfig
from aios.tools.models import ToolValidationResult


class ToolSandbox:
    def __init__(self, config: SandboxConfig | None = None) -> None:
        self.logger = get_logger("aios.tools.sandbox")
        self._config = config or SandboxConfig()
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def config(self) -> SandboxConfig:
        return self._config

    def initialize(self) -> ToolSandbox:
        self._initialized = True
        self.logger.info("ToolSandbox initialized (enabled=%s)", self._config.enabled)
        return self

    def validate_path(self, path: str) -> bool:
        self._require_initialized()
        if not self._config.enabled:
            return True
        allowed = self._config.allowed_paths
        if not allowed:
            return True
        return any(path.startswith(a) for a in allowed)

    def validate_command(self, command: str) -> bool:
        self._require_initialized()
        if not self._config.enabled:
            return True
        cmd_name = command.split()[0] if command else ""
        return cmd_name not in self._config.blocked_commands

    def require_path(self, path: str) -> None:
        if not self.validate_path(path):
            raise ToolError(f"Path '{path}' not allowed by sandbox")

    def require_command(self, command: str) -> None:
        if not self.validate_command(command):
            raise ToolError(f"Command '{command}' blocked by sandbox")

    def validate(self) -> ToolValidationResult:
        result = ToolValidationResult()
        if self._config.timeout <= 0:
            result.errors.append("Sandbox timeout must be positive")
            result.is_valid = False
        if self._config.max_memory_mb <= 0:
            result.errors.append("Sandbox max_memory_mb must be positive")
            result.is_valid = False
        return result

    def reload(self) -> ToolSandbox:
        self.logger.info("Reloading ToolSandbox")
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise ToolError("ToolSandbox has not been initialized")
