"""KnowledgeMemory — structured, versioned knowledge storage with relationships."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from aios.core.config import AIOSConfig
from aios.utils.serialization import read_json, write_json


class KnowledgeMemory:
    """Persistent, versioned knowledge store for facts, concepts, and relationships.

    Each knowledge item is stored as a node with optional edges (relationships)
    to other nodes. Supports versioning and semantic queries.
    """

    def __init__(self, config: AIOSConfig) -> None:
        self._path = config.repo_root / ".ai" / "runtime" / "knowledge.json"
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._nodes: dict[str, dict[str, Any]] = {}
        self._edges: list[dict[str, Any]] = []
        self._version: int = 0
        self._load()

    def add_knowledge(
        self,
        key: str,
        content: Any,
        category: str = "general",
        tags: list[str] | None = None,
        relationships: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        """Store a knowledge node. Returns the stored record."""
        node: dict[str, Any] = {
            "key": key,
            "content": content,
            "category": category,
            "tags": tags or [],
            "version": self._version + 1,
            "created": datetime.now(UTC).isoformat(),
            "updated": datetime.now(UTC).isoformat(),
        }
        self._nodes[key] = node
        if relationships:
            for rel in relationships:
                self._edges.append({
                    "source": key,
                    "target": rel.get("target", ""),
                    "type": rel.get("type", "related"),
                    "created": datetime.now(UTC).isoformat(),
                })
        self._version += 1
        self._save()
        return node

    def get_knowledge(self, key: str) -> dict[str, Any] | None:
        """Retrieve a knowledge node by key."""
        return self._nodes.get(key)

    def query(
        self,
        category: str | None = None,
        tags: list[str] | None = None,
        max_results: int = 50,
    ) -> list[dict[str, Any]]:
        """Query knowledge nodes by category and/or tags."""
        results = list(self._nodes.values())
        if category:
            results = [n for n in results if n.get("category") == category]
        if tags:
            tag_set = set(tags)
            results = [n for n in results if tag_set & set(n.get("tags", []))]
        return sorted(results, key=lambda x: x.get("updated", ""), reverse=True)[:max_results]

    def get_relationships(self, key: str) -> list[dict[str, Any]]:
        """Return all edges involving the given node key."""
        return [
            e for e in self._edges
            if e.get("source") == key or e.get("target") == key
        ]

    def remove_knowledge(self, key: str) -> bool:
        """Remove a knowledge node and its edges."""
        if key not in self._nodes:
            return False
        del self._nodes[key]
        self._edges = [e for e in self._edges if e.get("source") != key and e.get("target") != key]
        self._save()
        return True

    def count(self) -> int:
        """Return the number of stored knowledge nodes."""
        return len(self._nodes)

    def clear(self) -> None:
        """Wipe all knowledge."""
        self._nodes.clear()
        self._edges.clear()
        self._version = 0
        self._save()

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": self._version,
            "nodeCount": len(self._nodes),
            "edgeCount": len(self._edges),
            "nodes": dict(self._nodes),
            "edges": list(self._edges),
        }

    def _load(self) -> None:
        if not self._path.exists():
            return
        try:
            data = read_json(self._path)
            if data:
                self._nodes = data.get("nodes", {})
                self._edges = data.get("edges", [])
                self._version = data.get("version", 0)
        except Exception:
            pass

    def _save(self) -> None:
        write_json(self._path, self.to_dict())
