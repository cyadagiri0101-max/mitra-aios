"""Embedding Manager - main facade for the embedding layer."""

from __future__ import annotations

import threading
import time

from aios.core.exceptions import EmbeddingError
from aios.core.logger import get_logger
from aios.embedding.cache import EmbeddingCache
from aios.embedding.models import (
    BatchEmbeddingResult,
    EmbeddingResult,
    EmbeddingStatistics,
    EmbeddingValidationResult,
)
from aios.embedding.provider import EmbeddingProvider
from aios.embedding.registry import EmbeddingRegistry


class EmbeddingManager:
    """Main facade for the embedding layer."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.embedding.manager")
        self._lock = threading.Lock()
        self._initialized: bool = False

        # Initialize components
        self._registry = EmbeddingRegistry()
        self._cache = EmbeddingCache()

        # Statistics
        self._total_requests: int = 0
        self._successful_requests: int = 0
        self._failed_requests: int = 0
        self._total_tokens: int = 0
        self._total_latency: float = 0.0
        self._batch_operations: int = 0

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def registry(self) -> EmbeddingRegistry:
        return self._registry

    @property
    def cache(self) -> EmbeddingCache:
        return self._cache

    def initialize(self) -> EmbeddingManager:
        """Initialize the embedding manager and all components."""
        with self._lock:
            if self._initialized:
                return self

            self._registry.initialize()
            self._cache.initialize()

            self._initialized = True
            self.logger.info("EmbeddingManager initialized")

        return self

    def register_provider(self, provider: EmbeddingProvider, aliases: tuple[str, ...] = ()) -> None:
        """Register an embedding provider."""
        self._require_initialized()
        self._registry.register(provider, aliases)

    def unregister_provider(self, name: str) -> bool:
        """Unregister an embedding provider."""
        self._require_initialized()
        return self._registry.unregister(name)

    def embed(self, text: str, provider_name: str = "") -> EmbeddingResult:
        """Generate embedding for a single text."""
        self._require_initialized()
        start_time = time.time()

        # Get provider
        provider = self._get_provider(provider_name)

        # Check cache
        cached = self._cache.get(text, provider.name, provider.model)
        if cached is not None:
            self.logger.debug("Cache hit for text: %s", text[:50])
            return cached

        # Generate embedding
        try:
            result = provider.embed(text)
            processing_time = time.time() - start_time

            # Update statistics
            with self._lock:
                self._total_requests += 1
                self._successful_requests += 1
                self._total_tokens += len(text.split())
                self._total_latency += processing_time

            # Cache result
            self._cache.put(text, result)

            self.logger.debug("Generated embedding for text: %s", text[:50])
            return result

        except Exception as e:
            with self._lock:
                self._total_requests += 1
                self._failed_requests += 1

            self.logger.error("Failed to generate embedding: %s", e)
            raise EmbeddingError(f"Embedding generation failed: {e}", provider=provider.name) from e

    def embed_batch(self, texts: list[str], provider_name: str = "") -> BatchEmbeddingResult:
        """Generate embeddings for a batch of texts."""
        self._require_initialized()
        start_time = time.time()

        # Get provider
        provider = self._get_provider(provider_name)

        # Generate embeddings
        try:
            batch_result = provider.embed_batch(texts)
            processing_time = time.time() - start_time

            # Update statistics
            with self._lock:
                self._batch_operations += 1
                self._total_requests += len(texts)
                self._successful_requests += len(batch_result.results)
                self._total_tokens += sum(len(text.split()) for text in texts)
                self._total_latency += processing_time

            # Cache results
            for text, result in zip(texts, batch_result.results):
                self._cache.put(text, result)

            self.logger.debug("Generated %d embeddings in batch", len(texts))
            return batch_result

        except Exception as e:
            with self._lock:
                self._batch_operations += 1
                self._total_requests += len(texts)
                self._failed_requests += len(texts)

            self.logger.error("Failed to generate batch embeddings: %s", e)
            raise EmbeddingError(f"Batch embedding generation failed: {e}", provider=provider.name) from e

    def get_statistics(self) -> EmbeddingStatistics:
        """Get embedding statistics."""
        self._require_initialized()

        with self._lock:
            avg_latency = self._total_latency / self._total_requests if self._total_requests > 0 else 0.0

            return EmbeddingStatistics(
                total_requests=self._total_requests,
                successful_requests=self._successful_requests,
                failed_requests=self._failed_requests,
                total_tokens_processed=self._total_tokens,
                average_latency=avg_latency,
                cache_hits=self._cache.hits,
                cache_misses=self._cache.misses,
                batch_operations=self._batch_operations,
            )

    def validate(self) -> EmbeddingValidationResult:
        """Validate the embedding manager."""
        self._require_initialized()

        result = EmbeddingValidationResult()

        # Validate registry
        registry_result = self._registry.validate()
        result.warnings.extend(registry_result.warnings)
        result.errors.extend(registry_result.errors)
        if not registry_result.is_valid:
            result.is_valid = False

        # Validate cache
        cache_result = self._cache.validate()
        result.warnings.extend(cache_result.warnings)
        result.errors.extend(cache_result.errors)
        if not cache_result.is_valid:
            result.is_valid = False

        return result

    def reload(self) -> EmbeddingManager:
        """Reload the embedding manager."""
        self.logger.info("Reloading EmbeddingManager")

        with self._lock:
            self._registry.reload()
            self._cache.reload()
            self._total_requests = 0
            self._successful_requests = 0
            self._failed_requests = 0
            self._total_tokens = 0
            self._total_latency = 0.0
            self._batch_operations = 0
            self._initialized = False

        return self

    def shutdown(self) -> None:
        """Shutdown the embedding manager."""
        self.logger.info("Shutting down EmbeddingManager")

        with self._lock:
            for name in self._registry.list():
                provider = self._registry.get(name)
                if provider:
                    try:
                        provider.shutdown()
                    except Exception as e:
                        self.logger.warning("Error shutting down provider '%s': %s", name, e)

            self._initialized = False

    def _get_provider(self, name: str = "") -> EmbeddingProvider:
        """Get an embedding provider."""
        if name:
            provider = self._registry.get(name)
            if not provider:
                raise EmbeddingError(f"Provider '{name}' not found", provider=name)
            return provider
        else:
            provider = self._registry.default_provider()
            if not provider:
                raise EmbeddingError("No default provider configured")
            return provider

    def _require_initialized(self) -> None:
        """Check if manager is initialized."""
        if not self._initialized:
            raise EmbeddingError("EmbeddingManager has not been initialized")
