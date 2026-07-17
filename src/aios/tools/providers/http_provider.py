"""HTTP tool provider."""

from __future__ import annotations

import json
import threading
import time
from urllib import request as urlrequest

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


class HTTPProvider(ToolProvider):
    def __init__(self) -> None:
        self.logger = get_logger("aios.tools.http_provider")
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._executions: int = 0
        self._successes: int = 0
        self._failures: int = 0
        self._latency_sum: float = 0.0

    @property
    def name(self) -> str:
        return "http"

    @property
    def capabilities(self) -> ToolCapabilities:
        return ToolCapabilities(streaming=False, caching=True, retry=True)

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def statistics(self) -> ToolStatistics:
        with self._lock:
            avg = self._latency_sum / self._executions if self._executions > 0 else 0.0
            return ToolStatistics(executions=self._executions, successes=self._successes, failures=self._failures, average_latency=round(avg, 6))

    def initialize(self) -> HTTPProvider:
        self._initialized = True
        self.logger.info("HTTPProvider initialized")
        return self

    def execute(self, request: ToolRequest) -> ToolResponse:
        self._require_initialized()
        start = time.monotonic()
        url = request.arguments.get("url", "")
        method = request.arguments.get("method", "GET").upper()
        try:
            req = urlrequest.Request(url, method=method)
            body = request.arguments.get("body")
            if body:
                req.data = json.dumps(body).encode("utf-8")
                req.add_header("Content-Type", "application/json")
            with urlrequest.urlopen(req, timeout=request.timeout) as resp:
                result = resp.read().decode("utf-8")
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

    def stream(self, request: ToolRequest) -> list[str]:
        self._require_initialized()
        raise NotImplementedError("HTTPProvider does not support streaming")

    def list_tools(self) -> tuple[ToolDefinition, ...]:
        return (
            ToolDefinition(name="http_request", description="Make an HTTP request", provider=self.name, parameters=(ToolParameter(name="url", required=True), ToolParameter(name="method"), ToolParameter(name="body")), requires_permission=PermissionLevel.EXECUTE),
        )

    def health(self) -> bool:
        return self._initialized

    def validate(self) -> ToolValidationResult:
        return ToolValidationResult()

    def reload(self) -> HTTPProvider:
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
            raise ToolError("HTTPProvider has not been initialized", tool_name=self.name)
