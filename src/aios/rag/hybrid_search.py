"""Hybrid search combining multiple search methods."""

from __future__ import annotations

import threading

from aios.core.exceptions import RAGError
from aios.core.logger import get_logger
from aios.rag.models import (
    RAGValidationResult,
    SearchMethod,
    SearchResult,
)
from aios.rag.retriever import Retriever


class HybridSearch:
    """Hybrid search combining vector and keyword search."""

    def __init__(self, retriever: Retriever, vector_weight: float = 0.7, keyword_weight: float = 0.3) -> None:
        self.logger = get_logger("aios.rag.hybrid_search")
        self._retriever = retriever
        self._vector_weight = vector_weight
        self._keyword_weight = keyword_weight
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def vector_weight(self) -> float:
        return self._vector_weight

    @property
    def keyword_weight(self) -> float:
        return self._keyword_weight

    def initialize(self) -> HybridSearch:
        """Initialize the hybrid search."""
        self._initialized = True
        self.logger.info("HybridSearch initialized (vector_weight=%.2f, keyword_weight=%.2f)",
                        self._vector_weight, self._keyword_weight)
        return self

    def search(self, query: str, top_k: int = 10) -> list[SearchResult]:
        """Perform hybrid search."""
        self._require_initialized()

        # Get vector search results
        vector_results = self._retriever.search(query, top_k=top_k * 2, method=SearchMethod.VECTOR)

        # Get keyword search results
        keyword_results = self._retriever.search(query, top_k=top_k * 2, method=SearchMethod.KEYWORD)

        # Combine results
        combined_scores: dict[str, tuple[SearchResult, float]] = {}

        # Add vector results
        for result in vector_results:
            combined_scores[result.chunk.id] = (result, result.score * self._vector_weight)

        # Add keyword results
        for result in keyword_results:
            if result.chunk.id in combined_scores:
                existing_result, existing_score = combined_scores[result.chunk.id]
                combined_scores[result.chunk.id] = (existing_result, existing_score + result.score * self._keyword_weight)
            else:
                combined_scores[result.chunk.id] = (result, result.score * self._keyword_weight)

        # Sort by combined score
        sorted_results = sorted(combined_scores.values(), key=lambda x: x[1], reverse=True)

        # Create final results
        final_results = []
        for rank, (result, score) in enumerate(sorted_results[:top_k], 1):
            final_result = SearchResult(
                chunk=result.chunk,
                score=score,
                rank=rank,
                method=SearchMethod.HYBRID,
            )
            final_results.append(final_result)

        return final_results

    def validate(self) -> RAGValidationResult:
        """Validate hybrid search state."""
        result = RAGValidationResult()

        # Check weights
        total_weight = self._vector_weight + self._keyword_weight
        if abs(total_weight - 1.0) > 0.01:
            result.warnings.append(f"Weights do not sum to 1.0: {total_weight:.2f}")

        return result

    def reload(self) -> HybridSearch:
        """Reload hybrid search."""
        self.logger.info("Reloading HybridSearch")
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise RAGError("HybridSearch has not been initialized", component="HybridSearch")
