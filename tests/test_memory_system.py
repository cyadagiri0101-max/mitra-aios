"""Tests for AIOS Memory System."""

from __future__ import annotations

import threading
import time

import pytest

from aios.core.exceptions import MemoryError
from aios.memory.consolidation import ConsolidationEngine
from aios.memory.embeddings import EmbeddingProvider, MockEmbeddingProvider
from aios.memory.episodic_memory import EpisodicMemory
from aios.memory.memory_manager import MemoryManager
from aios.memory.memory_store import InMemoryBackend
from aios.memory.models import (
    ConsolidationResult,
    EpisodicEntry,
    MemoryStatistics,
    MemoryType,
    MemoryValidationResult,
    RetrievalResult,
    SemanticEntry,
    SemanticEntryType,
    WorkingMemoryEntry,
)
from aios.memory.retrieval import RetrievalEngine
from aios.memory.semantic_memory import SemanticMemory
from aios.memory.working_memory import WorkingMemory

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_backend() -> InMemoryBackend:
    return InMemoryBackend()


# ---------------------------------------------------------------------------
# EmbeddingProvider / MockEmbeddingProvider
# ---------------------------------------------------------------------------

class TestEmbeddingProvider:
    def test_mock_provider_generates_embedding(self):
        provider = MockEmbeddingProvider(dimension=128)
        emb = provider.generate_embedding("hello world")
        assert len(emb) == 128
        assert all(isinstance(v, float) for v in emb)

    def test_mock_provider_is_deterministic(self):
        provider = MockEmbeddingProvider(dimension=64)
        emb1 = provider.generate_embedding("same text")
        emb2 = provider.generate_embedding("same text")
        assert emb1 == emb2

    def test_mock_provider_different_text_different_embedding(self):
        provider = MockEmbeddingProvider(dimension=64)
        emb1 = provider.generate_embedding("hello")
        emb2 = provider.generate_embedding("world")
        assert emb1 != emb2

    def test_mock_provider_dimension(self):
        provider = MockEmbeddingProvider(dimension=256)
        assert provider.dimension() == 256

    def test_mock_provider_name(self):
        provider = MockEmbeddingProvider()
        assert provider.provider_name == "mock"

    def test_mock_provider_default_dimension(self):
        provider = MockEmbeddingProvider()
        assert provider.dimension() == 128

    def test_mock_provider_empty_string(self):
        provider = MockEmbeddingProvider(dimension=8)
        emb = provider.generate_embedding("")
        assert len(emb) == 8

    def test_embedding_provider_is_abstract(self):
        with pytest.raises(TypeError):
            EmbeddingProvider()  # type: ignore[abstract]


# ---------------------------------------------------------------------------
# InMemoryBackend
# ---------------------------------------------------------------------------

