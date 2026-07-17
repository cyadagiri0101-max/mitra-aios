"""Tests for AIOS Embedding Layer."""

from __future__ import annotations

import pytest

from aios.core.exceptions import EmbeddingError
from aios.embedding.cache import EmbeddingCache
from aios.embedding.manager import EmbeddingManager
from aios.embedding.models import (
    BatchEmbeddingResult,
    EmbeddingProviderConfig,
    EmbeddingResult,
    EmbeddingStatistics,
    EmbeddingValidationResult,
)
from aios.embedding.providers.jina import JinaEmbeddingProvider
from aios.embedding.providers.mock import MockEmbeddingProvider
from aios.embedding.providers.nomic import NomicEmbeddingProvider
from aios.embedding.providers.openai import OpenAIEmbeddingProvider
from aios.embedding.providers.sentence_transformers import SentenceTransformersProvider
from aios.embedding.providers.voyage import VoyageEmbeddingProvider
from aios.embedding.registry import EmbeddingRegistry

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class TestModels:
    def test_embedding_result_creation(self):
        result = EmbeddingResult(
            text="test text",
            embedding=(0.1, 0.2, 0.3),
            dimensions=3,
            provider="mock",
            model="mock-model",
        )
        assert result.text == "test text"
        assert result.embedding == (0.1, 0.2, 0.3)
        assert result.dimensions == 3
        assert result.provider == "mock"
        assert result.model == "mock-model"

    def test_batch_embedding_result_creation(self):
        results = (
            EmbeddingResult(text="text1", embedding=(0.1,), dimensions=1),
            EmbeddingResult(text="text2", embedding=(0.2,), dimensions=1),
        )
        batch_result = BatchEmbeddingResult(
            results=results,
            total_tokens=10,
            processing_time=0.5,
        )
        assert len(batch_result.results) == 2
        assert batch_result.total_tokens == 10
        assert batch_result.processing_time == 0.5

    def test_embedding_provider_config_creation(self):
        config = EmbeddingProviderConfig(
            name="test",
            model="test-model",
            api_key="test-key",
            dimensions=768,
            batch_size=16,
        )
        assert config.name == "test"
        assert config.model == "test-model"
        assert config.api_key == "test-key"
        assert config.dimensions == 768
        assert config.batch_size == 16

    def test_embedding_statistics_creation(self):
        stats = EmbeddingStatistics(
            total_requests=100,
            successful_requests=95,
            failed_requests=5,
            total_tokens_processed=1000,
            average_latency=0.1,
            cache_hits=80,
            cache_misses=20,
            batch_operations=10,
        )
        assert stats.total_requests == 100
        assert stats.successful_requests == 95
        assert stats.failed_requests == 5
        assert stats.total_tokens_processed == 1000
        assert stats.average_latency == 0.1
        assert stats.cache_hits == 80
        assert stats.cache_misses == 20
        assert stats.batch_operations == 10

    def test_embedding_validation_result_creation(self):
        result = EmbeddingValidationResult(
            is_valid=False,
            warnings=["Warning 1"],
            errors=["Error 1"],
        )
        assert result.is_valid is False
        assert result.warnings == ["Warning 1"]
        assert result.errors == ["Error 1"]


# ---------------------------------------------------------------------------
# EmbeddingCache
# ---------------------------------------------------------------------------


