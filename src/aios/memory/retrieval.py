"""Retrieval engine — keyword, filter, similarity, ranking, top-k."""

from __future__ import annotations

import threading
import time
from collections.abc import Sequence

from aios.core.exceptions import MemoryError
from aios.core.logger import get_logger
from aios.memory.embeddings import EmbeddingProvider, MockEmbeddingProvider
from aios.memory.memory_store import MemoryStoreBackend
from aios.memory.models import (
    MemoryStatistics,
    MemoryType,
    RetrievalResult,
    SemanticEntryType,
)


class RetrievalEngine:
    def __init__(
        self,
        backend: MemoryStoreBackend,
        embedding_provider: EmbeddingProvider | None = None,
    ) -> None:
        self.logger = get_logger("aios.memory.retrieval")
        self._backend = backend
        self._embedding_provider = embedding_provider or MockEmbeddingProvider()
        self._retrieval_count: int = 0
        self._latency_sum: float = 0.0
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> RetrievalEngine:
        self._initialized = True
        self.logger.info("RetrievalEngine initialized")
        return self

    def keyword_search(
        self,
        query: str,
        memory_types: Sequence[MemoryType] | None = None,
        limit: int = 20,
    ) -> list[RetrievalResult]:
        self._require_initialized()
        start = time.monotonic()
        types = set(memory_types) if memory_types else set(MemoryType)
        q = query.lower()
        results: list[RetrievalResult] = []

        if MemoryType.WORKING in types:
            for e in self._backend.list_working():
                score = self._keyword_score(q, e.content, e.type)
                if score > 0:
                    results.append(RetrievalResult(entry=e, score=score, source_type=MemoryType.WORKING))

        if MemoryType.EPISODIC in types:
            for e in self._backend.list_episodic():
                score = self._keyword_score(q, e.goal, e.outcome)
                if score > 0:
                    results.append(RetrievalResult(entry=e, score=score, source_type=MemoryType.EPISODIC))

        if MemoryType.SEMANTIC in types:
            for e in self._backend.list_semantic():
                score = self._keyword_score(q, e.content)
                if score > 0:
                    results.append(RetrievalResult(entry=e, score=score, source_type=MemoryType.SEMANTIC))

        results.sort(key=lambda r: r.score, reverse=True)
        self._record_latency(start)
        return results[:limit]

    def similarity_search(
        self,
        query: str,
        memory_types: Sequence[MemoryType] | None = None,
        top_k: int = 10,
    ) -> list[RetrievalResult]:
        self._require_initialized()
        start = time.monotonic()
        query_emb = self._embedding_provider.generate_embedding(query)
        types = set(memory_types) if memory_types else {MemoryType.SEMANTIC}
        results: list[RetrievalResult] = []

        if MemoryType.SEMANTIC in types:
            for e in self._backend.list_semantic():
                emb = self._embedding_provider.generate_embedding(e.content)
                score = self._cosine_similarity(query_emb, emb)
                results.append(RetrievalResult(entry=e, score=score, source_type=MemoryType.SEMANTIC))

        results.sort(key=lambda r: r.score, reverse=True)
        self._record_latency(start)
        return results[:top_k]

    def filter_search(
        self,
        *,
        execution_id: str | None = None,
        entry_type: SemanticEntryType | None = None,
        outcome: str | None = None,
        tags: tuple[str, ...] | None = None,
        min_confidence: float = 0.0,
        limit: int = 20,
    ) -> list[RetrievalResult]:
        self._require_initialized()
        start = time.monotonic()
        results: list[RetrievalResult] = []

        for e in self._backend.list_episodic():
            if execution_id is not None and e.execution_id != execution_id:
                continue
            if outcome is not None and e.outcome != outcome:
                continue
            results.append(RetrievalResult(entry=e, score=1.0, source_type=MemoryType.EPISODIC))

        for e in self._backend.list_semantic():
            if entry_type is not None and e.entry_type != entry_type:
                continue
            if tags and not any(t in e.tags for t in tags):
                continue
            if e.confidence < min_confidence:
                continue
            results.append(RetrievalResult(entry=e, score=e.confidence, source_type=MemoryType.SEMANTIC))

        results.sort(key=lambda r: r.score, reverse=True)
        self._record_latency(start)
        return results[:limit]

    def hybrid_search(
        self,
        query: str,
        memory_types: Sequence[MemoryType] | None = None,
        top_k: int = 10,
    ) -> list[RetrievalResult]:
        keyword_results = self.keyword_search(query, memory_types, top_k * 2)
        similarity_results = self.similarity_search(query, memory_types, top_k * 2)
        combined: dict[str, RetrievalResult] = {}
        for r in keyword_results:
            key = self._result_key(r)
            combined[key] = r
        for r in similarity_results:
            key = self._result_key(r)
            if key in combined:
                existing = combined[key]
                combined[key] = RetrievalResult(
                    entry=existing.entry,
                    score=existing.score * 0.5 + r.score * 0.5,
                    source_type=existing.source_type,
                )
            else:
                combined[key] = r
        sorted_results = sorted(combined.values(), key=lambda r: r.score, reverse=True)
        return sorted_results[:top_k]

    def statistics(self) -> MemoryStatistics:
        with self._lock:
            avg_latency = (
                self._latency_sum / self._retrieval_count
                if self._retrieval_count > 0
                else 0.0
            )
            return MemoryStatistics(
                retrieval_count=self._retrieval_count,
                average_retrieval_latency=round(avg_latency, 6),
            )

    def reload(self) -> RetrievalEngine:
        self.logger.info("Reloading RetrievalEngine")
        with self._lock:
            self._retrieval_count = 0
            self._latency_sum = 0.0
        return self

    @staticmethod
    def _keyword_score(query: str, *fields: str) -> float:
        if not query:
            return 0.0
        score = 0.0
        for f in fields:
            count = f.count(query)
            score += count
        if score > 0:
            score = 1.0 + score * 0.1
        return score

    @staticmethod
    def _cosine_similarity(a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(y * y for y in b) ** 0.5
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    @staticmethod
    def _result_key(r: RetrievalResult) -> str:
        return f"{r.source_type.value}:{r.entry.id}"

    def _record_latency(self, start: float) -> None:
        elapsed = time.monotonic() - start
        with self._lock:
            self._retrieval_count += 1
            self._latency_sum += elapsed

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise MemoryError("RetrievalEngine has not been initialized")
