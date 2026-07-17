"""Configuration file loader — TOML/YAML/JSON/.env detection and loading."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from aios.config.models import ConfigSource
from aios.core.exceptions import ConfigurationError
from aios.core.logger import get_logger

logger = get_logger("aios.config.loader")

try:
    import tomllib  # Python 3.11+
except ImportError:
    try:
        import tomli as tomllib  # type: ignore[no-redef]
    except ImportError:
        tomllib = None  # type: ignore[assignment]

try:
    import yaml  # type: ignore[import-untyped]
except ImportError:
    yaml = None  # type: ignore[assignment]


_CANDIDATE_NAMES = (
    "config.toml",
    "config.yaml",
    "config.yml",
    "config.json",
    "aios.toml",
    "aios.yaml",
    "aios.yml",
    "aios.json",
    ".aios/config.toml",
    ".aios/config.yaml",
    ".aios/config.yml",
    ".aios/config.json",
)

_ENV_FILES = (".env", ".env.local", ".env.production")


def detect_format(path: Path) -> str | None:
    """Detect config format from file extension."""
    suffix = path.suffix.lower()
    if suffix == ".toml":
        return "toml"
    if suffix in (".yaml", ".yml"):
        return "yaml"
    if suffix == ".json":
        return "json"
    return None


def load_file(path: Path) -> dict[str, Any]:
    """Load a single config file by detected format."""
    fmt = detect_format(path)
    if fmt is None:
        raise ConfigurationError(f"Unsupported config format: {path.suffix}", key=str(path))
    return _parse_file(path, fmt)


def load_file_as_source(path: Path, priority: int = 0) -> ConfigSource | None:
    """Load a file and wrap it as a ConfigSource. Returns None on failure."""
    fmt = detect_format(path)
    if fmt is None:
        return None
    try:
        data = _parse_file(path, fmt)
        return ConfigSource(path=str(path), format=fmt, data=data, priority=priority)
    except Exception as exc:
        logger.warning("Failed to load %s: %s", path, exc)
        return None


def load_dotenv(path: Path) -> dict[str, str]:
    """Parse a .env file into a dict of string key-value pairs."""
    result: dict[str, str] = {}
    if not path.is_file():
        return result
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "=" not in stripped:
            continue
        key, _, val = stripped.partition("=")
        key = key.strip()
        val = val.strip()
        if (val.startswith('"') and val.endswith('"')) or (
            val.startswith("'") and val.endswith("'")
        ):
            val = val[1:-1]
        result[key] = val
    return result


def discover_files(repo_root: Path) -> list[Path]:
    """Discover config files in the repo root."""
    candidates: list[Path] = []
    for name in _CANDIDATE_NAMES:
        p = repo_root / name
        if p.is_file():
            candidates.append(p)
    return sorted(candidates)


def discover_env_files(repo_root: Path) -> list[Path]:
    """Discover .env files in the repo root."""
    candidates: list[Path] = []
    for name in _ENV_FILES:
        p = repo_root / name
        if p.is_file():
            candidates.append(p)
    return sorted(candidates)


def load_all_files(repo_root: Path) -> list[ConfigSource]:
    """Load all discoverable config files and return as ordered ConfigSource list."""
    sources: list[ConfigSource] = []
    priority = 0
    for path in discover_files(repo_root):
        src = load_file_as_source(path, priority=priority)
        if src is not None:
            sources.append(src)
            priority += 1
    return sources


def load_all_dotenv(repo_root: Path) -> dict[str, str]:
    """Load all .env files and merge (later files override)."""
    merged: dict[str, str] = {}
    for path in discover_env_files(repo_root):
        merged.update(load_dotenv(path))
    return merged


def _parse_file(path: Path, fmt: str) -> dict[str, Any]:
    """Parse a config file into a dict."""
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise ConfigurationError(f"Cannot read {path}: {exc}", key=str(path)) from exc

    try:
        if fmt == "toml":
            if tomllib is None:
                raise ConfigurationError("tomli/tomllib required for TOML", key=str(path))
            data = tomllib.loads(text)  # type: ignore[union-attr]
        elif fmt == "yaml":
            if yaml is None:
                raise ConfigurationError("PyYAML required for YAML", key=str(path))
            data = yaml.safe_load(text) or {}
        elif fmt == "json":
            data = json.loads(text)
        else:
            raise ConfigurationError(f"Unsupported format: {fmt}", key=str(path))
    except ConfigurationError:
        raise
    except Exception as exc:
        raise ConfigurationError(f"Parse error in {path}: {exc}", key=str(path)) from exc

    if not isinstance(data, dict):
        raise ConfigurationError(f"Config file {path} must contain an object", key=str(path))
    return data


def _coerce_env_value(val: str) -> Any:
    """Coerce a string env value to its native type."""
    if val.lower() in ("true", "yes", "1"):
        return True
    if val.lower() in ("false", "no", "0"):
        return False
    try:
        return int(val)
    except ValueError:
        pass
    try:
        return float(val)
    except ValueError:
        pass
    # Handle lists: "a,b,c" -> ["a", "b", "c"]
    if "," in val:
        return [v.strip() for v in val.split(",") if v.strip()]
    return val
