"""Shell command tool provider."""

from __future__ import annotations

import shlex
import subprocess
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


class ShellProvider(ToolProvider):
    def __init__(self, allowed_commands: tuple[str, ...] = ("echo", "ls", "cat", "pwd")) -> None:
        self.logger = get_logger("aios.tools.shell_provider")
        self._allowed = set(allowed_commands)
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._executions: int = 0
        self._successes: int = 0
        self._failures: int = 0
        self._latency_sum: float = 0.0

    @property
    def name(self) -> str:
        return "shell"

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

    def initialize(self) -> ShellProvider:
        self._initialized = True
        self.logger.info("ShellProvider initialized")
        return self

    def execute(self, request: ToolRequest) -> ToolResponse:
        self._require_initialized()
        start = time.monotonic()
        command = request.arguments.get("command", "")
        if not command.strip():
            latency = time.monotonic() - start
            with self._lock:
                self._executions += 1
                self._failures += 1
                self._latency_sum += latency
            return ToolResponse(status=ToolStatus.ERROR, error="Command is empty", execution_time=latency)

        try:
            tokens = shlex.split(command, posix=True)
        except ValueError as exc:
            latency = time.monotonic() - start
            with self._lock:
                self._executions += 1
                self._failures += 1
                self._latency_sum += latency
            return ToolResponse(status=ToolStatus.ERROR, error=f"Invalid command syntax: {exc}", execution_time=latency)

        if not tokens:
            latency = time.monotonic() - start
            with self._lock:
                self._executions += 1
                self._failures += 1
                self._latency_sum += latency
            return ToolResponse(status=ToolStatus.ERROR, error="Command is empty", execution_time=latency)

        cmd_name = tokens[0]
        if cmd_name not in self._allowed:
            latency = time.monotonic() - start
            with self._lock:
                self._executions += 1
                self._failures += 1
                self._latency_sum += latency
            return ToolResponse(status=ToolStatus.ERROR, error=f"Command '{cmd_name}' not allowed", execution_time=latency)

        if any(char in command for char in ";&|><`$"):
            latency = time.monotonic() - start
            with self._lock:
                self._executions += 1
                self._failures += 1
                self._latency_sum += latency
            return ToolResponse(status=ToolStatus.ERROR, error=f"Command '{cmd_name}' not allowed", execution_time=latency)

        try:
            command_text = " ".join(tokens)
            result = subprocess.run(command_text, shell=True, capture_output=True, text=True, timeout=request.timeout, check=False)
            output = result.stdout or result.stderr
            status = ToolStatus.SUCCESS if result.returncode == 0 else ToolStatus.ERROR
            error = "" if result.returncode == 0 else f"Exit code {result.returncode}"
        except subprocess.TimeoutExpired:
            output = ""
            status = ToolStatus.TIMEOUT
            error = "Command timed out"
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

    def stream(self, request: ToolRequest) -> list[str]:
        self._require_initialized()
        raise NotImplementedError("ShellProvider does not support streaming")

    def list_tools(self) -> tuple[ToolDefinition, ...]:
        return (
            ToolDefinition(name="run_command", description="Run a shell command", provider=self.name, parameters=(ToolParameter(name="command", required=True),), requires_permission=PermissionLevel.EXECUTE),
        )

    def health(self) -> bool:
        return self._initialized

    def validate(self) -> ToolValidationResult:
        return ToolValidationResult()

    def reload(self) -> ShellProvider:
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
            raise ToolError("ShellProvider has not been initialized", tool_name=self.name)
