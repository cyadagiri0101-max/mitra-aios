"""Tool registry with provider management."""

from __future__ import annotations

import threading

from aios.core.exceptions import ToolError
from aios.core.logger import get_logger
from aios.tools.models import ToolDefinition, ToolValidationResult
from aios.tools.provider import ToolProvider


class ToolRegistry:
    def __init__(self) -> None:
        self.logger = get_logger("aios.tools.registry")
        self._providers: dict[str, ToolProvider] = {}
        self._tools: dict[str, tuple[ToolProvider, ToolDefinition]] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> ToolRegistry:
        self._initialized = True
        self.logger.info("ToolRegistry initialized")
        return self

    def register_provider(self, provider: ToolProvider) -> None:
        self._require_initialized()
        with self._lock:
            if provider.name in self._providers:
                raise ToolError(f"Provider '{provider.name}' already registered", tool_name=provider.name)
            self._providers[provider.name] = provider
            for tool_def in provider.list_tools():
                if tool_def.name in self._tools:
                    raise ToolError(f"Tool '{tool_def.name}' already registered", tool_name=tool_def.name)
                self._tools[tool_def.name] = (provider, tool_def)
            self.logger.info("Registered provider '%s' with %d tools", provider.name, len(provider.list_tools()))

    def unregister_provider(self, name: str) -> bool:
        self._require_initialized()
        with self._lock:
            if name not in self._providers:
                return False
            provider = self._providers[name]
            for tool_def in provider.list_tools():
                self._tools.pop(tool_def.name, None)
            del self._providers[name]
            self.logger.info("Unregistered provider '%s'", name)
            return True

    def get_provider(self, name: str) -> ToolProvider | None:
        self._require_initialized()
        with self._lock:
            return self._providers.get(name)

    def get_tool(self, name: str) -> tuple[ToolProvider, ToolDefinition] | None:
        self._require_initialized()
        with self._lock:
            return self._tools.get(name)

    def list_providers(self) -> list[str]:
        self._require_initialized()
        with self._lock:
            return list(self._providers.keys())

    def list_tools(self) -> list[ToolDefinition]:
        self._require_initialized()
        with self._lock:
            return [defn for _, defn in self._tools.values()]

    def validate(self) -> ToolValidationResult:
        result = ToolValidationResult()
        with self._lock:
            if not self._providers:
                result.warnings.append("No providers registered")
            for name, provider in self._providers.items():
                if not provider.is_initialized:
                    result.warnings.append(f"Provider '{name}' not initialized")
        return result

    def reload(self) -> ToolRegistry:
        self.logger.info("Reloading ToolRegistry")
        with self._lock:
            self._providers.clear()
            self._tools.clear()
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise ToolError("ToolRegistry has not been initialized")