class TestEmbeddingCache:
    def test_initialize(self):
        cache = EmbeddingCache()
        assert cache.is_initialized is False
        cache.initialize()
        assert cache.is_initialized is True

    def test_put_and_get(self):
        cache = EmbeddingCache().initialize()
        result = EmbeddingResult(
            text="test",
            embedding=(0.1, 0.2),
            dimensions=2,
            provider="mock",
            model="mock-model",
        )
        cache.put("test", result)
        retrieved = cache.get("test", "mock", "mock-model")
        assert retrieved is not None
        assert retrieved.embedding == (0.1, 0.2)

    def test_get_miss(self):
        cache = EmbeddingCache().initialize()
        retrieved = cache.get("nonexistent", "mock", "mock-model")
        assert retrieved is None

    def test_cache_size(self):
        cache = EmbeddingCache(max_size=2).initialize()
        for i in range(3):
            result = EmbeddingResult(
                text=f"text{i}",
                embedding=(float(i),),
                dimensions=1,
                provider="mock",
                model="mock-model",
            )
            cache.put(f"text{i}", result)
        assert cache.size == 2

    def test_clear(self):
        cache = EmbeddingCache().initialize()
        result = EmbeddingResult(
            text="test",
            embedding=(0.1,),
            dimensions=1,
            provider="mock",
            model="mock-model",
        )
        cache.put("test", result)
        cache.clear()
        assert cache.size == 0

    def test_hits_and_misses(self):
        cache = EmbeddingCache().initialize()
        result = EmbeddingResult(
            text="test",
            embedding=(0.1,),
            dimensions=1,
            provider="mock",
            model="mock-model",
        )
        cache.put("test", result)
        cache.get("test", "mock", "mock-model")  # hit
        cache.get("nonexistent", "mock", "mock-model")  # miss
        assert cache.hits == 1
        assert cache.misses == 1

    def test_validate(self):
        cache = EmbeddingCache(max_size=-1)
        result = cache.validate()
        assert result.is_valid is False

    def test_reload(self):
        cache = EmbeddingCache().initialize()
        result = EmbeddingResult(
            text="test",
            embedding=(0.1,),
            dimensions=1,
            provider="mock",
            model="mock-model",
        )
        cache.put("test", result)
        cache.reload()
        assert cache.size == 0

    def test_uninitialized_raises(self):
        cache = EmbeddingCache()
        with pytest.raises(EmbeddingError):
            cache.get("test", "mock", "mock-model")


# ---------------------------------------------------------------------------
# EmbeddingRegistry
# ---------------------------------------------------------------------------


class TestEmbeddingRegistry:
    def test_initialize(self):
        registry = EmbeddingRegistry()
        assert registry.is_initialized is False
        registry.initialize()
        assert registry.is_initialized is True

    def test_register_provider(self):
        registry = EmbeddingRegistry().initialize()
        provider = MockEmbeddingProvider().initialize()
        registry.register(provider)
        assert "mock" in registry.list()

    def test_register_with_aliases(self):
        registry = EmbeddingRegistry().initialize()
        provider = MockEmbeddingProvider().initialize()
        registry.register(provider, aliases=("m", "mock-alias"))
        assert registry.get("m") is provider
        assert registry.get("mock-alias") is provider

    def test_register_duplicate_raises(self):
        registry = EmbeddingRegistry().initialize()
        p1 = MockEmbeddingProvider().initialize()
        p2 = MockEmbeddingProvider().initialize()
        registry.register(p1)
        with pytest.raises(EmbeddingError):
            registry.register(p2)

    def test_unregister(self):
        registry = EmbeddingRegistry().initialize()
        provider = MockEmbeddingProvider().initialize()
        registry.register(provider)
        assert registry.unregister("mock") is True
        assert "mock" not in registry.list()

    def test_get_provider(self):
        registry = EmbeddingRegistry().initialize()
        provider = MockEmbeddingProvider().initialize()
        registry.register(provider)
        assert registry.get("mock") is provider

    def test_default_provider(self):
        registry = EmbeddingRegistry().initialize()
        provider = MockEmbeddingProvider().initialize()
        registry.register(provider)
        assert registry.default_provider() is provider

    def test_set_default(self):
        registry = EmbeddingRegistry().initialize()
        p1 = MockEmbeddingProvider().initialize()
        p2 = OpenAIEmbeddingProvider().initialize()
        registry.register(p1)
        registry.register(p2)
        registry.set_default("openai")
        assert registry.default_provider() is p2

    def test_validate(self):
        registry = EmbeddingRegistry().initialize()
        result = registry.validate()
        assert isinstance(result, EmbeddingValidationResult)

    def test_reload(self):
        registry = EmbeddingRegistry().initialize()
        provider = MockEmbeddingProvider().initialize()
        registry.register(provider)
        registry.reload()
        assert registry.list() == []

    def test_uninitialized_raises(self):
        registry = EmbeddingRegistry()
        with pytest.raises(EmbeddingError):
            registry.register(MockEmbeddingProvider().initialize())


