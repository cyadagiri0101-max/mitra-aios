"""In-memory vector store provider."""

from __future__ import annotations

import math
import threading

from aios.core.exceptions import VectorStoreError
from aios.core.logger import get_logger
from aios.vectorstore.models import (
    DistanceMetric,
    VectorRecord,
    VectorSearchResult,
    VectorStoreConfig,
    VectorStoreStatistics,
    VectorStoreValidationResult,
)
from aios.vectorstore.provider import VectorStoreProvider


class InMemoryVectorStore(VectorStoreProvider):
    """In-memory vector store provider."""

    def __init__(self, config: VectorStoreConfig | None = None) -> None:
        self.logger = get_logger("aios.vectorstore.in_memory")
        self._config = config or VectorStoreConfig(
            name="in-memory",
            dimensions=384,
            distance_metric=DistanceMetric.COSINE,
        )
        self._vectors: dict[str, dict[str, VectorRecord]] = {}  # namespace -> id -> record
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
        with self._lock:
            total = sum(len(ns_vectors) for ns_vectors in self._vectors.values())
            namespaces = list(self._vectors.keys())
            return VectorStoreStatistics(
                total_vectors=total,
                namespaces=namespaces,
                dimensions=self._config.dimensions,
                index_type=self._config.index_type.value,
                distance_metric=self._config.distance_metric.value,
            )

    def initialize(self) -> InMemoryVectorStore:
        """Initialize the provider."""
        self._initialized = True
        self.logger.info("InMemoryVectorStore initialized (dimensions=%d, metric=%s)",
                        self._config.dimensions, self._config.distance_metric.value)
        return self

    def upsert(self, records: list[VectorRecord]) -> int:
        """Insert or update vector records."""
        self._require_initialized()

        with self._lock:
            count = 0
            for record in records:
                namespace = record.namespace or self._config.namespace

                if namespace not in self._vectors:
                    self._vectors[namespace] = {}

                # Validate dimensions
                if len(record.vector) != self._config.dimensions:
                    raise VectorStoreError(
                        f"Vector dimensions mismatch: expected {self._config.dimensions}, got {len(record.vector)}",
                        provider=self.name,
                    )

                self._vectors[namespace][record.id] = record
                count += 1

            return count

    def get(self, record_id: str, namespace: str = "default") -> VectorRecord | None:
        """Get a vector record by ID."""
        self._require_initialized()

        with self._lock:
            ns_vectors = self._vectors.get(namespace, {})
            return ns_vectors.get(record_id)

    def delete(self, record_id: str, namespace: str = "default") -> bool:
        """Delete a vector record by ID."""
        self._require_initialized()

        with self._lock:
            ns_vectors = self._vectors.get(namespace, {})
            if record_id in ns_vectors:
                del ns_vectors[record_id]
                return True
            return False

    def search(
        self,
        query_vector: tuple[float, ...],
        top_k: int = 10,
        namespace: str = "default",
        filters: dict | None = None,
    ) -> list[VectorSearchResult]:
        """Search for similar vectors."""
        self._require_initialized()

        # Validate query dimensions
        if len(query_vector) != self._config.dimensions:
            raise VectorStoreError(
                f"Query vector dimensions mismatch: expected {self._config.dimensions}, got {len(query_vector)}",
                provider=self.name,
            )

        with self._lock:
            ns_vectors = self._vectors.get(namespace, {})
            results = []

            for record in ns_vectors.values():
                # Apply filters
                if filters:
                    if not self._matches_filters(record.metadata, filters):
                        continue

                # Calculate similarity
                score = self._calculate_similarity(query_vector, record.vector)
                results.append(VectorSearchResult(record=record, score=score))

            # Sort by score (descending)
            results.sort(key=lambda r: r.score, reverse=True)

            # Assign ranks and limit to top_k
            ranked_results = []
            for rank, result in enumerate(results[:top_k], 1):
                ranked_result = VectorSearchResult(
                    record=result.record,
                    score=result.score,
                    rank=rank,
                )
                ranked_results.append(ranked_result)

            return ranked_results

    def list_namespaces(self) -> list[str]:
        """List all namespaces."""
        self._require_initialized()

        with self._lock:
            return list(self._vectors.keys())

    def count(self, namespace: str = "default") -> int:
        """Count vectors in a namespace."""
        self._require_initialized()

        with self._lock:
            return len(self._vectors.get(namespace, {}))

    def clear(self, namespace: str = "default") -> None:
        """Clear all vectors in a namespace."""
        self._require_initialized()

        with self._lock:
            if namespace in self._vectors:
                del self._vectors[namespace]

    def health(self) -> bool:
        """Check provider health."""
        return self._initialized

    def validate(self) -> VectorStoreValidationResult:
        """Validate provider configuration."""
        result = VectorStoreValidationResult()

        if self._config.dimensions <= 0:
            result.errors.append("Dimensions must be positive")
            result.is_valid = False

        return result

    def reload(self) -> InMemoryVectorStore:
        """Reload provider configuration."""
        self.logger.info("Reloading InMemoryVectorStore")

        with self._lock:
            self._vectors.clear()

        return self

    def shutdown(self) -> None:
        """Shutdown the provider."""
        self.logger.info("Shutting down InMemoryVectorStore")
        self._initialized = False

    def _calculate_similarity(self, vec1: tuple[float, ...], vec2: tuple[float, ...]) -> float:
        """Calculate similarity between two vectors."""
        if self._config.distance_metric == DistanceMetric.COSINE:
            return self._cosine_similarity(vec1, vec2)
        elif self._config.distance_metric == DistanceMetric.EUCLIDEAN:
            return self._euclidean_similarity(vec1, vec2)
        elif self._config.distance_metric == DistanceMetric.DOT_PRODUCT:
            return self._dot_product(vec1, vec2)
        else:
            return self._cosine_similarity(vec1, vec2)

    def _cosine_similarity(self, vec1: tuple[float, ...], vec2: tuple[float, ...]) -> float:
        """Calculate cosine similarity."""
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(b * b for b in vec2))

        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0

        return dot_product / (magnitude1 * magnitude2)

    def _euclidean_similarity(self, vec1: tuple[float, ...], vec2: tuple[float, ...]) -> float:
        """Calculate Euclidean distance similarity (inverse)."""
        distance = math.sqrt(sum((a - b) ** 2 for a, b in zip(vec1, vec2)))
        return 1.0 / (1.0 + distance)

    def _dot_product(self, vec1: tuple[float, ...], vec2: tuple[float, ...]) -> float:
        """Calculate dot product."""
        return sum(a * b for a, b in zip(vec1, vec2))

    def _matches_filters(self, metadata: dict, filters: dict) -> bool:
        """Check if metadata matches filters."""
        for key, value in filters.items():
            if key not in metadata:
                return False
            if metadata[key] != value:
                return False
        return True

    def _require_initialized(self) -> None:
        """Check if provider is initialized."""
        if not self._initialized:
            raise VectorStoreError(f"InMemoryVectorStore '{self.name}' has not been initialized", provider=self.name)
