"""Shared memory for multi-agent communication."""

from __future__ import annotations

import threading
import time

from aios.core.exceptions import MultiAgentError
from aios.core.logger import get_logger
from aios.multiagent.models import (
    MultiAgentValidationResult,
    SharedMemory,
)


class SharedMemoryStore:
    """Thread-safe shared memory store for agent communication."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.multiagent.shared_memory")
        self._memory: dict[str, SharedMemory] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> SharedMemoryStore:
        self._initialized = True
        self.logger.info("SharedMemoryStore initialized")
        return self

    def store(self, key: str, value: str, created_by: str, metadata: dict | None = None) -> SharedMemory:
        """Store a value in shared memory."""
        self._require_initialized()
        with self._lock:
            memory = SharedMemory(
                key=key,
                value=value,
                created_by=created_by,
                timestamp=time.time(),
                metadata=metadata or {},
            )
            self._memory[key] = memory
            self.logger.debug("Stored key '%s' by agent '%s'", key, created_by)
            return memory

    def retrieve(self, key: str) -> SharedMemory | None:
        """Retrieve a value from shared memory."""
        self._require_initialized()
        with self._lock:
            return self._memory.get(key)

    def delete(self, key: str) -> bool:
        """Delete a value from shared memory."""
        self._require_initialized()
        with self._lock:
            if key in self._memory:
                del self._memory[key]
                self.logger.debug("Deleted key '%s'", key)
                return True
            return False

    def list_keys(self) -> list[str]:
        """List all keys in shared memory."""
        self._require_initialized()
        with self._lock:
            return list(self._memory.keys())

    def clear(self) -> None:
        """Clear all shared memory."""
        self._require_initialized()
        with self._lock:
            self._memory.clear()
            self.logger.info("Cleared all shared memory")

    def count(self) -> int:
        """Count items in shared memory."""
        self._require_initialized()
        with self._lock:
            return len(self._memory)

    def validate(self) -> MultiAgentValidationResult:
        """Validate shared memory state."""
        result = MultiAgentValidationResult()
        with self._lock:
            if not self._memory:
                result.warnings.append("Shared memory is empty")
        return result

    def reload(self) -> SharedMemoryStore:
        """Reload shared memory store."""
        self.logger.info("Reloading SharedMemoryStore")
        with self._lock:
            self._memory.clear()
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise MultiAgentError("SharedMemoryStore has not been initialized")
