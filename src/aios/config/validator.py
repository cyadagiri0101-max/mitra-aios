"""Configuration validator — schema validation with rich rules."""

from __future__ import annotations

import re
from typing import Any

from aios.config.merger import resolve_dotted
from aios.config.models import ConfigSchemaEntry, ConfigValidationResult


def validate_config(
    config: dict[str, Any],
    schema: list[ConfigSchemaEntry],
) -> ConfigValidationResult:
    """Validate a config dict against a schema. Returns a ConfigValidationResult."""
    errors: list[str] = []
    warnings: list[str] = []
    checked = 0

    for entry in schema:
        checked += 1
        val = resolve_dotted(config, entry.key, _MISSING)

        # Required check
        if val is _MISSING:
            if entry.required:
                errors.append(f"Missing required key: {entry.key}")
            elif entry.default is not None:
                warnings.append(f"Key '{entry.key}' not set, using default")
            continue

        # Type check
        if not _check_type(val, entry.type):
            errors.append(
                f"Key '{entry.key}' expected {entry.type.__name__}, got {type(val).__name__}"
            )
            continue

        # Enum check
        if entry.enum_values is not None and val not in entry.enum_values:
            errors.append(
                f"Key '{entry.key}' value '{val}' not in allowed values: {entry.enum_values}"
            )
            continue

        # Numeric range check
        if entry.min_value is not None and isinstance(val, (int, float)):
            if val < entry.min_value:
                errors.append(f"Key '{entry.key}' value {val} below minimum {entry.min_value}")

        if entry.max_value is not None and isinstance(val, (int, float)):
            if val > entry.max_value:
                errors.append(f"Key '{entry.key}' value {val} above maximum {entry.max_value}")

        # Regex pattern check
        if entry.pattern is not None and isinstance(val, str):
            if not re.match(entry.pattern, val):
                errors.append(f"Key '{entry.key}' value does not match pattern: {entry.pattern}")

        # Nested schema validation
        if entry.nested_schema is not None and isinstance(val, dict):
            nested_result = validate_config(val, entry.nested_schema)
            for err in nested_result.errors:
                errors.append(f"{entry.key}.{err}")
            for warn in nested_result.warnings:
                warnings.append(f"{entry.key}.{warn}")

    return ConfigValidationResult(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        checked_keys=checked,
    )


class _Missing:
    """Sentinel for missing config values."""
    sentinel = True


_MISSING = _Missing()


def _check_type(value: Any, expected_type: type) -> bool:
    """Check if a value matches the expected type."""
    if expected_type is str:
        return isinstance(value, str)
    if expected_type is int:
        return isinstance(value, int) and not isinstance(value, bool)
    if expected_type is float:
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected_type is bool:
        return isinstance(value, bool)
    if expected_type is list:
        return isinstance(value, list)
    if expected_type is dict:
        return isinstance(value, dict)
    return isinstance(value, expected_type)
