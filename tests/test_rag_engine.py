"""Tests for AIOS RAG Engine."""

from __future__ import annotations

import pytest

from aios.core.exceptions import RAGError
from aios.rag.chunk_manager import ChunkManager
from aios.rag.citation_engine import CitationEngine
from aios.rag.embedding_manager import EmbeddingManager
from aios.rag.hybrid_search import HybridSearch
from aios.rag.index_manager import IndexManager
from aios.rag.manager import RAGManager
from aios.rag.models import (
    Chunk,
    ChunkStrategy,
    Citation,
    Document,
    QueryPlan,
    RAGStatistics,
    RAGValidationResult,
    SearchMethod,
    SearchResult,
)
from aios.rag.query_planner import QueryPlanner
from aios.rag.ranker import Ranker
from aios.rag.retriever import Retriever

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class TestModels:
    def test_document_creation(self):
        doc = Document(id="doc1", content="Test content", metadata={"key": "value"})
        assert doc.id == "doc1"
        assert doc.content == "Test content"
        assert doc.metadata == {"key": "value"}
        assert doc.embedding == ()

    def test_chunk_creation(self):
        chunk = Chunk(
            id="chunk1",
            document_id="doc1",
            content="Chunk content",
            start_index=0,
            end_index=100,
            metadata={"key": "value"},
        )
        assert chunk.id == "chunk1"
        assert chunk.document_id == "doc1"
        assert chunk.content == "Chunk content"
        assert chunk.start_index == 0
        assert chunk.end_index == 100

    def test_search_result_creation(self):
        chunk = Chunk(id="chunk1", document_id="doc1", content="Content")
        result = SearchResult(chunk=chunk, score=0.95, rank=1, method=SearchMethod.VECTOR)
        assert result.chunk == chunk
        assert result.score == 0.95
        assert result.rank == 1
        assert result.method == SearchMethod.VECTOR

    def test_citation_creation(self):
        citation = Citation(
            chunk_id="chunk1",
            document_id="doc1",
            content="Cited content",
            score=0.9,
            position=1,
        )
        assert citation.chunk_id == "chunk1"
        assert citation.document_id == "doc1"
        assert citation.content == "Cited content"
        assert citation.score == 0.9
        assert citation.position == 1

    def test_query_plan_creation(self):
        plan = QueryPlan(
            original_query="test query",
            optimized_query="optimized query",
            search_method=SearchMethod.HYBRID,
            filters={"category": "tech"},
            top_k=10,
        )
        assert plan.original_query == "test query"
        assert plan.optimized_query == "optimized query"
        assert plan.search_method == SearchMethod.HYBRID
        assert plan.filters == {"category": "tech"}
        assert plan.top_k == 10

    def test_rag_statistics_creation(self):
        stats = RAGStatistics(
            documents_indexed=10,
            chunks_indexed=100,
            searches_performed=50,
            average_search_latency=0.1,
            cache_hits=30,
            cache_misses=20,
        )
        assert stats.documents_indexed == 10
        assert stats.chunks_indexed == 100
        assert stats.searches_performed == 50
        assert stats.average_search_latency == 0.1
        assert stats.cache_hits == 30
        assert stats.cache_misses == 20

    def test_rag_validation_result_creation(self):
        result = RAGValidationResult(
            is_valid=False,
            warnings=["Warning 1"],
            errors=["Error 1"],
        )
        assert result.is_valid is False
        assert result.warnings == ["Warning 1"]
        assert result.errors == ["Error 1"]

    def test_chunk_strategy_enum(self):
        assert ChunkStrategy.FIXED_SIZE.value == "fixed_size"
        assert ChunkStrategy.SENTENCE.value == "sentence"
        assert ChunkStrategy.PARAGRAPH.value == "paragraph"
        assert ChunkStrategy.SEMANTIC.value == "semantic"

    def test_search_method_enum(self):
        assert SearchMethod.VECTOR.value == "vector"
        assert SearchMethod.BM25.value == "bm25"
        assert SearchMethod.HYBRID.value == "hybrid"
        assert SearchMethod.KEYWORD.value == "keyword"


