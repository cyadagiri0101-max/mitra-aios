"""MCP (Model Context Protocol) tool provider (stub)."""

from __future__ import annotations

import threading
from collections.abc import Iterator

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


class MCPProvider(ToolProvider):
    def __init__(self, server_url: str = "") -> None:
        self.logger = get_logger("aios.tools.mcp_provider")
        self._server_url = server_url
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def name(self) -> str:
        return "mcp"

    @property
    def capabilities(self) -> ToolCapabilities:
        return ToolCapabilities(streaming=True, caching=True, retry=True)

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def statistics(self) -> ToolStatistics:
        return ToolStatistics()

    def initialize(self) -> MCPProvider:
        self._initialized = True
        self.logger.info("MCPProvider initialized (stub, server=%s)", self._server_url)
        return self

    def execute(self, request: ToolRequest) -> ToolResponse:
        self._require_initialized()
        raise NotImplementedError("MCPProvider requires MCP client implementation")

    def stream(self, request: ToolRequest) -> Iterator[str]:
        self._require_initialized()
        raise NotImplementedError("MCPProvider requires MCP client implementation")

    def list_tools(self) -> tuple[ToolDefinition, ...]:
        return (
            ToolDefinition(name="mcp_call", description="Call an MCP tool", provider=self.name, parameters=(ToolParameter(name="tool_name", required=True), ToolParameter(name="arguments")), requires_permission=PermissionLevel.EXECUTE),
        )

    def health(self) -> bool:
        return self._initialized

    def validate(self) -> ToolValidationResult:
        result = ToolValidationResult()
        result.warnings.append("MCPProvider is a stub — requires MCP client")
        if not self._server_url:
            result.warnings.append("No MCP server URL configured")
        return result

    def reload(self) -> MCPProvider:
        return self

    def shutdown(self) -> None:
        self._initialized = False

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise ToolError("MCPProvider has not been initialized", tool_name=self.name)
