"""MemoryCompressor — reduce memory storage by merging or dropping low-importance items."""

from __future__ import annotations

from aios.memory.store import MemoryStore


class MemoryCompressor:
    """Compress memories by removing low-importance short-term items."""

    def compress(self, store: MemoryStore, target_ratio: float = 0.5) -> int:
        """Remove short-term memories to reach target_ratio of original count."""
        all_items = store.all()
        short_term = [
            (k, v) for k, v in all_items.items() if v.get("type") == "short_term"
        ]
        long_term = [
            (k, v) for k, v in all_items.items() if v.get("type") == "long_term"
        ]

        target_count = max(int(len(short_term) * (1.0 - target_ratio)), len(long_term))
        if len(short_term) <= target_count:
            return 0

        # Keep most recent short-term items; drop oldest
        short_term.sort(key=lambda x: x[1].get("timestamp", ""), reverse=True)
        to_keep = short_term[:target_count]
        to_remove = short_term[target_count:]

        # Rebuild store
        store.clear()
        for k, v in long_term + to_keep:
            store.put(
                k,
                v.get("value"),
                v.get("type", "short_term"),
                v.get("tags", []),
            )

        return len(to_remove)
