"""EpisodicMemory — stores past execution episodes."""

from __future__ import annotations

import threading
import time

from aios.core.exceptions import MemoryError
from aios.core.logger import get_logger
from aios.memory.memory_store import MemoryStoreBackend
from aios.memory.models import (
    EpisodicEntry,
    MemoryStatistics,
    MemoryValidationResult,
)


class EpisodicMemory:
    def __init__(self, backend: MemoryStoreBackend) -> None:
        self.logger = get_logger("aios.memory.episodic_memory")
        self._backend = backend
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> EpisodicMemory:
        self._initialized = True
        self.logger.info("EpisodicMemory initialized")
        return self

    def add(
        self,
        execution_id: str,
        goal: str = "",
        workflow: dict | None = None,
        outcome: str = "",
        observations: list[str] | None = None,
        metadata: dict | None = None,
    ) -> EpisodicEntry:
        self._require_initialized()
        entry = EpisodicEntry(
            execution_id=execution_id,
            timestamp=time.time(),
            goal=goal,
            workflow=workflow or {},
            outcome=outcome,
            observations=observations or [],
            metadata=metadata or {},
        )
        self._backend.store_episodic(entry)
        return entry

    def get(self, entry_id: str) -> EpisodicEntry | None:
        self._require_initialized()
        return self._backend.get_episodic(entry_id)

    def search(
        self,
        query: str = "",
        execution_id: str | None = None,
        outcome: str | None = None,
        limit: int = 20,
    ) -> list[EpisodicEntry]:
        self._require_initialized()
        results: list[EpisodicEntry] = []
        q = query.lower()
        for entry in self._backend.list_episodic():
            if execution_id is not None and entry.execution_id != execution_id:
                continue
            if outcome is not None and entry.outcome != outcome:
                continue
            if q and q not in entry.goal.lower() and q not in entry.outcome.lower():
                continue
            results.append(entry)
        results.sort(key=lambda e: e.timestamp, reverse=True)
        return results[:limit]

    def delete(self, entry_id: str) -> bool:
        self._require_initialized()
        return self._backend.delete_episodic(entry_id)

    def clear(self) -> None:
        self._require_initialized()
        self._backend.clear_episodic()

    def count(self) -> int:
        self._require_initialized()
        return self._backend.count_episodic()

    def list(self) -> list[EpisodicEntry]:
        self._require_initialized()
        return self._backend.list_episodic()

    def statistics(self) -> MemoryStatistics:
        self._require_initialized()
        return MemoryStatistics(episodic_entries=self._backend.count_episodic())

    def validate(self) -> MemoryValidationResult:
        self._require_initialized()
        result = MemoryValidationResult()
        seen: set[str] = set()
        for entry in self._backend.list_episodic():
            if entry.id in seen:
                result.duplicate_ids.append(entry.id)
            seen.add(entry.id)
            if entry.timestamp <= 0:
                result.invalid_timestamps.append(entry.id)
        if result.duplicate_ids:
            result.is_valid = False
        if result.invalid_timestamps:
            result.is_valid = False
        return result

    def reload(self) -> EpisodicMemory:
        self.logger.info("Reloading EpisodicMemory")
        with self._lock:
            self._backend.clear_episodic()
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise MemoryError("EpisodicMemory has not been initialized")
