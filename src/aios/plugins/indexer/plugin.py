"""IndexerPlugin — build file registry, dependency graph, and search index."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import date
from typing import Any

from aios.plugins.base import BasePlugin
from aios.utils.serialization import read_json

_MARKDOWN_LINK = re.compile(r"\[([^\]]*)\]\(([^)]+)\)")
_FILE_REF = re.compile(r"([\w\-./]+\.(?:md|json|yaml|yml|py|ts|tsx|js))")

_REGISTRY_SCHEMA_VERSION = "1.1.0"
_REGISTRY_STATUS = "generated"

_REGISTRY_NAMES: tuple[str, ...] = (
    "document",
    "engine",
    "agent",
    "playbook",
    "template",
    "knowledge",
    "capability",
    "prompt",
    "checklist",
    "workflow",
)

_WELL_KNOWN_ENTRIES: dict[str, list[dict[str, str | list[str]]]] = {
    "document": [
        {
            "id": "AGENTS.md",
            "title": "AGENTS.md",
            "path": "AGENTS.md",
            "category": "document",
            "status": "active",
            "version": "1.0",
            "owner": "system",
            "last_updated": "2026-07-20",
            "resolved_links": [],
        },
    ],
    "engine": [
        {
            "id": "engines::RISK_ENGINE",
            "title": "Risk Engine",
            "path": "engines/RISK_ENGINE",
            "category": "engines",
            "status": "active",
            "version": "1.0",
            "owner": "system",
            "last_updated": "2026-07-20",
            "resolved_links": [],
        },
        {
            "id": "engines::ARCHITECTURE_ENGINE",
            "title": "Architecture Engine",
            "path": "engines/ARCHITECTURE_ENGINE",
            "category": "engines",
            "status": "active",
            "version": "1.0",
            "owner": "system",
            "last_updated": "2026-07-20",
            "resolved_links": ["AGENTS.md", "README.md"],
        },
    ],
}


def _eos_entry(
    file: dict[str, Any],
    category: str,
    links: tuple[str, ...] = (),
) -> dict[str, Any]:
    path = file.get("path", "")
    name = file.get("name", "")
    return {
        "id": path,
        "title": name,
        "path": path,
        "category": category,
        "status": "active",
        "version": "1.0",
        "owner": "unknown",
        "last_updated": str(date.today()),
        "resolved_links": list(links),
    }


class IndexerPlugin(BasePlugin):
    """Build structured indexes from scan results.

    Produces:
    - index.json: full file registry with references
    - summary.json: condensed summary for context loading
    - *-registry.json: EOSLoader-compatible registry files
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
            "schemaVersion": _REGISTRY_SCHEMA_VERSION,
            "type": "full-index",
            "registry": registry,
            "dependencyGraph": dep_graph,
            "searchIndex": search_index,
        }

        index_dir = self.config.index_dir
        index_dir.mkdir(parents=True, exist_ok=True)

        index_path = index_dir / "index.json"
        summary_path = index_dir / "summary.json"
        index_path.write_text(
            json.dumps(index_data, indent=2, default=str), encoding="utf-8"
        )
        summary_path.write_text(
            json.dumps(summary, indent=2, default=str), encoding="utf-8"
        )

        self._write_registries(files, dep_graph)

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

    def _write_registries(
        self,
        files: list[dict[str, Any]],
        dep_graph: dict[str, list[str]],
    ) -> None:
        index_dir = self.config.index_dir

        for reg_name in _REGISTRY_NAMES:
            entries = self._build_registry_entries(files, dep_graph, reg_name)
            reg_data = {
                "schemaVersion": _REGISTRY_SCHEMA_VERSION,
                "status": _REGISTRY_STATUS,
                "data": {reg_name: entries},
            }
            reg_path = index_dir / f"{reg_name}-registry.json"
            reg_path.write_text(
                json.dumps(reg_data, indent=2, default=str), encoding="utf-8"
            )
            self.logger.debug("Wrote %s with %d entries", reg_path.name, len(entries))

        self.logger.info(
            "Wrote %d EOS-compatible registry files", len(_REGISTRY_NAMES)
        )

    def _build_registry_entries(
        self,
        files: list[dict[str, Any]],
        dep_graph: dict[str, list[str]],
        reg_name: str,
    ) -> list[dict[str, Any]]:
        entries: list[dict[str, Any]] = []

        seen_ids: set[str] = set()

        for f in files:
            path = f.get("path", "")
            ext = f.get("extension", "")
            name = f.get("name", "")
            links = tuple(dep_graph.get(path, []))

            if reg_name == "document":
                if ext == ".md":
                    entry = _eos_entry(f, "document", links)
                    if entry["id"] not in seen_ids:
                        seen_ids.add(entry["id"])
                        entries.append(entry)

            elif reg_name in ("engine", "agent", "playbook", "template",
                              "knowledge", "capability", "prompt", "checklist", "workflow"):
                entry = _eos_entry(f, reg_name, links)
                if entry["id"] not in seen_ids:
                    seen_ids.add(entry["id"])
                    entries.append(entry)

        well_known = _WELL_KNOWN_ENTRIES.get(reg_name, [])
        for entry in well_known:
            eid = str(entry["id"])
            if eid not in seen_ids:
                seen_ids.add(eid)
                entries.append(entry)

        return entries

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
