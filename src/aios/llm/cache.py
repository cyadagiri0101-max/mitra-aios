"""LLM response cache with TTL and LRU eviction."""

from __future__ import annotations

import hashlib
import json
import threading
import time
from collections import OrderedDict

from aios.core.logger import get_logger
from aios.llm.config import CacheConfig
from aios.llm.models import LLMRequest, LLMResponse, ValidationResult


class LLMCache:
    def __init__(self, config: CacheConfig | None = None) -> None:
        self.logger = get_logger("aios.llm.cache")
        self._config = config or CacheConfig()
        self._cache: OrderedDict[str, tuple[LLMResponse, float]] = OrderedDict()
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

    def initialize(self) -> LLMCache:
        self._initialized = True
        self.logger.info("LLMCache initialized (ttl=%s, max_size=%d)", self._config.ttl, self._config.max_size)
        return self

    def get(self, request: LLMRequest) -> LLMResponse | None:
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

    def put(self, request: LLMRequest, response: LLMResponse) -> None:
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

    def validate(self) -> ValidationResult:
        result = ValidationResult()
        if self._config.ttl <= 0:
            result.errors.append("Cache TTL must be positive")
            result.is_valid = False
        if self._config.max_size <= 0:
            result.errors.append("Cache max_size must be positive")
            result.is_valid = False
        return result

    def reload(self) -> LLMCache:
        self.logger.info("Reloading LLMCache")
        with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0
        return self

    @staticmethod
    def _hash_request(request: LLMRequest) -> str:
        data = {
            "messages": [{"role": m.role.value, "content": m.content} for m in request.messages],
            "temperature": request.temperature,
            "top_p": request.top_p,
            "max_tokens": request.max_tokens,
            "stop": list(request.stop),
            "tools": list(request.tools),
            "response_format": request.response_format.value,
        }
        raw = json.dumps(data, sort_keys=True)
        return hashlib.sha256(raw.encode()).hexdigest()

    def _require_initialized(self) -> None:
        if not self._initialized:
            from aios.core.exceptions import LLMProviderError
            raise LLMProviderError("LLMCache has not been initialized")
