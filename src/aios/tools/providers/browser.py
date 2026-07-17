"""Browser tool provider (stub — requires selenium/playwright)."""

from __future__ import annotations

import threading

from aios.core.exceptions import ToolError
from aios.core.logger import get_logger
from aios.tools.models import (
    PermissionLevel,
    ToolCapabilities,
    ToolDefinition,
    ToolParameter,
    ToolRequest,
    ToolResponse,
    ToolStatistics,
    ToolValidationResult,
)
from aios.tools.provider import ToolProvider


class BrowserProvider(ToolProvider):
    def __init__(self) -> None:
        self.logger = get_logger("aios.tools.browser_provider")
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def name(self) -> str:
        return "browser"

    @property
    def capabilities(self) -> ToolCapabilities:
        return ToolCapabilities(streaming=False, caching=False, retry=False, sandbox=True)

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def statistics(self) -> ToolStatistics:
        return ToolStatistics()

    def initialize(self) -> BrowserProvider:
        self._initialized = True
        self.logger.info("BrowserProvider initialized (stub)")
        return self

    def execute(self, request: ToolRequest) -> ToolResponse:
        self._require_initialized()
        raise NotImplementedError("BrowserProvider requires selenium/playwright")

    def stream(self, request: ToolRequest) -> list[str]:
        self._require_initialized()
        raise NotImplementedError("BrowserProvider does not support streaming")

    def list_tools(self) -> tuple[ToolDefinition, ...]:
        return (
            ToolDefinition(name="navigate", description="Navigate to URL", provider=self.name, parameters=(ToolParameter(name="url", required=True),), requires_permission=PermissionLevel.EXECUTE),
            ToolDefinition(name="click", description="Click an element", provider=self.name, parameters=(ToolParameter(name="selector", required=True),), requires_permission=PermissionLevel.EXECUTE),
            ToolDefinition(name="screenshot", description="Take a screenshot", provider=self.name, requires_permission=PermissionLevel.READ),
        )

    def health(self) -> bool:
        return self._initialized

    def validate(self) -> ToolValidationResult:
        result = ToolValidationResult()
        result.warnings.append("BrowserProvider is a stub — requires selenium/playwright")
        return result

    def reload(self) -> BrowserProvider:
        return self

    def shutdown(self) -> None:
        self._initialized = False

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise ToolError("BrowserProvider has not been initialized", tool_name=self.name)
