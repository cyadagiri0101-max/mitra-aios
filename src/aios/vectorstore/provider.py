"""Abstract base class for vector store providers."""

from __future__ import annotations

from abc import ABC, abstractmethod

from aios.vectorstore.models import (
    VectorRecord,
    VectorSearchResult,
    VectorStoreStatistics,
    VectorStoreValidationResult,
)


class VectorStoreProvider(ABC):
    """Abstract base class for vector store providers."""

    @abstractmethod
    def initialize(self) -> VectorStoreProvider:
        """Initialize the vector store provider."""
        pass

    @abstractmethod
    def upsert(self, records: list[VectorRecord]) -> int:
        """Insert or update vector records."""
        pass

    @abstractmethod
    def get(self, record_id: str, namespace: str = "default") -> VectorRecord | None:
        """Get a vector record by ID."""
        pass

    @abstractmethod
    def delete(self, record_id: str, namespace: str = "default") -> bool:
        """Delete a vector record by ID."""
        pass

    @abstractmethod
    def search(
        self,
        query_vector: tuple[float, ...],
        top_k: int = 10,
        namespace: str = "default",
        filters: dict | None = None,
    ) -> list[VectorSearchResult]:
        """Search for similar vectors."""
        pass

    @abstractmethod
    def list_namespaces(self) -> list[str]:
        """List all namespaces."""
        pass

    @abstractmethod
    def count(self, namespace: str = "default") -> int:
        """Count vectors in a namespace."""
        pass

    @abstractmethod
    def clear(self, namespace: str = "default") -> None:
        """Clear all vectors in a namespace."""
        pass

    @abstractmethod
    def health(self) -> bool:
        """Check provider health."""
        pass

    @abstractmethod
    def validate(self) -> VectorStoreValidationResult:
        """Validate provider configuration."""
        pass

    @abstractmethod
    def reload(self) -> VectorStoreProvider:
        """Reload provider configuration."""
        pass

    @abstractmethod
    def shutdown(self) -> None:
        """Shutdown the provider."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Get provider name."""
        pass

    @property
    @abstractmethod
    def is_initialized(self) -> bool:
        """Check if provider is initialized."""
        pass

    @property
    @abstractmethod
    def statistics(self) -> VectorStoreStatistics:
        """Get provider statistics."""
        pass