# ---------------------------------------------------------------------------
# MockEmbeddingProvider
# ---------------------------------------------------------------------------


class TestMockEmbeddingProvider:
    def test_initialize(self):
        provider = MockEmbeddingProvider()
        assert provider.is_initialized is False
        provider.initialize()
        assert provider.is_initialized is True

    def test_embed(self):
        provider = MockEmbeddingProvider().initialize()
        result = provider.embed("test text")
        assert result.text == "test text"
        assert len(result.embedding) == 384
        assert result.provider == "mock"

    def test_embed_deterministic(self):
        provider = MockEmbeddingProvider().initialize()
        r1 = provider.embed("same text")
        r2 = provider.embed("same text")
        assert r1.embedding == r2.embedding

    def test_embed_batch(self):
        provider = MockEmbeddingProvider().initialize()
        texts = ["text1", "text2", "text3"]
        batch_result = provider.embed_batch(texts)
        assert len(batch_result.results) == 3
        assert batch_result.total_tokens > 0

    def test_get_dimensions(self):
        provider = MockEmbeddingProvider().initialize()
        assert provider.get_dimensions() == 384

    def test_health(self):
        provider = MockEmbeddingProvider()
        assert provider.health() is False
        provider.initialize()
        assert provider.health() is True

    def test_validate(self):
        provider = MockEmbeddingProvider()
        result = provider.validate()
        assert isinstance(result, EmbeddingValidationResult)

    def test_statistics(self):
        provider = MockEmbeddingProvider().initialize()
        provider.embed("test")
        stats = provider.statistics
        assert stats.total_requests == 1
        assert stats.successful_requests == 1

    def test_reload(self):
        provider = MockEmbeddingProvider().initialize()
        provider.embed("test")
        provider.reload()
        assert provider.statistics.total_requests == 0

    def test_shutdown(self):
        provider = MockEmbeddingProvider().initialize()
        provider.shutdown()
        assert provider.is_initialized is False

    def test_uninitialized_raises(self):
        provider = MockEmbeddingProvider()
        with pytest.raises(EmbeddingError):
            provider.embed("test")


# ---------------------------------------------------------------------------
# Cloud Providers
# ---------------------------------------------------------------------------


class TestCloudProviders:
    def test_openai_initialize(self):
        provider = OpenAIEmbeddingProvider().initialize()
        assert provider.is_initialized is True
        assert provider.name == "openai"

    def test_openai_validate_no_key(self):
        provider = OpenAIEmbeddingProvider()
        result = provider.validate()
        assert len(result.warnings) > 0

    def test_openai_embed_raises(self):
        config = EmbeddingProviderConfig(api_key="test-key", model="text-embedding-3-small")
        provider = OpenAIEmbeddingProvider(config).initialize()
        with pytest.raises(NotImplementedError):
            provider.embed("test")

    def test_voyage_initialize(self):
        provider = VoyageEmbeddingProvider().initialize()
        assert provider.is_initialized is True
        assert provider.name == "voyage"

    def test_jina_initialize(self):
        provider = JinaEmbeddingProvider().initialize()
        assert provider.is_initialized is True
        assert provider.name == "jina"

    def test_nomic_initialize(self):
        provider = NomicEmbeddingProvider().initialize()
        assert provider.is_initialized is True
        assert provider.name == "nomic"

    def test_sentence_transformers_initialize(self):
        provider = SentenceTransformersProvider().initialize()
        assert provider.is_initialized is True
        assert provider.name == "sentence-transformers"

    def test_sentence_transformers_validate(self):
        provider = SentenceTransformersProvider()
        result = provider.validate()
        assert len(result.warnings) > 0


