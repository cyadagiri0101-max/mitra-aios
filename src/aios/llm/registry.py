"""Provider registry with alias support."""

from __future__ import annotations

import threading

from aios.core.exceptions import LLMProviderError
from aios.core.logger import get_logger
from aios.llm.models import ValidationResult
from aios.llm.provider import LLMProvider


class ProviderRegistry:
    def __init__(self) -> None:
        self.logger = get_logger("aios.llm.registry")
        self._providers: dict[str, LLMProvider] = {}
        self._aliases: dict[str, str] = {}
        self._default: str = ""
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> ProviderRegistry:
        self._initialized = True
        self.logger.info("ProviderRegistry initialized")
        return self

    def register(self, provider: LLMProvider, aliases: tuple[str, ...] = ()) -> None:
        self._require_initialized()
        with self._lock:
            if provider.name in self._providers:
                raise LLMProviderError(f"Provider '{provider.name}' already registered", provider=provider.name)
            self._providers[provider.name] = provider
            for alias in aliases:
                if alias in self._aliases or alias in self._providers:
                    raise LLMProviderError(f"Alias '{alias}' conflicts with existing provider or alias", provider=provider.name)
                self._aliases[alias] = provider.name
            if not self._default:
                self._default = provider.name
            self.logger.info("Registered provider '%s' with aliases %s", provider.name, aliases)

    def unregister(self, name: str) -> bool:
        self._require_initialized()
        with self._lock:
            if name not in self._providers:
                return False
            del self._providers[name]
            to_remove = [a for a, p in self._aliases.items() if p == name]
            for a in to_remove:
                del self._aliases[a]
            if self._default == name:
                self._default = next(iter(self._providers), "")
            self.logger.info("Unregistered provider '%s'", name)
            return True

    def get(self, name: str) -> LLMProvider | None:
        self._require_initialized()
        with self._lock:
            resolved = self._aliases.get(name, name)
            return self._providers.get(resolved)

    def list(self) -> list[str]:
        self._require_initialized()
        with self._lock:
            return list(self._providers.keys())

    def set_default(self, name: str) -> None:
        self._require_initialized()
        with self._lock:
            resolved = self._aliases.get(name, name)
            if resolved not in self._providers:
                raise LLMProviderError(f"Provider '{name}' not found", provider=name)
            self._default = resolved
            self.logger.info("Default provider set to '%s'", resolved)

    def default_provider(self) -> LLMProvider | None:
        self._require_initialized()
        with self._lock:
            if not self._default:
                return None
            return self._providers.get(self._default)

    def validate(self) -> ValidationResult:
        result = ValidationResult()
        with self._lock:
            if not self._providers:
                result.warnings.append("No providers registered")
            if self._default and self._default not in self._providers:
                result.errors.append(f"Default provider '{self._default}' not found")
                result.is_valid = False
            for alias, target in self._aliases.items():
                if target not in self._providers:
                    result.errors.append(f"Alias '{alias}' points to missing provider '{target}'")
                    result.is_valid = False
        return result

    def reload(self) -> ProviderRegistry:
        self.logger.info("Reloading ProviderRegistry")
        with self._lock:
            self._providers.clear()
            self._aliases.clear()
            self._default = ""
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise LLMProviderError("ProviderRegistry has not been initialized")
