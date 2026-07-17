"""Configuration merge engine — recursive deep merge with list strategies."""

from __future__ import annotations

from typing import Any

from aios.config.models import MergeStrategy


def deep_merge(
    base: dict[str, Any],
    override: dict[str, Any],
    list_strategy: MergeStrategy = MergeStrategy.REPLACE,
) -> dict[str, Any]:
    """Recursively merge override into base (mutates base).

    List strategy controls how lists are merged:
      - REPLACE: override list replaces base list entirely
      - APPEND: override list is appended to base list
      - UNIQUE: override list is appended but duplicates are removed
    """
    for key, val in override.items():
        if key in base and isinstance(base[key], dict) and isinstance(val, dict):
            deep_merge(base[key], val, list_strategy=list_strategy)
        elif key in base and isinstance(base[key], list) and isinstance(val, list):
            base[key] = _merge_list(base[key], val, list_strategy)
        else:
            base[key] = _copy_value(val)
    return base


def deep_merge_copy(
    base: dict[str, Any],
    override: dict[str, Any],
    list_strategy: MergeStrategy = MergeStrategy.REPLACE,
) -> dict[str, Any]:
    """Merge override into a copy of base (non-mutating)."""
    import copy
    result = copy.deepcopy(base)
    return deep_merge(result, override, list_strategy=list_strategy)


def merge_multiple(
    *dicts: dict[str, Any],
    list_strategy: MergeStrategy = MergeStrategy.REPLACE,
) -> dict[str, Any]:
    """Merge multiple dicts in order (later wins)."""
    result: dict[str, Any] = {}
    for d in dicts:
        deep_merge(result, d, list_strategy=list_strategy)
    return result


def resolve_dotted(data: dict[str, Any], key: str, default: Any = None) -> Any:
    """Resolve a dot-notation key from a nested dict."""
    parts = key.split(".")
    current = data
    for part in parts:
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            return default
    return current


def set_dotted(data: dict[str, Any], key: str, value: Any) -> None:
    """Set a value in a nested dict using dot notation."""
    parts = key.split(".")
    current = data
    for part in parts[:-1]:
        if part not in current or not isinstance(current[part], dict):
            current[part] = {}
        current = current[part]
    current[parts[-1]] = value


def count_keys(data: dict[str, Any]) -> int:
    """Count all leaf keys in a nested dict."""
    total = 0
    for val in data.values():
        if isinstance(val, dict):
            total += count_keys(val)
        else:
            total += 1
    return total


def flatten(data: dict[str, Any], prefix: str = "") -> dict[str, Any]:
    """Flatten a nested dict into dot-notation keys."""
    result: dict[str, Any] = {}
    for key, val in data.items():
        full_key = f"{prefix}.{key}" if prefix else key
        if isinstance(val, dict):
            result.update(flatten(val, full_key))
        else:
            result[full_key] = val
    return result


def _merge_list(
    base: list[Any],
    override: list[Any],
    strategy: MergeStrategy,
) -> list[Any]:
    """Merge two lists according to the strategy."""
    if strategy is MergeStrategy.REPLACE:
        return list(override)
    if strategy is MergeStrategy.APPEND:
        return base + override
    if strategy is MergeStrategy.UNIQUE:
        seen = set(base)
        result = list(base)
        for item in override:
            key = _hashable_key(item)
            if key not in seen:
                result.append(item)
                seen.add(key)
        return result
    return list(override)


def _copy_value(val: Any) -> Any:
    """Deep copy a value if it's a dict or list."""
    if isinstance(val, dict):
        return {k: _copy_value(v) for k, v in val.items()}
    if isinstance(val, list):
        return [_copy_value(v) for v in val]
    return val


def _hashable_key(val: Any) -> Any:
    """Convert a value to a hashable key for deduplication."""
    if isinstance(val, dict):
        return tuple(sorted(val.items()))
    if isinstance(val, list):
        return tuple(val)
    return val
