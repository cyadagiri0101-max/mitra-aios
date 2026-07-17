"""Abstract base plugin with lifecycle contract."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from aios.core.config import AIOSConfig
from aios.core.logger import get_logger


@dataclass(slots=True)
class PluginResult:
    """Standardized result from a plugin execution."""

    plugin_name: str
    status: str = "ok"
    payload: dict[str, Any] = field(default_factory=dict)
    validation: dict[str, Any] = field(default_factory=dict)
    report: dict[str, Any] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)

    @property
    def is_ok(self) -> bool:
        return self.status == "ok" and len(self.errors) == 0


class BasePlugin(ABC):
    """Abstract base for all AIOS plugins.

    Every plugin implements the four-phase lifecycle:
    initialize → execute → validate → report.
    """

    name: str = "base"

    def __init__(self, config: AIOSConfig) -> None:
        self.config = config
        self.logger = get_logger(f"aios.plugins.{self.name}", config.log_level)

    @abstractmethod
    def initialize(self) -> None:
        """Prepare the plugin for execution."""

    @abstractmethod
    def execute(self, context: dict[str, Any] | None = None) -> dict[str, Any]:
        """Run the plugin's primary logic and return a payload."""

    @abstractmethod
    def validate(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Validate the payload produced by execute."""

    @abstractmethod
    def report(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Generate a report summary from the payload."""

    def run(self, context: dict[str, Any] | None = None) -> PluginResult:
        """Execute the full lifecycle and return a PluginResult."""
        try:
            self.initialize()
            payload = self.execute(context)
            validation = self.validate(payload)
            report_data = self.report(payload)
            return PluginResult(
                plugin_name=self.name,
                status="ok",
                payload=payload,
                validation=validation,
                report=report_data,
            )
        except Exception as exc:
            self.logger.exception("Plugin %s failed", self.name)
            return PluginResult(
                plugin_name=self.name,
                status="failed",
                errors=[str(exc)],
            )
