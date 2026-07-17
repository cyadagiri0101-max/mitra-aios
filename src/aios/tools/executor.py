"""Tool executor with retry and timeout support."""

from __future__ import annotations

import threading
import time

from aios.core.exceptions import ToolError
from aios.core.logger import get_logger
from aios.tools.cache import ToolCache
from aios.tools.config import ToolConfig
from aios.tools.metrics import ToolMetrics
from aios.tools.models import (
    ToolRequest,
    ToolResponse,
    ToolStatus,
    ToolValidationResult,
)
from aios.tools.permission import PermissionManager
from aios.tools.provider import ToolProvider
from aios.tools.sandbox import ToolSandbox
from aios.tools.validation import ValidationEngine


class ToolExecutor:
    def __init__(
        self,
        config: ToolConfig | None = None,
        permission_manager: PermissionManager | None = None,
        sandbox: ToolSandbox | None = None,
        validation_engine: ValidationEngine | None = None,
        cache: ToolCache | None = None,
        metrics: ToolMetrics | None = None,
    ) -> None:
        self.logger = get_logger("aios.tools.executor")
        self._config = config or ToolConfig()
        self._permission = permission_manager
        self._sandbox = sandbox
        self._validation = validation_engine
        self._cache = cache
        self._metrics = metrics
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> ToolExecutor:
        self._initialized = True
        self.logger.info("ToolExecutor initialized")
        return self

    def execute(self, provider: ToolProvider, request: ToolRequest, tool_def) -> ToolResponse:
        self._require_initialized()
        start = time.monotonic()

        if self._permission is not None:
            self._permission.require(tool_def, tool_def.requires_permission)

        if self._cache is not None:
            cached = self._cache.get(request)
            if cached is not None:
                self._metrics.record_cache_hit() if self._metrics else None
                return cached
            self._metrics.record_cache_miss() if self._metrics else None

        last_error: Exception | None = None
        for attempt in range(self._config.max_retries):
            try:
                response = provider.execute(request)
                latency = time.monotonic() - start
                if self._metrics:
                    self._metrics.record_execution(request.tool_name, True, latency)
                if self._cache is not None and response.status == ToolStatus.SUCCESS:
                    self._cache.put(request, response)
                return response
            except Exception as e:
                last_error = e
                self.logger.warning("Tool '%s' attempt %d failed: %s", request.tool_name, attempt + 1, e)

        latency = time.monotonic() - start
        if self._metrics:
            self._metrics.record_execution(request.tool_name, False, latency)
        raise ToolError(
            f"Tool '{request.tool_name}' failed after {self._config.max_retries} attempts: {last_error}",
            tool_name=request.tool_name,
        )

    def validate(self) -> ToolValidationResult:
        result = ToolValidationResult()
        if self._permission is not None:
            perm_result = self._permission.validate()
            result.warnings.extend(perm_result.warnings)
        if self._sandbox is not None:
            sandbox_result = self._sandbox.validate()
            result.errors.extend(sandbox_result.errors)
            if not sandbox_result.is_valid:
                result.is_valid = False
        if self._cache is not None:
            cache_result = self._cache.validate()
            result.errors.extend(cache_result.errors)
            if not cache_result.is_valid:
                result.is_valid = False
        return result

    def reload(self) -> ToolExecutor:
        self.logger.info("Reloading ToolExecutor")
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise ToolError("ToolExecutor has not been initialized")
