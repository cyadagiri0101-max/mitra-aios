"""RAG Manager - main facade for the RAG engine."""

from __future__ import annotations

import threading

from aios.core.exceptions import RAGError
from aios.core.logger import get_logger
from aios.rag.chunk_manager import ChunkManager
from aios.rag.citation_engine import CitationEngine
from aios.rag.embedding_manager import EmbeddingManager
from aios.rag.hybrid_search import HybridSearch
from aios.rag.index_manager import IndexManager
from aios.rag.models import (
    ChunkStrategy,
    Citation,
    Document,
    RAGStatistics,
    RAGValidationResult,
    SearchMethod,
    SearchResult,
)
from aios.rag.query_planner import QueryPlanner
from aios.rag.ranker import Ranker
from aios.rag.retriever import Retriever


class RAGManager:
    """Main facade for the RAG engine."""

    def __init__(self, chunk_strategy: ChunkStrategy = ChunkStrategy.SENTENCE) -> None:
        self.logger = get_logger("aios.rag.manager")
        self._lock = threading.Lock()
        self._initialized: bool = False

        # Initialize components
        self._chunk_manager = ChunkManager(strategy=chunk_strategy)
        self._index_manager = IndexManager()
        self._embedding_manager = EmbeddingManager()
        self._retriever = Retriever(embedding_manager=self._embedding_manager)
        self._ranker = Ranker()
        self._query_planner = QueryPlanner()
        self._citation_engine = CitationEngine()
        self._hybrid_search = HybridSearch(retriever=self._retriever)

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def chunk_manager(self) -> ChunkManager:
        return self._chunk_manager

    @property
    def index_manager(self) -> IndexManager:
        return self._index_manager

    @property
    def embedding_manager(self) -> EmbeddingManager:
        return self._embedding_manager

    @property
    def retriever(self) -> Retriever:
        return self._retriever

    @property
    def ranker(self) -> Ranker:
        return self._ranker

    @property
    def query_planner(self) -> QueryPlanner:
        return self._query_planner

    @property
    def citation_engine(self) -> CitationEngine:
        return self._citation_engine

    @property
    def hybrid_search(self) -> HybridSearch:
        return self._hybrid_search

    def initialize(self) -> RAGManager:
        """Initialize the RAG manager and all components."""
        with self._lock:
            if self._initialized:
                return self

            self._chunk_manager.initialize()
            self._index_manager.initialize()
            self._embedding_manager.initialize()
            self._retriever.initialize()
            self._ranker.initialize()
            self._query_planner.initialize()
            self._citation_engine.initialize()
            self._hybrid_search.initialize()

            self._initialized = True
            self.logger.info("RAGManager initialized")

        return self

    def index_document(self, document: Document) -> str:
        """Index a document with full RAG pipeline."""
        self._require_initialized()

        # Index document
        doc_id = self._index_manager.index_document(document)

        # Chunk document
        chunks = self._chunk_manager.chunk_document(document)

        # Embed chunks
        embedded_chunks = []
        for chunk in chunks:
            embedded_chunk = self._embedding_manager.embed_chunk(chunk)
            embedded_chunks.append(embedded_chunk)

        # Add chunks to retriever
        self._retriever.add_chunks(embedded_chunks)

        self.logger.info("Indexed document %s with %d chunks", doc_id, len(chunks))
        return doc_id

    def search(self, query: str, top_k: int = 10, method: SearchMethod = SearchMethod.HYBRID) -> list[SearchResult]:
        """Search for relevant chunks."""
        self._require_initialized()

        # Plan query
        self._query_planner.plan(query, top_k=top_k)

        # Perform search
        if method == SearchMethod.HYBRID:
            results = self._hybrid_search.search(query, top_k=top_k)
        else:
            results = self._retriever.search(query, top_k=top_k, method=method)

        # Rank results
        ranked_results = self._ranker.rank(results, query, top_k=top_k)

        self.logger.info("Search for '%s' returned %d results", query, len(ranked_results))
        return ranked_results

    def search_with_citations(self, query: str, top_k: int = 10) -> tuple[list[SearchResult], list[Citation]]:
        """Search and generate citations."""
        self._require_initialized()

        results = self.search(query, top_k=top_k)
        citations = self._citation_engine.generate_citations(results, max_citations=top_k)

        return results, citations

    def get_statistics(self) -> RAGStatistics:
        """Get RAG statistics."""
        self._require_initialized()

        retriever_stats = self._retriever.statistics()

        return RAGStatistics(
            documents_indexed=self._index_manager.count(),
            chunks_indexed=self._chunk_manager.count(),
            searches_performed=retriever_stats.searches_performed,
            average_search_latency=retriever_stats.average_search_latency,
            cache_hits=retriever_stats.cache_hits,
            cache_misses=retriever_stats.cache_misses,
        )

    def validate(self) -> RAGValidationResult:
        """Validate RAG manager state."""
        self._require_initialized()

        result = RAGValidationResult()

        # Validate all components
        for component in [
            self._chunk_manager,
            self._index_manager,
            self._embedding_manager,
            self._retriever,
            self._ranker,
            self._query_planner,
            self._citation_engine,
            self._hybrid_search,
        ]:
            component_result = component.validate()
            result.warnings.extend(component_result.warnings)
            result.errors.extend(component_result.errors)
            if not component_result.is_valid:
                result.is_valid = False

        return result

    def reload(self) -> RAGManager:
        """Reload RAG manager."""
        self.logger.info("Reloading RAGManager")

        with self._lock:
            self._chunk_manager.reload()
            self._index_manager.reload()
            self._embedding_manager.reload()
            self._retriever.reload()
            self._ranker.reload()
            self._query_planner.reload()
            self._citation_engine.reload()
            self._hybrid_search.reload()

        return self

    def shutdown(self) -> None:
        """Shutdown RAG manager."""
        self.logger.info("Shutting down RAGManager")
        with self._lock:
            self._initialized = False

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise RAGError("RAGManager has not been initialized", component="RAGManager")
