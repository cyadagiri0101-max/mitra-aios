"""Abstract memory store backend and in-memory implementation."""

from __future__ import annotations

import threading
from abc import ABC, abstractmethod
from typing import Any

from aios.core.logger import get_logger
from aios.memory.models import (
    EpisodicEntry,
    SemanticEntry,
    WorkingMemoryEntry,
)


class MemoryStoreBackend(ABC):
    @abstractmethod
    def store_working(self, entry: WorkingMemoryEntry) -> str: ...

    @abstractmethod
    def store_episodic(self, entry: EpisodicEntry) -> str: ...

    @abstractmethod
    def store_semantic(self, entry: SemanticEntry) -> str: ...

    @abstractmethod
    def get_working(self, entry_id: str) -> WorkingMemoryEntry | None: ...

    @abstractmethod
    def get_episodic(self, entry_id: str) -> EpisodicEntry | None: ...

    @abstractmethod
    def get_semantic(self, entry_id: str) -> SemanticEntry | None: ...

    @abstractmethod
    def delete_working(self, entry_id: str) -> bool: ...

    @abstractmethod
    def delete_episodic(self, entry_id: str) -> bool: ...

    @abstractmethod
    def delete_semantic(self, entry_id: str) -> bool: ...

    @abstractmethod
    def list_working(self) -> list[WorkingMemoryEntry]: ...

    @abstractmethod
    def list_episodic(self) -> list[EpisodicEntry]: ...

    @abstractmethod
    def list_semantic(self) -> list[SemanticEntry]: ...

    @abstractmethod
    def clear_working(self) -> None: ...

    @abstractmethod
    def clear_episodic(self) -> None: ...

    @abstractmethod
    def clear_semantic(self) -> None: ...

    @abstractmethod
    def count_working(self) -> int: ...

    @abstractmethod
    def count_episodic(self) -> int: ...

    @abstractmethod
    def count_semantic(self) -> int: ...

    @abstractmethod
    def clear_all(self) -> None: ...

    @abstractmethod
    def stats(self) -> dict[str, Any]: ...


class InMemoryBackend(MemoryStoreBackend):
    def __init__(self) -> None:
        self.logger = get_logger("aios.memory.in_memory_backend")
        self._working: dict[str, WorkingMemoryEntry] = {}
        self._episodic: dict[str, EpisodicEntry] = {}
        self._semantic: dict[str, SemanticEntry] = {}
        self._lock = threading.Lock()

    def store_working(self, entry: WorkingMemoryEntry) -> str:
        with self._lock:
            self._working[entry.id] = entry
        return entry.id

    def store_episodic(self, entry: EpisodicEntry) -> str:
        with self._lock:
            self._episodic[entry.id] = entry
        return entry.id

    def store_semantic(self, entry: SemanticEntry) -> str:
        with self._lock:
            self._semantic[entry.id] = entry
        return entry.id

    def get_working(self, entry_id: str) -> WorkingMemoryEntry | None:
        with self._lock:
            return self._working.get(entry_id)

    def get_episodic(self, entry_id: str) -> EpisodicEntry | None:
        with self._lock:
            return self._episodic.get(entry_id)

    def get_semantic(self, entry_id: str) -> SemanticEntry | None:
        with self._lock:
            return self._semantic.get(entry_id)

    def delete_working(self, entry_id: str) -> bool:
        with self._lock:
            return self._working.pop(entry_id, None) is not None

    def delete_episodic(self, entry_id: str) -> bool:
        with self._lock:
            return self._episodic.pop(entry_id, None) is not None

    def delete_semantic(self, entry_id: str) -> bool:
        with self._lock:
            return self._semantic.pop(entry_id, None) is not None

    def list_working(self) -> list[WorkingMemoryEntry]:
        with self._lock:
            return list(self._working.values())

    def list_episodic(self) -> list[EpisodicEntry]:
        with self._lock:
            return list(self._episodic.values())

    def list_semantic(self) -> list[SemanticEntry]:
        with self._lock:
            return list(self._semantic.values())

    def clear_working(self) -> None:
        with self._lock:
            self._working.clear()

    def clear_episodic(self) -> None:
        with self._lock:
            self._episodic.clear()

    def clear_semantic(self) -> None:
        with self._lock:
            self._semantic.clear()

    def clear_all(self) -> None:
        with self._lock:
            self._working.clear()
            self._episodic.clear()
            self._semantic.clear()

    def count_working(self) -> int:
        with self._lock:
            return len(self._working)

    def count_episodic(self) -> int:
        with self._lock:
            return len(self._episodic)

    def count_semantic(self) -> int:
        with self._lock:
            return len(self._semantic)

    def stats(self) -> dict[str, Any]:
        with self._lock:
            return {
                "working_count": len(self._working),
                "episodic_count": len(self._episodic),
                "semantic_count": len(self._semantic),
                "total_entries": len(self._working) + len(self._episodic) + len(self._semantic),
            }
