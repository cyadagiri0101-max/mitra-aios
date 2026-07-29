"""Python code execution tool provider."""

from __future__ import annotations

import threading
import time
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
    ToolStatus,
    ToolValidationResult,
)
from aios.tools.provider import ToolProvider


class PythonProvider(ToolProvider):
    def __init__(self) -> None:
        self.logger = get_logger("aios.tools.python_provider")
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._executions: int = 0
        self._successes: int = 0
        self._failures: int = 0
        self._latency_sum: float = 0.0

    @property
    def name(self) -> str:
        return "python"

    @property
    def capabilities(self) -> ToolCapabilities:
        return ToolCapabilities(streaming=False, caching=False, retry=False, sandbox=True)

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def statistics(self) -> ToolStatistics:
        with self._lock:
            avg = self._latency_sum / self._executions if self._executions > 0 else 0.0
            return ToolStatistics(executions=self._executions, successes=self._successes, failures=self._failures, average_latency=round(avg, 6))

    def initialize(self) -> PythonProvider:
        self._initialized = True
        self.logger.info("PythonProvider initialized")
        return self

    def execute(self, request: ToolRequest) -> ToolResponse:
        self._require_initialized()
        start = time.monotonic()
        code = request.arguments.get("code", "")
        try:
            import io
            import sys
            old_stdout = sys.stdout
            sys.stdout = buffer = io.StringIO()
            exec(code, {"__builtins__": __builtins__})
            sys.stdout = old_stdout
            result = buffer.getvalue()
            status = ToolStatus.SUCCESS
            error = ""
        except Exception as e:
            result = ""
            status = ToolStatus.ERROR
            error = str(e)
        latency = time.monotonic() - start
        with self._lock:
            self._executions += 1
            if status == ToolStatus.SUCCESS:
                self._successes += 1
            else:
                self._failures += 1
            self._latency_sum += latency
        return ToolResponse(result=result, status=status, error=error, execution_time=latency)

    def stream(self, request: ToolRequest) -> Iterator[str]:
        self._require_initialized()
        raise NotImplementedError("PythonProvider does not support streaming")

    def list_tools(self) -> tuple[ToolDefinition, ...]:
        return (
            ToolDefinition(name="run_python", description="Execute Python code", provider=self.name, parameters=(ToolParameter(name="code", required=True),), requires_permission=PermissionLevel.EXECUTE),
        )

    def health(self) -> bool:
        return self._initialized

    def validate(self) -> ToolValidationResult:
        return ToolValidationResult()

    def reload(self) -> PythonProvider:
        with self._lock:
            self._executions = 0
            self._successes = 0
            self._failures = 0
            self._latency_sum = 0.0
        return self

    def shutdown(self) -> None:
        self._initialized = False

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise ToolError("PythonProvider has not been initialized", tool_name=self.name)
