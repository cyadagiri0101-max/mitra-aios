"""MemoryIndex — in-memory keyword index for fast memory retrieval."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from aios.core.config import AIOSConfig
from aios.memory.store import MemoryStore


class MemoryIndex:
    """Build and maintain a keyword index over stored memories."""

    def __init__(self, config: AIOSConfig) -> None:
        self._index: dict[str, list[str]] = defaultdict(list)
        self._type_index: dict[str, list[str]] = defaultdict(list)

    def index(self, record: dict[str, Any]) -> None:
        key = record.get("key", "")
        value = record.get("value", "")
        tags = record.get("tags", [])
        memory_type = record.get("type", "short_term")

        self._type_index[memory_type].append(key)

        tokens = self._tokenize(str(value)) + [t.lower() for t in tags]
        for token in tokens:
            if key not in self._index[token]:
                self._index[token].append(key)

    def search(self, query: str) -> list[str]:
        tokens = self._tokenize(query)
        if not tokens:
            return []
        results: set[str] | None = None
        for token in tokens:
            keys = set(self._index.get(token, []))
            if results is None:
                results = keys
            else:
                results &= keys
        return sorted(results or [])

    def keys_by_type(self, memory_type: str) -> list[str]:
        return list(self._type_index.get(memory_type, []))

    def rebuild(self, store: MemoryStore) -> None:
        self._index.clear()
        self._type_index.clear()
        for record in store.all().values():
            self.index(record)

    def rebuild_from_dict(self, data: dict[str, Any]) -> None:
        self._index.clear()
        self._type_index.clear()
        raw_index = data.get("index", {})
        for token, keys in raw_index.items():
            self._index[token] = list(keys)
        raw_type = data.get("typeIndex", {})
        for mem_type, keys in raw_type.items():
            self._type_index[mem_type] = list(keys)

    def stats(self) -> dict[str, int]:
        return {
            "uniqueTokens": len(self._index),
            "totalEntries": sum(len(v) for v in self._index.values()),
            "shortTermCount": len(self._type_index.get("short_term", [])),
            "longTermCount": len(self._type_index.get("long_term", [])),
        }

    def to_dict(self) -> dict[str, Any]:
        return {
            "index": {k: v for k, v in self._index.items()},
            "typeIndex": {k: v for k, v in self._type_index.items()},
            "stats": self.stats(),
        }

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        import re

        return [t.lower() for t in re.findall(r"\w+", text) if len(t) >= 2]
