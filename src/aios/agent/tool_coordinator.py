"""Tool coordinator for agent tool integration."""

from __future__ import annotations

import threading

from aios.agent.models import AgentValidationResult
from aios.core.logger import get_logger


class ToolCoordinator:
    def __init__(self) -> None:
        self.logger = get_logger("aios.agent.tool_coordinator")
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._executions: int = 0

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> ToolCoordinator:
        self._initialized = True
        self.logger.info("ToolCoordinator initialized")
        return self

    def execute_tool(self, tool_name: str, arguments: dict) -> str:
        self._require_initialized()
        with self._lock:
            self._executions += 1
        return f"Tool '{tool_name}' executed with {len(arguments)} args"

    def list_available_tools(self) -> list[str]:
        self._require_initialized()
        return ["echo", "add", "search"]

    @property
    def execution_count(self) -> int:
        with self._lock:
            return self._executions

    def validate(self) -> AgentValidationResult:
        return AgentValidationResult()

    def reload(self) -> ToolCoordinator:
        with self._lock:
            self._executions = 0
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            from aios.core.exceptions import AgentLayerError
            raise AgentLayerError("ToolCoordinator has not been initialized")