# ---------------------------------------------------------------------------
# ChunkManager
# ---------------------------------------------------------------------------


class TestChunkManager:
    def test_initialize(self):
        manager = ChunkManager()
        assert manager.is_initialized is False
        manager.initialize()
        assert manager.is_initialized is True

    def test_chunk_fixed_size(self):
        manager = ChunkManager(strategy=ChunkStrategy.FIXED_SIZE).initialize()
        doc = Document(id="doc1", content="This is a test document with some content.")
        chunks = manager.chunk_document(doc, chunk_size=20, overlap=5)
        assert len(chunks) > 0
        assert all(chunk.document_id == "doc1" for chunk in chunks)

    def test_chunk_by_sentence(self):
        manager = ChunkManager(strategy=ChunkStrategy.SENTENCE).initialize()
        doc = Document(id="doc1", content="First sentence. Second sentence. Third sentence.")
        chunks = manager.chunk_document(doc, chunk_size=50, overlap=10)
        assert len(chunks) > 0
        assert all(chunk.document_id == "doc1" for chunk in chunks)

    def test_chunk_by_paragraph(self):
        manager = ChunkManager(strategy=ChunkStrategy.PARAGRAPH).initialize()
        doc = Document(id="doc1", content="First paragraph.\n\nSecond paragraph.\n\nThird paragraph.")
        chunks = manager.chunk_document(doc)
        assert len(chunks) == 3
        assert all(chunk.document_id == "doc1" for chunk in chunks)

    def test_get_chunk(self):
        manager = ChunkManager().initialize()
        doc = Document(id="doc1", content="Test content")
        chunks = manager.chunk_document(doc)
        if chunks:
            retrieved = manager.get_chunk(chunks[0].id)
            assert retrieved is not None
            assert retrieved.id == chunks[0].id

    def test_list_chunks(self):
        manager = ChunkManager().initialize()
        doc1 = Document(id="doc1", content="Content 1")
        doc2 = Document(id="doc2", content="Content 2")
        manager.chunk_document(doc1)
        manager.chunk_document(doc2)
        all_chunks = manager.list_chunks()
        assert len(all_chunks) > 0
        doc1_chunks = manager.list_chunks(document_id="doc1")
        assert all(chunk.document_id == "doc1" for chunk in doc1_chunks)

    def test_delete_chunk(self):
        manager = ChunkManager().initialize()
        doc = Document(id="doc1", content="Test content")
        chunks = manager.chunk_document(doc)
        if chunks:
            assert manager.delete_chunk(chunks[0].id) is True
            assert manager.get_chunk(chunks[0].id) is None

    def test_delete_chunks_by_document(self):
        manager = ChunkManager().initialize()
        doc = Document(id="doc1", content="Test content")
        manager.chunk_document(doc)
        count = manager.delete_chunks_by_document("doc1")
        assert count > 0
        assert manager.count(document_id="doc1") == 0

    def test_count(self):
        manager = ChunkManager().initialize()
        doc = Document(id="doc1", content="Test content")
        manager.chunk_document(doc)
        assert manager.count() > 0
        assert manager.count(document_id="doc1") > 0

    def test_validate(self):
        manager = ChunkManager().initialize()
        result = manager.validate()
        assert isinstance(result, RAGValidationResult)

    def test_reload(self):
        manager = ChunkManager().initialize()
        doc = Document(id="doc1", content="Test content")
        manager.chunk_document(doc)
        manager.reload()
        assert manager.count() == 0

    def test_uninitialized_raises(self):
        manager = ChunkManager()
        with pytest.raises(RAGError):
            manager.chunk_document(Document(id="doc1", content="Test"))


# ---------------------------------------------------------------------------
# IndexManager
# ---------------------------------------------------------------------------


