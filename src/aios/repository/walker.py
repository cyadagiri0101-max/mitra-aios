"""Repository tree walker with ignore rules and file record collection."""

from __future__ import annotations

import os
from collections.abc import Iterator
from datetime import datetime
from pathlib import Path

from aios.core.types import FileRecord
from aios.repository.classifier import FileClassifier
from aios.repository.hashing import HashCalculator
from aios.repository.ignore import IgnoreRules


class RepositoryWalker:
    """Walk a repository tree, yielding FileRecord instances.

    Respects ignore rules, classifies files, and computes checksums.
    """

    def __init__(
        self,
        repo_root: Path,
        ignore: IgnoreRules | None = None,
        classifier: FileClassifier | None = None,
        hasher: HashCalculator | None = None,
        skip_hashing: bool = False,
    ) -> None:
        self.repo_root = repo_root.resolve()
        self._ignore = ignore or IgnoreRules()
        self._classifier = classifier or FileClassifier()
        self._hasher = hasher or HashCalculator()
        self._skip_hashing = skip_hashing

    def walk(self) -> Iterator[tuple[Path, list[str], list[FileRecord]]]:
        """Yield (directory_path, subdirectory_names, file_records) tuples.

        Subdirectory names are filtered in-place to respect ignore rules.
        """
        for root, dirs, files in os.walk(self.repo_root):
            dirs[:] = sorted(self._ignore.filter_directories(dirs))
            root_path = Path(root)
            records: list[FileRecord] = []

            for name in sorted(files):
                if self._ignore.should_skip_file(name):
                    continue
                file_path = root_path / name
                record = self._build_record(file_path)
                if record is not None:
                    records.append(record)

            yield root_path, dirs, records

    def _build_record(self, file_path: Path) -> FileRecord | None:
        try:
            stat = file_path.stat()
        except (OSError, PermissionError):
            return None

        ext = file_path.suffix.lower() or "no_extension"
        rel = str(file_path.relative_to(self.repo_root)).replace("\\", "/")

        checksum = ""
        if not self._skip_hashing and not self._classifier.is_binary(ext):
            try:
                checksum = self._hasher.hash_file(file_path, stat.st_mtime)
            except Exception:
                checksum = ""

        return FileRecord(
            path=rel,
            name=file_path.name,
            extension=ext,
            size=stat.st_size,
            modified=datetime.fromtimestamp(stat.st_mtime),
            checksum=checksum,
            file_type=self._classifier.classify_type(ext),
            language=self._classifier.classify_language(ext),
        )
