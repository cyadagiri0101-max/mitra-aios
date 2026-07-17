"""Tests for AIOS Vector Store Layer."""

from __future__ import annotations

import pytest

from aios.core.exceptions import VectorStoreError
from aios.vectorstore.manager import VectorStoreManager
from aios.vectorstore.models import (
    DistanceMetric,
    IndexType,
    VectorRecord,
    VectorSearchResult,
    VectorStoreConfig,
    VectorStoreStatistics,
    VectorStoreValidationResult,
)
from aios.vectorstore.providers.chroma import ChromaVectorStore
from aios.vectorstore.providers.faiss import FAISSVectorStore
from aios.vectorstore.providers.in_memory import InMemoryVectorStore
from aios.vectorstore.providers.milvus import MilvusVectorStore
from aios.vectorstore.providers.pinecone import PineconeVectorStore
from aios.vectorstore.providers.qdrant import QdrantVectorStore
from aios.vectorstore.providers.weaviate import WeaviateVectorStore

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class TestModels:
    def test_vector_record_creation(self):
        record = VectorRecord(
            id="vec1",
            vector=(0.1, 0.2, 0.3),
            metadata={"key": "value"},
            namespace="test",
        )
        assert record.id == "vec1"
        assert record.vector == (0.1, 0.2, 0.3)
        assert record.metadata == {"key": "value"}
        assert record.namespace == "test"

    def test_vector_search_result_creation(self):
        record = VectorRecord(id="vec1", vector=(0.1, 0.2))
        result = VectorSearchResult(record=record, score=0.95, rank=1)
        assert result.record == record
        assert result.score == 0.95
        assert result.rank == 1

    def test_vector_store_config_creation(self):
        config = VectorStoreConfig(
            name="test",
            dimensions=768,
            distance_metric=DistanceMetric.COSINE,
            index_type=IndexType.HNSW,
            namespace="test-ns",
        )
        assert config.name == "test"
        assert config.dimensions == 768
        assert config.distance_metric == DistanceMetric.COSINE
        assert config.index_type == IndexType.HNSW
        assert config.namespace == "test-ns"

    def test_vector_store_statistics_creation(self):
        stats = VectorStoreStatistics(
            total_vectors=1000,
            namespaces=["ns1", "ns2"],
            dimensions=384,
            index_type="hnsw",
            distance_metric="cosine",
        )
        assert stats.total_vectors == 1000
        assert stats.namespaces == ["ns1", "ns2"]
        assert stats.dimensions == 384
        assert stats.index_type == "hnsw"
        assert stats.distance_metric == "cosine"

    def test_vector_store_validation_result_creation(self):
        result = VectorStoreValidationResult(
            is_valid=False,
            warnings=["Warning 1"],
            errors=["Error 1"],
        )
        assert result.is_valid is False
        assert result.warnings == ["Warning 1"]
        assert result.errors == ["Error 1"]

    def test_distance_metric_enum(self):
        assert DistanceMetric.COSINE.value == "cosine"
        assert DistanceMetric.EUCLIDEAN.value == "euclidean"
        assert DistanceMetric.DOT_PRODUCT.value == "dot_product"
        assert DistanceMetric.MANHATTAN.value == "manhattan"

    def test_index_type_enum(self):
        assert IndexType.FLAT.value == "flat"
        assert IndexType.HNSW.value == "hnsw"
        assert IndexType.IVF.value == "ivf"
        assert IndexType.ANNOY.value == "annoy"


# ---------------------------------------------------------------------------
# InMemoryVectorStore
# ---------------------------------------------------------------------------


