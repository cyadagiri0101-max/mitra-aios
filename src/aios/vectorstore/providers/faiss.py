"""FAISS vector store provider."""

from __future__ import annotations

import threading

from aios.core.exceptions import VectorStoreError
from aios.core.logger import get_logger
from aios.vectorstore.models import (
    VectorRecord,
    VectorSearchResult,
    VectorStoreConfig,
    VectorStoreStatistics,
    VectorStoreValidationResult,
)
from aios.vectorstore.provider import VectorStoreProvider


class FAISSVectorStore(VectorStoreProvider):
    """FAISS vector store provider."""

    def __init__(self, config: VectorStoreConfig | None = None) -> None:
        self.logger = get_logger("aios.vectorstore.faiss")
        self._config = config or VectorStoreConfig(
            name="faiss",
            dimensions=384,
        )
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def name(self) -> str:
        return self._config.name

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def statistics(self) -> VectorStoreStatistics:
        return VectorStoreStatistics(
            total_vectors=0,
            namespaces=[],
            dimensions=self._config.dimensions,
            index_type="flat",
            distance_metric="l2",
        )

    def initialize(self) -> FAISSVectorStore:
        """Initialize the provider."""
        self._initialized = True
        self.logger.info("FAISSVectorStore initialized (dimensions=%d)", self._config.dimensions)
        return self

    def upsert(self, records: list[VectorRecord]) -> int:
        """Insert or update vector records."""
        self._require_initialized()
        raise NotImplementedError("FAISS requires the faiss library")

    def get(self, record_id: str, namespace: str = "default") -> VectorRecord | None:
        """Get a vector record by ID."""
        self._require_initialized()
        raise NotImplementedError("FAISS requires the faiss library")

    def delete(self, record_id: str, namespace: str = "default") -> bool:
        """Delete a vector record by ID."""
        self._require_initialized()
        raise NotImplementedError("FAISS requires the faiss library")

    def search(
        self,
        query_vector: tuple[float, ...],
        top_k: int = 10,
        namespace: str = "default",
        filters: dict | None = None,
    ) -> list[VectorSearchResult]:
        """Search for similar vectors."""
        self._require_initialized()
        raise NotImplementedError("FAISS requires the faiss library")

    def list_namespaces(self) -> list[str]:
        """List all namespaces."""
        self._require_initialized()
        return []

    def count(self, namespace: str = "default") -> int:
        """Count vectors in a namespace."""
        self._require_initialized()
        return 0

    def clear(self, namespace: str = "default") -> None:
        """Clear all vectors in a namespace."""
        self._require_initialized()
        pass

    def health(self) -> bool:
        """Check provider health."""
        return self._initialized

    def validate(self) -> VectorStoreValidationResult:
        """Validate provider configuration."""
        result = VectorStoreValidationResult()
        result.warnings.append("FAISS requires the faiss library")
        return result

    def reload(self) -> FAISSVectorStore:
        """Reload provider configuration."""
        self.logger.info("Reloading FAISSVectorStore")
        return self

    def shutdown(self) -> None:
        """Shutdown the provider."""
        self.logger.info("Shutting down FAISSVectorStore")
        self._initialized = False

    def _require_initialized(self) -> None:
        """Check if provider is initialized."""
        if not self._initialized:
            raise VectorStoreError(f"FAISSVectorStore '{self.name}' has not been initialized", provider=self.name)