class TestIndexManager:
    def test_initialize(self):
        manager = IndexManager()
        assert manager.is_initialized is False
        manager.initialize()
        assert manager.is_initialized is True

    def test_index_document(self):
        manager = IndexManager().initialize()
        doc = Document(id="doc1", content="Test content")
        doc_id = manager.index_document(doc)
        assert doc_id == "doc1"

    def test_index_document_auto_id(self):
        manager = IndexManager().initialize()
        doc = Document(content="Test content")
        doc_id = manager.index_document(doc)
        assert doc_id != ""
        assert manager.get_document(doc_id) is not None

    def test_get_document(self):
        manager = IndexManager().initialize()
        doc = Document(id="doc1", content="Test content")
        manager.index_document(doc)
        retrieved = manager.get_document("doc1")
        assert retrieved is not None
        assert retrieved.id == "doc1"

    def test_list_documents(self):
        manager = IndexManager().initialize()
        manager.index_document(Document(id="doc1", content="Content 1"))
        manager.index_document(Document(id="doc2", content="Content 2"))
        docs = manager.list_documents()
        assert len(docs) == 2

    def test_delete_document(self):
        manager = IndexManager().initialize()
        manager.index_document(Document(id="doc1", content="Test"))
        assert manager.delete_document("doc1") is True
        assert manager.get_document("doc1") is None

    def test_count(self):
        manager = IndexManager().initialize()
        manager.index_document(Document(id="doc1", content="Test"))
        assert manager.count() == 1

    def test_validate(self):
        manager = IndexManager().initialize()
        result = manager.validate()
        assert isinstance(result, RAGValidationResult)

    def test_reload(self):
        manager = IndexManager().initialize()
        manager.index_document(Document(id="doc1", content="Test"))
        manager.reload()
        assert manager.count() == 0

    def test_uninitialized_raises(self):
        manager = IndexManager()
        with pytest.raises(RAGError):
            manager.index_document(Document(id="doc1", content="Test"))


# ---------------------------------------------------------------------------
# EmbeddingManager
# ---------------------------------------------------------------------------


class TestEmbeddingManager:
    def test_initialize(self):
        manager = EmbeddingManager()
        assert manager.is_initialized is False
        manager.initialize()
        assert manager.is_initialized is True

    def test_generate_embedding(self):
        manager = EmbeddingManager(dimension=384).initialize()
        embedding = manager.generate_embedding("Test text")
        assert len(embedding) == 384
        assert all(isinstance(x, float) for x in embedding)

    def test_embed_document(self):
        manager = EmbeddingManager().initialize()
        doc = Document(id="doc1", content="Test content")
        embedded_doc = manager.embed_document(doc)
        assert embedded_doc.id == "doc1"
        assert len(embedded_doc.embedding) > 0

    def test_embed_chunk(self):
        manager = EmbeddingManager().initialize()
        chunk = Chunk(id="chunk1", document_id="doc1", content="Test content")
        embedded_chunk = manager.embed_chunk(chunk)
        assert embedded_chunk.id == "chunk1"
        assert len(embedded_chunk.embedding) > 0

    def test_get_embedding(self):
        manager = EmbeddingManager().initialize()
        doc = Document(id="doc1", content="Test content")
        manager.embed_document(doc)
        embedding = manager.get_embedding("doc1")
        assert embedding is not None
        assert len(embedding) > 0

    def test_delete_embedding(self):
        manager = EmbeddingManager().initialize()
        doc = Document(id="doc1", content="Test content")
        manager.embed_document(doc)
        assert manager.delete_embedding("doc1") is True
        assert manager.get_embedding("doc1") is None

    def test_count(self):
        manager = EmbeddingManager().initialize()
        manager.embed_document(Document(id="doc1", content="Test"))
        assert manager.count() == 1

    def test_validate(self):
        manager = EmbeddingManager().initialize()
        result = manager.validate()
        assert isinstance(result, RAGValidationResult)

    def test_reload(self):
        manager = EmbeddingManager().initialize()
        manager.embed_document(Document(id="doc1", content="Test"))
        manager.reload()
        assert manager.count() == 0

    def test_uninitialized_raises(self):
        manager = EmbeddingManager()
        with pytest.raises(RAGError):
            manager.generate_embedding("Test")


# ---------------------------------------------------------------------------
# Retriever
# ---------------------------------------------------------------------------


