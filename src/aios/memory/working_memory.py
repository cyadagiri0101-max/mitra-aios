"""WorkingMemory — short-lived, per-execution, FIFO-evicted memory."""

from __future__ import annotations

import threading
import time
from collections.abc import Callable

from aios.core.exceptions import MemoryError
from aios.core.logger import get_logger
from aios.memory.memory_store import MemoryStoreBackend
from aios.memory.models import (
    MemoryStatistics,
    MemoryValidationResult,
    WorkingMemoryEntry,
)


class WorkingMemory:
    def __init__(
        self,
        backend: MemoryStoreBackend,
        capacity: int = 100,
    ) -> None:
        self.logger = get_logger("aios.memory.working_memory")
        self._backend = backend
        self._capacity = capacity
        self._evictions: int = 0
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._eviction_hooks: list[Callable[[WorkingMemoryEntry], None]] = []

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def capacity(self) -> int:
        return self._capacity

    def initialize(self) -> WorkingMemory:
        self._initialized = True
        self.logger.info("WorkingMemory initialized (capacity=%d)", self._capacity)
        return self

    def add(
        self,
        content: str,
        execution_id: str = "",
        type: str = "general",
        importance: float = 0.0,
        metadata: dict | None = None,
    ) -> WorkingMemoryEntry:
        self._require_initialized()
        entry = WorkingMemoryEntry(
            execution_id=execution_id,
            content=content,
            type=type,
            timestamp=time.time(),
            importance=max(0.0, min(1.0, importance)),
            metadata=metadata or {},
        )
        evicted: WorkingMemoryEntry | None = None
        with self._lock:
            self._backend.store_working(entry)
            if self._backend.count_working() > self._capacity:
                oldest = self._find_oldest()
                if oldest is not None and oldest.id != entry.id:
                    self._backend.delete_working(oldest.id)
                    self._evictions += 1
                    evicted = oldest
        if evicted is not None:
            self._notify_eviction(evicted)
        return entry

    def get(self, entry_id: str) -> WorkingMemoryEntry | None:
        self._require_initialized()
        return self._backend.get_working(entry_id)

    def delete(self, entry_id: str) -> bool:
        self._require_initialized()
        return self._backend.delete_working(entry_id)

    def list(self) -> list[WorkingMemoryEntry]:
        self._require_initialized()
        return self._backend.list_working()

    def clear(self) -> None:
        self._require_initialized()
        with self._lock:
            self._backend.clear_working()
            self._evictions = 0

    def count(self) -> int:
        self._require_initialized()
        return self._backend.count_working()

    def search(self, query: str) -> list[WorkingMemoryEntry]:
        self._require_initialized()
        q = query.lower()
        results = []
        for entry in self._backend.list_working():
            if q in entry.content.lower() or q in entry.type.lower():
                results.append(entry)
        return results

    def search_by_execution(self, execution_id: str) -> list[WorkingMemoryEntry]:
        self._require_initialized()
        return [
            e for e in self._backend.list_working()
            if e.execution_id == execution_id
        ]

    def on_eviction(self, hook: Callable[[WorkingMemoryEntry], None]) -> None:
        with self._lock:
            self._eviction_hooks.append(hook)

    def statistics(self) -> MemoryStatistics:
        self._require_initialized()
        with self._lock:
            return MemoryStatistics(
                working_entries=self._backend.count_working(),
                evictions=self._evictions,
            )

    def validate(self) -> MemoryValidationResult:
        self._require_initialized()
        result = MemoryValidationResult()
        seen: set[str] = set()
        for entry in self._backend.list_working():
            if entry.id in seen:
                result.duplicate_ids.append(entry.id)
            seen.add(entry.id)
            if entry.timestamp <= 0:
                result.invalid_timestamps.append(entry.id)
            if not (0.0 <= entry.importance <= 1.0):
                result.warnings.append(f"Working entry {entry.id} importance out of range")
        count = self._backend.count_working()
        if count > self._capacity:
            result.capacity_overflow = True
            result.is_valid = False
        if result.duplicate_ids:
            result.is_valid = False
        if result.invalid_timestamps:
            result.is_valid = False
        return result

    def reload(self) -> WorkingMemory:
        self.logger.info("Reloading WorkingMemory")
        with self._lock:
            self._backend.clear_working()
            self._evictions = 0
            self._eviction_hooks.clear()
        return self

    def _find_oldest(self) -> WorkingMemoryEntry | None:
        entries = self._backend.list_working()
        if not entries:
            return None
        return min(entries, key=lambda e: e.timestamp)

    def _notify_eviction(self, entry: WorkingMemoryEntry) -> None:
        hooks = list(self._eviction_hooks)
        for hook in hooks:
            try:
                hook(entry)
            except Exception:
                self.logger.exception("Eviction hook failed for %s", entry.id)

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise MemoryError("WorkingMemory has not been initialized")