class TestInMemoryBackend:
    def test_store_and_get_working(self):
        backend = _make_backend()
        entry = WorkingMemoryEntry(content="test")
        backend.store_working(entry)
        assert backend.get_working(entry.id) == entry

    def test_store_and_get_episodic(self):
        backend = _make_backend()
        entry = EpisodicEntry(execution_id="e1")
        backend.store_episodic(entry)
        assert backend.get_episodic(entry.id) == entry

    def test_store_and_get_semantic(self):
        backend = _make_backend()
        entry = SemanticEntry(content="fact")
        backend.store_semantic(entry)
        assert backend.get_semantic(entry.id) == entry

    def test_delete_working_returns_true(self):
        backend = _make_backend()
        entry = WorkingMemoryEntry(content="x")
        backend.store_working(entry)
        assert backend.delete_working(entry.id) is True

    def test_delete_working_returns_false(self):
        backend = _make_backend()
        assert backend.delete_working("nonexistent") is False

    def test_list_working(self):
        backend = _make_backend()
        e1 = WorkingMemoryEntry(content="a")
        e2 = WorkingMemoryEntry(content="b")
        backend.store_working(e1)
        backend.store_working(e2)
        assert len(backend.list_working()) == 2

    def test_clear_working(self):
        backend = _make_backend()
        backend.store_working(WorkingMemoryEntry(content="x"))
        backend.clear_working()
        assert backend.count_working() == 0

    def test_clear_all(self):
        backend = _make_backend()
        backend.store_working(WorkingMemoryEntry(content="w"))
        backend.store_episodic(EpisodicEntry(execution_id="e"))
        backend.store_semantic(SemanticEntry(content="s"))
        backend.clear_all()
        assert backend.count_working() == 0
        assert backend.count_episodic() == 0
        assert backend.count_semantic() == 0

    def test_stats(self):
        backend = _make_backend()
        backend.store_working(WorkingMemoryEntry(content="w"))
        backend.store_episodic(EpisodicEntry(execution_id="e"))
        stats = backend.stats()
        assert stats["working_count"] == 1
        assert stats["episodic_count"] == 1
        assert stats["semantic_count"] == 0
        assert stats["total_entries"] == 2

    def test_thread_safe_concurrent_store(self):
        backend = _make_backend()
        n = 50
        barrier = threading.Barrier(n)

        def store_worker():
            barrier.wait()
            backend.store_working(WorkingMemoryEntry(content="x"))

        threads = [threading.Thread(target=store_worker) for _ in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert backend.count_working() == n


# ---------------------------------------------------------------------------
# WorkingMemory
# ---------------------------------------------------------------------------

class TestWorkingMemory:
    def test_add_entry(self):
        wm = WorkingMemory(_make_backend()).initialize()
        entry = wm.add("hello", execution_id="e1")
        assert entry.content == "hello"
        assert entry.execution_id == "e1"
        assert entry.id

    def test_add_assigns_defaults(self):
        wm = WorkingMemory(_make_backend()).initialize()
        entry = wm.add("test")
        assert isinstance(entry.importance, float)
        assert entry.metadata == {}

    def test_get_entry(self):
        wm = WorkingMemory(_make_backend()).initialize()
        added = wm.add("data")
        got = wm.get(added.id)
        assert got == added

    def test_get_nonexistent(self):
        wm = WorkingMemory(_make_backend()).initialize()
        assert wm.get("missing") is None

    def test_delete_entry(self):
        wm = WorkingMemory(_make_backend()).initialize()
        added = wm.add("delete me")
        assert wm.delete(added.id) is True
        assert wm.get(added.id) is None

    def test_delete_missing(self):
        wm = WorkingMemory(_make_backend()).initialize()
        assert wm.delete("missing") is False

    def test_count(self):
        wm = WorkingMemory(_make_backend()).initialize()
        wm.add("a")
        wm.add("b")
        assert wm.count() == 2

    def test_list(self):
        wm = WorkingMemory(_make_backend()).initialize()
        wm.add("a")
        wm.add("b")
        assert len(wm.list()) == 2

    def test_clear(self):
        wm = WorkingMemory(_make_backend()).initialize()
        wm.add("a")
        wm.clear()
        assert wm.count() == 0

    def test_capacity_eviction(self):
        wm = WorkingMemory(_make_backend(), capacity=2).initialize()
        wm.add("first")
        wm.add("second")
        wm.add("third")
        assert wm.count() <= 2

    def test_eviction_hook_called(self):
        wm = WorkingMemory(_make_backend(), capacity=1).initialize()
        evicted: list[WorkingMemoryEntry] = []
        wm.on_eviction(lambda e: evicted.append(e))
        wm.add("first")
        wm.add("second")
        assert len(evicted) == 1
        assert evicted[0].content == "first"

    def test_search_by_content(self):
        wm = WorkingMemory(_make_backend()).initialize()
        wm.add("apple pie")
        wm.add("banana split")
        results = wm.search("apple")
        assert len(results) == 1
        assert results[0].content == "apple pie"

    def test_search_by_type(self):
        wm = WorkingMemory(_make_backend()).initialize()
        wm.add("data", type="alert")
        results = wm.search("alert")
        assert len(results) == 1

    def test_search_no_match(self):
        wm = WorkingMemory(_make_backend()).initialize()
        wm.add("hello")
        assert wm.search("zzz") == []

    def test_search_by_execution(self):
        wm = WorkingMemory(_make_backend()).initialize()
        wm.add("a", execution_id="e1")
        wm.add("b", execution_id="e1")
        wm.add("c", execution_id="e2")
        assert len(wm.search_by_execution("e1")) == 2
        assert len(wm.search_by_execution("e2")) == 1

    def test_statistics(self):
        wm = WorkingMemory(_make_backend()).initialize()
        wm.add("a")
        wm.add("b")
        stats = wm.statistics()
        assert stats.working_entries == 2
        assert stats.evictions == 0

    def test_validate_clean(self):
        wm = WorkingMemory(_make_backend()).initialize()
        wm.add("a")
        result = wm.validate()
        assert result.is_valid is True

    def test_validate_capacity_overflow(self):
        wm = WorkingMemory(_make_backend(), capacity=1).initialize()
        wm._backend.store_working(WorkingMemoryEntry(content="a"))
        wm._backend.store_working(WorkingMemoryEntry(content="b"))
        result = wm.validate()
        assert result.capacity_overflow is True
        assert result.is_valid is False

    def test_validate_invalid_timestamp(self):
        wm = WorkingMemory(_make_backend()).initialize()
        wm._backend.store_working(WorkingMemoryEntry(content="bad", timestamp=-1))
        result = wm.validate()
        assert result.is_valid is False
        assert len(result.invalid_timestamps) > 0

    def test_reload_clears(self):
        wm = WorkingMemory(_make_backend()).initialize()
        wm.add("a")
        wm.reload()
        assert wm.count() == 0
        assert wm.statistics().evictions == 0

    def test_uninitialized_raises(self):
        wm = WorkingMemory(_make_backend())
        with pytest.raises(MemoryError):
            wm.add("x")

    def test_importance_clamped(self):
        wm = WorkingMemory(_make_backend()).initialize()
        e1 = wm.add("x", importance=-0.5)
        e2 = wm.add("y", importance=1.5)
        assert e1.importance == 0.0
        assert e2.importance == 1.0

    def test_thread_safe_add(self):
        wm = WorkingMemory(_make_backend()).initialize()
        n = 30
        barrier = threading.Barrier(n)

        def worker():
            barrier.wait()
            wm.add("t")

        threads = [threading.Thread(target=worker) for _ in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert wm.count() == n


# ---------------------------------------------------------------------------
# EpisodicMemory
# ---------------------------------------------------------------------------

class TestEpisodicMemory:
    def test_add_entry(self):
        em = EpisodicMemory(_make_backend()).initialize()
        entry = em.add("e1", goal="test goal")
        assert entry.execution_id == "e1"
        assert entry.goal == "test goal"
        assert entry.id

    def test_get_entry(self):
        em = EpisodicMemory(_make_backend()).initialize()
        added = em.add("e1")
        assert em.get(added.id) == added

    def test_get_nonexistent(self):
        em = EpisodicMemory(_make_backend()).initialize()
        assert em.get("missing") is None

    def test_delete(self):
        em = EpisodicMemory(_make_backend()).initialize()
        added = em.add("e1")
        assert em.delete(added.id) is True
        assert em.get(added.id) is None

    def test_delete_missing(self):
        em = EpisodicMemory(_make_backend()).initialize()
        assert em.delete("missing") is False

    def test_count(self):
        em = EpisodicMemory(_make_backend()).initialize()
        em.add("e1")
        em.add("e2")
        assert em.count() == 2

    def test_clear(self):
        em = EpisodicMemory(_make_backend()).initialize()
        em.add("e1")
        em.clear()
        assert em.count() == 0

    def test_list(self):
        em = EpisodicMemory(_make_backend()).initialize()
        em.add("e1")
        em.add("e2")
        assert len(em.list()) == 2

    def test_search_by_execution_id(self):
        em = EpisodicMemory(_make_backend()).initialize()
        em.add("e1", goal="g1")
        em.add("e2", goal="g2")
        results = em.search(execution_id="e1")
        assert len(results) == 1
        assert results[0].execution_id == "e1"

    def test_search_by_outcome(self):
        em = EpisodicMemory(_make_backend()).initialize()
        e = em.add("e1", outcome="success", goal="g")
        results = em.search(outcome="success")
        assert len(results) == 1
        assert results[0].id == e.id

    def test_search_by_query(self):
        em = EpisodicMemory(_make_backend()).initialize()
        em.add("e1", goal="machine learning")
        em.add("e2", goal="cooking")
        results = em.search(query="machine")
        assert len(results) == 1

    def test_search_limit(self):
        em = EpisodicMemory(_make_backend()).initialize()
        for i in range(10):
            em.add(f"e{i}", goal="same")
        assert len(em.search(query="same", limit=3)) == 3

    def test_search_ordering(self):
        em = EpisodicMemory(_make_backend()).initialize()
        first = em.add("e1", goal="test")
        time.sleep(0.01)
        second = em.add("e2", goal="test")
        results = em.search(query="test")
        assert results[0].id == second.id
        assert results[1].id == first.id

    def test_statistics(self):
        em = EpisodicMemory(_make_backend()).initialize()
        em.add("e1")
        stats = em.statistics()
        assert stats.episodic_entries == 1

    def test_validate_clean(self):
        em = EpisodicMemory(_make_backend()).initialize()
        em.add("e1")
        assert em.validate().is_valid is True

    def test_reload_clears(self):
        em = EpisodicMemory(_make_backend()).initialize()
        em.add("e1")
        em.reload()
        assert em.count() == 0

    def test_uninitialized_raises(self):
        em = EpisodicMemory(_make_backend())
        with pytest.raises(MemoryError):
            em.add("x")


# ---------------------------------------------------------------------------
# SemanticMemory
# ---------------------------------------------------------------------------

class TestSemanticMemory:
    def test_insert_entry(self):
        sm = SemanticMemory(_make_backend()).initialize()
        entry = sm.insert("Paris is capital of France")
        assert entry.content == "Paris is capital of France"
        assert entry.entry_type == SemanticEntryType.FACT

    def test_get_entry(self):
        sm = SemanticMemory(_make_backend()).initialize()
        added = sm.insert("fact")
        assert sm.get(added.id) == added

    def test_get_nonexistent(self):
        sm = SemanticMemory(_make_backend()).initialize()
        assert sm.get("missing") is None

    def test_update_content(self):
        sm = SemanticMemory(_make_backend()).initialize()
        added = sm.insert("old")
        updated = sm.update(added.id, content="new")
        assert updated is not None
        assert updated.content == "new"
        assert updated.id == added.id

    def test_update_nonexistent(self):
        sm = SemanticMemory(_make_backend()).initialize()
        assert sm.update("missing", content="x") is None

    def test_update_confidence(self):
        sm = SemanticMemory(_make_backend()).initialize()
        added = sm.insert("fact", confidence=0.5)
        updated = sm.update(added.id, confidence=0.9)
        assert updated is not None
        assert updated.confidence == 0.9

    def test_update_confidence_clamped(self):
        sm = SemanticMemory(_make_backend()).initialize()
        added = sm.insert("fact")
        updated = sm.update(added.id, confidence=2.0)
        assert updated is not None
        assert updated.confidence == 1.0

    def test_update_tags(self):
        sm = SemanticMemory(_make_backend()).initialize()
        added = sm.insert("fact", tags=("a",))
        updated = sm.update(added.id, tags=("b", "c"))
        assert updated is not None
        assert updated.tags == ("b", "c")

    def test_remove(self):
        sm = SemanticMemory(_make_backend()).initialize()
        added = sm.insert("fact")
        assert sm.remove(added.id) is True
        assert sm.get(added.id) is None

    def test_remove_missing(self):
        sm = SemanticMemory(_make_backend()).initialize()
        assert sm.remove("missing") is False

    def test_search_by_query(self):
        sm = SemanticMemory(_make_backend()).initialize()
        sm.insert("Python is a language")
        sm.insert("Cake is sweet")
        results = sm.search(query="Python")
        assert len(results) == 1

    def test_search_by_type(self):
        sm = SemanticMemory(_make_backend()).initialize()
        sm.insert("skill", entry_type=SemanticEntryType.SKILL)
        sm.insert("fact", entry_type=SemanticEntryType.FACT)
        results = sm.search(entry_type=SemanticEntryType.SKILL)
        assert len(results) == 1

    def test_search_by_tags(self):
        sm = SemanticMemory(_make_backend()).initialize()
        sm.insert("a", tags=("python", "code"))
        sm.insert("b", tags=("cooking",))
        results = sm.search(tags=("python",))
        assert len(results) == 1

    def test_search_limit(self):
        sm = SemanticMemory(_make_backend()).initialize()
        for i in range(10):
            sm.insert(f"item {i}", tags=("all",))
        assert len(sm.search(tags=("all",), limit=3)) == 3

    def test_similarity_search(self):
        sm = SemanticMemory(_make_backend()).initialize()
        sm.insert("Python programming language")
        sm.insert("World of Warcraft game")
        results = sm.similarity_search("Python code")
        assert len(results) > 0
        entry, score = results[0]
        assert "Python" in entry.content
        assert isinstance(score, float)

    def test_similarity_search_with_type_filter(self):
        sm = SemanticMemory(_make_backend()).initialize()
        sm.insert("python", entry_type=SemanticEntryType.SKILL)
        sm.insert("java", entry_type=SemanticEntryType.CONCEPT)
        results = sm.similarity_search("python", entry_type=SemanticEntryType.SKILL)
        assert len(results) == 1

    def test_similarity_search_top_k(self):
        sm = SemanticMemory(_make_backend()).initialize()
        for i in range(10):
            sm.insert(f"word {i}")
        results = sm.similarity_search("word", top_k=3)
        assert len(results) <= 3

    def test_count(self):
        sm = SemanticMemory(_make_backend()).initialize()
        sm.insert("a")
        sm.insert("b")
        assert sm.count() == 2

    def test_clear(self):
        sm = SemanticMemory(_make_backend()).initialize()
        sm.insert("a")
        sm.clear()
        assert sm.count() == 0

    def test_list(self):
        sm = SemanticMemory(_make_backend()).initialize()
        sm.insert("a")
        sm.insert("b")
        assert len(sm.list()) == 2

    def test_statistics(self):
        sm = SemanticMemory(_make_backend()).initialize()
        sm.insert("a")
        stats = sm.statistics()
        assert stats.semantic_entries == 1

    def test_validate_clean(self):
        sm = SemanticMemory(_make_backend()).initialize()
        sm.insert("clean")
        assert sm.validate().is_valid is True

    def test_validate_broken_relationship(self):
        sm = SemanticMemory(_make_backend()).initialize()
        sm.insert("a", relationships={"related": ["missing_id"]})
        result = sm.validate()
        assert result.is_valid is False
        assert len(result.broken_relationships) > 0

    def test_reload_clears(self):
        sm = SemanticMemory(_make_backend()).initialize()
        sm.insert("a")
        sm.reload()
        assert sm.count() == 0

    def test_uninitialized_raises(self):
        sm = SemanticMemory(_make_backend())
        with pytest.raises(MemoryError):
            sm.insert("x")


# ---------------------------------------------------------------------------
# RetrievalEngine
# ---------------------------------------------------------------------------

class TestRetrievalEngine:
    def test_keyword_search_working(self):
        backend = _make_backend()
        backend.store_working(WorkingMemoryEntry(content="find me"))
        re = RetrievalEngine(backend).initialize()
        results = re.keyword_search("find")
        assert len(results) == 1
        assert results[0].source_type == MemoryType.WORKING

    def test_keyword_search_episodic(self):
        backend = _make_backend()
        backend.store_episodic(EpisodicEntry(execution_id="e1", goal="search goal"))
        re = RetrievalEngine(backend).initialize()
        results = re.keyword_search("search")
        assert len(results) == 1
        assert results[0].source_type == MemoryType.EPISODIC

    def test_keyword_search_semantic(self):
        backend = _make_backend()
        backend.store_semantic(SemanticEntry(content="semantic data"))
        re = RetrievalEngine(backend).initialize()
        results = re.keyword_search("semantic")
        assert len(results) == 1
        assert results[0].source_type == MemoryType.SEMANTIC

    def test_keyword_search_filter_by_type(self):
        backend = _make_backend()
        backend.store_working(WorkingMemoryEntry(content="hello"))
        backend.store_semantic(SemanticEntry(content="hello"))
        re = RetrievalEngine(backend).initialize()
        results = re.keyword_search("hello", memory_types=[MemoryType.WORKING])
        assert len(results) == 1
        assert results[0].source_type == MemoryType.WORKING

    def test_keyword_search_limit(self):
        backend = _make_backend()
        for i in range(10):
            backend.store_working(WorkingMemoryEntry(content="data"))
        re = RetrievalEngine(backend).initialize()
        assert len(re.keyword_search("data", limit=3)) == 3

    def test_keyword_search_empty_query(self):
        backend = _make_backend()
        backend.store_working(WorkingMemoryEntry(content="x"))
        re = RetrievalEngine(backend).initialize()
        assert re.keyword_search("") == []

    def test_similarity_search(self):
        backend = _make_backend()
        backend.store_semantic(SemanticEntry(content="python language"))
        re = RetrievalEngine(backend).initialize()
        results = re.similarity_search("python")
        assert len(results) == 1

    def test_filter_search_by_execution_id(self):
        backend = _make_backend()
        backend.store_episodic(EpisodicEntry(execution_id="e1"))
        backend.store_episodic(EpisodicEntry(execution_id="e2"))
        re = RetrievalEngine(backend).initialize()
        results = re.filter_search(execution_id="e1")
        assert len(results) == 1

    def test_filter_search_by_type(self):
        backend = _make_backend()
        backend.store_semantic(SemanticEntry(content="skill", entry_type=SemanticEntryType.SKILL))
        backend.store_semantic(SemanticEntry(content="fact", entry_type=SemanticEntryType.FACT))
        re = RetrievalEngine(backend).initialize()
        results = re.filter_search(entry_type=SemanticEntryType.SKILL)
        assert len(results) == 1

    def test_filter_search_min_confidence(self):
        backend = _make_backend()
        backend.store_semantic(SemanticEntry(content="a", confidence=0.3))
        backend.store_semantic(SemanticEntry(content="b", confidence=0.8))
        re = RetrievalEngine(backend).initialize()
        results = re.filter_search(min_confidence=0.5)
        assert len(results) == 1

    def test_hybrid_search(self):
        backend = _make_backend()
        backend.store_semantic(SemanticEntry(content="python language"))
        re = RetrievalEngine(backend).initialize()
        results = re.hybrid_search("python")
        assert len(results) >= 1

    def test_statistics(self):
        backend = _make_backend()
        backend.store_semantic(SemanticEntry(content="x"))
        re = RetrievalEngine(backend).initialize()
        re.keyword_search("x")
        stats = re.statistics()
        assert stats.retrieval_count >= 1

    def test_reload(self):
        re = RetrievalEngine(_make_backend()).initialize()
        re.keyword_search("x")
        re.reload()
        stats = re.statistics()
        assert stats.retrieval_count == 0

    def test_uninitialized_raises(self):
        re = RetrievalEngine(_make_backend())
        with pytest.raises(MemoryError):
            re.keyword_search("x")


# ---------------------------------------------------------------------------
# ConsolidationEngine
# ---------------------------------------------------------------------------

class TestConsolidationEngine:
    def test_promote_working_to_episodic(self):
        backend = _make_backend()
        backend.store_working(WorkingMemoryEntry(content="important", importance=0.7))
        ce = ConsolidationEngine(backend).initialize()
        result = ce.consolidate()
        assert len(result.moved_to_episodic) == 1
        assert result.removed_from_working == result.moved_to_episodic
        assert backend.count_working() == 0
        assert backend.count_episodic() == 1

    def test_skips_low_importance(self):
        backend = _make_backend()
        backend.store_working(WorkingMemoryEntry(content="low", importance=0.1))
        ce = ConsolidationEngine(backend).initialize()
        result = ce.consolidate()
        assert len(result.moved_to_episodic) == 0
        assert backend.count_working() == 1

    def test_promote_working_to_semantic(self):
        backend = _make_backend()
        backend.store_working(WorkingMemoryEntry(content="knowledge", importance=0.8, type="knowledge"))
        ce = ConsolidationEngine(backend).initialize()
        result = ce.consolidate()
        assert len(result.moved_to_semantic) == 1
        assert backend.count_semantic() == 1

    def test_expire_working(self):
        backend = _make_backend()
        backend.store_working(WorkingMemoryEntry(
            content="old",
            timestamp=time.time() - 100,
        ))
        ce = ConsolidationEngine(backend, working_ttl=10).initialize()
        result = ce.consolidate()
        assert len(result.expired) == 1
        assert backend.count_working() == 0

    def test_no_expire_fresh(self):
        backend = _make_backend()
        backend.store_working(WorkingMemoryEntry(content="fresh"))
        ce = ConsolidationEngine(backend, working_ttl=3600).initialize()
        result = ce.consolidate()
        assert len(result.expired) == 0

    def test_deduplicate_semantic(self):
        backend = _make_backend()
        backend.store_semantic(SemanticEntry(content="same content"))
        backend.store_semantic(SemanticEntry(content="same content"))
        ce = ConsolidationEngine(backend, dedup_threshold=0.8).initialize()
        result = ce.consolidate()
        assert len(result.deduplicated) >= 1

    def test_no_dedup_different_content(self):
        backend = _make_backend()
        backend.store_semantic(SemanticEntry(content="aaaa"))
        backend.store_semantic(SemanticEntry(content="bbbb"))
        ce = ConsolidationEngine(backend).initialize()
        result = ce.consolidate()
        assert len(result.deduplicated) == 0

    def test_consolidate_empty(self):
        ce = ConsolidationEngine(_make_backend()).initialize()
        result = ce.consolidate()
        assert len(result.moved_to_episodic) == 0
        assert len(result.moved_to_semantic) == 0
        assert len(result.expired) == 0
        assert len(result.deduplicated) == 0

    def test_reload(self):
        ce = ConsolidationEngine(_make_backend()).initialize()
        ce.reload()
        assert ce.is_initialized

    def test_uninitialized_raises(self):
        ce = ConsolidationEngine(_make_backend())
        with pytest.raises(MemoryError):
            ce.consolidate()


# ---------------------------------------------------------------------------
# MemoryManager
# ---------------------------------------------------------------------------

class TestMemoryManager:
    def test_initialize(self):
        mm = MemoryManager(_make_backend()).initialize()
        assert mm.is_initialized is True

    def test_double_initialize(self):
        mm = MemoryManager(_make_backend()).initialize()
        mm.initialize()
        assert mm.is_initialized is True

    def test_store_and_retrieve(self):
        mm = MemoryManager(_make_backend()).initialize()
        entry = mm.store("hello world")
        assert isinstance(entry, WorkingMemoryEntry)
        results = mm.retrieve("hello")
        assert len(results) == 1

    def test_hybrid_retrieve(self):
        mm = MemoryManager(_make_backend()).initialize()
        mm.store("python code")
        results = mm.hybrid_retrieve("python")
        assert len(results) >= 1

    def test_similarity_retrieve(self):
        mm = MemoryManager(_make_backend()).initialize()
        mm.semantic.insert("python language")
        results = mm.similarity_retrieve("python")
        assert len(results) >= 1

    def test_forget_working(self):
        mm = MemoryManager(_make_backend()).initialize()
        entry = mm.store("forgettable")
        assert mm.forget(MemoryType.WORKING, entry.id) is True
        assert mm.working.get(entry.id) is None

    def test_forget_episodic(self):
        mm = MemoryManager(_make_backend()).initialize()
        entry = mm.episodic.add("e1")
        assert mm.forget(MemoryType.EPISODIC, entry.id) is True
        assert mm.episodic.get(entry.id) is None

    def test_forget_semantic(self):
        mm = MemoryManager(_make_backend()).initialize()
        entry = mm.semantic.insert("fact")
        assert mm.forget(MemoryType.SEMANTIC, entry.id) is True
        assert mm.semantic.get(entry.id) is None

    def test_forget_unknown_type(self):
        mm = MemoryManager(_make_backend()).initialize()
        assert mm.forget("unknown", "x") is False  # type: ignore[arg-type]

    def test_consolidate_all(self):
        mm = MemoryManager(_make_backend()).initialize()
        mm.store("important", importance=0.8)
        result = mm.consolidate_all()
        assert len(result.moved_to_episodic) == 1

    def test_statistics(self):
        mm = MemoryManager(_make_backend()).initialize()
        mm.store("a")
        stats = mm.statistics()
        assert stats.working_entries == 1
        assert isinstance(stats, MemoryStatistics)

    def test_validate_clean(self):
        mm = MemoryManager(_make_backend()).initialize()
        mm.store("a")
        result = mm.validate()
        assert result.is_valid is True

    def test_validate_aggregates_sub_results(self):
        mm = MemoryManager(_make_backend()).initialize()
        mm.working._backend.store_working(WorkingMemoryEntry(content="x", timestamp=-1))
        result = mm.validate()
        assert result.is_valid is False

    def test_reload(self):
        mm = MemoryManager(_make_backend()).initialize()
        mm.store("a")
        mm.reload()
        assert mm.is_initialized is False
        with pytest.raises(MemoryError):
            mm.store("b")

    def test_reinitialize_after_reload(self):
        mm = MemoryManager(_make_backend()).initialize()
        mm.store("a")
        mm.reload()
        mm.initialize()
        assert mm.is_initialized is True
        mm.store("b")
        assert mm.working.count() == 1

    def test_properties_exposed(self):
        mm = MemoryManager(_make_backend()).initialize()
        assert mm.working is not None
        assert mm.episodic is not None
        assert mm.semantic is not None
        assert mm.retrieval is not None
        assert mm.consolidation is not None

    def test_uninitialized_store_raises(self):
        mm = MemoryManager(_make_backend())
        with pytest.raises(MemoryError):
            mm.store("x")

    def test_uninitialized_retrieve_raises(self):
        mm = MemoryManager(_make_backend())
        with pytest.raises(MemoryError):
            mm.retrieve("x")

    def test_uninitialized_forget_raises(self):
        mm = MemoryManager(_make_backend())
        with pytest.raises(MemoryError):
            mm.forget(MemoryType.WORKING, "x")

    def test_uninitialized_consolidate_raises(self):
        mm = MemoryManager(_make_backend())
        with pytest.raises(MemoryError):
            mm.consolidate_all()

    def test_uninitialized_statistics_raises(self):
        mm = MemoryManager(_make_backend())
        with pytest.raises(MemoryError):
            mm.statistics()

    def test_uninitialized_validate_raises(self):
        mm = MemoryManager(_make_backend())
        with pytest.raises(MemoryError):
            mm.validate()


# ---------------------------------------------------------------------------
# Model tests
# ---------------------------------------------------------------------------

class TestModels:
    def test_working_memory_entry_defaults(self):
        e = WorkingMemoryEntry()
        assert e.id
        assert e.execution_id == ""
        assert e.content == ""
        assert e.type == "general"
        assert e.timestamp > 0

    def test_working_memory_entry_frozen(self):
        e = WorkingMemoryEntry(content="x")
        with pytest.raises(AttributeError):
            e.content = "y"  # type: ignore[misc]

    def test_episodic_entry_defaults(self):
        e = EpisodicEntry()
        assert e.id
        assert e.execution_id == ""
        assert e.observations == []

    def test_semantic_entry_defaults(self):
        e = SemanticEntry()
        assert e.id
        assert e.entry_type == SemanticEntryType.FACT
        assert e.confidence == 1.0
        assert e.tags == ()

    def test_semantic_entry_types(self):
        assert SemanticEntryType.FACT.value == "fact"
        assert SemanticEntryType.SKILL.value == "skill"
        assert SemanticEntryType.CONCEPT.value == "concept"
        assert SemanticEntryType.RELATIONSHIP.value == "relationship"

    def test_memory_types(self):
        assert MemoryType.WORKING.value == "working"
        assert MemoryType.EPISODIC.value == "episodic"
        assert MemoryType.SEMANTIC.value == "semantic"

    def test_retrieval_result(self):
        entry = WorkingMemoryEntry(content="x")
        r = RetrievalResult(entry=entry, score=0.5, source_type=MemoryType.WORKING)
        assert r.entry == entry
        assert r.score == 0.5
        assert r.source_type == MemoryType.WORKING

    def test_consolidation_result_defaults(self):
        r = ConsolidationResult()
        assert r.moved_to_episodic == []
        assert r.moved_to_semantic == []
        assert r.removed_from_working == []
        assert r.deduplicated == []
        assert r.expired == []

    def test_memory_statistics_defaults(self):
        s = MemoryStatistics()
        assert s.working_entries == 0
        assert s.episodic_entries == 0
        assert s.semantic_entries == 0

    def test_memory_validation_result_defaults(self):
        v = MemoryValidationResult()
        assert v.is_valid is True


# ---------------------------------------------------------------------------
# Thread safety
# ---------------------------------------------------------------------------

class TestThreadSafety:
    def test_concurrent_working_operations(self):
        wm = WorkingMemory(_make_backend(), capacity=20).initialize()
        n = 50
        barrier = threading.Barrier(n)

        def worker():
            barrier.wait()
            wm.add("data")
            wm.count()
            wm.list()

        threads = [threading.Thread(target=worker) for _ in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert wm.count() > 0

    def test_concurrent_episodic_operations(self):
        em = EpisodicMemory(_make_backend()).initialize()
        n = 30
        barrier = threading.Barrier(n)

        def worker():
            barrier.wait()
            em.add("e1")

        threads = [threading.Thread(target=worker) for _ in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert em.count() == n

    def test_concurrent_semantic_operations(self):
        sm = SemanticMemory(_make_backend()).initialize()
        n = 20
        barrier = threading.Barrier(n)

        def worker():
            barrier.wait()
            sm.insert("data")

        threads = [threading.Thread(target=worker) for _ in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert sm.count() == n

    def test_concurrent_memory_manager(self):
        mm = MemoryManager(_make_backend()).initialize()
        n = 20
        barrier = threading.Barrier(n)

        def worker():
            barrier.wait()
            mm.store("data")
            mm.retrieve("data")

        threads = [threading.Thread(target=worker) for _ in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert mm.working.count() == n
