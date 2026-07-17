"""Consolidation — importance scoring, dedup, expiration, working→episodic/semantic."""

from __future__ import annotations

import threading
import time
from collections.abc import Callable

from aios.core.exceptions import MemoryError
from aios.core.logger import get_logger
from aios.memory.memory_store import MemoryStoreBackend
from aios.memory.models import (
    ConsolidationResult,
    EpisodicEntry,
    MemoryStatistics,
    MemoryValidationResult,
    SemanticEntry,
    SemanticEntryType,
)


class ConsolidationEngine:
    def __init__(
        self,
        backend: MemoryStoreBackend,
        working_ttl: float = 3600.0,
        dedup_threshold: float = 0.85,
    ) -> None:
        self.logger = get_logger("aios.memory.consolidation")
        self._backend = backend
        self._working_ttl = working_ttl
        self._dedup_threshold = dedup_threshold
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._summary_hooks: list[Callable[[str, dict], None]] = []

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> ConsolidationEngine:
        self._initialized = True
        self.logger.info(
            "ConsolidationEngine initialized (working_ttl=%s, dedup_threshold=%s)",
            self._working_ttl,
            self._dedup_threshold,
        )
        return self

    def consolidate(self) -> ConsolidationResult:
        self._require_initialized()
        expired = self._expire_working()
        moved_to_semantic = self._promote_working_to_semantic()
        moved_to_episodic = self._promote_working_to_episodic()
        deduplicated = self._deduplicate_semantic()
        result = ConsolidationResult(
            moved_to_episodic=moved_to_episodic,
            moved_to_semantic=moved_to_semantic,
            deduplicated=deduplicated,
            expired=expired,
            removed_from_working=moved_to_episodic + moved_to_semantic,
        )
        self.logger.info(
            "Consolidation completed: episodic=%d, semantic=%d, expired=%d, dedup=%d",
            len(result.moved_to_episodic),
            len(result.moved_to_semantic),
            len(result.expired),
            len(result.deduplicated),
        )
        return result

    def on_summary(self, hook: Callable[[str, dict], None]) -> None:
        with self._lock:
            self._summary_hooks.append(hook)

    def statistics(self) -> MemoryStatistics:
        return MemoryStatistics()

    def validate(self) -> MemoryValidationResult:
        return MemoryValidationResult()

    def reload(self) -> ConsolidationEngine:
        self.logger.info("Reloading ConsolidationEngine")
        with self._lock:
            self._summary_hooks.clear()
        return self

    def _expire_working(self) -> list[str]:
        now = time.time()
        expired_ids: list[str] = []
        for entry in self._backend.list_working():
            if now - entry.timestamp > self._working_ttl:
                expired_ids.append(entry.id)
        for eid in expired_ids:
            self._backend.delete_working(eid)
        return expired_ids

    def _promote_working_to_episodic(self) -> list[str]:
        promoted: list[str] = []
        for entry in self._backend.list_working():
            if entry.importance >= 0.5:
                ep = EpisodicEntry(
                    execution_id=entry.execution_id,
                    goal=entry.content[:200],
                    observations=[entry.content],
                    outcome=entry.metadata.get("outcome", "completed"),
                    metadata=dict(entry.metadata, source="working_memory_consolidation"),
                )
                self._backend.store_episodic(ep)
                promoted.append(entry.id)
        for pid in promoted:
            self._backend.delete_working(pid)
        if promoted:
            self.logger.info("Promoted %d working entries to episodic", len(promoted))
        return promoted

    def _promote_working_to_semantic(self) -> list[str]:
        promoted: list[str] = []
        for entry in self._backend.list_working():
            if entry.importance >= 0.7 and entry.type in ("knowledge", "concept", "fact"):
                se = SemanticEntry(
                    entry_type=SemanticEntryType.FACT,
                    content=entry.content,
                    source="working_memory_consolidation",
                    confidence=entry.importance,
                )
                self._backend.store_semantic(se)
                promoted.append(entry.id)
        for pid in promoted:
            self._backend.delete_working(pid)
        if promoted:
            self.logger.info("Promoted %d working entries to semantic", len(promoted))
        return promoted

    def _deduplicate_semantic(self) -> list[str]:
        entries = self._backend.list_semantic()
        if len(entries) < 2:
            return []
        removed: list[str] = []
        handled: set[str] = set()
        for i in range(len(entries)):
            if entries[i].id in handled:
                continue
            for j in range(i + 1, len(entries)):
                if entries[j].id in handled:
                    continue
                sim = self._jaccard_similarity(entries[i].content, entries[j].content)
                if sim >= self._dedup_threshold:
                    self._backend.delete_semantic(entries[j].id)
                    removed.append(entries[j].id)
                    handled.add(entries[j].id)
        return removed

    @staticmethod
    def _jaccard_similarity(a: str, b: str) -> float:
        tokens_a = set(a.lower().split())
        tokens_b = set(b.lower().split())
        if not tokens_a or not tokens_b:
            return 0.0
        intersection = tokens_a & tokens_b
        union = tokens_a | tokens_b
        return len(intersection) / len(union)

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise MemoryError("ConsolidationEngine has not been initialized")
