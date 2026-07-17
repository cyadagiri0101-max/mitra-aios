"""SHA-256 file hashing with incremental reads and optional caching."""

from __future__ import annotations

import hashlib
from pathlib import Path

from aios.core.exceptions import RepositoryError
from aios.core.types import ChecksumAlgorithm


class HashCalculator:
    """Compute file checksums using configurable algorithms.

    Supports SHA-256 (default), SHA-512, and BLAKE2b.
    Reads files in chunks to handle large files without excessive memory.
    """

    _CHUNK_SIZE = 65_536

    def __init__(
        self,
        algorithm: ChecksumAlgorithm = ChecksumAlgorithm.SHA256,
        cache: dict[str, str] | None = None,
    ) -> None:
        self._algorithm = algorithm
        self._cache: dict[str, str] = cache if cache is not None else {}

    @property
    def algorithm(self) -> ChecksumAlgorithm:
        return self._algorithm

    def hash_file(self, path: Path, mtime: float | None = None) -> str:
        """Return the hex digest for *path*, using cache when possible.

        If *mtime* is provided and matches the cached mtime, the cached
        digest is returned without re-reading the file.
        """
        cache_key = f"{path}:{mtime}" if mtime is not None else str(path)
        if cache_key in self._cache:
            return self._cache[cache_key]

        digest = self._compute(path)
        self._cache[cache_key] = digest
        return digest

    def _compute(self, path: Path) -> str:
        try:
            h = hashlib.new(self._algorithm.value)
        except ValueError:
            h = hashlib.sha256()

        try:
            with path.open("rb") as fh:
                while True:
                    chunk = fh.read(self._CHUNK_SIZE)
                    if not chunk:
                        break
                    h.update(chunk)
        except (OSError, PermissionError) as exc:
            raise RepositoryError(
                f"Cannot read file for hashing: {path}",
                details={"path": str(path), "error": str(exc)},
            ) from exc

        return h.hexdigest()

    def clear_cache(self) -> None:
        self._cache.clear()

    def cache_stats(self) -> dict[str, int]:
        return {"entries": len(self._cache)}
