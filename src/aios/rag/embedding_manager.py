"""Embedding manager for document and chunk embeddings."""

from __future__ import annotations

import hashlib
import threading

from aios.core.exceptions import RAGError
from aios.core.logger import get_logger
from aios.rag.models import (
    Chunk,
    Document,
    RAGValidationResult,
)


class EmbeddingManager:
    """Manager for embedding operations."""

    def __init__(self, dimension: int = 384) -> None:
        self.logger = get_logger("aios.rag.embedding_manager")
        self._dimension = dimension
        self._embeddings: dict[str, tuple[float, ...]] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def dimension(self) -> int:
        return self._dimension

    def initialize(self) -> EmbeddingManager:
        """Initialize the embedding manager."""
        self._initialized = True
        self.logger.info("EmbeddingManager initialized with dimension: %d", self._dimension)
        return self

    def generate_embedding(self, text: str) -> tuple[float, ...]:
        """Generate a mock embedding for text."""
        self._require_initialized()

        # Generate deterministic mock embedding based on text hash
        hash_bytes = hashlib.sha256(text.encode()).digest()
        embedding = []
        for i in range(self._dimension):
            byte_idx = i % len(hash_bytes)
            value = (hash_bytes[byte_idx] + i) % 256 / 255.0
            embedding.append(value * 2 - 1)  # Normalize to [-1, 1]

        return tuple(embedding)

    def embed_document(self, document: Document) -> Document:
        """Embed a document."""
        self._require_initialized()

        embedding = self.generate_embedding(document.content)

        embedded_doc = Document(
            id=document.id,
            content=document.content,
            metadata=document.metadata,
            embedding=embedding,
        )

        with self._lock:
            self._embeddings[document.id] = embedding

        return embedded_doc

    def embed_chunk(self, chunk: Chunk) -> Chunk:
        """Embed a chunk."""
        self._require_initialized()

        embedding = self.generate_embedding(chunk.content)

        embedded_chunk = Chunk(
            id=chunk.id,
            document_id=chunk.document_id,
            content=chunk.content,
            start_index=chunk.start_index,
            end_index=chunk.end_index,
            metadata=chunk.metadata,
            embedding=embedding,
        )

        with self._lock:
            self._embeddings[chunk.id] = embedding

        return embedded_chunk

    def get_embedding(self, item_id: str) -> tuple[float, ...] | None:
        """Get an embedding by ID."""
        self._require_initialized()
        with self._lock:
            return self._embeddings.get(item_id)

    def delete_embedding(self, item_id: str) -> bool:
        """Delete an embedding by ID."""
        self._require_initialized()
        with self._lock:
            if item_id in self._embeddings:
                del self._embeddings[item_id]
                return True
            return False

    def count(self) -> int:
        """Count embeddings."""
        self._require_initialized()
        with self._lock:
            return len(self._embeddings)

    def validate(self) -> RAGValidationResult:
        """Validate embedding manager state."""
        result = RAGValidationResult()
        with self._lock:
            if not self._embeddings:
                result.warnings.append("No embeddings generated")
        return result

    def reload(self) -> EmbeddingManager:
        """Reload embedding manager."""
        self.logger.info("Reloading EmbeddingManager")
        with self._lock:
            self._embeddings.clear()
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise RAGError("EmbeddingManager has not been initialized", component="EmbeddingManager")
