"""Plugin registry for managing plugin metadata."""

from __future__ import annotations

import threading
import time

from aios.core.exceptions import PluginError
from aios.core.logger import get_logger
from aios.plugins.models import (
    PluginInfo,
    PluginMetadata,
    PluginStatus,
    PluginValidationResult,
)


class PluginRegistry:
    """Registry for managing plugin metadata."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.plugins.registry")
        self._plugins: dict[str, PluginInfo] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> PluginRegistry:
        """Initialize the registry."""
        self._initialized = True
        self.logger.info("PluginRegistry initialized")
        return self

    def register(self, metadata: PluginMetadata) -> PluginInfo:
        """Register a plugin."""
        self._require_initialized()

        with self._lock:
            if metadata.name in self._plugins:
                raise PluginError(f"Plugin '{metadata.name}' already registered", plugin_name=metadata.name)

            info = PluginInfo(
                metadata=metadata,
                status=PluginStatus.INSTALLED,
                installed_at=time.time(),
            )
            self._plugins[metadata.name] = info
            self.logger.info("Registered plugin: %s", metadata.name)
            return info

    def unregister(self, name: str) -> bool:
        """Unregister a plugin."""
        self._require_initialized()

        with self._lock:
            if name not in self._plugins:
                return False

            del self._plugins[name]
            self.logger.info("Unregistered plugin: %s", name)
            return True

    def get(self, name: str) -> PluginInfo | None:
        """Get plugin info by name."""
        self._require_initialized()

        with self._lock:
            return self._plugins.get(name)

    def update_status(self, name: str, status: PluginStatus) -> bool:
        """Update plugin status."""
        self._require_initialized()

        with self._lock:
            if name not in self._plugins:
                return False

            info = self._plugins[name]
            updated_info = PluginInfo(
                metadata=info.metadata,
                status=status,
                installed_at=info.installed_at,
                enabled_at=time.time() if status == PluginStatus.ENABLED else info.enabled_at,
            )
            self._plugins[name] = updated_info
            self.logger.info("Updated plugin '%s' status to %s", name, status.value)
            return True

    def list(self, status: PluginStatus | None = None) -> list[str]:
        """List all plugin names, optionally filtered by status."""
        self._require_initialized()

        with self._lock:
            if status:
                return [name for name, info in self._plugins.items() if info.status == status]
            return list(self._plugins.keys())

    def count(self, status: PluginStatus | None = None) -> int:
        """Count plugins, optionally filtered by status."""
        self._require_initialized()

        with self._lock:
            if status:
                return sum(1 for info in self._plugins.values() if info.status == status)
            return len(self._plugins)

    def validate(self) -> PluginValidationResult:
        """Validate the registry."""
        result = PluginValidationResult()

        with self._lock:
            if not self._plugins:
                result.warnings.append("No plugins registered")

        return result

    def reload(self) -> PluginRegistry:
        """Reload the registry."""
        self.logger.info("Reloading PluginRegistry")

        with self._lock:
            self._plugins.clear()

        return self

    def _require_initialized(self) -> None:
        """Check if registry is initialized."""
        if not self._initialized:
            raise PluginError("PluginRegistry has not been initialized")
