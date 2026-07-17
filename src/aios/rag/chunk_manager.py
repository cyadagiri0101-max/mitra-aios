"""Chunk manager for document chunking."""

from __future__ import annotations

import re
import threading
import uuid

from aios.core.exceptions import RAGError
from aios.core.logger import get_logger
from aios.rag.models import (
    Chunk,
    ChunkStrategy,
    Document,
    RAGValidationResult,
)


class ChunkManager:
    """Manager for document chunking operations."""

    def __init__(self, strategy: ChunkStrategy = ChunkStrategy.SENTENCE) -> None:
        self.logger = get_logger("aios.rag.chunk_manager")
        self._strategy = strategy
        self._chunks: dict[str, Chunk] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def strategy(self) -> ChunkStrategy:
        return self._strategy

    def initialize(self) -> ChunkManager:
        """Initialize the chunk manager."""
        self._initialized = True
        self.logger.info("ChunkManager initialized with strategy: %s", self._strategy.value)
        return self

    def chunk_document(self, document: Document, chunk_size: int = 500, overlap: int = 50) -> list[Chunk]:
        """Chunk a document using the configured strategy."""
        self._require_initialized()

        if self._strategy == ChunkStrategy.FIXED_SIZE:
            return self._chunk_fixed_size(document, chunk_size, overlap)
        elif self._strategy == ChunkStrategy.SENTENCE:
            return self._chunk_by_sentence(document, chunk_size, overlap)
        elif self._strategy == ChunkStrategy.PARAGRAPH:
            return self._chunk_by_paragraph(document)
        elif self._strategy == ChunkStrategy.SEMANTIC:
            return self._chunk_semantic(document, chunk_size)
        else:
            raise RAGError(f"Unknown chunking strategy: {self._strategy}", component="ChunkManager")

    def _chunk_fixed_size(self, document: Document, chunk_size: int, overlap: int) -> list[Chunk]:
        """Chunk document by fixed size with overlap."""
        chunks = []
        content = document.content
        start = 0

        while start < len(content):
            end = min(start + chunk_size, len(content))
            chunk_content = content[start:end]

            chunk = Chunk(
                id=str(uuid.uuid4()),
                document_id=document.id,
                content=chunk_content,
                start_index=start,
                end_index=end,
                metadata=document.metadata.copy(),
            )
            chunks.append(chunk)

            with self._lock:
                self._chunks[chunk.id] = chunk

            start = end - overlap if end < len(content) else end

        return chunks

    def _chunk_by_sentence(self, document: Document, chunk_size: int, overlap: int) -> list[Chunk]:
        """Chunk document by sentences."""
        chunks = []
        sentences = re.split(r'(?<=[.!?])\s+', document.content)
        current_chunk = []
        current_length = 0
        start_index = 0

        for sentence in sentences:
            sentence_length = len(sentence)

            if current_length + sentence_length > chunk_size and current_chunk:
                chunk_content = " ".join(current_chunk)
                end_index = start_index + len(chunk_content)

                chunk = Chunk(
                    id=str(uuid.uuid4()),
                    document_id=document.id,
                    content=chunk_content,
                    start_index=start_index,
                    end_index=end_index,
                    metadata=document.metadata.copy(),
                )
                chunks.append(chunk)

                with self._lock:
                    self._chunks[chunk.id] = chunk

                # Apply overlap
                overlap_sentences = []
                overlap_length = 0
                for s in reversed(current_chunk):
                    if overlap_length + len(s) > overlap:
                        break
                    overlap_sentences.insert(0, s)
                    overlap_length += len(s)

                current_chunk = overlap_sentences
                current_length = overlap_length
                start_index = end_index - overlap_length

            current_chunk.append(sentence)
            current_length += sentence_length

        # Add remaining chunk
        if current_chunk:
            chunk_content = " ".join(current_chunk)
            end_index = start_index + len(chunk_content)

            chunk = Chunk(
                id=str(uuid.uuid4()),
                document_id=document.id,
                content=chunk_content,
                start_index=start_index,
                end_index=end_index,
                metadata=document.metadata.copy(),
            )
            chunks.append(chunk)

            with self._lock:
                self._chunks[chunk.id] = chunk

        return chunks

    def _chunk_by_paragraph(self, document: Document) -> list[Chunk]:
        """Chunk document by paragraphs."""
        chunks = []
        paragraphs = document.content.split("\n\n")
        current_index = 0

        for paragraph in paragraphs:
            if not paragraph.strip():
                continue

            start_index = current_index
            end_index = current_index + len(paragraph)

            chunk = Chunk(
                id=str(uuid.uuid4()),
                document_id=document.id,
                content=paragraph,
                start_index=start_index,
                end_index=end_index,
                metadata=document.metadata.copy(),
            )
            chunks.append(chunk)

            with self._lock:
                self._chunks[chunk.id] = chunk

            current_index = end_index + 2  # +2 for \n\n

        return chunks

    def _chunk_semantic(self, document: Document, chunk_size: int) -> list[Chunk]:
        """Chunk document by semantic similarity (simplified version)."""
        # For now, use sentence-based chunking as a fallback
        return self._chunk_by_sentence(document, chunk_size, 50)

    def get_chunk(self, chunk_id: str) -> Chunk | None:
        """Get a chunk by ID."""
        self._require_initialized()
        with self._lock:
            return self._chunks.get(chunk_id)

    def list_chunks(self, document_id: str | None = None) -> list[Chunk]:
        """List all chunks, optionally filtered by document ID."""
        self._require_initialized()
        with self._lock:
            chunks = list(self._chunks.values())
            if document_id:
                chunks = [c for c in chunks if c.document_id == document_id]
            return chunks

    def delete_chunk(self, chunk_id: str) -> bool:
        """Delete a chunk by ID."""
        self._require_initialized()
        with self._lock:
            if chunk_id in self._chunks:
                del self._chunks[chunk_id]
                return True
            return False

    def delete_chunks_by_document(self, document_id: str) -> int:
        """Delete all chunks for a document."""
        self._require_initialized()
        with self._lock:
            chunk_ids = [cid for cid, c in self._chunks.items() if c.document_id == document_id]
            for chunk_id in chunk_ids:
                del self._chunks[chunk_id]
            return len(chunk_ids)

    def count(self, document_id: str | None = None) -> int:
        """Count chunks, optionally filtered by document ID."""
        self._require_initialized()
        with self._lock:
            if document_id:
                return sum(1 for c in self._chunks.values() if c.document_id == document_id)
            return len(self._chunks)

    def validate(self) -> RAGValidationResult:
        """Validate chunk manager state."""
        result = RAGValidationResult()
        with self._lock:
            if not self._chunks:
                result.warnings.append("No chunks indexed")
        return result

    def reload(self) -> ChunkManager:
        """Reload chunk manager."""
        self.logger.info("Reloading ChunkManager")
        with self._lock:
            self._chunks.clear()
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise RAGError("ChunkManager has not been initialized", component="ChunkManager")
