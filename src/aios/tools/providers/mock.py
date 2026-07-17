"""Mock tool provider — fully functional, no external dependencies."""

from __future__ import annotations

import threading
import time

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
    ToolStatus,
    ToolValidationResult,
)
from aios.tools.provider import ToolProvider


class MockToolProvider(ToolProvider):
    def __init__(self) -> None:
        self.logger = get_logger("aios.tools.mock_provider")
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._executions: int = 0
        self._successes: int = 0
        self._failures: int = 0
        self._latency_sum: float = 0.0

    @property
    def name(self) -> str:
        return "mock"

    @property
    def capabilities(self) -> ToolCapabilities:
        return ToolCapabilities(
            streaming=True,
            async_execution=False,
            caching=True,
            retry=True,
            sandbox=False,
        )

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def statistics(self) -> ToolStatistics:
        with self._lock:
            avg = self._latency_sum / self._executions if self._executions > 0 else 0.0
            return ToolStatistics(
                executions=self._executions,
                successes=self._successes,
                failures=self._failures,
                average_latency=round(avg, 6),
            )

    def initialize(self) -> MockToolProvider:
        self._initialized = True
        self.logger.info("MockToolProvider initialized")
        return self

    def execute(self, request: ToolRequest) -> ToolResponse:
        self._require_initialized()
        start = time.monotonic()
        tool_name = request.tool_name

        if tool_name == "echo":
            result = request.arguments.get("message", "")
        elif tool_name == "add":
            a = request.arguments.get("a", 0)
            b = request.arguments.get("b", 0)
            result = str(a + b)
        elif tool_name == "fail":
            raise RuntimeError("Mock failure")
        else:
            result = f"mock result for {tool_name}"

        latency = time.monotonic() - start
        with self._lock:
            self._executions += 1
            self._successes += 1
            self._latency_sum += latency

        return ToolResponse(
            result=result,
            status=ToolStatus.SUCCESS,
            execution_time=latency,
        )

    def stream(self, request: ToolRequest) -> list[str]:
        self._require_initialized()
        result = self.execute(request)
        return iter(result.result.split())

    def list_tools(self) -> tuple[ToolDefinition, ...]:
        return (
            ToolDefinition(
                name="echo",
                description="Echo a message back",
                provider=self.name,
                parameters=(ToolParameter(name="message", type="string", required=True),),
                returns="string",
                requires_permission=PermissionLevel.READ,
            ),
            ToolDefinition(
                name="add",
                description="Add two numbers",
                provider=self.name,
                parameters=(
                    ToolParameter(name="a", type="number", required=True),
                    ToolParameter(name="b", type="number", required=True),
                ),
                returns="number",
                requires_permission=PermissionLevel.READ,
            ),
            ToolDefinition(
                name="fail",
                description="Always fails (for testing)",
                provider=self.name,
                returns="never",
                requires_permission=PermissionLevel.EXECUTE,
            ),
        )

    def health(self) -> bool:
        return self._initialized

    def validate(self) -> ToolValidationResult:
        result = ToolValidationResult()
        if not self._initialized:
            result.warnings.append("MockToolProvider not initialized")
        return result

    def reload(self) -> MockToolProvider:
        self.logger.info("Reloading MockToolProvider")
        with self._lock:
            self._executions = 0
            self._successes = 0
            self._failures = 0
            self._latency_sum = 0.0
        return self

    def shutdown(self) -> None:
        self.logger.info("Shutting down MockToolProvider")
        self._initialized = False

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise ToolError("MockToolProvider has not been initialized", tool_name=self.name)
