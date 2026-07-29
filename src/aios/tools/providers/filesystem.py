"""Filesystem tool provider."""

from __future__ import annotations

import os
import threading
import time
from collections.abc import Iterator
from pathlib import Path

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


class FilesystemProvider(ToolProvider):
    def __init__(self, base_path: str = ".") -> None:
        self.logger = get_logger("aios.tools.filesystem_provider")
        self._base_path = os.path.abspath(base_path)
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._executions: int = 0
        self._successes: int = 0
        self._failures: int = 0
        self._latency_sum: float = 0.0

    @property
    def name(self) -> str:
        return "filesystem"

    @property
    def capabilities(self) -> ToolCapabilities:
        return ToolCapabilities(streaming=False, caching=True, retry=True, sandbox=True)

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def statistics(self) -> ToolStatistics:
        with self._lock:
            avg = self._latency_sum / self._executions if self._executions > 0 else 0.0
            return ToolStatistics(executions=self._executions, successes=self._successes, failures=self._failures, average_latency=round(avg, 6))

    def initialize(self) -> FilesystemProvider:
        self._initialized = True
        self.logger.info("FilesystemProvider initialized (base=%s)", self._base_path)
        return self

    def execute(self, request: ToolRequest) -> ToolResponse:
        self._require_initialized()
        start = time.monotonic()
        try:
            base_path = Path(self._base_path).resolve(strict=False)
            if request.tool_name == "read_file":
                path = request.arguments.get("path", "")
                full = self._resolve_path(path, base_path)
                with full.open("r", encoding="utf-8") as f:
                    result = f.read()
            elif request.tool_name == "write_file":
                path = request.arguments.get("path", "")
                content = request.arguments.get("content", "")
                full = self._resolve_path(path, base_path)
                full.parent.mkdir(parents=True, exist_ok=True)
                with full.open("w", encoding="utf-8") as f:
                    f.write(content)
                result = f"Wrote {len(content)} bytes"
            elif request.tool_name == "list_dir":
                path = request.arguments.get("path", ".")
                full = self._resolve_path(path, base_path)
                result = "\n".join(sorted(p.name for p in full.iterdir()))
            elif request.tool_name == "file_exists":
                path = request.arguments.get("path", "")
                full = self._resolve_path(path, base_path)
                result = str(full.exists())
            else:
                result = f"Unknown tool: {request.tool_name}"
            status = ToolStatus.SUCCESS
            error = ""
        except Exception as e:
            result = ""
            status = ToolStatus.ERROR
            error = str(e)
            with self._lock:
                self._failures += 1
        latency = time.monotonic() - start
        with self._lock:
            self._executions += 1
            if status == ToolStatus.SUCCESS:
                self._successes += 1
            self._latency_sum += latency
        return ToolResponse(result=result, status=status, error=error, execution_time=latency)

    def stream(self, request: ToolRequest) -> Iterator[str]:
        self._require_initialized()
        raise NotImplementedError("FilesystemProvider does not support streaming")

    def list_tools(self) -> tuple[ToolDefinition, ...]:
        return (
            ToolDefinition(name="read_file", description="Read a file", provider=self.name, parameters=(ToolParameter(name="path", required=True),), requires_permission=PermissionLevel.READ),
            ToolDefinition(name="write_file", description="Write a file", provider=self.name, parameters=(ToolParameter(name="path", required=True), ToolParameter(name="content", required=True)), requires_permission=PermissionLevel.WRITE),
            ToolDefinition(name="list_dir", description="List directory contents", provider=self.name, parameters=(ToolParameter(name="path"),), requires_permission=PermissionLevel.READ),
            ToolDefinition(name="file_exists", description="Check if file exists", provider=self.name, parameters=(ToolParameter(name="path", required=True),), requires_permission=PermissionLevel.READ),
        )

    def health(self) -> bool:
        return self._initialized and os.path.isdir(self._base_path)

    def validate(self) -> ToolValidationResult:
        result = ToolValidationResult()
        if not os.path.isdir(self._base_path):
            result.errors.append(f"Base path '{self._base_path}' does not exist")
            result.is_valid = False
        return result

    def reload(self) -> FilesystemProvider:
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
            raise ToolError("FilesystemProvider has not been initialized", tool_name=self.name)

    def _resolve_path(self, requested_path: str, base_path: Path) -> Path:
        candidate = Path(requested_path)
        full_path = (base_path / candidate).resolve(strict=False) if not candidate.is_absolute() else candidate.resolve(strict=False)
        try:
            full_path.relative_to(base_path)
        except ValueError as exc:
            raise ToolError("Access denied: outside base path", tool_name=self.name) from exc
        return full_path
