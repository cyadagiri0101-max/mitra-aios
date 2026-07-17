"""Tool Manager — unified facade over all tool subsystems."""

from __future__ import annotations

import threading

from aios.core.exceptions import ToolError
from aios.core.logger import get_logger
from aios.tools.cache import ToolCache
from aios.tools.config import ToolConfig
from aios.tools.executor import ToolExecutor
from aios.tools.metrics import ToolMetrics
from aios.tools.models import (
    ToolDefinition,
    ToolRequest,
    ToolResponse,
    ToolStatistics,
    ToolValidationResult,
)
from aios.tools.permission import PermissionManager
from aios.tools.provider import ToolProvider
from aios.tools.sandbox import ToolSandbox
from aios.tools.tool_registry import ToolRegistry
from aios.tools.validation import ValidationEngine


class ToolManager:
    def __init__(self, config: ToolConfig | None = None) -> None:
        self.logger = get_logger("aios.tools.manager")
        self._config = config or ToolConfig()
        self._lock = threading.Lock()
        self._initialized: bool = False

        self._registry = ToolRegistry()
        self._permission = PermissionManager()
        self._sandbox = ToolSandbox(self._config.sandbox)
        self._validation = ValidationEngine()
        self._cache = ToolCache(self._config.cache)
        self._metrics = ToolMetrics()
        self._executor = ToolExecutor(
            config=self._config,
            permission_manager=self._permission,
            sandbox=self._sandbox,
            validation_engine=self._validation,
            cache=self._cache,
            metrics=self._metrics,
        )

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def registry(self) -> ToolRegistry:
        return self._registry

    @property
    def permission(self) -> PermissionManager:
        return self._permission

    @property
    def sandbox(self) -> ToolSandbox:
        return self._sandbox

    @property
    def cache(self) -> ToolCache:
        return self._cache

    @property
    def metrics(self) -> ToolMetrics:
        return self._metrics

    def initialize(self) -> ToolManager:
        with self._lock:
            if self._initialized:
                return self
            self._registry.initialize()
            self._permission.initialize()
            self._sandbox.initialize()
            self._validation.initialize()
            self._cache.initialize()
            self._executor.initialize()
            self._initialized = True
            self.logger.info("ToolManager initialized")
        return self

    def register_provider(self, provider: ToolProvider) -> None:
        self._require_initialized()
        self._registry.register_provider(provider)
        for tool_def in provider.list_tools():
            self._permission.grant(tool_def.name, tool_def.requires_permission)

    def unregister_provider(self, name: str) -> bool:
        self._require_initialized()
        return self._registry.unregister_provider(name)

    def execute(self, request: ToolRequest) -> ToolResponse:
        self._require_initialized()
        entry = self._registry.get_tool(request.tool_name)
        if entry is None:
            raise ToolError(f"Tool '{request.tool_name}' not found", tool_name=request.tool_name)
        provider, tool_def = entry
        return self._executor.execute(provider, request, tool_def)

    def list_tools(self) -> list[ToolDefinition]:
        self._require_initialized()
        return self._registry.list_tools()

    def list_providers(self) -> list[str]:
        self._require_initialized()
        return self._registry.list_providers()

    def statistics(self) -> ToolStatistics:
        self._require_initialized()
        m = self._metrics.statistics()
        return ToolStatistics(
            executions=m["executions"],
            successes=m["successes"],
            failures=m["failures"],
            timeouts=m["timeouts"],
            average_latency=m["average_latency"],
            cache_hits=m["cache_hits"],
            cache_misses=m["cache_misses"],
        )

    def validate(self) -> ToolValidationResult:
        result = ToolValidationResult()
        reg_result = self._registry.validate()
        perm_result = self._permission.validate()
        sandbox_result = self._sandbox.validate()
        cache_result = self._cache.validate()
        executor_result = self._executor.validate()
        for r in [reg_result, perm_result, sandbox_result, cache_result, executor_result]:
            result.warnings.extend(r.warnings)
            result.errors.extend(r.errors)
            if not r.is_valid:
                result.is_valid = False
        return result

    def reload(self) -> ToolManager:
        self.logger.info("Reloading ToolManager")
        with self._lock:
            self._registry.reload()
            self._permission.reload()
            self._sandbox.reload()
            self._validation.reload()
            self._cache.reload()
            self._executor.reload()
            self._metrics.reset()
            self._initialized = False
        return self

    def shutdown(self) -> None:
        self.logger.info("Shutting down ToolManager")
        with self._lock:
            for name in self._registry.list_providers():
                provider = self._registry.get_provider(name)
                if provider is not None:
                    try:
                        provider.shutdown()
                    except Exception:
                        self.logger.exception("Error shutting down provider '%s'", name)
            self._initialized = False

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise ToolError("ToolManager has not been initialized")
