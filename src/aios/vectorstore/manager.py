"""Vector Store Manager - main facade for the vector store layer."""

from __future__ import annotations

import threading

from aios.core.exceptions import VectorStoreError
from aios.core.logger import get_logger
from aios.vectorstore.models import (
    VectorRecord,
    VectorSearchResult,
    VectorStoreStatistics,
    VectorStoreValidationResult,
)
from aios.vectorstore.provider import VectorStoreProvider


class VectorStoreManager:
    """Main facade for the vector store layer."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.vectorstore.manager")
        self._providers: dict[str, VectorStoreProvider] = {}
        self._default_provider: str = ""
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> VectorStoreManager:
        """Initialize the vector store manager."""
        with self._lock:
            if self._initialized:
                return self

            self._initialized = True
            self.logger.info("VectorStoreManager initialized")

        return self

    def register_provider(self, provider: VectorStoreProvider, set_default: bool = False) -> None:
        """Register a vector store provider."""
        self._require_initialized()

        with self._lock:
            self._providers[provider.name] = provider

            if set_default or not self._default_provider:
                self._default_provider = provider.name

            self.logger.info("Registered vector store provider: %s", provider.name)

    def unregister_provider(self, name: str) -> bool:
        """Unregister a vector store provider."""
        self._require_initialized()

        with self._lock:
            if name not in self._providers:
                return False

            provider = self._providers[name]
            provider.shutdown()
            del self._providers[name]

            if self._default_provider == name:
                self._default_provider = next(iter(self._providers), "")

            self.logger.info("Unregistered vector store provider: %s", name)
            return True

    def get_provider(self, name: str = "") -> VectorStoreProvider:
        """Get a vector store provider."""
        self._require_initialized()

        with self._lock:
            if name:
                provider = self._providers.get(name)
                if not provider:
                    raise VectorStoreError(f"Provider '{name}' not found", provider=name)
                return provider
            else:
                if not self._default_provider:
                    raise VectorStoreError("No default provider configured")
                return self._providers[self._default_provider]

    def list_providers(self) -> list[str]:
        """List all registered providers."""
        self._require_initialized()

        with self._lock:
            return list(self._providers.keys())

    def upsert(self, records: list[VectorRecord], provider_name: str = "") -> int:
        """Insert or update vector records."""
        provider = self.get_provider(provider_name)
        return provider.upsert(records)

    def get(self, record_id: str, namespace: str = "default", provider_name: str = "") -> VectorRecord | None:
        """Get a vector record by ID."""
        provider = self.get_provider(provider_name)
        return provider.get(record_id, namespace)

    def delete(self, record_id: str, namespace: str = "default", provider_name: str = "") -> bool:
        """Delete a vector record by ID."""
        provider = self.get_provider(provider_name)
        return provider.delete(record_id, namespace)

    def search(
        self,
        query_vector: tuple[float, ...],
        top_k: int = 10,
        namespace: str = "default",
        filters: dict | None = None,
        provider_name: str = "",
    ) -> list[VectorSearchResult]:
        """Search for similar vectors."""
        provider = self.get_provider(provider_name)
        return provider.search(query_vector, top_k, namespace, filters)

    def list_namespaces(self, provider_name: str = "") -> list[str]:
        """List all namespaces."""
        provider = self.get_provider(provider_name)
        return provider.list_namespaces()

    def count(self, namespace: str = "default", provider_name: str = "") -> int:
        """Count vectors in a namespace."""
        provider = self.get_provider(provider_name)
        return provider.count(namespace)

    def clear(self, namespace: str = "default", provider_name: str = "") -> None:
        """Clear all vectors in a namespace."""
        provider = self.get_provider(provider_name)
        provider.clear(namespace)

    def get_statistics(self, provider_name: str = "") -> VectorStoreStatistics:
        """Get vector store statistics."""
        provider = self.get_provider(provider_name)
        return provider.statistics

    def validate(self) -> VectorStoreValidationResult:
        """Validate the vector store manager."""
        self._require_initialized()

        result = VectorStoreValidationResult()

        with self._lock:
            if not self._providers:
                result.warnings.append("No providers registered")

            for name, provider in self._providers.items():
                provider_result = provider.validate()
                result.warnings.extend(provider_result.warnings)
                result.errors.extend(provider_result.errors)
                if not provider_result.is_valid:
                    result.is_valid = False

        return result

    def reload(self) -> VectorStoreManager:
        """Reload the vector store manager."""
        self.logger.info("Reloading VectorStoreManager")

        with self._lock:
            for provider in self._providers.values():
                provider.reload()

        return self

    def shutdown(self) -> None:
        """Shutdown the vector store manager."""
        self.logger.info("Shutting down VectorStoreManager")

        with self._lock:
            for provider in self._providers.values():
                provider.shutdown()

            self._initialized = False

    def _require_initialized(self) -> None:
        """Check if manager is initialized."""
        if not self._initialized:
            raise VectorStoreError("VectorStoreManager has not been initialized")
