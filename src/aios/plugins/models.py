"""Data models for plugin system."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class PluginStatus(StrEnum):
    """Plugin status."""
    INSTALLED = "installed"
    ENABLED = "enabled"
    DISABLED = "disabled"
    ERROR = "error"
    UNINSTALLED = "uninstalled"


@dataclass(frozen=True, slots=True)
class PluginMetadata:
    """Plugin metadata."""
    name: str = ""
    version: str = ""
    description: str = ""
    author: str = ""
    dependencies: tuple[str, ...] = ()
    entry_point: str = ""
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class PluginInfo:
    """Plugin information."""
    metadata: PluginMetadata = field(default_factory=PluginMetadata)
    status: PluginStatus = PluginStatus.INSTALLED
    installed_at: float = 0.0
    enabled_at: float = 0.0
    runtime_metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class PluginDependency:
    """Plugin dependency."""
    name: str = ""
    version_constraint: str = ""
    optional: bool = False


@dataclass(slots=True)
class PluginStatistics:
    """Plugin statistics."""
    total_plugins: int = 0
    enabled_plugins: int = 0
    disabled_plugins: int = 0
    error_plugins: int = 0


@dataclass(slots=True)
class PluginValidationResult:
    """Plugin validation result."""
    is_valid: bool = True
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