class TestInMemoryVectorStore:
    def test_initialize(self):
        store = InMemoryVectorStore()
        assert store.is_initialized is False
        store.initialize()
        assert store.is_initialized is True

    def test_upsert(self):
        store = InMemoryVectorStore(VectorStoreConfig(dimensions=3)).initialize()
        records = [
            VectorRecord(id="vec1", vector=(0.1, 0.2, 0.3)),
            VectorRecord(id="vec2", vector=(0.4, 0.5, 0.6)),
        ]
        count = store.upsert(records)
        assert count == 2

    def test_get(self):
        store = InMemoryVectorStore(VectorStoreConfig(dimensions=3)).initialize()
        record = VectorRecord(id="vec1", vector=(0.1, 0.2, 0.3))
        store.upsert([record])
        retrieved = store.get("vec1")
        assert retrieved is not None
        assert retrieved.id == "vec1"

    def test_get_nonexistent(self):
        store = InMemoryVectorStore().initialize()
        retrieved = store.get("nonexistent")
        assert retrieved is None

    def test_delete(self):
        store = InMemoryVectorStore(VectorStoreConfig(dimensions=3)).initialize()
        record = VectorRecord(id="vec1", vector=(0.1, 0.2, 0.3))
        store.upsert([record])
        assert store.delete("vec1") is True
        assert store.get("vec1") is None

    def test_search(self):
        store = InMemoryVectorStore(VectorStoreConfig(dimensions=3)).initialize()
        records = [
            VectorRecord(id="vec1", vector=(1.0, 0.0, 0.0)),
            VectorRecord(id="vec2", vector=(0.0, 1.0, 0.0)),
            VectorRecord(id="vec3", vector=(0.5, 0.5, 0.0)),
        ]
        store.upsert(records)
        results = store.search((1.0, 0.0, 0.0), top_k=2)
        assert len(results) == 2
        assert results[0].record.id == "vec1"

    def test_search_with_filters(self):
        store = InMemoryVectorStore(VectorStoreConfig(dimensions=2)).initialize()
        records = [
            VectorRecord(id="vec1", vector=(0.1, 0.2), metadata={"category": "A"}),
            VectorRecord(id="vec2", vector=(0.3, 0.4), metadata={"category": "B"}),
        ]
        store.upsert(records)
        results = store.search((0.1, 0.2), filters={"category": "A"})
        assert len(results) == 1
        assert results[0].record.id == "vec1"

    def test_list_namespaces(self):
        store = InMemoryVectorStore(VectorStoreConfig(dimensions=1)).initialize()
        records = [
            VectorRecord(id="vec1", vector=(0.1,), namespace="ns1"),
            VectorRecord(id="vec2", vector=(0.2,), namespace="ns2"),
        ]
        store.upsert(records)
        namespaces = store.list_namespaces()
        assert "ns1" in namespaces
        assert "ns2" in namespaces

    def test_count(self):
        store = InMemoryVectorStore(VectorStoreConfig(dimensions=1)).initialize()
        records = [
            VectorRecord(id="vec1", vector=(0.1,)),
            VectorRecord(id="vec2", vector=(0.2,)),
        ]
        store.upsert(records)
        assert store.count() == 2

    def test_clear(self):
        store = InMemoryVectorStore(VectorStoreConfig(dimensions=1)).initialize()
        records = [VectorRecord(id="vec1", vector=(0.1,))]
        store.upsert(records)
        store.clear()
        assert store.count() == 0

    def test_health(self):
        store = InMemoryVectorStore()
        assert store.health() is False
        store.initialize()
        assert store.health() is True

    def test_validate(self):
        store = InMemoryVectorStore()
        result = store.validate()
        assert isinstance(result, VectorStoreValidationResult)

    def test_statistics(self):
        store = InMemoryVectorStore(VectorStoreConfig(dimensions=1)).initialize()
        records = [VectorRecord(id="vec1", vector=(0.1,))]
        store.upsert(records)
        stats = store.statistics
        assert isinstance(stats, VectorStoreStatistics)
        assert stats.total_vectors == 1

    def test_reload(self):
        store = InMemoryVectorStore(VectorStoreConfig(dimensions=1)).initialize()
        records = [VectorRecord(id="vec1", vector=(0.1,))]
        store.upsert(records)
        store.reload()
        assert store.count() == 0

    def test_shutdown(self):
        store = InMemoryVectorStore().initialize()
        store.shutdown()
        assert store.is_initialized is False

    def test_uninitialized_raises(self):
        store = InMemoryVectorStore()
        with pytest.raises(VectorStoreError):
            store.upsert([VectorRecord(id="vec1", vector=(0.1,))])

    def test_dimension_mismatch_raises(self):
        store = InMemoryVectorStore(VectorStoreConfig(dimensions=3)).initialize()
        with pytest.raises(VectorStoreError):
            store.upsert([VectorRecord(id="vec1", vector=(0.1, 0.2))])


# ---------------------------------------------------------------------------
# Cloud Providers
# ---------------------------------------------------------------------------


class TestCloudProviders:
    def test_faiss_initialize(self):
        provider = FAISSVectorStore().initialize()
        assert provider.is_initialized is True
        assert provider.name == "faiss"

    def test_faiss_validate(self):
        provider = FAISSVectorStore()
        result = provider.validate()
        assert len(result.warnings) > 0

    def test_faiss_upsert_raises(self):
        provider = FAISSVectorStore().initialize()
        with pytest.raises(NotImplementedError):
            provider.upsert([VectorRecord(id="vec1", vector=(0.1,))])

    def test_chroma_initialize(self):
        provider = ChromaVectorStore().initialize()
        assert provider.is_initialized is True
        assert provider.name == "chroma"

    def test_qdrant_initialize(self):
        provider = QdrantVectorStore().initialize()
        assert provider.is_initialized is True
        assert provider.name == "qdrant"

    def test_milvus_initialize(self):
        provider = MilvusVectorStore().initialize()
        assert provider.is_initialized is True
        assert provider.name == "milvus"

    def test_pinecone_initialize(self):
        provider = PineconeVectorStore().initialize()
        assert provider.is_initialized is True
        assert provider.name == "pinecone"

    def test_weaviate_initialize(self):
        provider = WeaviateVectorStore().initialize()
        assert provider.is_initialized is True
        assert provider.name == "weaviate"


