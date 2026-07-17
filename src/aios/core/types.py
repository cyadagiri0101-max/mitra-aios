"""Common type definitions for AIOS."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any


class ChecksumAlgorithm(StrEnum):
    SHA256 = "sha256"
    SHA512 = "sha512"
    BLAKE2B = "blake2b"


class FileMode(StrEnum):
    DISCOVERY = "discovery"
    ARCHITECTURE = "architecture"
    IMPLEMENTATION = "implementation"
    VALIDATION = "validation"
    REVIEW = "review"
    GOVERNANCE = "governance"
    RELEASE = "release"
    RECOVERY = "recovery"


class Severity(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class PluginLifecycle(StrEnum):
    INITIALIZE = "initialize"
    EXECUTE = "execute"
    VALIDATE = "validate"
    REPORT = "report"


@dataclass(frozen=True, slots=True)
class FileRecord:
    """Immutable record for a single file in the repository."""

    path: str
    name: str
    extension: str
    size: int
    modified: datetime
    checksum: str
    file_type: str = "file"
    language: str | None = None
    references: tuple[str, ...] = ()
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def is_document(self) -> bool:
        return self.extension in {".md", ".rst", ".txt"}

    @property
    def is_code(self) -> bool:
        return self.extension in {
            ".py",
            ".ts",
            ".tsx",
            ".js",
            ".jsx",
            ".rs",
            ".go",
            ".java",
            ".cs",
            ".rb",
            ".sh",
            ".ps1",
            ".bat",
        }

    @property
    def is_config(self) -> bool:
        return self.extension in {
            ".json",
            ".yaml",
            ".yml",
            ".toml",
            ".ini",
            ".cfg",
            ".conf",
            ".env",
            ".xml",
        }


@dataclass(frozen=True, slots=True)
class SnapshotMetadata:
    """Metadata about a repository snapshot."""

    total_files: int
    total_directories: int
    total_size: int
    file_types: dict[str, int]
    empty_directories: tuple[str, ...]
    duplicate_groups: int
    broken_references: int
    orphan_documents: int
    scanned_at: datetime
    scan_duration_seconds: float


@dataclass(slots=True)
class CommandResult:
    """Result of a CLI command execution."""

    command: str
    status: str = "ok"
    exit_code: int = 0
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: datetime | None = None
    steps: list[dict[str, Any]] = field(default_factory=list)
    errors: list[dict[str, Any]] = field(default_factory=list)
    metrics: dict[str, Any] = field(default_factory=dict)

    @property
    def is_ok(self) -> bool:
        return self.exit_code == 0 and len(self.errors) == 0

    @property
    def is_partial(self) -> bool:
        return self.exit_code == 0 and len(self.errors) > 0

    def finalize(self) -> None:
        self.completed_at = datetime.now()
        if self.errors:
            self.status = "partial"
            self.exit_code = 4
