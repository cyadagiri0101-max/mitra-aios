"""Tool execution cache."""

from __future__ import annotations

import hashlib
import json
import threading
import time
from collections import OrderedDict

from aios.core.logger import get_logger
from aios.tools.config import ToolCacheConfig
from aios.tools.models import ToolRequest, ToolResponse, ToolValidationResult


class ToolCache:
    def __init__(self, config: ToolCacheConfig | None = None) -> None:
        self.logger = get_logger("aios.tools.cache")
        self._config = config or ToolCacheConfig()
        self._cache: OrderedDict[str, tuple[ToolResponse, float]] = OrderedDict()
        self._lock = threading.Lock()
        self._hits: int = 0
        self._misses: int = 0
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def size(self) -> int:
        with self._lock:
            return len(self._cache)

    def initialize(self) -> ToolCache:
        self._initialized = True
        self.logger.info("ToolCache initialized (ttl=%s, max_size=%d)", self._config.ttl, self._config.max_size)
        return self

    def get(self, request: ToolRequest) -> ToolResponse | None:
        self._require_initialized()
        key = self._hash_request(request)
        with self._lock:
            if key not in self._cache:
                self._misses += 1
                return None
            response, timestamp = self._cache[key]
            if time.time() - timestamp > self._config.ttl:
                del self._cache[key]
                self._misses += 1
                return None
            self._cache.move_to_end(key)
            self._hits += 1
            return response

    def put(self, request: ToolRequest, response: ToolResponse) -> None:
        self._require_initialized()
        if not self._config.enabled:
            return
        key = self._hash_request(request)
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            self._cache[key] = (response, time.time())
            while len(self._cache) > self._config.max_size:
                self._cache.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0

    def statistics(self) -> dict[str, int]:
        with self._lock:
            return {
                "size": len(self._cache),
                "hits": self._hits,
                "misses": self._misses,
            }

    def validate(self) -> ToolValidationResult:
        result = ToolValidationResult()
        if self._config.ttl <= 0:
            result.errors.append("Cache TTL must be positive")
            result.is_valid = False
        if self._config.max_size <= 0:
            result.errors.append("Cache max_size must be positive")
            result.is_valid = False
        return result

    def reload(self) -> ToolCache:
        self.logger.info("Reloading ToolCache")
        with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0
        return self

    @staticmethod
    def _hash_request(request: ToolRequest) -> str:
        data = {
            "tool_name": request.tool_name,
            "arguments": dict(sorted(request.arguments.items())),
        }
        raw = json.dumps(data, sort_keys=True)
        return hashlib.sha256(raw.encode()).hexdigest()

    def _require_initialized(self) -> None:
        if not self._initialized:
            from aios.core.exceptions import ToolError
            raise ToolError("ToolCache has not been initialized")
