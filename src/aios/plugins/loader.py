"""Plugin loader for loading plugin modules."""

from __future__ import annotations

import importlib
import threading
from typing import Any

from aios.core.exceptions import PluginError
from aios.core.logger import get_logger
from aios.plugins.models import (
    PluginMetadata,
    PluginValidationResult,
)


class PluginLoader:
    """Loader for plugin modules."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.plugins.loader")
        self._loaded_modules: dict[str, Any] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> PluginLoader:
        """Initialize the loader."""
        self._initialized = True
        self.logger.info("PluginLoader initialized")
        return self

    def load_plugin(self, metadata: PluginMetadata) -> Any:
        """Load a plugin module."""
        self._require_initialized()

        if not metadata.entry_point:
            raise PluginError(f"No entry point for plugin '{metadata.name}'", plugin_name=metadata.name)

        with self._lock:
            if metadata.name in self._loaded_modules:
                return self._loaded_modules[metadata.name]

            try:
                module = importlib.import_module(metadata.entry_point)
                self._loaded_modules[metadata.name] = module
                self.logger.info("Loaded plugin module: %s", metadata.entry_point)
                return module
            except ImportError as e:
                raise PluginError(
                    f"Failed to load plugin '{metadata.name}': {e}",
                    plugin_name=metadata.name,
                ) from e

    def unload_plugin(self, plugin_name: str) -> bool:
        """Unload a plugin module."""
        self._require_initialized()

        with self._lock:
            if plugin_name in self._loaded_modules:
                del self._loaded_modules[plugin_name]
                self.logger.info("Unloaded plugin: %s", plugin_name)
                return True
            return False

    def is_loaded(self, plugin_name: str) -> bool:
        """Check if a plugin is loaded."""
        self._require_initialized()

        with self._lock:
            return plugin_name in self._loaded_modules

    def list_loaded(self) -> list[str]:
        """List all loaded plugins."""
        self._require_initialized()

        with self._lock:
            return list(self._loaded_modules.keys())

    def validate(self) -> PluginValidationResult:
        """Validate the loader."""
        return PluginValidationResult()

    def reload(self) -> PluginLoader:
        """Reload the loader."""
        self.logger.info("Reloading PluginLoader")

        with self._lock:
            self._loaded_modules.clear()

        return self

    def _require_initialized(self) -> None:
        """Check if loader is initialized."""
        if not self._initialized:
            raise PluginError("PluginLoader has not been initialized")
