"""Embedding providers."""

from aios.embedding.providers.jina import JinaEmbeddingProvider
from aios.embedding.providers.mock import MockEmbeddingProvider
from aios.embedding.providers.nomic import NomicEmbeddingProvider
from aios.embedding.providers.openai import OpenAIEmbeddingProvider
from aios.embedding.providers.sentence_transformers import SentenceTransformersProvider
from aios.embedding.providers.voyage import VoyageEmbeddingProvider

__all__ = [
    "JinaEmbeddingProvider",
    "MockEmbeddingProvider",
    "NomicEmbeddingProvider",
    "OpenAIEmbeddingProvider",
    "SentenceTransformersProvider",
    "VoyageEmbeddingProvider",
]
