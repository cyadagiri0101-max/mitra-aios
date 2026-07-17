"""Memory data models for AIOS memory system."""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from enum import StrEnum


class MemoryType(StrEnum):
    WORKING = "working"
    EPISODIC = "episodic"
    SEMANTIC = "semantic"


class SemanticEntryType(StrEnum):
    FACT = "fact"
    SKILL = "skill"
    CONCEPT = "concept"
    RELATIONSHIP = "relationship"


@dataclass(frozen=True, slots=True)
class WorkingMemoryEntry:
    id: str = ""
    execution_id: str = ""
    content: str = ""
    type: str = "general"
    timestamp: float = 0.0
    importance: float = 0.0
    metadata: dict = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "id", self.id or str(uuid.uuid4()))
        object.__setattr__(self, "timestamp", self.timestamp or time.time())


@dataclass(frozen=True, slots=True)
class EpisodicEntry:
    id: str = ""
    execution_id: str = ""
    timestamp: float = 0.0
    goal: str = ""
    workflow: dict = field(default_factory=dict)
    outcome: str = ""
    observations: list[str] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "id", self.id or str(uuid.uuid4()))
        object.__setattr__(self, "timestamp", self.timestamp or time.time())


@dataclass(frozen=True, slots=True)
class SemanticEntry:
    id: str = ""
    entry_type: SemanticEntryType = SemanticEntryType.FACT
    content: str = ""
    tags: tuple[str, ...] = ()
    source: str = "memory"
    confidence: float = 1.0
    relationships: dict[str, list[str]] = field(default_factory=dict)
    created_at: float = 0.0
    updated_at: float = 0.0

    def __post_init__(self) -> None:
        now = time.time()
        object.__setattr__(self, "id", self.id or str(uuid.uuid4()))
        object.__setattr__(self, "created_at", self.created_at or now)
        object.__setattr__(self, "updated_at", self.updated_at or now)


@dataclass(frozen=True, slots=True)
class RetrievalResult:
    entry: WorkingMemoryEntry | EpisodicEntry | SemanticEntry
    score: float = 0.0
    source_type: MemoryType = MemoryType.WORKING


@dataclass(frozen=True, slots=True)
class ConsolidationResult:
    moved_to_episodic: list[str] = field(default_factory=list)
    moved_to_semantic: list[str] = field(default_factory=list)
    removed_from_working: list[str] = field(default_factory=list)
    deduplicated: list[str] = field(default_factory=list)
    expired: list[str] = field(default_factory=list)


@dataclass(slots=True)
class MemoryStatistics:
    working_entries: int = 0
    episodic_entries: int = 0
    semantic_entries: int = 0
    retrieval_count: int = 0
    store_size_bytes: int = 0
    evictions: int = 0
    consolidations: int = 0
    average_retrieval_latency: float = 0.0


@dataclass(slots=True)
class MemoryValidationResult:
    is_valid: bool = True
    duplicate_ids: list[str] = field(default_factory=list)
    invalid_timestamps: list[str] = field(default_factory=list)
    broken_relationships: list[str] = field(default_factory=list)
    capacity_overflow: bool = False
    orphan_records: list[str] = field(default_factory=list)
    inconsistent_statistics: bool = False
    warnings: list[str] = field(default_factory=list)
