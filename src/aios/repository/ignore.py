"""Gitignore-aware directory and file ignore rules."""

from __future__ import annotations

_DEFAULT_IGNORE_DIRS: frozenset[str] = frozenset(
    {
        ".git",
        ".svn",
        ".hg",
        "__pycache__",
        "node_modules",
        ".venv",
        "venv",
        ".tox",
        ".mypy_cache",
        ".pytest_cache",
        ".ruff_cache",
        "dist",
        "build",
        ".eggs",
        "*.egg-info",
    }
)

_DEFAULT_IGNORE_FILES: frozenset[str] = frozenset(
    {
        ".DS_Store",
        "Thumbs.db",
        "*.pyc",
        "*.pyo",
    }
)


class IgnoreRules:
    """Determine whether directories and files should be skipped during scanning.

    Supports default ignore patterns and optional gitignore-style globs.
    """

    def __init__(
        self,
        extra_dirs: set[str] | None = None,
        extra_files: set[str] | None = None,
    ) -> None:
        self._dir_patterns = set(_DEFAULT_IGNORE_DIRS) | (extra_dirs or set())
        self._file_patterns = set(_DEFAULT_IGNORE_FILES) | (extra_files or set())

    def should_skip_directory(self, name: str) -> bool:
        """Return True if the directory should be excluded from traversal."""
        if name.startswith("."):
            return True
        if name in self._dir_patterns:
            return True
        for pattern in self._dir_patterns:
            if pattern.startswith("*") and name.endswith(pattern[1:]):
                return True
        return False

    def should_skip_file(self, name: str) -> bool:
        """Return True if the file should be excluded from scanning."""
        for pattern in self._file_patterns:
            if pattern.startswith("*") and name.endswith(pattern[1:]):
                return True
            if name == pattern:
                return True
        return False

    def filter_directories(self, names: list[str]) -> list[str]:
        """Return only directories that should be traversed."""
        return [n for n in names if not self.should_skip_directory(n)]
