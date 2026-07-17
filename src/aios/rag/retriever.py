"""Retriever for document and chunk retrieval."""

from __future__ import annotations

import math
import threading
import time

from aios.core.exceptions import RAGError
from aios.core.logger import get_logger
from aios.rag.embedding_manager import EmbeddingManager
from aios.rag.models import (
    Chunk,
    RAGStatistics,
    RAGValidationResult,
    SearchMethod,
    SearchResult,
)


class Retriever:
    """Retriever for searching chunks."""

    def __init__(self, embedding_manager: EmbeddingManager) -> None:
        self.logger = get_logger("aios.rag.retriever")
        self._embedding_manager = embedding_manager
        self._chunks: dict[str, Chunk] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._searches: int = 0
        self._total_latency: float = 0.0
        self._cache_hits: int = 0
        self._cache_misses: int = 0

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> Retriever:
        """Initialize the retriever."""
        self._initialized = True
        self.logger.info("Retriever initialized")
        return self

    def add_chunk(self, chunk: Chunk) -> None:
        """Add a chunk to the retriever."""
        self._require_initialized()
        with self._lock:
            self._chunks[chunk.id] = chunk

    def add_chunks(self, chunks: list[Chunk]) -> None:
        """Add multiple chunks to the retriever."""
        self._require_initialized()
        with self._lock:
            for chunk in chunks:
                self._chunks[chunk.id] = chunk

    def search(self, query: str, top_k: int = 10, method: SearchMethod = SearchMethod.VECTOR) -> list[SearchResult]:
        """Search for chunks matching the query."""
        self._require_initialized()
        start_time = time.time()

        # Generate query embedding
        query_embedding = self._embedding_manager.generate_embedding(query)

        # Perform search
        if method == SearchMethod.VECTOR:
            results = self._vector_search(query_embedding, top_k)
        elif method == SearchMethod.BM25:
            results = self._bm25_search(query, top_k)
        elif method == SearchMethod.HYBRID:
            results = self._hybrid_search(query, query_embedding, top_k)
        elif method == SearchMethod.KEYWORD:
            results = self._keyword_search(query, top_k)
        else:
            raise RAGError(f"Unknown search method: {method}", component="Retriever")

        # Update statistics
        latency = time.time() - start_time
        with self._lock:
            self._searches += 1
            self._total_latency += latency

        return results

    def _vector_search(self, query_embedding: tuple[float, ...], top_k: int) -> list[SearchResult]:
        """Perform vector similarity search."""
        scores = []

        with self._lock:
            for chunk in self._chunks.values():
                if not chunk.embedding:
                    continue

                similarity = self._cosine_similarity(query_embedding, chunk.embedding)
                scores.append((chunk, similarity))

        # Sort by similarity score
        scores.sort(key=lambda x: x[1], reverse=True)

        # Create search results
        results = []
        for rank, (chunk, score) in enumerate(scores[:top_k], 1):
            results.append(SearchResult(
                chunk=chunk,
                score=score,
                rank=rank,
                method=SearchMethod.VECTOR,
            ))

        return results

    def _bm25_search(self, query: str, top_k: int) -> list[SearchResult]:
        """Perform BM25 keyword search."""
        query_terms = query.lower().split()
        scores = []

        with self._lock:
            for chunk in self._chunks.values():
                score = self._bm25_score(query_terms, chunk.content)
                if score > 0:
                    scores.append((chunk, score))

        # Sort by BM25 score
        scores.sort(key=lambda x: x[1], reverse=True)

        # Create search results
        results = []
        for rank, (chunk, score) in enumerate(scores[:top_k], 1):
            results.append(SearchResult(
                chunk=chunk,
                score=score,
                rank=rank,
                method=SearchMethod.BM25,
            ))

        return results

    def _hybrid_search(self, query: str, query_embedding: tuple[float, ...], top_k: int) -> list[SearchResult]:
        """Perform hybrid search combining vector and BM25."""
        vector_results = self._vector_search(query_embedding, top_k * 2)
        bm25_results = self._bm25_search(query, top_k * 2)

        # Combine results
        combined_scores: dict[str, tuple[Chunk, float]] = {}

        for result in vector_results:
            combined_scores[result.chunk.id] = (result.chunk, result.score * 0.5)

        for result in bm25_results:
            if result.chunk.id in combined_scores:
                chunk, score = combined_scores[result.chunk.id]
                combined_scores[result.chunk.id] = (chunk, score + result.score * 0.5)
            else:
                combined_scores[result.chunk.id] = (result.chunk, result.score * 0.5)

        # Sort by combined score
        sorted_results = sorted(combined_scores.values(), key=lambda x: x[1], reverse=True)

        # Create search results
        results = []
        for rank, (chunk, score) in enumerate(sorted_results[:top_k], 1):
            results.append(SearchResult(
                chunk=chunk,
                score=score,
                rank=rank,
                method=SearchMethod.HYBRID,
            ))

        return results

    def _keyword_search(self, query: str, top_k: int) -> list[SearchResult]:
        """Perform simple keyword search."""
        query_lower = query.lower()
        scores = []

        with self._lock:
            for chunk in self._chunks.values():
                content_lower = chunk.content.lower()
                # Simple keyword matching
                score = sum(1 for term in query_lower.split() if term in content_lower)
                if score > 0:
                    scores.append((chunk, float(score)))

        # Sort by score
        scores.sort(key=lambda x: x[1], reverse=True)

        # Create search results
        results = []
        for rank, (chunk, score) in enumerate(scores[:top_k], 1):
            results.append(SearchResult(
                chunk=chunk,
                score=score,
                rank=rank,
                method=SearchMethod.KEYWORD,
            ))

        return results

    def _cosine_similarity(self, vec1: tuple[float, ...], vec2: tuple[float, ...]) -> float:
        """Calculate cosine similarity between two vectors."""
        if len(vec1) != len(vec2):
            return 0.0

        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(b * b for b in vec2))

        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0

        return dot_product / (magnitude1 * magnitude2)

    def _bm25_score(self, query_terms: list[str], content: str, k1: float = 1.5, b: float = 0.75) -> float:
        """Calculate BM25 score for a document."""
        content_terms = content.lower().split()
        doc_length = len(content_terms)
        avg_doc_length = 500  # Average document length (simplified)

        score = 0.0
        for term in query_terms:
            term_freq = content_terms.count(term)
            if term_freq == 0:
                continue

            # IDF (simplified)
            doc_freq = sum(1 for chunk in self._chunks.values() if term in chunk.content.lower())
            total_docs = len(self._chunks)
            idf = math.log((total_docs - doc_freq + 0.5) / (doc_freq + 0.5) + 1)

            # BM25 term score
            numerator = term_freq * (k1 + 1)
            denominator = term_freq + k1 * (1 - b + b * doc_length / avg_doc_length)
            score += idf * numerator / denominator

        return score

    def statistics(self) -> RAGStatistics:
        """Get retriever statistics."""
        self._require_initialized()
        with self._lock:
            avg_latency = self._total_latency / self._searches if self._searches > 0 else 0.0
            return RAGStatistics(
                documents_indexed=0,  # Managed by IndexManager
                chunks_indexed=len(self._chunks),
                searches_performed=self._searches,
                average_search_latency=avg_latency,
                cache_hits=self._cache_hits,
                cache_misses=self._cache_misses,
            )

    def validate(self) -> RAGValidationResult:
        """Validate retriever state."""
        result = RAGValidationResult()
        with self._lock:
            if not self._chunks:
                result.warnings.append("No chunks indexed in retriever")
        return result

    def reload(self) -> Retriever:
        """Reload retriever."""
        self.logger.info("Reloading Retriever")
        with self._lock:
            self._chunks.clear()
            self._searches = 0
            self._total_latency = 0.0
            self._cache_hits = 0
            self._cache_misses = 0
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise RAGError("Retriever has not been initialized", component="Retriever")
