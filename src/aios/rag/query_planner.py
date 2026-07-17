"""Query planner for query optimization."""

from __future__ import annotations

import re
import threading

from aios.core.exceptions import RAGError
from aios.core.logger import get_logger
from aios.rag.models import (
    QueryPlan,
    RAGValidationResult,
    SearchMethod,
)


class QueryPlanner:
    """Planner for query optimization."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.rag.query_planner")
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> QueryPlanner:
        """Initialize the query planner."""
        self._initialized = True
        self.logger.info("QueryPlanner initialized")
        return self

    def plan(self, query: str, top_k: int = 10) -> QueryPlan:
        """Create a query plan for the given query."""
        self._require_initialized()

        # Optimize query
        optimized_query = self._optimize_query(query)

        # Determine search method
        search_method = self._determine_search_method(query)

        # Extract filters from query
        filters = self._extract_filters(query)

        plan = QueryPlan(
            original_query=query,
            optimized_query=optimized_query,
            search_method=search_method,
            filters=filters,
            top_k=top_k,
        )

        return plan

    def _optimize_query(self, query: str) -> str:
        """Optimize the query for better retrieval."""
        # Remove extra whitespace
        optimized = re.sub(r'\s+', ' ', query)

        # Remove common stop words (simplified)
        stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being'}
        words = optimized.split()
        optimized_words = [w for w in words if w.lower() not in stop_words]

        return ' '.join(optimized_words)

    def _determine_search_method(self, query: str) -> SearchMethod:
        """Determine the best search method for the query."""
        query_lower = query.lower()

        # If query contains specific terms or phrases, use keyword search
        if any(term in query_lower for term in ['exact', 'specific', 'precise']):
            return SearchMethod.KEYWORD

        # If query is short and simple, use BM25
        if len(query.split()) <= 3:
            return SearchMethod.BM25

        # For complex queries, use hybrid search
        return SearchMethod.HYBRID

    def _extract_filters(self, query: str) -> dict:
        """Extract filters from the query."""
        filters = {}

        # Extract date filters (simplified)
        date_pattern = r'(?:from|between|after)\s+(\d{4}-\d{2}-\d{2})'
        date_matches = re.findall(date_pattern, query, re.IGNORECASE)
        if date_matches:
            filters['date_from'] = date_matches[0]

        # Extract category filters (simplified)
        category_pattern = r'(?:in|category|type)\s+(\w+)'
        category_matches = re.findall(category_pattern, query, re.IGNORECASE)
        if category_matches:
            filters['category'] = category_matches[0]

        return filters

    def validate(self) -> RAGValidationResult:
        """Validate query planner state."""
        return RAGValidationResult()

    def reload(self) -> QueryPlanner:
        """Reload query planner."""
        self.logger.info("Reloading QueryPlanner")
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise RAGError("QueryPlanner has not been initialized", component="QueryPlanner")
