"""Repository snapshot: immutable result of a full repository scan."""

from __future__ import annotations

import json
import time
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

from aios.core.types import FileRecord, SnapshotMetadata
from aios.repository.walker import RepositoryWalker


class RepositorySnapshot:
    """Build and hold the result of scanning a repository.

    Produces a structured index suitable for serialization to JSON.
    """

    def __init__(self, repo_root: Path, walker: RepositoryWalker | None = None) -> None:
        self.repo_root = repo_root.resolve()
        self._walker = walker or RepositoryWalker(self.repo_root)
        self._files: list[FileRecord] = []
        self._directories: list[dict[str, Any]] = []
        self._empty_dirs: list[str] = []
        self._file_types: dict[str, int] = defaultdict(int)
        self._hash_groups: dict[str, list[str]] = defaultdict(list)
        self._total_size: int = 0
        self._metadata: SnapshotMetadata | None = None

    @property
    def files(self) -> list[FileRecord]:
        return list(self._files)

    @property
    def metadata(self) -> SnapshotMetadata | None:
        return self._metadata

    def scan(self) -> dict[str, Any]:
        """Execute the full repository scan and return the index dict."""
        start = time.monotonic()
        self._files.clear()
        self._directories.clear()
        self._empty_dirs.clear()
        self._file_types.clear()
        self._hash_groups.clear()
        self._total_size = 0

        dir_count = 0
        for root_path, dirs, records in self._walker.walk():
            rel = root_path.relative_to(self.repo_root)
            if rel != Path("."):
                dir_count += 1
                self._directories.append(
                    {
                        "path": str(rel).replace("\\", "/"),
                        "name": root_path.name,
                        "file_count": len(records),
                        "subdirectory_count": len(dirs),
                    }
                )
                if len(records) == 0 and len(dirs) == 0:
                    self._empty_dirs.append(str(rel).replace("\\", "/"))

            for record in records:
                self._files.append(record)
                self._file_types[record.extension] += 1
                self._total_size += record.size
                if record.checksum:
                    self._hash_groups[record.checksum].append(record.path)

        elapsed = time.monotonic() - start
        dup_groups = sum(1 for v in self._hash_groups.values() if len(v) > 1)

        self._metadata = SnapshotMetadata(
            total_files=len(self._files),
            total_directories=dir_count,
            total_size=self._total_size,
            file_types=dict(self._file_types),
            empty_directories=tuple(self._empty_dirs),
            duplicate_groups=dup_groups,
            broken_references=0,
            orphan_documents=0,
            scanned_at=datetime.now(),
            scan_duration_seconds=round(elapsed, 3),
        )

        return self.to_dict()

    def to_dict(self) -> dict[str, Any]:
        """Serialize the snapshot to a JSON-compatible dictionary."""
        if self._metadata is None:
            self.scan()

        meta = self._metadata
        assert meta is not None

        duplicates = [
            {"hash": h, "files": files}
            for h, files in self._hash_groups.items()
            if len(files) > 1
        ]

        return {
            "schemaVersion": "1.1.0",
            "status": "generated",
            "updated": meta.scanned_at.isoformat(),
            "repositoryRoot": str(self.repo_root),
            "summary": {
                "totalFiles": meta.total_files,
                "totalDirectories": meta.total_directories,
                "totalSize": meta.total_size,
                "fileTypes": meta.file_types,
                "emptyDirectories": list(meta.empty_directories),
                "duplicateGroups": duplicates,
                "duplicateGroupCount": meta.duplicate_groups,
                "brokenReferences": meta.broken_references,
                "orphanDocuments": meta.orphan_documents,
                "scanDurationSeconds": meta.scan_duration_seconds,
            },
            "data": {
                "directories": self._directories,
                "files": [
                    {
                        "path": f.path,
                        "name": f.name,
                        "extension": f.extension,
                        "size": f.size,
                        "modified": f.modified.isoformat(),
                        "checksum": f.checksum,
                        "fileType": f.file_type,
                        "language": f.language,
                    }
                    for f in self._files
                ],
            },
        }

    def save(self, output_path: Path) -> Path:
        """Write the index to a JSON file."""
        data = self.to_dict()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        return output_path
