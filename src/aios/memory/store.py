"""MemoryStore — persistent key-value store for memory items."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from aios.core.config import AIOSConfig


class MemoryStore:
    """Persistent, append-based memory store backed by JSON Lines."""

    def __init__(self, config: AIOSConfig) -> None:
        self._path = config.repo_root / ".ai" / "runtime" / "memory-store.jsonl"
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._cache: dict[str, dict[str, Any]] = {}
        self._load()

    def put(
        self,
        key: str,
        value: Any,
        memory_type: str = "short_term",
        tags: list[str] | None = None,
    ) -> dict[str, Any]:
        record: dict[str, Any] = {
            "key": key,
            "value": value,
            "type": memory_type,
            "tags": tags or [],
            "timestamp": datetime.now(UTC).isoformat(),
        }
        self._cache[key] = record
        with self._path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, default=str) + "\n")
        return record

    def get(self, key: str) -> Any | None:
        record = self._cache.get(key)
        return record["value"] if record else None

    def get_record(self, key: str) -> dict[str, Any] | None:
        return self._cache.get(key)

    def list(self, memory_type: str | None = None) -> list[dict[str, Any]]:
        items = list(self._cache.values())
        if memory_type:
            items = [i for i in items if i.get("type") == memory_type]
        return sorted(items, key=lambda x: x.get("timestamp", ""), reverse=True)

    def count(self, memory_type: str | None = None) -> int:
        return len(self.list(memory_type))

    def delete(self, key: str) -> bool:
        if key in self._cache:
            del self._cache[key]
            self._flush()
            return True
        return False

    def prune(self, max_age_days: int = 30) -> int:
        cutoff = datetime.now(UTC).timestamp() - (max_age_days * 86400)
        to_remove = [
            k
            for k, v in self._cache.items()
            if datetime.fromisoformat(v["timestamp"]).timestamp() < cutoff
        ]
        for k in to_remove:
            del self._cache[k]
        self._flush()
        return len(to_remove)

    def clear(self) -> None:
        self._cache.clear()
        self._path.write_text("", encoding="utf-8")

    def all(self) -> dict[str, dict[str, Any]]:
        return dict(self._cache)

    def _load(self) -> None:
        if not self._path.exists():
            return
        with self._path.open("r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                    self._cache[record["key"]] = record
                except (json.JSONDecodeError, KeyError):
                    continue

    def _flush(self) -> None:
        with self._path.open("w", encoding="utf-8") as fh:
            for record in self._cache.values():
                fh.write(json.dumps(record, default=str) + "\n")