class TestRetriever:
    def test_initialize(self):
        embedding_manager = EmbeddingManager().initialize()
        retriever = Retriever(embedding_manager=embedding_manager)
        assert retriever.is_initialized is False
        retriever.initialize()
        assert retriever.is_initialized is True

    def test_add_chunk(self):
        embedding_manager = EmbeddingManager().initialize()
        retriever = Retriever(embedding_manager=embedding_manager).initialize()
        chunk = Chunk(id="chunk1", document_id="doc1", content="Test content")
        embedded_chunk = embedding_manager.embed_chunk(chunk)
        retriever.add_chunk(embedded_chunk)
        # No exception means success

    def test_search_vector(self):
        embedding_manager = EmbeddingManager().initialize()
        retriever = Retriever(embedding_manager=embedding_manager).initialize()

        # Add some chunks
        for i in range(5):
            chunk = Chunk(id=f"chunk{i}", document_id="doc1", content=f"Test content {i}")
            embedded_chunk = embedding_manager.embed_chunk(chunk)
            retriever.add_chunk(embedded_chunk)

        results = retriever.search("test", top_k=3, method=SearchMethod.VECTOR)
        assert len(results) <= 3
        assert all(isinstance(r, SearchResult) for r in results)

    def test_search_keyword(self):
        embedding_manager = EmbeddingManager().initialize()
        retriever = Retriever(embedding_manager=embedding_manager).initialize()

        chunk = Chunk(id="chunk1", document_id="doc1", content="Python programming language")
        embedded_chunk = embedding_manager.embed_chunk(chunk)
        retriever.add_chunk(embedded_chunk)

        results = retriever.search("Python", top_k=1, method=SearchMethod.KEYWORD)
        assert len(results) > 0

    def test_statistics(self):
        embedding_manager = EmbeddingManager().initialize()
        retriever = Retriever(embedding_manager=embedding_manager).initialize()
        stats = retriever.statistics()
        assert isinstance(stats, RAGStatistics)

    def test_validate(self):
        embedding_manager = EmbeddingManager().initialize()
        retriever = Retriever(embedding_manager=embedding_manager).initialize()
        result = retriever.validate()
        assert isinstance(result, RAGValidationResult)

    def test_reload(self):
        embedding_manager = EmbeddingManager().initialize()
        retriever = Retriever(embedding_manager=embedding_manager).initialize()
        chunk = Chunk(id="chunk1", document_id="doc1", content="Test")
        embedded_chunk = embedding_manager.embed_chunk(chunk)
        retriever.add_chunk(embedded_chunk)
        retriever.reload()
        stats = retriever.statistics()
        assert stats.chunks_indexed == 0

    def test_uninitialized_raises(self):
        embedding_manager = EmbeddingManager().initialize()
        retriever = Retriever(embedding_manager=embedding_manager)
        with pytest.raises(RAGError):
            retriever.search("test")


# ---------------------------------------------------------------------------
# Ranker
# ---------------------------------------------------------------------------


class TestRanker:
    def test_initialize(self):
        ranker = Ranker()
        assert ranker.is_initialized is False
        ranker.initialize()
        assert ranker.is_initialized is True

    def test_rank(self):
        ranker = Ranker().initialize()
        chunk1 = Chunk(id="chunk1", document_id="doc1", content="Python programming")
        chunk2 = Chunk(id="chunk2", document_id="doc1", content="Java programming")
        results = [
            SearchResult(chunk=chunk1, score=0.9, rank=1, method=SearchMethod.VECTOR),
            SearchResult(chunk=chunk2, score=0.8, rank=2, method=SearchMethod.VECTOR),
        ]
        ranked = ranker.rank(results, query="Python", top_k=2)
        assert len(ranked) == 2
        assert all(isinstance(r, SearchResult) for r in ranked)

    def test_validate(self):
        ranker = Ranker().initialize()
        result = ranker.validate()
        assert isinstance(result, RAGValidationResult)

    def test_reload(self):
        ranker = Ranker().initialize()
        ranker.reload()
        assert ranker.is_initialized is True

    def test_uninitialized_raises(self):
        ranker = Ranker()
        with pytest.raises(RAGError):
            ranker.rank([], "test")


