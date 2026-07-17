"""Data models for RAG engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class SearchMethod(StrEnum):
    """Search method types."""
    VECTOR = "vector"
    BM25 = "bm25"
    HYBRID = "hybrid"
    KEYWORD = "keyword"


class ChunkStrategy(StrEnum):
    """Document chunking strategies."""
    FIXED_SIZE = "fixed_size"
    SENTENCE = "sentence"
    PARAGRAPH = "paragraph"
    SEMANTIC = "semantic"


@dataclass(frozen=True, slots=True)
class Document:
    """Document model."""
    id: str = ""
    content: str = ""
    metadata: dict = field(default_factory=dict)
    embedding: tuple[float, ...] = ()


@dataclass(frozen=True, slots=True)
class Chunk:
    """Document chunk model."""
    id: str = ""
    document_id: str = ""
    content: str = ""
    start_index: int = 0
    end_index: int = 0
    metadata: dict = field(default_factory=dict)
    embedding: tuple[float, ...] = ()


@dataclass(frozen=True, slots=True)
class SearchResult:
    """Search result model."""
    chunk: Chunk
    score: float = 0.0
    rank: int = 0
    method: SearchMethod = SearchMethod.VECTOR


@dataclass(frozen=True, slots=True)
class Citation:
    """Citation model."""
    chunk_id: str = ""
    document_id: str = ""
    content: str = ""
    score: float = 0.0
    position: int = 0


@dataclass(frozen=True, slots=True)
class QueryPlan:
    """Query plan model."""
    original_query: str = ""
    optimized_query: str = ""
    search_method: SearchMethod = SearchMethod.HYBRID
    filters: dict = field(default_factory=dict)
    top_k: int = 10


@dataclass(slots=True)
class RAGStatistics:
    """RAG statistics model."""
    documents_indexed: int = 0
    chunks_indexed: int = 0
    searches_performed: int = 0
    average_search_latency: float = 0.0
    cache_hits: int = 0
    cache_misses: int = 0


@dataclass(slots=True)
class RAGValidationResult:
    """RAG validation result model."""
    is_valid: bool = True
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
