"""Git tool provider."""

from __future__ import annotations

import subprocess
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


class GitProvider(ToolProvider):
    def __init__(self, repo_path: str = ".") -> None:
        self.logger = get_logger("aios.tools.git_provider")
        self._repo_path = repo_path
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._executions: int = 0
        self._successes: int = 0
        self._failures: int = 0
        self._latency_sum: float = 0.0

    @property
    def name(self) -> str:
        return "git"

    @property
    def capabilities(self) -> ToolCapabilities:
        return ToolCapabilities(streaming=False, caching=True, retry=False, sandbox=True)

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def statistics(self) -> ToolStatistics:
        with self._lock:
            avg = self._latency_sum / self._executions if self._executions > 0 else 0.0
            return ToolStatistics(executions=self._executions, successes=self._successes, failures=self._failures, average_latency=round(avg, 6))

    def initialize(self) -> GitProvider:
        self._initialized = True
        self.logger.info("GitProvider initialized (repo=%s)", self._repo_path)
        return self

    def execute(self, request: ToolRequest) -> ToolResponse:
        self._require_initialized()
        start = time.monotonic()
        try:
            args = request.arguments.get("args", "")
            cmd = f"git {args}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=self._repo_path, timeout=request.timeout)
            output = result.stdout or result.stderr
            status = ToolStatus.SUCCESS if result.returncode == 0 else ToolStatus.ERROR
            error = "" if result.returncode == 0 else f"Exit code {result.returncode}"
        except Exception as e:
            output = ""
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
        return ToolResponse(result=output.strip(), status=status, error=error, execution_time=latency)

    def stream(self, request: ToolRequest) -> Iterator[str]:
        self._require_initialized()
        raise NotImplementedError("GitProvider does not support streaming")

    def list_tools(self) -> tuple[ToolDefinition, ...]:
        return (
            ToolDefinition(name="git_command", description="Run a git command", provider=self.name, parameters=(ToolParameter(name="args", required=True),), requires_permission=PermissionLevel.EXECUTE),
        )

    def health(self) -> bool:
        return self._initialized

    def validate(self) -> ToolValidationResult:
        return ToolValidationResult()

    def reload(self) -> GitProvider:
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
            raise ToolError("GitProvider has not been initialized", tool_name=self.name)
