"""Mock embedding provider for testing."""

from __future__ import annotations

import hashlib
import threading
import time

from aios.core.exceptions import EmbeddingError
from aios.core.logger import get_logger
from aios.embedding.models import (
    BatchEmbeddingResult,
    EmbeddingProviderConfig,
    EmbeddingResult,
    EmbeddingStatistics,
    EmbeddingValidationResult,
)
from aios.embedding.provider import EmbeddingProvider


class MockEmbeddingProvider(EmbeddingProvider):
    """Mock embedding provider for testing."""

    def __init__(self, config: EmbeddingProviderConfig | None = None) -> None:
        self.logger = get_logger("aios.embedding.mock_provider")
        self._config = config or EmbeddingProviderConfig(
            name="mock",
            model="mock-embedding-model",
            dimensions=384,
        )
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._total_requests: int = 0
        self._successful_requests: int = 0
        self._failed_requests: int = 0
        self._total_tokens: int = 0
        self._total_latency: float = 0.0

    @property
    def name(self) -> str:
        return self._config.name

    @property
    def model(self) -> str:
        return self._config.model

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def statistics(self) -> EmbeddingStatistics:
        with self._lock:
            avg_latency = self._total_latency / self._total_requests if self._total_requests > 0 else 0.0
            return EmbeddingStatistics(
                total_requests=self._total_requests,
                successful_requests=self._successful_requests,
                failed_requests=self._failed_requests,
                total_tokens_processed=self._total_tokens,
                average_latency=avg_latency,
            )

    def initialize(self) -> MockEmbeddingProvider:
        """Initialize the provider."""
        self._initialized = True
        self.logger.info("MockEmbeddingProvider initialized (model=%s, dimensions=%d)",
                        self._config.model, self._config.dimensions)
        return self

    def embed(self, text: str) -> EmbeddingResult:
        """Generate embedding for a single text."""
        self._require_initialized()
        start_time = time.time()

        try:
            # Generate deterministic embedding based on text hash
            embedding = self._generate_mock_embedding(text)
            processing_time = time.time() - start_time

            # Update statistics
            with self._lock:
                self._total_requests += 1
                self._successful_requests += 1
                self._total_tokens += len(text.split())
                self._total_latency += processing_time

            return EmbeddingResult(
                text=text,
                embedding=embedding,
                dimensions=self._config.dimensions,
                provider=self.name,
                model=self.model,
                metadata={"processing_time": processing_time},
            )

        except Exception as e:
            with self._lock:
                self._total_requests += 1
                self._failed_requests += 1

            raise EmbeddingError(f"Mock embedding generation failed: {e}", provider=self.name) from e

    def embed_batch(self, texts: list[str]) -> BatchEmbeddingResult:
        """Generate embeddings for a batch of texts."""
        self._require_initialized()
        start_time = time.time()

        try:
            results = []
            for text in texts:
                result = self.embed(text)
                results.append(result)

            processing_time = time.time() - start_time

            return BatchEmbeddingResult(
                results=tuple(results),
                total_tokens=sum(len(text.split()) for text in texts),
                processing_time=processing_time,
                metadata={"batch_size": len(texts)},
            )

        except Exception as e:
            raise EmbeddingError(f"Mock batch embedding generation failed: {e}", provider=self.name) from e

    def get_dimensions(self) -> int:
        """Get the embedding dimensions."""
        return self._config.dimensions

    def health(self) -> bool:
        """Check provider health."""
        return self._initialized

    def validate(self) -> EmbeddingValidationResult:
        """Validate provider configuration."""
        result = EmbeddingValidationResult()

        if not self._config.name:
            result.errors.append("Provider name is required")
            result.is_valid = False

        if not self._config.model:
            result.errors.append("Model name is required")
            result.is_valid = False

        if self._config.dimensions <= 0:
            result.errors.append("Dimensions must be positive")
            result.is_valid = False

        return result

    def reload(self) -> MockEmbeddingProvider:
        """Reload provider configuration."""
        self.logger.info("Reloading MockEmbeddingProvider")

        with self._lock:
            self._total_requests = 0
            self._successful_requests = 0
            self._failed_requests = 0
            self._total_tokens = 0
            self._total_latency = 0.0

        return self

    def shutdown(self) -> None:
        """Shutdown the provider."""
        self.logger.info("Shutting down MockEmbeddingProvider")
        self._initialized = False

    def _generate_mock_embedding(self, text: str) -> tuple[float, ...]:
        """Generate a deterministic mock embedding."""
        # Use hash to generate deterministic values
        hash_bytes = hashlib.sha256(text.encode()).digest()

        # Generate embedding values from hash
        embedding = []
        for i in range(self._config.dimensions):
            # Use different bytes from hash for different dimensions
            byte_idx = i % len(hash_bytes)
            value = (hash_bytes[byte_idx] + i) % 256 / 255.0
            # Normalize to [-1, 1]
            embedding.append(value * 2 - 1)

        return tuple(embedding)

    def _require_initialized(self) -> None:
        """Check if provider is initialized."""
        if not self._initialized:
            raise EmbeddingError(f"MockEmbeddingProvider '{self.name}' has not been initialized", provider=self.name)
