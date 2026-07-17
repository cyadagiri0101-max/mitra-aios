"""JSON and YAML serialization helpers."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

try:
    import yaml  # type: ignore[import-untyped]
except ImportError:
    yaml = None  # type: ignore[assignment]


def read_json(path: Path) -> dict[str, Any]:
    """Read and parse a JSON file."""
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def write_json(path: Path, data: Any, indent: int = 2) -> Path:
    """Write data as formatted JSON."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=indent, default=str), encoding="utf-8")
    return path


def read_yaml(path: Path) -> dict[str, Any]:
    """Read and parse a YAML file. Falls back to JSON if PyYAML unavailable."""
    if yaml is not None:
        with path.open("r", encoding="utf-8") as fh:
            return yaml.safe_load(fh) or {}
    return read_json(path)


def write_yaml(path: Path, data: Any) -> Path:
    """Write data as YAML. Falls back to JSON if PyYAML unavailable."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if yaml is not None:
        with path.open("w", encoding="utf-8") as fh:
            yaml.dump(data, fh, default_flow_style=False, sort_keys=False)
    else:
        write_json(path, data)
    return path
