"""AIOS Configuration System — unified config with TOML/YAML/JSON/env/secrets support.

Priority order (highest to lowest):
  1. Runtime overrides
  2. Environment variables
  3. Secrets
  4. Project config files
  5. Default config
"""

from aios.config.defaults import get_component_defaults, get_defaults
from aios.config.environment import get_env_mappings, load_env_overrides
from aios.config.loader import (
    detect_format,
    discover_env_files,
    discover_files,
    load_all_dotenv,
    load_all_files,
    load_dotenv,
    load_file,
    load_file_as_source,
)
from aios.config.manager import ConfigManager, ConfigSchema
from aios.config.merger import (
    count_keys,
    deep_merge,
    deep_merge_copy,
    flatten,
    merge_multiple,
    resolve_dotted,
    set_dotted,
)
from aios.config.models import (
    ConfigSchemaEntry,
    ConfigSection,
    ConfigSource,
    ConfigStatistics,
    ConfigValidationResult,
    ConfigValue,
    EnvironmentVariable,
    EnvMappingMode,
    MergeStrategy,
    SecretValue,
)
from aios.config.secrets import SecretsManager
from aios.config.validator import validate_config

__all__ = [
    # Manager
    "ConfigManager",
    "ConfigSchema",
    # Models
    "ConfigSchemaEntry",
    "ConfigSource",
    "ConfigStatistics",
    "ConfigValidationResult",
    "ConfigValue",
    "ConfigSection",
    "EnvironmentVariable",
    "EnvMappingMode",
    "MergeStrategy",
    "SecretValue",
    # Defaults
    "get_defaults",
    "get_component_defaults",
    # Loader
    "detect_format",
    "discover_files",
    "discover_env_files",
    "load_file",
    "load_file_as_source",
    "load_dotenv",
    "load_all_files",
    "load_all_dotenv",
    # Environment
    "load_env_overrides",
    "get_env_mappings",
    # Merger
    "deep_merge",
    "deep_merge_copy",
    "merge_multiple",
    "resolve_dotted",
    "set_dotted",
    "count_keys",
    "flatten",
    # Validator
    "validate_config",
    # Secrets
    "SecretsManager",
]
