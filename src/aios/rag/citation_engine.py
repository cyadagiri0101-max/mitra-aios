"""Citation engine for generating citations."""

from __future__ import annotations

import threading

from aios.core.exceptions import RAGError
from aios.core.logger import get_logger
from aios.rag.models import (
    Citation,
    RAGValidationResult,
    SearchResult,
)


class CitationEngine:
    """Engine for generating citations from search results."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.rag.citation_engine")
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> CitationEngine:
        """Initialize the citation engine."""
        self._initialized = True
        self.logger.info("CitationEngine initialized")
        return self

    def generate_citations(self, results: list[SearchResult], max_citations: int = 5) -> list[Citation]:
        """Generate citations from search results."""
        self._require_initialized()

        citations = []
        for position, result in enumerate(results[:max_citations], 1):
            citation = Citation(
                chunk_id=result.chunk.id,
                document_id=result.chunk.document_id,
                content=result.chunk.content[:200],  # Truncate for citation
                score=result.score,
                position=position,
            )
            citations.append(citation)

        return citations

    def format_citations(self, citations: list[Citation], style: str = "numeric") -> str:
        """Format citations for display."""
        self._require_initialized()

        if style == "numeric":
            return self._format_numeric(citations)
        elif style == "inline":
            return self._format_inline(citations)
        else:
            return self._format_numeric(citations)

    def _format_numeric(self, citations: list[Citation]) -> str:
        """Format citations in numeric style."""
        lines = []
        for citation in citations:
            lines.append(f"[{citation.position}] Document: {citation.document_id}")
            lines.append(f"    Score: {citation.score:.3f}")
            lines.append(f"    Content: {citation.content}...")
            lines.append("")

        return "\n".join(lines)

    def _format_inline(self, citations: list[Citation]) -> str:
        """Format citations in inline style."""
        refs = [f"[{c.position}]" for c in citations]
        return " ".join(refs)

    def validate(self) -> RAGValidationResult:
        """Validate citation engine state."""
        return RAGValidationResult()

    def reload(self) -> CitationEngine:
        """Reload citation engine."""
        self.logger.info("Reloading CitationEngine")
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise RAGError("CitationEngine has not been initialized", component="CitationEngine")
