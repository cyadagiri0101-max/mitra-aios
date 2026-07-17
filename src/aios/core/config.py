"""Configuration loader with JSON/YAML file support and environment overrides."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from aios.core.exceptions import ConfigError

try:
    import yaml  # type: ignore[import-untyped]
except ImportError:
    yaml = None  # type: ignore[assignment]


_CANDIDATE_NAMES = (
    "config.json",
    "config.yaml",
    "config.yml",
    ".ai/config.json",
    ".ai/config.yaml",
    ".ai/config.yml",
)

_ENV_MAP: dict[str, tuple[str, type]] = {
    "AIOS_MODE": ("mode", str),
    "AIOS_TOKEN_BUDGET": ("token_budget", int),
    "AIOS_LOG_LEVEL": ("log_level", str),
    "AIOS_LOG_FILE": ("log_file", str),
    "AIOS_CACHE_DIR": ("cache_dir", str),
    "AIOS_STATE_DIR": ("state_dir", str),
    "AIOS_INDEX_DIR": ("index_dir", str),
    "AIOS_REPORT_DIR": ("report_dir", str),
    "AIOS_CHECKSUM_ALGORITHM": ("checksum_algorithm", str),
}


@dataclass
class ProviderConfig:
    """Model provider configuration."""

    name: str = "default"
    capabilities: list[str] = field(
        default_factory=lambda: ["scan", "validate", "context", "report"]
    )


@dataclass
class AIOSConfig:
    """Central configuration for the AIOS runtime.

    All directory paths are resolved relative to *repo_root* when not absolute.
    """

    repo_root: Path
    mode: str = "discovery"
    token_budget: int = 12_000
    log_level: str = "INFO"
    log_file: Path | None = None
    cache_dir: Path | None = None
    state_dir: Path | None = None
    index_dir: Path | None = None
    report_dir: Path | None = None
    recovery_dir: Path | None = None
    events_dir: Path | None = None
    runtime_dir: Path | None = None
    memory_dir: Path | None = None
    decision_dir: Path | None = None
    checksum_algorithm: str = "sha256"
    provider: ProviderConfig = field(default_factory=ProviderConfig)

    def __post_init__(self) -> None:
        if not isinstance(self.repo_root, Path):
            self.repo_root = Path(self.repo_root)
        self.repo_root = self.repo_root.resolve()

        if not isinstance(self.provider, ProviderConfig):
            data = self.provider if isinstance(self.provider, dict) else {}
            self.provider = ProviderConfig(**data)

        self.cache_dir = self._resolve(self.cache_dir, ".ai/cache")
        self.state_dir = self._resolve(self.state_dir, ".ai/state")
        self.index_dir = self._resolve(self.index_dir, ".ai/index")
        self.report_dir = self._resolve(self.report_dir, ".ai/reports")
        self.recovery_dir = self._resolve(self.recovery_dir, ".ai/recovery")
        self.events_dir = self._resolve(self.events_dir, ".ai/events")
        self.runtime_dir = self._resolve(self.runtime_dir, ".ai/runtime")
        self.memory_dir = self._resolve(self.memory_dir, ".ai/runtime")
        self.decision_dir = self._resolve(self.decision_dir, ".ai/runtime")

        if self.log_file is not None and not isinstance(self.log_file, Path):
            self.log_file = Path(self.log_file)

    def _resolve(self, value: Path | str | None, default_rel: str) -> Path:
        if value is None:
            return self.repo_root / default_rel
        p = Path(value)
        return p if p.is_absolute() else (self.repo_root / p).resolve()

    @classmethod
    def from_dict(cls, repo_root: Path | str, data: dict[str, Any]) -> AIOSConfig:
        """Build config from a dictionary (parsed file or merged env data)."""
        provider_data = data.get("provider") or {}
        if isinstance(provider_data, dict):
            provider = ProviderConfig(**provider_data)
        else:
            provider = ProviderConfig(name=str(provider_data or "default"))

        return cls(
            repo_root=repo_root,
            mode=str(data.get("mode", "discovery")),
            token_budget=int(data.get("token_budget", 12_000)),
            log_level=str(data.get("log_level", "INFO")),
            log_file=data.get("log_file"),
            cache_dir=data.get("cache_dir"),
            state_dir=data.get("state_dir"),
            index_dir=data.get("index_dir"),
            report_dir=data.get("report_dir"),
            recovery_dir=data.get("recovery_dir"),
            events_dir=data.get("events_dir"),
            runtime_dir=data.get("runtime_dir"),
            memory_dir=data.get("memory_dir"),
            decision_dir=data.get("decision_dir"),
            checksum_algorithm=str(data.get("checksum_algorithm", "sha256")),
            provider=provider,
        )

    def ensure_directories(self) -> None:
        """Create all configured directories if they do not exist."""
        for d in (
            self.cache_dir,
            self.state_dir,
            self.index_dir,
            self.report_dir,
            self.recovery_dir,
            self.events_dir,
            self.runtime_dir,
            self.memory_dir,
            self.decision_dir,
        ):
            if d is not None:
                d.mkdir(parents=True, exist_ok=True)


def load_config(
    repo_root: Path | str,
    config_path: Path | str | None = None,
) -> AIOSConfig:
    """Load configuration from file and environment overrides.

    Resolution order:
    1. Explicit *config_path* if provided.
    2. Candidate files in repo root.
    3. Environment variable overrides applied on top.
    """
    root = Path(repo_root).resolve()
    file_data: dict[str, Any] = {}

    if config_path is not None:
        file_data = _load_file(Path(config_path))
    else:
        for name in _CANDIDATE_NAMES:
            candidate = root / name
            if candidate.exists():
                file_data = _load_file(candidate)
                break

    env_data = _load_env()
    merged = {**file_data, **env_data}
    return AIOSConfig.from_dict(root, merged)


def _load_file(path: Path) -> dict[str, Any]:
    suffix = path.suffix.lower()
    if suffix in {".yaml", ".yml"}:
        if yaml is None:
            raise ConfigError(f"PyYAML required to load {path}")
        with path.open("r", encoding="utf-8") as fh:
            data = yaml.safe_load(fh) or {}
    else:
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
    if not isinstance(data, dict):
        raise ConfigError(f"Config file {path} must contain an object")
    return data


def _load_env() -> dict[str, Any]:
    overrides: dict[str, Any] = {}
    for env_key, (field_name, cast) in _ENV_MAP.items():
        raw = os.getenv(env_key)
        if raw is not None:
            overrides[field_name] = cast(raw)

    provider_name = os.getenv("AIOS_PROVIDER")
    if provider_name:
        overrides["provider"] = {"name": provider_name}

    caps = os.getenv("AIOS_PROVIDER_CAPABILITIES")
    if caps:
        prov = overrides.get("provider", {})
        prov["capabilities"] = [c.strip() for c in caps.split(",") if c.strip()]
        overrides["provider"] = prov

    return overrides
