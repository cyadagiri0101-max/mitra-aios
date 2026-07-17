"""Index manager for document indexing."""

from __future__ import annotations

import threading
import uuid

from aios.core.exceptions import RAGError
from aios.core.logger import get_logger
from aios.rag.models import (
    Document,
    RAGValidationResult,
)


class IndexManager:
    """Manager for document indexing operations."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.rag.index_manager")
        self._documents: dict[str, Document] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> IndexManager:
        """Initialize the index manager."""
        self._initialized = True
        self.logger.info("IndexManager initialized")
        return self

    def index_document(self, document: Document) -> str:
        """Index a document."""
        self._require_initialized()

        if not document.id:
            document = Document(
                id=str(uuid.uuid4()),
                content=document.content,
                metadata=document.metadata,
                embedding=document.embedding,
            )

        with self._lock:
            self._documents[document.id] = document
            self.logger.debug("Indexed document: %s", document.id)

        return document.id

    def get_document(self, document_id: str) -> Document | None:
        """Get a document by ID."""
        self._require_initialized()
        with self._lock:
            return self._documents.get(document_id)

    def list_documents(self) -> list[Document]:
        """List all documents."""
        self._require_initialized()
        with self._lock:
            return list(self._documents.values())

    def delete_document(self, document_id: str) -> bool:
        """Delete a document by ID."""
        self._require_initialized()
        with self._lock:
            if document_id in self._documents:
                del self._documents[document_id]
                self.logger.debug("Deleted document: %s", document_id)
                return True
            return False

    def count(self) -> int:
        """Count documents."""
        self._require_initialized()
        with self._lock:
            return len(self._documents)

    def validate(self) -> RAGValidationResult:
        """Validate index manager state."""
        result = RAGValidationResult()
        with self._lock:
            if not self._documents:
                result.warnings.append("No documents indexed")
        return result

    def reload(self) -> IndexManager:
        """Reload index manager."""
        self.logger.info("Reloading IndexManager")
        with self._lock:
            self._documents.clear()
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise RAGError("IndexManager has not been initialized", component="IndexManager")
