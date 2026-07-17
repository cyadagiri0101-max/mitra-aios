"""Memory coordinator for agent memory integration."""

from __future__ import annotations

import threading

from aios.agent.models import AgentValidationResult
from aios.core.logger import get_logger


class MemoryCoordinator:
    def __init__(self) -> None:
        self.logger = get_logger("aios.agent.memory_coordinator")
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._stored: int = 0
        self._retrieved: int = 0

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> MemoryCoordinator:
        self._initialized = True
        self.logger.info("MemoryCoordinator initialized")
        return self

    def store(self, content: str, metadata: dict | None = None) -> None:
        self._require_initialized()
        with self._lock:
            self._stored += 1

    def retrieve(self, query: str, limit: int = 5) -> list[str]:
        self._require_initialized()
        with self._lock:
            self._retrieved += 1
        return [f"memory result for: {query}"]

    @property
    def stored_count(self) -> int:
        with self._lock:
            return self._stored

    @property
    def retrieved_count(self) -> int:
        with self._lock:
            return self._retrieved

    def validate(self) -> AgentValidationResult:
        return AgentValidationResult()

    def reload(self) -> MemoryCoordinator:
        with self._lock:
            self._stored = 0
            self._retrieved = 0
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            from aios.core.exceptions import AgentLayerError
            raise AgentLayerError("MemoryCoordinator has not been initialized")
