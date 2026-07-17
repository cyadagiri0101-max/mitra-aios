"""MemorySearch — search memories by keyword."""

from __future__ import annotations

from typing import Any

from aios.memory.index import MemoryIndex
from aios.memory.store import MemoryStore


class MemorySearch:
    """Search across memory store using the keyword index."""

    def __init__(self, index: MemoryIndex, store: MemoryStore | None = None) -> None:
        self._index = index
        self._store = store

    def search(
        self,
        query: str,
        top_k: int = 10,
        memory_type: str | None = None,
    ) -> list[dict[str, Any]]:
        """Return matching memory records, ordered by relevance."""
        keys = self._index.search(query)
        if memory_type:
            type_keys = set(self._index.keys_by_type(memory_type))
            keys = [k for k in keys if k in type_keys]

        results: list[dict[str, Any]] = []
        for key in keys[:top_k]:
            record = None
            if self._store:
                record = self._store.get_record(key)
            if record:
                results.append(record)

        return results
