"""Environment variable mapping — converts env vars to config keys."""

from __future__ import annotations

import os
from typing import Any

from aios.config.loader import _coerce_env_value
from aios.config.models import EnvironmentVariable, EnvMappingMode
from aios.core.logger import get_logger

logger = get_logger("aios.config.environment")

_ENV_PREFIX = "MITRA_"


# Canonical mapping: env var name -> config key
_ENV_MAP: dict[str, EnvironmentVariable] = {
    "MITRA_LLM_PROVIDER": EnvironmentVariable("MITRA_LLM_PROVIDER", "llm.provider", str),
    "MITRA_LLM_MODEL": EnvironmentVariable("MITRA_LLM_MODEL", "llm.model", str),
    "MITRA_LLM_TEMPERATURE": EnvironmentVariable("MITRA_LLM_TEMPERATURE", "llm.temperature", float),
    "MITRA_LLM_MAX_TOKENS": EnvironmentVariable("MITRA_LLM_MAX_TOKENS", "llm.max_tokens", int),
    "MITRA_MEMORY_BACKEND": EnvironmentVariable("MITRA_MEMORY_BACKEND", "memory.backend", str),
    "MITRA_MEMORY_MAX_ENTRIES": EnvironmentVariable("MITRA_MEMORY_MAX_ENTRIES", "memory.max_entries", int),
    "MITRA_TOOLS_SANDBOX": EnvironmentVariable("MITRA_TOOLS_SANDBOX", "tools.sandbox_enabled", bool),
    "MITRA_AGENT_MAX_TURNS": EnvironmentVariable("MITRA_AGENT_MAX_TURNS", "agent.max_turns", int),
    "MITRA_API_HOST": EnvironmentVariable("MITRA_API_HOST", "api.host", str),
    "MITRA_API_PORT": EnvironmentVariable("MITRA_API_PORT", "api.port", int),
    "MITRA_API_RATE_LIMIT": EnvironmentVariable("MITRA_API_RATE_LIMIT", "api.rate_limit_rpm", int),
    "MITRA_SECURITY_ENCRYPTION": EnvironmentVariable("MITRA_SECURITY_ENCRYPTION", "security.encryption_enabled", bool),
    "MITRA_OBSERVABILITY_METRICS": EnvironmentVariable("MITRA_OBSERVABILITY_METRICS", "observability.metrics_enabled", bool),
    "MITRA_EMBEDDING_PROVIDER": EnvironmentVariable("MITRA_EMBEDDING_PROVIDER", "embedding.provider", str),
    "MITRA_VECTORSTORE_PROVIDER": EnvironmentVariable("MITRA_VECTORSTORE_PROVIDER", "vectorstore.provider", str),
    "MITRA_LOG_LEVEL": EnvironmentVariable("MITRA_LOG_LEVEL", "cli.log_level", str),
}


def load_env_overrides(
    prefix: str = _ENV_PREFIX,
    mode: EnvMappingMode = EnvMappingMode.SINGLE_UNDERSCORE,
) -> dict[str, Any]:
    """Load all MITRA_ environment variables and return as nested config dict."""
    env_data: dict[str, Any] = {}
    count = 0

    # First, apply canonical mappings
    for env_key, mapping in _ENV_MAP.items():
        raw = os.environ.get(env_key)
        if raw is not None and raw != "":
            value = _coerce_value(raw, mapping.value_type)
            _set_nested(env_data, mapping.config_key, value)
            count += 1

    # Then, scan for any MITRA_ env vars not in the canonical map
    for key, val in os.environ.items():
        if key.startswith(prefix) and val and key not in _ENV_MAP:
            raw_name = key[len(prefix):].lower()
            config_key = _convert_key(raw_name, mode)
            _set_nested(env_data, config_key, _coerce_env_value(val))
            count += 1

    if count:
        logger.debug("Loaded %d env overrides (prefix=%s)", count, prefix)
    return env_data


def get_env_mappings() -> list[EnvironmentVariable]:
    """Return the canonical environment variable mappings."""
    return list(_ENV_MAP.values())


def _convert_key(raw: str, mode: EnvMappingMode) -> str:
    """Convert an env var name segment to a dot-notation config key."""
    if mode == EnvMappingMode.DOUBLE_UNDERSCORE:
        return raw.replace("__", ".")
    return raw.replace("_", ".")


def _coerce_value(val: str, target_type: type) -> Any:
    """Coerce a string to the target type."""
    if target_type is bool:
        return val.lower() in ("true", "yes", "1", "on")
    if target_type is int:
        try:
            return int(val)
        except ValueError:
            return val
    if target_type is float:
        try:
            return float(val)
        except ValueError:
            return val
    return val


def _set_nested(data: dict, key: str, value: Any) -> None:
    """Set a value in a nested dict using dot notation."""
    parts = key.split(".")
    current = data
    for part in parts[:-1]:
        if part not in current or not isinstance(current[part], dict):
            current[part] = {}
        current = current[part]
    current[parts[-1]] = value
