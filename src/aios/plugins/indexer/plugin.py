"""IndexerPlugin — build file registry, dependency graph, and search index."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from typing import Any

from aios.plugins.base import BasePlugin
from aios.utils.serialization import read_json

_MARKDOWN_LINK = re.compile(r"\[([^\]]*)\]\(([^)]+)\)")
_FILE_REF = re.compile(r"([\w\-./]+\.(?:md|json|yaml|yml|py|ts|tsx|js))")


class IndexerPlugin(BasePlugin):
    """Build structured indexes from scan results.

    Produces:
    - index.json: full file registry with references
    - summary.json: condensed summary for context loading
    """

    name = "indexer"

    def initialize(self) -> None:
        self.logger.info("Indexer initialized")

    def execute(self, context: dict[str, Any] | None = None) -> dict[str, Any]:
        scan_path = self.config.index_dir / "scan.json"
        if not scan_path.exists():
            self.logger.warning("No scan.json found; run scanner first")
            return {"status": "skipped", "reason": "no scan data"}

        scan = read_json(scan_path)
        files = scan.get("data", {}).get("files", [])

        registry = self._build_registry(files)
        dep_graph = self._build_dependency_graph(files)
        search_index = self._build_search_index(files)
        summary = self._build_summary(scan, registry, dep_graph)

        index_data = {
            "schemaVersion": "1.1.0",
            "type": "full-index",
            "registry": registry,
            "dependencyGraph": dep_graph,
            "searchIndex": search_index,
        }

        index_path = self.config.index_dir / "index.json"
        summary_path = self.config.index_dir / "summary.json"
        index_path.parent.mkdir(parents=True, exist_ok=True)
        index_path.write_text(
            json.dumps(index_data, indent=2, default=str), encoding="utf-8"
        )
        summary_path.write_text(
            json.dumps(summary, indent=2, default=str), encoding="utf-8"
        )

        self.logger.info(
            "Index built: %d files, %d references, %d search entries",
            len(registry),
            len(dep_graph),
            len(search_index),
        )
        return {
            "status": "ok",
            "registryCount": len(registry),
            "dependencyCount": len(dep_graph),
            "searchCount": len(search_index),
            "indexFile": str(index_path),
            "summaryFile": str(summary_path),
        }

    def validate(self, payload: dict[str, Any]) -> dict[str, Any]:
        if payload.get("status") == "skipped":
            return {"ok": False, "reason": payload.get("reason")}
        return {
            "ok": payload.get("registryCount", 0) > 0,
            "registryCount": payload.get("registryCount", 0),
            "dependencyCount": payload.get("dependencyCount", 0),
        }

    def report(self, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "indexFile": payload.get("indexFile", ""),
            "summaryFile": payload.get("summaryFile", ""),
            "registryCount": payload.get("registryCount", 0),
        }

    def _build_registry(self, files: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
        registry: dict[str, dict[str, Any]] = {}
        for f in files:
            path = f.get("path", "")
            registry[path] = {
                "name": f.get("name", ""),
                "extension": f.get("extension", ""),
                "size": f.get("size", 0),
                "fileType": f.get("fileType", "file"),
                "language": f.get("language"),
                "checksum": f.get("checksum", ""),
            }
        return registry

    def _build_dependency_graph(
        self, files: list[dict[str, Any]]
    ) -> dict[str, list[str]]:
        graph: dict[str, list[str]] = defaultdict(list)
        existing = {f.get("path", "") for f in files}

        for f in files:
            path = f.get("path", "")
            ext = f.get("extension", "")
            if ext not in {".md", ".yaml", ".yml", ".json", ".py", ".ts", ".tsx"}:
                continue

            full_path = self.config.repo_root / path
            if not full_path.exists():
                continue

            try:
                content = full_path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue

            refs: set[str] = set()
            for match in _MARKDOWN_LINK.finditer(content):
                refs.add(match.group(2))
            for match in _FILE_REF.finditer(content):
                refs.add(match.group(1))

            for ref in refs:
                if ref.startswith(("http", "#", "mailto:")):
                    continue
                normalized = ref.replace("\\", "/").lstrip("./")
                if normalized in existing:
                    graph[path].append(normalized)

        return dict(graph)

    def _build_search_index(self, files: list[dict[str, Any]]) -> list[dict[str, str]]:
        entries: list[dict[str, str]] = []
        for f in files:
            path = f.get("path", "")
            ext = f.get("extension", "")
            if ext not in {".md", ".py", ".ts", ".tsx", ".js", ".yaml", ".json"}:
                continue
            entries.append(
                {
                    "path": path,
                    "name": f.get("name", ""),
                    "type": f.get("fileType", "file"),
                    "language": f.get("language") or "",
                }
            )
        return entries

    def _build_summary(
        self,
        scan: dict[str, Any],
        registry: dict[str, Any],
        dep_graph: dict[str, list[str]],
    ) -> dict[str, Any]:
        summary = scan.get("summary", {})
        return {
            "schemaVersion": "1.1.0",
            "type": "index-summary",
            "totalFiles": summary.get("totalFiles", 0),
            "totalDirectories": summary.get("totalDirectories", 0),
            "totalSize": summary.get("totalSize", 0),
            "fileTypes": summary.get("fileTypes", {}),
            "registryEntries": len(registry),
            "dependencyEdges": sum(len(v) for v in dep_graph.values()),
            "emptyDirectories": summary.get("emptyDirectories", []),
            "duplicateGroupCount": summary.get("duplicateGroupCount", 0),
        }
