"""Data models for vector store layer."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class DistanceMetric(StrEnum):
    """Distance metrics for vector similarity."""
    COSINE = "cosine"
    EUCLIDEAN = "euclidean"
    DOT_PRODUCT = "dot_product"
    MANHATTAN = "manhattan"


class IndexType(StrEnum):
    """Vector index types."""
    FLAT = "flat"
    HNSW = "hnsw"
    IVF = "ivf"
    ANNOY = "annoy"


@dataclass(frozen=True, slots=True)
class VectorRecord:
    """Vector record model."""
    id: str = ""
    vector: tuple[float, ...] = ()
    metadata: dict = field(default_factory=dict)
    namespace: str = "default"


@dataclass(frozen=True, slots=True)
class VectorSearchResult:
    """Vector search result model."""
    record: VectorRecord
    score: float = 0.0
    rank: int = 0


@dataclass(frozen=True, slots=True)
class VectorStoreConfig:
    """Vector store configuration."""
    name: str = ""
    dimensions: int = 384
    distance_metric: DistanceMetric = DistanceMetric.COSINE
    index_type: IndexType = IndexType.FLAT
    namespace: str = "default"
    metadata: dict = field(default_factory=dict)


@dataclass(slots=True)
class VectorStoreStatistics:
    """Vector store statistics."""
    total_vectors: int = 0
    namespaces: list[str] = field(default_factory=list)
    dimensions: int = 0
    index_type: str = ""
    distance_metric: str = ""


@dataclass(slots=True)
class VectorStoreValidationResult:
    """Vector store validation result."""
    is_valid: bool = True
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
