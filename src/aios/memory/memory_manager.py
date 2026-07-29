"""MemoryManager — unified façade over all memory subsystems."""

from __future__ import annotations

import json
import threading
import time
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from aios.core.exceptions import MemoryError
from aios.core.logger import get_logger
from aios.memory.consolidation import ConsolidationEngine
from aios.memory.embeddings import EmbeddingProvider, MockEmbeddingProvider
from aios.memory.episodic_memory import EpisodicMemory
from aios.memory.memory_store import InMemoryBackend, MemoryStoreBackend
from aios.memory.models import (
    ConsolidationResult,
    MemoryStatistics,
    MemoryType,
    MemoryValidationResult,
    RetrievalResult,
    WorkingMemoryEntry,
)
from aios.memory.retrieval import RetrievalEngine
from aios.memory.semantic_memory import SemanticMemory
from aios.memory.working_memory import WorkingMemory


class MemoryManager:
    def __init__(
        self,
        backend: MemoryStoreBackend | None = None,
        embedding_provider: EmbeddingProvider | None = None,
        working_capacity: int = 100,
        working_ttl: float = 3600.0,
        dedup_threshold: float = 0.85,
        snapshot_dir: str | Path | None = None,
    ) -> None:
        self.logger = get_logger("aios.memory.memory_manager")
        self._backend = backend or InMemoryBackend()
        self._embedding_provider = embedding_provider or MockEmbeddingProvider()
        self._lock = threading.Lock()
        self._initialized: bool = False

        self._snapshot_dir = (
            Path(snapshot_dir)
            if snapshot_dir
            else Path.cwd() / ".ai" / "runtime" / "snapshots"
        )

        be = self._backend
        self._working: WorkingMemory = WorkingMemory(be, working_capacity)
        self._episodic: EpisodicMemory = EpisodicMemory(be)
        self._semantic: SemanticMemory = SemanticMemory(be)
        self._retrieval: RetrievalEngine = RetrievalEngine(be, self._embedding_provider)
        self._consolidation: ConsolidationEngine = ConsolidationEngine(
            be,
            working_ttl=working_ttl,
            dedup_threshold=dedup_threshold,
        )

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def working(self) -> WorkingMemory:
        return self._working

    @property
    def episodic(self) -> EpisodicMemory:
        return self._episodic

    @property
    def semantic(self) -> SemanticMemory:
        return self._semantic

    @property
    def retrieval(self) -> RetrievalEngine:
        return self._retrieval

    @property
    def consolidation(self) -> ConsolidationEngine:
        return self._consolidation

    def initialize(self) -> MemoryManager:
        with self._lock:
            if self._initialized:
                return self
            self._working.initialize()
            self._episodic.initialize()
            self._semantic.initialize()
            self._retrieval.initialize()
            self._consolidation.initialize()
            self._snapshot_dir.mkdir(parents=True, exist_ok=True)
            self._initialized = True
            self.logger.info("MemoryManager initialized")
        return self

    def store(
        self,
        content: str,
        execution_id: str = "",
        type: str = "general",
        importance: float = 0.0,
        metadata: dict | None = None,
    ) -> WorkingMemoryEntry:
        self._require_initialized()
        return self._working.add(
            content=content,
            execution_id=execution_id,
            type=type,
            importance=importance,
            metadata=metadata,
        )

    def retrieve(
        self,
        query: str,
        memory_types: Sequence[MemoryType] | None = None,
        limit: int = 20,
    ) -> list[RetrievalResult]:
        self._require_initialized()
        return self._retrieval.keyword_search(query, memory_types, limit)

    def hybrid_retrieve(
        self,
        query: str,
        memory_types: Sequence[MemoryType] | None = None,
        top_k: int = 10,
    ) -> list[RetrievalResult]:
        self._require_initialized()
        return self._retrieval.hybrid_search(query, memory_types, top_k)

    def similarity_retrieve(
        self,
        query: str,
        memory_types: Sequence[MemoryType] | None = None,
        top_k: int = 10,
    ) -> list[RetrievalResult]:
        self._require_initialized()
        return self._retrieval.similarity_search(query, memory_types, top_k)

    def forget(self, memory_type: MemoryType, entry_id: str) -> bool:
        self._require_initialized()
        if memory_type == MemoryType.WORKING:
            return self._working.delete(entry_id)
        elif memory_type == MemoryType.EPISODIC:
            return self._episodic.delete(entry_id)
        elif memory_type == MemoryType.SEMANTIC:
            return self._semantic.remove(entry_id)
        return False

    def consolidate_all(self) -> ConsolidationResult:
        self._require_initialized()
        return self._consolidation.consolidate()

    def statistics(self) -> MemoryStatistics:
        self._require_initialized()
        stats = MemoryStatistics()
        working_stats = self._working.statistics()
        episodic_stats = self._episodic.statistics()
        semantic_stats = self._semantic.statistics()
        retrieval_stats = self._retrieval.statistics()
        stats.working_entries = working_stats.working_entries
        stats.episodic_entries = episodic_stats.episodic_entries
        stats.semantic_entries = semantic_stats.semantic_entries
        stats.evictions = working_stats.evictions
        stats.retrieval_count = retrieval_stats.retrieval_count
        stats.average_retrieval_latency = retrieval_stats.average_retrieval_latency
        return stats

    def validate(self) -> MemoryValidationResult:
        self._require_initialized()
        result = MemoryValidationResult()
        validators: list[Any] = [self._working, self._episodic, self._semantic]
        for validator in validators:
            sub = validator.validate()
            if not sub.is_valid:
                result.is_valid = False
            result.duplicate_ids.extend(sub.duplicate_ids)
            result.invalid_timestamps.extend(sub.invalid_timestamps)
            result.broken_relationships.extend(sub.broken_relationships)
            result.warnings.extend(sub.warnings)
            if sub.capacity_overflow:
                result.capacity_overflow = True
        return result

    def reload(self) -> MemoryManager:
        self.logger.info("Reloading MemoryManager")
        with self._lock:
            self._working.reload()
            self._episodic.reload()
            self._semantic.reload()
            self._retrieval.reload()
            self._consolidation.reload()
            self._initialized = False
        self.logger.info("MemoryManager reloaded — re-initialize before use")
        return self

    def compress(self) -> ConsolidationResult:
        """Compress memory by consolidating working entries and deduplicating.
        Delegates to consolidate_all() with an additional compaction hint.
        """
        self._require_initialized()
        with self._lock:
            result = self._consolidation.consolidate()
        return result

    def prune(self, min_importance: float = 0.1, max_age: float = 86400.0) -> int:
        """Remove low-importance or expired entries from working memory.
        Returns count of pruned entries.
        """
        self._require_initialized()
        now = time.time()
        pruned: list[str] = []
        with self._lock:
            for entry in self._backend.list_working():
                if entry.importance < min_importance:
                    pruned.append(entry.id)
                elif now - entry.timestamp > max_age:
                    pruned.append(entry.id)
            for eid in pruned:
                self._backend.delete_working(eid)
        if pruned:
            self.logger.info("Pruned %d entries (min_importance=%.2f, max_age=%.0fs)", len(pruned), min_importance, max_age)
        return len(pruned)

    def snapshot(self, label: str = "") -> dict:
        """Create a point-in-time snapshot of all memory state.
        Returns snapshot metadata.
        """
        self._require_initialized()
        timestamp = datetime.now(UTC).isoformat()
        snapshot_id = f"SNAP-{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        snap_path = self._snapshot_dir / f"{snapshot_id}.json"

        with self._lock:
            data = {
                "snapshotId": snapshot_id,
                "label": label,
                "created": timestamp,
                "memory": {
                    "working": [self._serialize_entry(e) for e in self._backend.list_working()],
                    "episodic": [self._serialize_entry(e) for e in self._backend.list_episodic()],
                    "semantic": [self._serialize_entry(e) for e in self._backend.list_semantic()],
                },
            }

        snap_path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
        self.logger.info("Snapshot %s created (%d entries)", snapshot_id, sum(len(v) for v in data["memory"].values()))
        return {
            "snapshot_id": snapshot_id,
            "label": label,
            "created": timestamp,
            "path": str(snap_path),
            "entry_count": sum(len(v) for v in data["memory"].values()),
        }

    def restore(self, snapshot_id: str) -> bool:
        """Restore memory state from a snapshot.
        Returns True on success.
        """
        self._require_initialized()
        snap_path = self._snapshot_dir / f"{snapshot_id}.json"
        if not snap_path.exists():
            self.logger.error("Snapshot %s not found", snapshot_id)
            return False
        try:
            data = json.loads(snap_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            self.logger.error("Failed to read snapshot %s: %s", snapshot_id, exc)
            return False
        with self._lock:
            self._backend.clear_all()
            for raw in data.get("memory", {}).get("working", []):
                entry = WorkingMemoryEntry(**raw)
                self._backend.store_working(entry)
            episodic_data = data.get("memory", {}).get("episodic", [])
            for raw in episodic_data:
                from aios.memory.models import EpisodicEntry
                self._backend.store_episodic(EpisodicEntry(**raw))
            semantic_data = data.get("memory", {}).get("semantic", [])
            for raw in semantic_data:
                from aios.memory.models import SemanticEntry
                self._backend.store_semantic(SemanticEntry(**raw))
        self.logger.info("Snapshot %s restored successfully (%d entries)", snapshot_id, len(episodic_data) + len(semantic_data) + len(data.get("memory", {}).get("working", [])))
        return True

    def list_snapshots(self) -> list[dict]:
        """List all available snapshots sorted by creation time (newest first)."""
        snapshots: list[dict] = []
        for path in sorted(self._snapshot_dir.glob("SNAP-*.json"), reverse=True):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                snapshots.append({
                    "snapshot_id": data.get("snapshotId", path.stem),
                    "label": data.get("label", ""),
                    "created": data.get("created", ""),
                    "path": str(path),
                    "entry_count": sum(len(v) for v in data.get("memory", {}).values()),
                })
            except (json.JSONDecodeError, OSError):
                continue
        return snapshots

    @staticmethod
    def _serialize_entry(entry: object) -> dict:
        if hasattr(entry, "__dataclass_fields__"):
            return {f.name: getattr(entry, f.name) for f in entry.__dataclass_fields__.values()}
        if isinstance(entry, dict):
            return entry
        return {"id": str(entry)}

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise MemoryError("MemoryManager has not been initialized")
