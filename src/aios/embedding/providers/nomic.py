"""Nomic AI embedding provider."""

from __future__ import annotations

import threading

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


class NomicEmbeddingProvider(EmbeddingProvider):
    """Nomic AI embedding provider."""

    def __init__(self, config: EmbeddingProviderConfig | None = None) -> None:
        self.logger = get_logger("aios.embedding.nomic_provider")
        self._config = config or EmbeddingProviderConfig(
            name="nomic",
            model="nomic-embed-text-v1.5",
            api_base="https://api-atlas.nomic.ai/v1",
            dimensions=768,
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

    def initialize(self) -> NomicEmbeddingProvider:
        """Initialize the provider."""
        self._initialized = True
        self.logger.info("NomicEmbeddingProvider initialized (model=%s)", self._config.model)
        return self

    def embed(self, text: str) -> EmbeddingResult:
        """Generate embedding for a single text."""
        self._require_initialized()
        self._validate_config()
        raise NotImplementedError("Nomic AI API transport not implemented")

    def embed_batch(self, texts: list[str]) -> BatchEmbeddingResult:
        """Generate embeddings for a batch of texts."""
        self._require_initialized()
        self._validate_config()
        raise NotImplementedError("Nomic AI API transport not implemented")

    def get_dimensions(self) -> int:
        """Get the embedding dimensions."""
        return self._config.dimensions

    def health(self) -> bool:
        """Check provider health."""
        return self._initialized and bool(self._config.api_key)

    def validate(self) -> EmbeddingValidationResult:
        """Validate provider configuration."""
        result = EmbeddingValidationResult()

        if not self._config.api_key:
            result.warnings.append("Nomic AI API key not configured")

        if not self._config.model:
            result.errors.append("Nomic AI model not configured")
            result.is_valid = False

        return result

    def reload(self) -> NomicEmbeddingProvider:
        """Reload provider configuration."""
        self.logger.info("Reloading NomicEmbeddingProvider")

        with self._lock:
            self._total_requests = 0
            self._successful_requests = 0
            self._failed_requests = 0
            self._total_tokens = 0
            self._total_latency = 0.0

        return self

    def shutdown(self) -> None:
        """Shutdown the provider."""
        self.logger.info("Shutting down NomicEmbeddingProvider")
        self._initialized = False

    def _validate_config(self) -> None:
        """Validate configuration."""
        if not self._config.api_key:
            raise EmbeddingError("Nomic AI API key not configured", provider=self.name)

    def _require_initialized(self) -> None:
        """Check if provider is initialized."""
        if not self._initialized:
            raise EmbeddingError(f"NomicEmbeddingProvider '{self.name}' has not been initialized", provider=self.name)