# ---------------------------------------------------------------------------
# EmbeddingManager
# ---------------------------------------------------------------------------


class TestEmbeddingManager:
    def test_initialize(self):
        manager = EmbeddingManager()
        assert manager.is_initialized is False
        manager.initialize()
        assert manager.is_initialized is True

    def test_register_provider(self):
        manager = EmbeddingManager().initialize()
        provider = MockEmbeddingProvider().initialize()
        manager.register_provider(provider)
        assert "mock" in manager.registry.list()

    def test_embed(self):
        manager = EmbeddingManager().initialize()
        provider = MockEmbeddingProvider().initialize()
        manager.register_provider(provider)
        result = manager.embed("test text")
        assert result.text == "test text"
        assert len(result.embedding) > 0

    def test_embed_with_cache(self):
        manager = EmbeddingManager().initialize()
        provider = MockEmbeddingProvider().initialize()
        manager.register_provider(provider)

        r1 = manager.embed("cached text")
        r2 = manager.embed("cached text")

        assert r1.embedding == r2.embedding
        stats = manager.get_statistics()
        assert stats.cache_hits >= 1

    def test_embed_batch(self):
        manager = EmbeddingManager().initialize()
        provider = MockEmbeddingProvider().initialize()
        manager.register_provider(provider)

        texts = ["text1", "text2", "text3"]
        batch_result = manager.embed_batch(texts)

        assert len(batch_result.results) == 3
        stats = manager.get_statistics()
        assert stats.batch_operations >= 1

    def test_get_statistics(self):
        manager = EmbeddingManager().initialize()
        provider = MockEmbeddingProvider().initialize()
        manager.register_provider(provider)

        manager.embed("test")
        stats = manager.get_statistics()

        assert isinstance(stats, EmbeddingStatistics)
        assert stats.total_requests >= 1

    def test_validate(self):
        manager = EmbeddingManager().initialize()
        result = manager.validate()
        assert isinstance(result, EmbeddingValidationResult)

    def test_reload(self):
        manager = EmbeddingManager().initialize()
        provider = MockEmbeddingProvider().initialize()
        manager.register_provider(provider)
        manager.embed("test")

        manager.reload()

        assert manager.is_initialized is False

    def test_shutdown(self):
        manager = EmbeddingManager().initialize()
        provider = MockEmbeddingProvider().initialize()
        manager.register_provider(provider)

        manager.shutdown()

        assert manager.is_initialized is False

    def test_uninitialized_raises(self):
        manager = EmbeddingManager()
        with pytest.raises(EmbeddingError):
            manager.embed("test")

    def test_provider_not_found(self):
        manager = EmbeddingManager().initialize()
        with pytest.raises(EmbeddingError):
            manager.embed("test", provider_name="nonexistent")


# ---------------------------------------------------------------------------
# Integration
# ---------------------------------------------------------------------------


class TestIntegration:
    def test_full_embedding_workflow(self):
        manager = EmbeddingManager().initialize()

        # Register providers
        mock_provider = MockEmbeddingProvider().initialize()
        manager.register_provider(mock_provider, aliases=("default-mock",))

        # Single embedding
        result = manager.embed("What is machine learning?")
        assert result.text == "What is machine learning?"
        assert len(result.embedding) == 384

        # Batch embedding
        texts = ["Python", "JavaScript", "TypeScript"]
        batch_result = manager.embed_batch(texts)
        assert len(batch_result.results) == 3

        # Statistics
        stats = manager.get_statistics()
        assert stats.total_requests >= 4
        assert stats.successful_requests >= 4

        # Validate
        validation = manager.validate()
        assert validation.is_valid is True

        manager.shutdown()
