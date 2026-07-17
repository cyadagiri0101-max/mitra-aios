"""Plugin validator for validating plugin metadata and dependencies."""

from __future__ import annotations

import re
import threading

from aios.core.exceptions import PluginError
from aios.core.logger import get_logger
from aios.plugins.models import (
    PluginMetadata,
    PluginValidationResult,
)


class PluginValidator:
    """Validator for plugin metadata and dependencies."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.plugins.validator")
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> PluginValidator:
        """Initialize the validator."""
        self._initialized = True
        self.logger.info("PluginValidator initialized")
        return self

    def validate_metadata(self, metadata: PluginMetadata) -> PluginValidationResult:
        """Validate plugin metadata."""
        self._require_initialized()
        result = PluginValidationResult()

        if not metadata.name:
            result.errors.append("Plugin name is required")
            result.is_valid = False

        if not re.match(r'^[a-zA-Z0-9_-]+$', metadata.name):
            result.errors.append(f"Invalid plugin name: {metadata.name}")
            result.is_valid = False

        if not metadata.version:
            result.errors.append("Plugin version is required")
            result.is_valid = False

        if not re.match(r'^\d+\.\d+\.\d+', metadata.version):
            result.warnings.append(f"Version format may be non-standard: {metadata.version}")

        if not metadata.entry_point:
            result.warnings.append("No entry point specified")

        return result

    def validate_dependencies(
        self,
        dependencies: tuple[str, ...],
        available_plugins: list[str],
    ) -> PluginValidationResult:
        """Validate plugin dependencies."""
        self._require_initialized()
        result = PluginValidationResult()

        for dep in dependencies:
            dep_name = dep.split("==")[0].split(">=")[0].split("<=")[0].strip()
            if dep_name not in available_plugins:
                result.errors.append(f"Missing dependency: {dep_name}")
                result.is_valid = False

        return result

    def validate_version_constraint(self, version: str, constraint: str) -> bool:
        """Validate if a version satisfies a constraint."""
        self._require_initialized()

        if not constraint:
            return True

        # Parse constraint
        if constraint.startswith("=="):
            return version == constraint[2:]
        elif constraint.startswith(">="):
            return self._compare_versions(version, constraint[2:]) >= 0
        elif constraint.startswith("<="):
            return self._compare_versions(version, constraint[2:]) <= 0
        elif constraint.startswith(">"):
            return self._compare_versions(version, constraint[1:]) > 0
        elif constraint.startswith("<"):
            return self._compare_versions(version, constraint[1:]) < 0
        else:
            return version == constraint

    def validate(self) -> PluginValidationResult:
        """Validate the validator."""
        return PluginValidationResult()

    def reload(self) -> PluginValidator:
        """Reload the validator."""
        self.logger.info("Reloading PluginValidator")
        return self

    def _compare_versions(self, v1: str, v2: str) -> int:
        """Compare two version strings."""
        parts1 = [int(x) for x in v1.split(".")]
        parts2 = [int(x) for x in v2.split(".")]

        for p1, p2 in zip(parts1, parts2):
            if p1 < p2:
                return -1
            elif p1 > p2:
                return 1

        return len(parts1) - len(parts2)

    def _require_initialized(self) -> None:
        """Check if validator is initialized."""
        if not self._initialized:
            raise PluginError("PluginValidator has not been initialized")
