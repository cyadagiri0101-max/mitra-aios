"""Data models for embedding layer."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class EmbeddingStatus(StrEnum):
    """Embedding operation status."""
    SUCCESS = "success"
    ERROR = "error"
    TIMEOUT = "timeout"
    RATE_LIMITED = "rate_limited"


@dataclass(frozen=True, slots=True)
class EmbeddingResult:
    """Result of an embedding operation."""
    text: str = ""
    embedding: tuple[float, ...] = ()
    dimensions: int = 0
    provider: str = ""
    model: str = ""
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class BatchEmbeddingResult:
    """Result of a batch embedding operation."""
    results: tuple[EmbeddingResult, ...] = ()
    total_tokens: int = 0
    processing_time: float = 0.0
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class EmbeddingProviderConfig:
    """Configuration for an embedding provider."""
    name: str = ""
    model: str = ""
    api_key: str = ""
    api_base: str = ""
    dimensions: int = 384
    batch_size: int = 32
    timeout: float = 30.0
    max_retries: int = 3
    metadata: dict = field(default_factory=dict)


@dataclass(slots=True)
class EmbeddingStatistics:
    """Statistics for embedding operations."""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    total_tokens_processed: int = 0
    average_latency: float = 0.0
    cache_hits: int = 0
    cache_misses: int = 0
    batch_operations: int = 0


@dataclass(slots=True)
class EmbeddingValidationResult:
    """Validation result for embedding operations."""
    is_valid: bool = True
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
