"""Configuration data models — frozen dataclasses with slots."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class MergeStrategy(Enum):
    """List merge strategies."""

    REPLACE = "replace"
    APPEND = "append"
    UNIQUE = "unique"


class EnvMappingMode(Enum):
    """Environment variable key mapping modes."""

    SINGLE_UNDERSCORE = "single"  # MITRA_LLM_MODEL -> llm.model
    DOUBLE_UNDERSCORE = "double"  # MITRA_LLM__MODEL -> llm.model


@dataclass(frozen=True, slots=True)
class ConfigSource:
    """Represents a loaded configuration source."""

    path: str | None
    format: str
    data: dict[str, Any]
    priority: int = 0


@dataclass(frozen=True, slots=True)
class ConfigValue:
    """A single configuration value with metadata."""

    key: str
    value: Any
    source: str = "default"
    type_name: str = ""


@dataclass(frozen=True, slots=True)
class ConfigSection:
    """A named section of configuration."""

    name: str
    values: dict[str, Any] = field(default_factory=dict)
    source: str = "default"


@dataclass(frozen=True, slots=True)
class ConfigSchemaEntry:
    """Describes a single validation rule for a config key."""

    key: str
    type: type = str
    default: Any = None
    required: bool = False
    description: str = ""
    enum_values: tuple[Any, ...] | None = None
    min_value: float | None = None
    max_value: float | None = None
    pattern: str | None = None
    nested_schema: list[ConfigSchemaEntry] | None = None


@dataclass(frozen=True, slots=True)
class ConfigValidationResult:
    """Result of a configuration validation run."""

    is_valid: bool = True
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    checked_keys: int = 0


@dataclass(frozen=True, slots=True)
class ConfigStatistics:
    """Statistics about the configuration system."""

    total_sources: int = 0
    total_keys: int = 0
    total_merges: int = 0
    total_validations: int = 0
    total_reloads: int = 0
    env_overrides: int = 0
    secrets_loaded: int = 0


@dataclass(frozen=True, slots=True)
class SecretValue:
    """A secret value — never exposed in logs or repr."""

    name: str
    _placeholder: str = field(default="***", repr=False, compare=False)

    @property
    def display(self) -> str:
        return "***"

    def __str__(self) -> str:
        return "***"

    def __repr__(self) -> str:
        return f"SecretValue(name={self.name!r})"


@dataclass(frozen=True, slots=True)
class EnvironmentVariable:
    """Maps an environment variable to a config key."""

    env_key: str
    config_key: str
    value_type: type = str
    default: Any = None
    description: str = ""


# Backward-compatible alias
ConfigSchema = ConfigSchemaEntry
