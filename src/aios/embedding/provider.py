"""Abstract base class for embedding providers."""

from __future__ import annotations

from abc import ABC, abstractmethod

from aios.embedding.models import (
    BatchEmbeddingResult,
    EmbeddingResult,
    EmbeddingStatistics,
    EmbeddingValidationResult,
)


class EmbeddingProvider(ABC):
    """Abstract base class for embedding providers."""

    @abstractmethod
    def initialize(self) -> EmbeddingProvider:
        """Initialize the embedding provider."""
        pass

    @abstractmethod
    def embed(self, text: str) -> EmbeddingResult:
        """Generate embedding for a single text."""
        pass

    @abstractmethod
    def embed_batch(self, texts: list[str]) -> BatchEmbeddingResult:
        """Generate embeddings for a batch of texts."""
        pass

    @abstractmethod
    def get_dimensions(self) -> int:
        """Get the embedding dimensions."""
        pass

    @abstractmethod
    def health(self) -> bool:
        """Check provider health."""
        pass

    @abstractmethod
    def validate(self) -> EmbeddingValidationResult:
        """Validate provider configuration."""
        pass

    @abstractmethod
    def reload(self) -> EmbeddingProvider:
        """Reload provider configuration."""
        pass

    @abstractmethod
    def shutdown(self) -> None:
        """Shutdown the provider."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Get provider name."""
        pass

    @property
    @abstractmethod
    def model(self) -> str:
        """Get provider model."""
        pass

    @property
    @abstractmethod
    def is_initialized(self) -> bool:
        """Check if provider is initialized."""
        pass

    @property
    @abstractmethod
    def statistics(self) -> EmbeddingStatistics:
        """Get provider statistics."""
        pass
