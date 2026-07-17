"""Registry for embedding providers."""

from __future__ import annotations

import threading

from aios.core.exceptions import EmbeddingError
from aios.core.logger import get_logger
from aios.embedding.models import EmbeddingValidationResult
from aios.embedding.provider import EmbeddingProvider


class EmbeddingRegistry:
    """Registry for managing embedding providers."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.embedding.registry")
        self._providers: dict[str, EmbeddingProvider] = {}
        self._aliases: dict[str, str] = {}
        self._default_provider: str = ""
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> EmbeddingRegistry:
        """Initialize the registry."""
        self._initialized = True
        self.logger.info("EmbeddingRegistry initialized")
        return self

    def register(self, provider: EmbeddingProvider, aliases: tuple[str, ...] = ()) -> None:
        """Register an embedding provider."""
        self._require_initialized()

        with self._lock:
            if provider.name in self._providers:
                raise EmbeddingError(f"Provider '{provider.name}' already registered", provider=provider.name)

            self._providers[provider.name] = provider

            for alias in aliases:
                if alias in self._aliases or alias in self._providers:
                    raise EmbeddingError(f"Alias '{alias}' conflicts with existing provider or alias", provider=provider.name)
                self._aliases[alias] = provider.name

            if not self._default_provider:
                self._default_provider = provider.name

            self.logger.info("Registered embedding provider '%s' with aliases %s", provider.name, aliases)

    def unregister(self, name: str) -> bool:
        """Unregister an embedding provider."""
        self._require_initialized()

        with self._lock:
            if name not in self._providers:
                return False

            del self._providers[name]

            aliases_to_remove = [alias for alias, target in self._aliases.items() if target == name]
            for alias in aliases_to_remove:
                del self._aliases[alias]

            if self._default_provider == name:
                self._default_provider = next(iter(self._providers), "")

            self.logger.info("Unregistered embedding provider '%s'", name)
            return True

    def get(self, name: str) -> EmbeddingProvider | None:
        """Get an embedding provider by name or alias."""
        self._require_initialized()

        with self._lock:
            resolved = self._aliases.get(name, name)
            return self._providers.get(resolved)

    def list(self) -> list[str]:
        """List all registered provider names."""
        self._require_initialized()

        with self._lock:
            return list(self._providers.keys())

    def set_default(self, name: str) -> None:
        """Set the default provider."""
        self._require_initialized()

        with self._lock:
            resolved = self._aliases.get(name, name)
            if resolved not in self._providers:
                raise EmbeddingError(f"Provider '{name}' not found", provider=name)

            self._default_provider = resolved
            self.logger.info("Default embedding provider set to '%s'", resolved)

    def default_provider(self) -> EmbeddingProvider | None:
        """Get the default provider."""
        self._require_initialized()

        with self._lock:
            if not self._default_provider:
                return None
            return self._providers.get(self._default_provider)

    def validate(self) -> EmbeddingValidationResult:
        """Validate the registry."""
        result = EmbeddingValidationResult()

        with self._lock:
            if not self._providers:
                result.warnings.append("No providers registered")

            if self._default_provider and self._default_provider not in self._providers:
                result.errors.append(f"Default provider '{self._default_provider}' not found")
                result.is_valid = False

            for alias, target in self._aliases.items():
                if target not in self._providers:
                    result.errors.append(f"Alias '{alias}' points to missing provider '{target}'")
                    result.is_valid = False

        return result

    def reload(self) -> EmbeddingRegistry:
        """Reload the registry."""
        self.logger.info("Reloading EmbeddingRegistry")

        with self._lock:
            self._providers.clear()
            self._aliases.clear()
            self._default_provider = ""

        return self

    def _require_initialized(self) -> None:
        """Check if registry is initialized."""
        if not self._initialized:
            raise EmbeddingError("EmbeddingRegistry has not been initialized")
