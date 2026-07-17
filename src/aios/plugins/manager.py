"""Plugin Manager - main facade for the plugin system."""

from __future__ import annotations

import threading

from aios.core.exceptions import PluginError
from aios.core.logger import get_logger
from aios.plugins.lifecycle import LifecycleManager
from aios.plugins.loader import PluginLoader
from aios.plugins.models import (
    PluginInfo,
    PluginMetadata,
    PluginStatistics,
    PluginStatus,
    PluginValidationResult,
)
from aios.plugins.registry import PluginRegistry
from aios.plugins.validator import PluginValidator


class PluginManager:
    """Main facade for the plugin system."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.plugins.manager")
        self._lock = threading.Lock()
        self._initialized: bool = False

        # Initialize components
        self._registry = PluginRegistry()
        self._loader = PluginLoader()
        self._validator = PluginValidator()
        self._lifecycle = LifecycleManager(
            registry=self._registry,
            loader=self._loader,
            validator=self._validator,
        )

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def registry(self) -> PluginRegistry:
        return self._registry

    @property
    def loader(self) -> PluginLoader:
        return self._loader

    @property
    def validator(self) -> PluginValidator:
        return self._validator

    @property
    def lifecycle(self) -> LifecycleManager:
        return self._lifecycle

    def initialize(self) -> PluginManager:
        """Initialize the plugin manager and all components."""
        with self._lock:
            if self._initialized:
                return self

            self._registry.initialize()
            self._loader.initialize()
            self._validator.initialize()
            self._lifecycle.initialize()

            self._initialized = True
            self.logger.info("PluginManager initialized")

        return self

    def install_plugin(self, metadata: PluginMetadata) -> bool:
        """Install a plugin."""
        self._require_initialized()
        return self._lifecycle.install(metadata)

    def uninstall_plugin(self, name: str) -> bool:
        """Uninstall a plugin."""
        self._require_initialized()
        return self._lifecycle.uninstall(name)

    def enable_plugin(self, name: str) -> bool:
        """Enable a plugin."""
        self._require_initialized()
        return self._lifecycle.enable(name)

    def disable_plugin(self, name: str) -> bool:
        """Disable a plugin."""
        self._require_initialized()
        return self._lifecycle.disable(name)

    def update_plugin(self, name: str, new_metadata: PluginMetadata) -> bool:
        """Update a plugin."""
        self._require_initialized()
        return self._lifecycle.update(name, new_metadata)

    def get_plugin(self, name: str) -> PluginInfo | None:
        """Get plugin information."""
        self._require_initialized()
        return self._registry.get(name)

    def list_plugins(self, status: PluginStatus | None = None) -> list[str]:
        """List all plugins, optionally filtered by status."""
        self._require_initialized()
        return self._registry.list(status)

    def get_statistics(self) -> PluginStatistics:
        """Get plugin statistics."""
        self._require_initialized()

        return PluginStatistics(
            total_plugins=self._registry.count(),
            enabled_plugins=self._registry.count(PluginStatus.ENABLED),
            disabled_plugins=self._registry.count(PluginStatus.DISABLED),
            error_plugins=self._registry.count(PluginStatus.ERROR),
        )

    def validate(self) -> PluginValidationResult:
        """Validate the plugin manager."""
        self._require_initialized()

        result = PluginValidationResult()

        # Validate all components
        for component in [self._registry, self._loader, self._validator, self._lifecycle]:
            component_result = component.validate()
            result.warnings.extend(component_result.warnings)
            result.errors.extend(component_result.errors)
            if not component_result.is_valid:
                result.is_valid = False

        return result

    def reload(self) -> PluginManager:
        """Reload the plugin manager."""
        self.logger.info("Reloading PluginManager")

        with self._lock:
            self._registry.reload()
            self._loader.reload()
            self._validator.reload()
            self._lifecycle.reload()
            self._initialized = False

        return self

    def shutdown(self) -> None:
        """Shutdown the plugin manager."""
        self.logger.info("Shutting down PluginManager")

        with self._lock:
            # Disable all enabled plugins
            for name in self._registry.list(PluginStatus.ENABLED):
                try:
                    self._lifecycle.disable(name)
                except Exception as e:
                    self.logger.warning("Error disabling plugin '%s': %s", name, e)

            self._initialized = False

    def _require_initialized(self) -> None:
        """Check if manager is initialized."""
        if not self._initialized:
            raise PluginError("PluginManager has not been initialized")
