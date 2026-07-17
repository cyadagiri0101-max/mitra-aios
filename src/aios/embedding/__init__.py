"""AIOS Embedding Layer - unified abstraction for all embedding providers."""

from aios.embedding.cache import EmbeddingCache
from aios.embedding.manager import EmbeddingManager
from aios.embedding.models import (
    BatchEmbeddingResult,
    EmbeddingProviderConfig,
    EmbeddingResult,
    EmbeddingStatistics,
    EmbeddingValidationResult,
)
from aios.embedding.provider import EmbeddingProvider
from aios.embedding.providers import (
    JinaEmbeddingProvider,
    MockEmbeddingProvider,
    NomicEmbeddingProvider,
    OpenAIEmbeddingProvider,
    SentenceTransformersProvider,
    VoyageEmbeddingProvider,
)
from aios.embedding.registry import EmbeddingRegistry

__all__ = [
    # Core components
    "EmbeddingManager",
    "EmbeddingRegistry",
    "EmbeddingCache",
    "EmbeddingProvider",

    # Models
    "EmbeddingResult",
    "BatchEmbeddingResult",
    "EmbeddingProviderConfig",
    "EmbeddingStatistics",
    "EmbeddingValidationResult",

    # Providers
    "MockEmbeddingProvider",
    "OpenAIEmbeddingProvider",
    "VoyageEmbeddingProvider",
    "JinaEmbeddingProvider",
    "NomicEmbeddingProvider",
    "SentenceTransformersProvider",
]
