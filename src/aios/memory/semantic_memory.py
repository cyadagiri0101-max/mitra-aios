"""SemanticMemory — stores facts, skills, concepts, and relationships."""

from __future__ import annotations

import threading
import time

from aios.core.exceptions import MemoryError
from aios.core.logger import get_logger
from aios.memory.memory_store import MemoryStoreBackend
from aios.memory.models import (
    MemoryStatistics,
    MemoryValidationResult,
    SemanticEntry,
    SemanticEntryType,
)


class SemanticMemory:
    def __init__(self, backend: MemoryStoreBackend) -> None:
        self.logger = get_logger("aios.memory.semantic_memory")
        self._backend = backend
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> SemanticMemory:
        self._initialized = True
        self.logger.info("SemanticMemory initialized")
        return self

    def insert(
        self,
        content: str,
        entry_type: SemanticEntryType = SemanticEntryType.FACT,
        tags: tuple[str, ...] = (),
        source: str = "memory",
        confidence: float = 1.0,
        relationships: dict[str, list[str]] | None = None,
    ) -> SemanticEntry:
        self._require_initialized()
        entry = SemanticEntry(
            entry_type=entry_type,
            content=content,
            tags=tags,
            source=source,
            confidence=max(0.0, min(1.0, confidence)),
            relationships=relationships or {},
        )
        self._backend.store_semantic(entry)
        return entry

    def get(self, entry_id: str) -> SemanticEntry | None:
        self._require_initialized()
        return self._backend.get_semantic(entry_id)

    def update(
        self,
        entry_id: str,
        content: str | None = None,
        tags: tuple[str, ...] | None = None,
        confidence: float | None = None,
        relationships: dict[str, list[str]] | None = None,
    ) -> SemanticEntry | None:
        self._require_initialized()
        existing = self._backend.get_semantic(entry_id)
        if existing is None:
            return None
        updated = SemanticEntry(
            id=existing.id,
            entry_type=existing.entry_type,
            content=content if content is not None else existing.content,
            tags=tags if tags is not None else existing.tags,
            source=existing.source,
            confidence=(
                max(0.0, min(1.0, confidence))
                if confidence is not None
                else existing.confidence
            ),
            relationships=relationships if relationships is not None else existing.relationships,
            created_at=existing.created_at,
            updated_at=time.time(),
        )
        self._backend.store_semantic(updated)
        return updated

    def remove(self, entry_id: str) -> bool:
        self._require_initialized()
        return self._backend.delete_semantic(entry_id)

    def search(
        self,
        query: str = "",
        entry_type: SemanticEntryType | None = None,
        tags: tuple[str, ...] | None = None,
        limit: int = 50,
    ) -> list[SemanticEntry]:
        self._require_initialized()
        q = query.lower()
        results: list[SemanticEntry] = []
        for entry in self._backend.list_semantic():
            if entry_type is not None and entry.entry_type != entry_type:
                continue
            if tags and not any(t in entry.tags for t in tags):
                continue
            if q and q not in entry.content.lower():
                continue
            results.append(entry)
        results.sort(key=lambda e: e.confidence, reverse=True)
        return results[:limit]

    def similarity_search(
        self,
        query: str,
        entry_type: SemanticEntryType | None = None,
        top_k: int = 10,
    ) -> list[tuple[SemanticEntry, float]]:
        self._require_initialized()
        q = query.lower()
        scored: list[tuple[SemanticEntry, float]] = []
        for entry in self._backend.list_semantic():
            if entry_type is not None and entry.entry_type != entry_type:
                continue
            score = self._compute_similarity(q, entry.content.lower())
            if score > 0:
                scored.append((entry, score))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    def list(self) -> list[SemanticEntry]:
        self._require_initialized()
        return self._backend.list_semantic()

    def count(self) -> int:
        self._require_initialized()
        return self._backend.count_semantic()

    def clear(self) -> None:
        self._require_initialized()
        self._backend.clear_semantic()

    def statistics(self) -> MemoryStatistics:
        self._require_initialized()
        return MemoryStatistics(semantic_entries=self._backend.count_semantic())

    def validate(self) -> MemoryValidationResult:
        self._require_initialized()
        result = MemoryValidationResult()
        seen: set[str] = set()
        all_ids = {e.id for e in self._backend.list_semantic()}
        for entry in self._backend.list_semantic():
            if entry.id in seen:
                result.duplicate_ids.append(entry.id)
            seen.add(entry.id)
            if entry.created_at <= 0 or entry.updated_at <= 0:
                result.invalid_timestamps.append(entry.id)
            for rel_type, rel_ids in entry.relationships.items():
                for rid in rel_ids:
                    if rid not in all_ids:
                        result.broken_relationships.append(
                            f"{entry.id}.{rel_type} -> {rid}",
                        )
        if result.duplicate_ids:
            result.is_valid = False
        if result.invalid_timestamps:
            result.is_valid = False
        if result.broken_relationships:
            result.is_valid = False
        return result

    def reload(self) -> SemanticMemory:
        self.logger.info("Reloading SemanticMemory")
        with self._lock:
            self._backend.clear_semantic()
        return self

    @staticmethod
    def _compute_similarity(a: str, b: str) -> float:
        words_a = set(a.split())
        words_b = set(b.split())
        if not words_a or not words_b:
            return 0.0
        intersection = words_a & words_b
        union = words_a | words_b
        return len(intersection) / len(union)

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise MemoryError("SemanticMemory has not been initialized")