# ---------------------------------------------------------------------------
# QueryPlanner
# ---------------------------------------------------------------------------


class TestQueryPlanner:
    def test_initialize(self):
        planner = QueryPlanner()
        assert planner.is_initialized is False
        planner.initialize()
        assert planner.is_initialized is True

    def test_plan(self):
        planner = QueryPlanner().initialize()
        plan = planner.plan("test query", top_k=10)
        assert isinstance(plan, QueryPlan)
        assert plan.original_query == "test query"
        assert plan.top_k == 10

    def test_validate(self):
        planner = QueryPlanner().initialize()
        result = planner.validate()
        assert isinstance(result, RAGValidationResult)

    def test_reload(self):
        planner = QueryPlanner().initialize()
        planner.reload()
        assert planner.is_initialized is True

    def test_uninitialized_raises(self):
        planner = QueryPlanner()
        with pytest.raises(RAGError):
            planner.plan("test")


# ---------------------------------------------------------------------------
# CitationEngine
# ---------------------------------------------------------------------------


class TestCitationEngine:
    def test_initialize(self):
        engine = CitationEngine()
        assert engine.is_initialized is False
        engine.initialize()
        assert engine.is_initialized is True

    def test_generate_citations(self):
        engine = CitationEngine().initialize()
        chunk = Chunk(id="chunk1", document_id="doc1", content="Test content")
        results = [SearchResult(chunk=chunk, score=0.9, rank=1, method=SearchMethod.VECTOR)]
        citations = engine.generate_citations(results, max_citations=5)
        assert len(citations) == 1
        assert isinstance(citations[0], Citation)

    def test_format_citations_numeric(self):
        engine = CitationEngine().initialize()
        citations = [
            Citation(chunk_id="chunk1", document_id="doc1", content="Content", score=0.9, position=1),
        ]
        formatted = engine.format_citations(citations, style="numeric")
        assert "[1]" in formatted
        assert "doc1" in formatted

    def test_format_citations_inline(self):
        engine = CitationEngine().initialize()
        citations = [
            Citation(chunk_id="chunk1", document_id="doc1", content="Content", score=0.9, position=1),
        ]
        formatted = engine.format_citations(citations, style="inline")
        assert "[1]" in formatted

    def test_validate(self):
        engine = CitationEngine().initialize()
        result = engine.validate()
        assert isinstance(result, RAGValidationResult)

    def test_reload(self):
        engine = CitationEngine().initialize()
        engine.reload()
        assert engine.is_initialized is True

    def test_uninitialized_raises(self):
        engine = CitationEngine()
        with pytest.raises(RAGError):
            engine.generate_citations([])


# ---------------------------------------------------------------------------
# HybridSearch
# ---------------------------------------------------------------------------


class TestHybridSearch:
    def test_initialize(self):
        embedding_manager = EmbeddingManager().initialize()
        retriever = Retriever(embedding_manager=embedding_manager).initialize()
        hybrid = HybridSearch(retriever=retriever)
        assert hybrid.is_initialized is False
        hybrid.initialize()
        assert hybrid.is_initialized is True

    def test_search(self):
        embedding_manager = EmbeddingManager().initialize()
        retriever = Retriever(embedding_manager=embedding_manager).initialize()
        hybrid = HybridSearch(retriever=retriever).initialize()

        # Add some chunks
        for i in range(5):
            chunk = Chunk(id=f"chunk{i}", document_id="doc1", content=f"Test content {i}")
            embedded_chunk = embedding_manager.embed_chunk(chunk)
            retriever.add_chunk(embedded_chunk)

        results = hybrid.search("test", top_k=3)
        assert len(results) <= 3
        assert all(isinstance(r, SearchResult) for r in results)

    def test_validate(self):
        embedding_manager = EmbeddingManager().initialize()
        retriever = Retriever(embedding_manager=embedding_manager).initialize()
        hybrid = HybridSearch(retriever=retriever).initialize()
        result = hybrid.validate()
        assert isinstance(result, RAGValidationResult)

    def test_reload(self):
        embedding_manager = EmbeddingManager().initialize()
        retriever = Retriever(embedding_manager=embedding_manager).initialize()
        hybrid = HybridSearch(retriever=retriever).initialize()
        hybrid.reload()
        assert hybrid.is_initialized is True

    def test_uninitialized_raises(self):
        embedding_manager = EmbeddingManager().initialize()
        retriever = Retriever(embedding_manager=embedding_manager).initialize()
        hybrid = HybridSearch(retriever=retriever)
        with pytest.raises(RAGError):
            hybrid.search("test")


