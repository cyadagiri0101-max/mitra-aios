"""ScannerPlugin — repository scanning, metadata extraction, dependency discovery."""

from __future__ import annotations

import json
import re
from typing import Any

from aios.core.config import AIOSConfig
from aios.plugins.base import BasePlugin
from aios.repository.snapshot import RepositorySnapshot

_REFERENCE_PATTERNS = (
    re.compile(r"\[([^\]]+)\]\(([^)]+)\)"),
    re.compile(r"(?:from|import)\s+([\w.]+)"),
)

_DEPENDENCY_FILES = {
    "package.json",
    "pyproject.toml",
    "requirements.txt",
    "Cargo.toml",
    "go.mod",
    "Gemfile",
}


class ScannerPlugin(BasePlugin):
    """Scan the repository, extract metadata, discover dependencies."""

    name = "scanner"

    def __init__(self, config: AIOSConfig) -> None:
        super().__init__(config)
        self._snapshot: RepositorySnapshot | None = None

    def initialize(self) -> None:
        self._snapshot = RepositorySnapshot(self.config.repo_root)
        self.logger.info("Scanner initialized for %s", self.config.repo_root)

    def execute(self, context: dict[str, Any] | None = None) -> dict[str, Any]:
        assert self._snapshot is not None
        index = self._snapshot.scan()

        dependencies = self._discover_dependencies()
        languages = self._detect_languages(index)
        index["summary"]["dependencies"] = dependencies
        index["summary"]["languages"] = languages

        output = self.config.index_dir / "scan.json"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(index, indent=2, default=str), encoding="utf-8")
        self.logger.info(
            "Scan complete: %d files, %d directories",
            index["summary"]["totalFiles"],
            index["summary"]["totalDirectories"],
        )
        return index

    def validate(self, payload: dict[str, Any]) -> dict[str, Any]:
        summary = payload.get("summary", {})
        total = summary.get("totalFiles", 0)
        return {
            "ok": isinstance(summary, dict) and total >= 0,
            "totalFiles": total,
            "totalDirectories": summary.get("totalDirectories", 0),
            "hasDependencies": bool(summary.get("dependencies")),
            "hasLanguages": bool(summary.get("languages")),
        }

    def report(self, payload: dict[str, Any]) -> dict[str, Any]:
        summary = payload.get("summary", {})
        return {
            "scanFile": str(self.config.index_dir / "scan.json"),
            "totalFiles": summary.get("totalFiles", 0),
            "totalDirectories": summary.get("totalDirectories", 0),
            "scanDuration": summary.get("scanDurationSeconds", 0),
        }

    def _discover_dependencies(self) -> dict[str, Any]:
        deps: dict[str, Any] = {}
        for dep_file in _DEPENDENCY_FILES:
            path = self.config.repo_root / dep_file
            if path.exists():
                try:
                    if dep_file == "package.json":
                        data = json.loads(path.read_text(encoding="utf-8"))
                        deps["npm"] = {
                            "name": data.get("name", ""),
                            "dependencies": list(data.get("dependencies", {}).keys()),
                            "devDependencies": list(
                                data.get("devDependencies", {}).keys()
                            ),
                        }
                    elif dep_file == "requirements.txt":
                        lines = path.read_text(encoding="utf-8").strip().splitlines()
                        deps["pip"] = [
                            line.split("==")[0].split(">=")[0].strip()
                            for line in lines
                            if line.strip() and not line.startswith("#")
                        ]
                    elif dep_file == "pyproject.toml":
                        deps["pyproject"] = path.read_text(encoding="utf-8")[:500]
                except Exception:
                    pass
        return deps

    def _detect_languages(self, index: dict[str, Any]) -> dict[str, int]:
        languages: dict[str, int] = {}
        for file_info in index.get("data", {}).get("files", []):
            lang = file_info.get("language")
            if lang:
                languages[lang] = languages.get(lang, 0) + 1
        return dict(sorted(languages.items(), key=lambda x: x[1], reverse=True))