# ---------------------------------------------------------------------------
# VectorStoreManager
# ---------------------------------------------------------------------------


class TestVectorStoreManager:
    def test_initialize(self):
        manager = VectorStoreManager()
        assert manager.is_initialized is False
        manager.initialize()
        assert manager.is_initialized is True

    def test_register_provider(self):
        manager = VectorStoreManager().initialize()
        provider = InMemoryVectorStore().initialize()
        manager.register_provider(provider)
        assert "in-memory" in manager.list_providers()

    def test_unregister_provider(self):
        manager = VectorStoreManager().initialize()
        provider = InMemoryVectorStore().initialize()
        manager.register_provider(provider)
        assert manager.unregister_provider("in-memory") is True
        assert "in-memory" not in manager.list_providers()

    def test_get_provider(self):
        manager = VectorStoreManager().initialize()
        provider = InMemoryVectorStore().initialize()
        manager.register_provider(provider)
        retrieved = manager.get_provider("in-memory")
        assert retrieved is provider

    def test_get_default_provider(self):
        manager = VectorStoreManager().initialize()
        provider = InMemoryVectorStore().initialize()
        manager.register_provider(provider, set_default=True)
        retrieved = manager.get_provider()
        assert retrieved is provider

    def test_upsert(self):
        manager = VectorStoreManager().initialize()
        provider = InMemoryVectorStore(VectorStoreConfig(name="in-memory", dimensions=3)).initialize()
        manager.register_provider(provider, set_default=True)

        records = [VectorRecord(id="vec1", vector=(0.1, 0.2, 0.3))]
        count = manager.upsert(records)
        assert count == 1

    def test_search(self):
        manager = VectorStoreManager().initialize()
        provider = InMemoryVectorStore(VectorStoreConfig(name="in-memory", dimensions=3)).initialize()
        manager.register_provider(provider, set_default=True)

        records = [VectorRecord(id="vec1", vector=(1.0, 0.0, 0.0))]
        manager.upsert(records)

        results = manager.search((1.0, 0.0, 0.0), top_k=1)
        assert len(results) == 1

    def test_get_statistics(self):
        manager = VectorStoreManager().initialize()
        provider = InMemoryVectorStore().initialize()
        manager.register_provider(provider)

        stats = manager.get_statistics()
        assert isinstance(stats, VectorStoreStatistics)

    def test_validate(self):
        manager = VectorStoreManager().initialize()
        result = manager.validate()
        assert isinstance(result, VectorStoreValidationResult)

    def test_reload(self):
        manager = VectorStoreManager().initialize()
        provider = InMemoryVectorStore().initialize()
        manager.register_provider(provider)
        manager.reload()
        assert manager.is_initialized is True

    def test_shutdown(self):
        manager = VectorStoreManager().initialize()
        provider = InMemoryVectorStore().initialize()
        manager.register_provider(provider)
        manager.shutdown()
        assert manager.is_initialized is False

    def test_uninitialized_raises(self):
        manager = VectorStoreManager()
        with pytest.raises(VectorStoreError):
            manager.upsert([VectorRecord(id="vec1", vector=(0.1,))])

    def test_provider_not_found(self):
        manager = VectorStoreManager().initialize()
        with pytest.raises(VectorStoreError):
            manager.get_provider("nonexistent")


# ---------------------------------------------------------------------------
# Integration
# ---------------------------------------------------------------------------


class TestIntegration:
    def test_full_vector_store_workflow(self):
        manager = VectorStoreManager().initialize()

        # Register provider
        provider = InMemoryVectorStore(VectorStoreConfig(name="in-memory", dimensions=3)).initialize()
        manager.register_provider(provider, set_default=True)

        # Insert vectors
        records = [
            VectorRecord(id="vec1", vector=(1.0, 0.0, 0.0), metadata={"category": "A"}),
            VectorRecord(id="vec2", vector=(0.0, 1.0, 0.0), metadata={"category": "B"}),
            VectorRecord(id="vec3", vector=(0.5, 0.5, 0.0), metadata={"category": "A"}),
        ]
        count = manager.upsert(records)
        assert count == 3

        # Search
        results = manager.search((1.0, 0.0, 0.0), top_k=2)
        assert len(results) == 2
        assert results[0].record.id == "vec1"

        # Search with filters
        filtered_results = manager.search((0.5, 0.5, 0.0), filters={"category": "A"})
        assert len(filtered_results) == 2

        # Get specific vector
        retrieved = manager.get("vec1")
        assert retrieved is not None
        assert retrieved.id == "vec1"

        # Count
        assert manager.count() == 3

        # Delete
        assert manager.delete("vec1") is True
        assert manager.count() == 2

        # Statistics
        stats = manager.get_statistics()
        assert stats.total_vectors == 2

        # Validate
        validation = manager.validate()
        assert validation.is_valid is True

        manager.shutdown()
