"""Cache for embedding results."""

from __future__ import annotations

import hashlib
import threading
import time
from collections import OrderedDict

from aios.core.exceptions import EmbeddingError
from aios.core.logger import get_logger
from aios.embedding.models import (
    EmbeddingResult,
    EmbeddingValidationResult,
)


class EmbeddingCache:
    """Cache for embedding results with LRU eviction and TTL."""

    def __init__(self, max_size: int = 10000, ttl: float = 3600.0) -> None:
        self.logger = get_logger("aios.embedding.cache")
        self._max_size = max_size
        self._ttl = ttl
        self._cache: OrderedDict[str, tuple[EmbeddingResult, float]] = OrderedDict()
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._hits: int = 0
        self._misses: int = 0

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def size(self) -> int:
        """Get current cache size."""
        with self._lock:
            return len(self._cache)

    @property
    def hits(self) -> int:
        """Get cache hit count."""
        with self._lock:
            return self._hits

    @property
    def misses(self) -> int:
        """Get cache miss count."""
        with self._lock:
            return self._misses

    def initialize(self) -> EmbeddingCache:
        """Initialize the cache."""
        self._initialized = True
        self.logger.info("EmbeddingCache initialized (max_size=%d, ttl=%.1f)", self._max_size, self._ttl)
        return self

    def get(self, text: str, provider: str = "", model: str = "") -> EmbeddingResult | None:
        """Get embedding from cache."""
        self._require_initialized()
        key = self._make_key(text, provider, model)

        with self._lock:
            if key in self._cache:
                result, timestamp = self._cache[key]
                if time.time() - timestamp <= self._ttl:
                    self._cache.move_to_end(key)
                    self._hits += 1
                    return result
                else:
                    del self._cache[key]

            self._misses += 1
            return None

    def put(self, text: str, result: EmbeddingResult) -> None:
        """Put embedding in cache."""
        self._require_initialized()
        key = self._make_key(text, result.provider, result.model)

        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            self._cache[key] = (result, time.time())

            while len(self._cache) > self._max_size:
                self._cache.popitem(last=False)

    def clear(self) -> None:
        """Clear the cache."""
        with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0
        self.logger.info("EmbeddingCache cleared")

    def validate(self) -> EmbeddingValidationResult:
        """Validate cache configuration."""
        result = EmbeddingValidationResult()

        if self._max_size <= 0:
            result.errors.append("Cache max_size must be positive")
            result.is_valid = False

        if self._ttl <= 0:
            result.errors.append("Cache TTL must be positive")
            result.is_valid = False

        return result

    def reload(self) -> EmbeddingCache:
        """Reload the cache."""
        self.logger.info("Reloading EmbeddingCache")
        self.clear()
        return self

    def _make_key(self, text: str, provider: str, model: str) -> str:
        """Create cache key."""
        combined = f"{text}:{provider}:{model}"
        return hashlib.sha256(combined.encode()).hexdigest()

    def _require_initialized(self) -> None:
        """Check if cache is initialized."""
        if not self._initialized:
            raise EmbeddingError("EmbeddingCache has not been initialized")