# ---------------------------------------------------------------------------
# RAGManager
# ---------------------------------------------------------------------------


class TestRAGManager:
    def test_initialize(self):
        manager = RAGManager()
        assert manager.is_initialized is False
        manager.initialize()
        assert manager.is_initialized is True

    def test_double_initialize(self):
        manager = RAGManager().initialize()
        manager.initialize()
        assert manager.is_initialized is True

    def test_index_document(self):
        manager = RAGManager().initialize()
        doc = Document(id="doc1", content="This is a test document with some content.")
        doc_id = manager.index_document(doc)
        assert doc_id == "doc1"
        stats = manager.get_statistics()
        assert stats.documents_indexed == 1
        assert stats.chunks_indexed > 0

    def test_search(self):
        manager = RAGManager().initialize()
        doc = Document(id="doc1", content="Python is a programming language.")
        manager.index_document(doc)
        results = manager.search("Python", top_k=5)
        assert len(results) > 0
        assert all(isinstance(r, SearchResult) for r in results)

    def test_search_with_citations(self):
        manager = RAGManager().initialize()
        doc = Document(id="doc1", content="Python is a programming language.")
        manager.index_document(doc)
        results, citations = manager.search_with_citations("Python", top_k=5)
        assert len(results) > 0
        assert len(citations) > 0
        assert all(isinstance(c, Citation) for c in citations)

    def test_get_statistics(self):
        manager = RAGManager().initialize()
        stats = manager.get_statistics()
        assert isinstance(stats, RAGStatistics)

    def test_validate(self):
        manager = RAGManager().initialize()
        result = manager.validate()
        assert isinstance(result, RAGValidationResult)

    def test_reload(self):
        manager = RAGManager().initialize()
        doc = Document(id="doc1", content="Test content")
        manager.index_document(doc)
        manager.reload()
        stats = manager.get_statistics()
        assert stats.documents_indexed == 0
        assert stats.chunks_indexed == 0

    def test_shutdown(self):
        manager = RAGManager().initialize()
        manager.shutdown()
        assert manager.is_initialized is False

    def test_uninitialized_raises(self):
        manager = RAGManager()
        with pytest.raises(RAGError):
            manager.index_document(Document(id="doc1", content="Test"))

    def test_components_accessible(self):
        manager = RAGManager().initialize()
        assert manager.chunk_manager is not None
        assert manager.index_manager is not None
        assert manager.embedding_manager is not None
        assert manager.retriever is not None
        assert manager.ranker is not None
        assert manager.query_planner is not None
        assert manager.citation_engine is not None
        assert manager.hybrid_search is not None


# ---------------------------------------------------------------------------
# Integration
# ---------------------------------------------------------------------------


class TestIntegration:
    def test_full_rag_pipeline(self):
        manager = RAGManager(chunk_strategy=ChunkStrategy.SENTENCE).initialize()

        # Index multiple documents
        docs = [
            Document(id="doc1", content="Python is a high-level programming language."),
            Document(id="doc2", content="Java is another popular programming language."),
            Document(id="doc3", content="Machine learning uses Python extensively."),
        ]

        for doc in docs:
            manager.index_document(doc)

        # Search
        results = manager.search("Python programming", top_k=5)
        assert len(results) > 0

        # Search with citations
        results, citations = manager.search_with_citations("Python", top_k=3)
        assert len(results) > 0
        assert len(citations) > 0

        # Check statistics
        stats = manager.get_statistics()
        assert stats.documents_indexed == 3
        assert stats.chunks_indexed > 0
        assert stats.searches_performed > 0

        # Validate
        validation = manager.validate()
        assert validation.is_valid is True
