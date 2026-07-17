"""Plugin lifecycle manager for managing plugin lifecycle."""

from __future__ import annotations

import threading

from aios.core.exceptions import PluginError
from aios.core.logger import get_logger
from aios.plugins.loader import PluginLoader
from aios.plugins.models import (
    PluginMetadata,
    PluginStatus,
    PluginValidationResult,
)
from aios.plugins.registry import PluginRegistry
from aios.plugins.validator import PluginValidator


class LifecycleManager:
    """Manager for plugin lifecycle operations."""

    def __init__(
        self,
        registry: PluginRegistry,
        loader: PluginLoader,
        validator: PluginValidator,
    ) -> None:
        self.logger = get_logger("aios.plugins.lifecycle")
        self._registry = registry
        self._loader = loader
        self._validator = validator
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> LifecycleManager:
        """Initialize the lifecycle manager."""
        self._initialized = True
        self.logger.info("LifecycleManager initialized")
        return self

    def install(self, metadata: PluginMetadata) -> bool:
        """Install a plugin."""
        self._require_initialized()

        # Validate metadata
        validation = self._validator.validate_metadata(metadata)
        if not validation.is_valid:
            raise PluginError(
                f"Invalid plugin metadata: {', '.join(validation.errors)}",
                plugin_name=metadata.name,
            )

        # Register plugin
        self._registry.register(metadata)
        self.logger.info("Installed plugin: %s", metadata.name)
        return True

    def uninstall(self, name: str) -> bool:
        """Uninstall a plugin."""
        self._require_initialized()

        # Check if plugin exists
        info = self._registry.get(name)
        if not info:
            return False

        # Unload if loaded
        if self._loader.is_loaded(name):
            self._loader.unload_plugin(name)

        # Unregister
        self._registry.unregister(name)
        self.logger.info("Uninstalled plugin: %s", name)
        return True

    def enable(self, name: str) -> bool:
        """Enable a plugin."""
        self._require_initialized()

        # Check if plugin exists
        info = self._registry.get(name)
        if not info:
            raise PluginError(f"Plugin '{name}' not found", plugin_name=name)

        # Load plugin
        try:
            self._loader.load_plugin(info.metadata)
            self._registry.update_status(name, PluginStatus.ENABLED)
            self.logger.info("Enabled plugin: %s", name)
            return True
        except Exception as e:
            self._registry.update_status(name, PluginStatus.ERROR)
            raise PluginError(f"Failed to enable plugin '{name}': {e}", plugin_name=name) from e

    def disable(self, name: str) -> bool:
        """Disable a plugin."""
        self._require_initialized()

        # Check if plugin exists
        info = self._registry.get(name)
        if not info:
            return False

        # Unload plugin
        if self._loader.is_loaded(name):
            self._loader.unload_plugin(name)

        self._registry.update_status(name, PluginStatus.DISABLED)
        self.logger.info("Disabled plugin: %s", name)
        return True

    def update(self, name: str, new_metadata: PluginMetadata) -> bool:
        """Update a plugin."""
        self._require_initialized()

        # Check if plugin exists
        info = self._registry.get(name)
        if not info:
            raise PluginError(f"Plugin '{name}' not found", plugin_name=name)

        # Disable if enabled
        if info.status == PluginStatus.ENABLED:
            self.disable(name)

        # Uninstall
        self.uninstall(name)

        # Install new version
        self.install(new_metadata)

        self.logger.info("Updated plugin: %s", name)
        return True

    def validate(self) -> PluginValidationResult:
        """Validate the lifecycle manager."""
        return PluginValidationResult()

    def reload(self) -> LifecycleManager:
        """Reload the lifecycle manager."""
        self.logger.info("Reloading LifecycleManager")
        return self

    def _require_initialized(self) -> None:
        """Check if lifecycle manager is initialized."""
        if not self._initialized:
            raise PluginError("LifecycleManager has not been initialized")
