"""Ranker for search result ranking."""

from __future__ import annotations

import threading

from aios.core.exceptions import RAGError
from aios.core.logger import get_logger
from aios.rag.models import (
    RAGValidationResult,
    SearchResult,
)


class Ranker:
    """Ranker for re-ranking search results."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.rag.ranker")
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> Ranker:
        """Initialize the ranker."""
        self._initialized = True
        self.logger.info("Ranker initialized")
        return self

    def rank(self, results: list[SearchResult], query: str, top_k: int = 10) -> list[SearchResult]:
        """Re-rank search results based on query relevance."""
        self._require_initialized()

        if not results:
            return []

        # Calculate relevance scores
        scored_results = []
        for result in results:
            relevance_score = self._calculate_relevance(query, result.chunk.content)
            combined_score = result.score * 0.7 + relevance_score * 0.3
            scored_results.append((result, combined_score))

        # Sort by combined score
        scored_results.sort(key=lambda x: x[1], reverse=True)

        # Create re-ranked results
        ranked_results = []
        for rank, (result, score) in enumerate(scored_results[:top_k], 1):
            ranked_result = SearchResult(
                chunk=result.chunk,
                score=score,
                rank=rank,
                method=result.method,
            )
            ranked_results.append(ranked_result)

        return ranked_results

    def _calculate_relevance(self, query: str, content: str) -> float:
        """Calculate relevance score between query and content."""
        query_terms = set(query.lower().split())
        content_terms = set(content.lower().split())

        if not query_terms or not content_terms:
            return 0.0

        # Jaccard similarity
        intersection = query_terms & content_terms
        union = query_terms | content_terms

        return len(intersection) / len(union) if union else 0.0

    def validate(self) -> RAGValidationResult:
        """Validate ranker state."""
        return RAGValidationResult()

    def reload(self) -> Ranker:
        """Reload ranker."""
        self.logger.info("Reloading Ranker")
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise RAGError("Ranker has not been initialized", component="Ranker")
