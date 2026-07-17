"""AIOS Vector Store Layer - unified abstraction for all vector store providers."""

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
from aios.vectorstore.provider import VectorStoreProvider
from aios.vectorstore.providers import (
    ChromaVectorStore,
    FAISSVectorStore,
    InMemoryVectorStore,
    MilvusVectorStore,
    PineconeVectorStore,
    QdrantVectorStore,
    WeaviateVectorStore,
)

__all__ = [
    # Core components
    "VectorStoreManager",
    "VectorStoreProvider",

    # Models
    "VectorRecord",
    "VectorSearchResult",
    "VectorStoreConfig",
    "VectorStoreStatistics",
    "VectorStoreValidationResult",
    "DistanceMetric",
    "IndexType",

    # Providers
    "InMemoryVectorStore",
    "FAISSVectorStore",
    "ChromaVectorStore",
    "QdrantVectorStore",
    "MilvusVectorStore",
    "PineconeVectorStore",
    "WeaviateVectorStore",
]
