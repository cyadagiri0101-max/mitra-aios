"""AIOS Plugin System - plugin management and lifecycle."""

from aios.plugins.lifecycle import LifecycleManager
from aios.plugins.loader import PluginLoader
from aios.plugins.manager import PluginManager
from aios.plugins.models import (
    PluginInfo,
    PluginMetadata,
    PluginStatistics,
    PluginStatus,
    PluginValidationResult,
)
from aios.plugins.registry import PluginRegistry
from aios.plugins.validator import PluginValidator

__all__ = [
    # Core components
    "PluginManager",
    "PluginRegistry",
    "PluginLoader",
    "PluginValidator",
    "LifecycleManager",

    # Models
    "PluginMetadata",
    "PluginInfo",
    "PluginStatus",
    "PluginStatistics",
    "PluginValidationResult",
]
