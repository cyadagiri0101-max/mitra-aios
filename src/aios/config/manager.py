"""Configuration manager — facade over loader, merger, validator, secrets, environment."""

from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any

from aios.config.defaults import get_defaults
from aios.config.environment import load_env_overrides
from aios.config.loader import load_all_dotenv, load_all_files
from aios.config.merger import (
    count_keys,
    deep_merge,
    flatten,
    resolve_dotted,
    set_dotted,
)
from aios.config.models import (
    ConfigSchemaEntry,
    ConfigSource,
    ConfigStatistics,
    ConfigValidationResult,
    MergeStrategy,
)
from aios.config.secrets import SecretsManager
from aios.config.validator import validate_config
from aios.core.exceptions import ConfigurationError
from aios.core.logger import get_logger

# Backward-compatible alias
ConfigSchema = ConfigSchemaEntry


class ConfigManager:
    """Unified configuration manager.

    Priority order (highest to lowest):
      1. Runtime overrides
      2. Environment variables
      3. Secrets
      4. Project config files
      5. Default config
    """

    def __init__(self, repo_root: Path | str = ".") -> None:
        self.logger = get_logger("aios.config.manager")
        self._repo_root = Path(repo_root).resolve()
        self._lock = threading.Lock()
        self._initialized: bool = False

        self._sources: list[ConfigSource] = []
        self._config: dict[str, Any] = {}
        self._schema: list[ConfigSchemaEntry] = []
        self._watchers: list[str] = []
        self._secrets = SecretsManager()

        # Statistics
        self._stats = ConfigStatistics()
        self._merge_count: int = 0
        self._validation_count: int = 0
        self._reload_count: int = 0

    # -- Properties --

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def repo_root(self) -> Path:
        return self._repo_root

    @property
    def config(self) -> dict[str, Any]:
        with self._lock:
            return dict(self._config)

    @property
    def secrets(self) -> SecretsManager:
        return self._secrets

    # -- Lifecycle --

    def initialize(self) -> ConfigManager:
        """Initialize by loading defaults, files, env, and secrets."""
        with self._lock:
            if self._initialized:
                return self

            # 5. Defaults
            defaults = get_defaults()
            deep_merge(self._config, defaults)

            # 4. Config files
            file_sources = load_all_files(self._repo_root)
            for src in file_sources:
                self._sources.append(src)
                deep_merge(self._config, src.data)

            # Load .env files
            dotenv_data = load_all_dotenv(self._repo_root)
            if dotenv_data:
                env_from_dotenv: dict[str, Any] = {}
                for k, v in dotenv_data.items():
                    if k.startswith("MITRA_"):
                        config_key = k[len("MITRA_"):].lower().replace("_", ".")
                        set_dotted(env_from_dotenv, config_key, v)
                if env_from_dotenv:
                    self._sources.append(
                        ConfigSource(path=".env", format="dotenv", data=env_from_dotenv, priority=50)
                    )
                    deep_merge(self._config, env_from_dotenv)

            # 3. Secrets
            self._secrets.initialize()

            # 2. Environment variables
            env_data = load_env_overrides()
            if env_data:
                self._sources.append(
                    ConfigSource(path=None, format="env", data=env_data, priority=100)
                )
                self._stats = ConfigStatistics(
                    env_overrides=self._stats.env_overrides + self.count_nested(env_data)
                )
                deep_merge(self._config, env_data)

            # Apply schema defaults
            self._apply_schema_defaults()

            self._initialized = True
            self.logger.info(
                "ConfigManager initialized (sources=%d, keys=%d)",
                len(self._sources),
                count_keys(self._config),
            )
        return self

    def shutdown(self) -> None:
        """Shutdown config manager and clear state."""
        with self._lock:
            self._initialized = False
            self._config.clear()
            self._sources.clear()
        self._secrets.shutdown()
        self.logger.info("ConfigManager shut down")

    def reload(self) -> ConfigManager:
        """Reload all configuration sources."""
        with self._lock:
            self._config.clear()
            self._sources.clear()
            self._initialized = False
            self._reload_count += 1
        self._secrets.reload()
        self.initialize()
        self.logger.info("Config reloaded")
        return self

    # -- Get / Set / Delete / Exists --

    def get(self, key: str, default: Any = None) -> Any:
        """Get a config value by dot-notation key."""
        self._require_initialized()
        with self._lock:
            return resolve_dotted(self._config, key, default)

    def set(self, key: str, value: Any) -> None:
        """Set a config value by dot-notation key (runtime override)."""
        self._require_initialized()
        with self._lock:
            set_dotted(self._config, key, value)

    def delete(self, key: str) -> bool:
        """Delete a config key. Returns True if it existed."""
        self._require_initialized()
        with self._lock:
            parts = key.split(".")
            current = self._config
            for part in parts[:-1]:
                if not isinstance(current, dict) or part not in current:
                    return False
                current = current[part]
            if isinstance(current, dict) and parts[-1] in current:
                del current[parts[-1]]
                return True
            return False

    def exists(self, key: str) -> bool:
        """Check if a config key exists."""
        self._require_initialized()
        with self._lock:
            return resolve_dotted(self._config, key, _MISSING) is not _MISSING

    # -- Sections --

    def get_section(self, section: str) -> dict[str, Any]:
        """Get a config section as a dict."""
        self._require_initialized()
        with self._lock:
            val = resolve_dotted(self._config, section, {})
            return dict(val) if isinstance(val, dict) else {}

    def set_section(self, section: str, values: dict[str, Any]) -> None:
        """Set an entire config section."""
        self._require_initialized()
        with self._lock:
            set_dotted(self._config, section, values)

    # -- Export --

    def export_json(self, indent: int = 2) -> str:
        """Export config as JSON string."""
        self._require_initialized()
        with self._lock:
            return json.dumps(self._config, indent=indent, default=str)

    def export_yaml(self) -> str:
        """Export config as YAML string."""
        self._require_initialized()
        try:
            import yaml  # type: ignore[import-untyped]
            with self._lock:
                return yaml.dump(self._config, default_flow_style=False, sort_keys=True)
        except ImportError:
            raise ConfigurationError("PyYAML required for YAML export")

    def export_toml(self) -> str:
        """Export config as TOML string."""
        self._require_initialized()
        try:
            import tomli_w  # type: ignore[import-untyped]
            with self._lock:
                return tomli_w.dumps(self._config)
        except ImportError:
            # Fallback: manual TOML-ish serialization
            return self._manual_toml(self._config)

    # -- Merge --

    def merge(
        self,
        overrides: dict[str, Any],
        source: str = "override",
        list_strategy: MergeStrategy = MergeStrategy.REPLACE,
    ) -> None:
        """Merge additional config data."""
        self._require_initialized()
        with self._lock:
            deep_merge(self._config, overrides, list_strategy=list_strategy)
            self._merge_count += 1
            self.logger.info("Merged config from '%s'", source)

    # -- Validation --

    def set_schema(self, schema: list[ConfigSchemaEntry]) -> None:
        """Define validation schema."""
        with self._lock:
            self._schema = list(schema)

    def validate(self) -> ConfigValidationResult:
        """Validate config against schema."""
        self._require_initialized()
        with self._lock:
            self._apply_schema_defaults()
            self._validation_count += 1
            return validate_config(self._config, self._schema)

    # -- Watch --

    def watch(self, key: str, callback: Any = None) -> None:
        """Register a key to watch for changes."""
        with self._lock:
            self._watchers.append(key)
            if callback is not None:
                self._watchers.append(f"{key}:{id(callback)}")

    def get_watched_keys(self) -> list[str]:
        """Return list of watched keys (filtering out callback entries)."""
        with self._lock:
            return [k for k in self._watchers if ":" not in k]

    # -- Statistics --

    def statistics(self) -> ConfigStatistics:
        """Return configuration statistics."""
        self._require_initialized()
        with self._lock:
            return ConfigStatistics(
                total_sources=len(self._sources),
                total_keys=count_keys(self._config),
                total_merges=self._merge_count,
                total_validations=self._validation_count,
                total_reloads=self._reload_count,
                env_overrides=self._stats.env_overrides,
                secrets_loaded=self._secrets.count() if self._secrets.is_initialized else 0,
            )

    # -- Utilities --

    def as_dict(self) -> dict[str, Any]:
        """Return full config as a serializable dict."""
        self._require_initialized()
        with self._lock:
            return json.loads(json.dumps(self._config, default=str))

    def flatten(self) -> dict[str, Any]:
        """Return config as flat dot-notation keys."""
        self._require_initialized()
        with self._lock:
            return flatten(self._config)

    def sources_info(self) -> list[dict[str, Any]]:
        """Return info about loaded sources."""
        self._require_initialized()
        with self._lock:
            return [
                {"path": str(s.path), "format": s.format, "priority": s.priority}
                for s in self._sources
            ]

    # -- Internal --

    def _apply_schema_defaults(self) -> None:
        """Apply defaults from schema."""
        for entry in self._schema:
            current = resolve_dotted(self._config, entry.key, _MISSING)
            if current is _MISSING and entry.default is not None:
                set_dotted(self._config, entry.key, entry.default)

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise ConfigurationError("ConfigManager not initialized")

    def _manual_toml(self, data: dict, prefix: str = "") -> str:
        """Minimal TOML serialization fallback."""
        lines: list[str] = []
        simple: dict[str, Any] = {}
        tables: dict[str, Any] = {}
        for k, v in data.items():
            if isinstance(v, dict):
                tables[k] = v
            else:
                simple[k] = v

        for k, v in simple.items():
            lines.append(f"{k} = {_toml_value(v)}")

        for k, v in tables.items():
            section = f"{prefix}.{k}" if prefix else k
            lines.append(f"\n[{section}]")
            lines.append(self._manual_toml(v, section))

        return "\n".join(lines)

    @staticmethod
    def count_nested(d: dict[str, Any]) -> int:
        """Count nested leaf values."""
        return count_keys(d)


class _Missing:
    sentinel = True


_MISSING = _Missing()


def _toml_value(v: Any) -> str:
    """Format a value for TOML output."""
    if isinstance(v, str):
        return f'"{v}"'
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, list):
        items = ", ".join(_toml_value(i) for i in v)
        return f"[{items}]"
    return f'"{v}"'
