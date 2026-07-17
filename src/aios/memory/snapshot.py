"""SnapshotManager — create, list, and restore memory snapshots."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from aios.core.config import AIOSConfig
from aios.core.logger import get_logger
from aios.utils.serialization import write_json


class SnapshotManager:
    """Manages point-in-time snapshots of memory state with restore capability."""

    def __init__(self, config: AIOSConfig, store: Any, index: Any) -> None:
        self.config = config
        self.store = store
        self.index = index
        self.logger = get_logger("aios.memory.snapshot", config.log_level)
        self._snapshot_dir = config.repo_root / ".ai" / "runtime" / "snapshots"
        self._snapshot_dir.mkdir(parents=True, exist_ok=True)

    def create(self, label: str = "") -> dict[str, Any]:
        """Create a snapshot of current memory state. Returns snapshot metadata."""
        timestamp = datetime.now(UTC).isoformat()
        snapshot_id = f"SNAP-{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        snap_path = self._snapshot_dir / f"{snapshot_id}.json"

        data = {
            "snapshotId": snapshot_id,
            "label": label,
            "created": timestamp,
            "memory": {
                "items": list(self.store.all().values()),
            },
            "index": self.index.to_dict(),
        }

        write_json(snap_path, data)
        self.logger.info("Snapshot %s created (%d memory items)", snapshot_id, len(data["memory"]["items"]))
        return {
            "snapshotId": snapshot_id,
            "label": label,
            "created": timestamp,
            "path": str(snap_path),
            "itemCount": len(data["memory"]["items"]),
        }

    def list_snapshots(self) -> list[dict[str, Any]]:
        """List all available snapshots sorted by creation time (newest first)."""
        snapshots = []
        for path in sorted(self._snapshot_dir.glob("SNAP-*.json"), reverse=True):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                snapshots.append({
                    "snapshotId": data.get("snapshotId", path.stem),
                    "label": data.get("label", ""),
                    "created": data.get("created", ""),
                    "path": str(path),
                    "itemCount": len(data.get("memory", {}).get("items", [])),
                })
            except (json.JSONDecodeError, OSError):
                continue
        return snapshots

    def restore(self, snapshot_id: str) -> bool:
        """Restore memory state from a snapshot. Returns True on success."""
        snap_path = self._snapshot_dir / f"{snapshot_id}.json"
        if not snap_path.exists():
            self.logger.error("Snapshot %s not found", snapshot_id)
            return False

        try:
            data = json.loads(snap_path.read_text(encoding="utf-8"))
            self.store.clear()
            for item in data.get("memory", {}).get("items", []):
                self.store.put(
                    key=item["key"],
                    value=item["value"],
                    memory_type=item.get("type", "short_term"),
                    tags=item.get("tags", []),
                )
            idx_data = data.get("index", {})
            self.index.rebuild_from_dict(idx_data)
            self.logger.info("Snapshot %s restored successfully", snapshot_id)
            return True
        except (KeyError, json.JSONDecodeError, OSError) as exc:
            self.logger.error("Failed to restore snapshot %s: %s", snapshot_id, exc)
            return False

    def delete_snapshot(self, snapshot_id: str) -> bool:
        """Delete a snapshot file. Returns True if deleted."""
        snap_path = self._snapshot_dir / f"{snapshot_id}.json"
        if not snap_path.exists():
            return False
        snap_path.unlink()
        self.logger.info("Snapshot %s deleted", snapshot_id)
        return True

    def latest(self) -> dict[str, Any] | None:
        """Return metadata for the most recent snapshot, or None."""
        snaps = self.list_snapshots()
        return snaps[0] if snaps else None
