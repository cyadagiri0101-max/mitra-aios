"""LLM Manager — unified facade over all LLM subsystems."""

from __future__ import annotations

import threading
import time

from aios.core.exceptions import LLMProviderError
from aios.core.logger import get_logger
from aios.llm.cache import LLMCache
from aios.llm.config import LLMConfig
from aios.llm.metrics import LLMMetrics
from aios.llm.models import (
    EmbeddingRequest,
    EmbeddingResponse,
    LLMRequest,
    LLMResponse,
    LLMStatistics,
    ValidationResult,
)
from aios.llm.provider import LLMProvider
from aios.llm.registry import ProviderRegistry
from aios.llm.streaming import LLMStream
from aios.llm.tokenizer import MockTokenizer, Tokenizer


class LLMManager:
    def __init__(self, config: LLMConfig | None = None) -> None:
        self.logger = get_logger("aios.llm.manager")
        self._config = config or LLMConfig()
        self._lock = threading.Lock()
        self._initialized: bool = False

        self._registry = ProviderRegistry()
        self._cache = LLMCache(self._config.cache)
        self._metrics = LLMMetrics()
        self._tokenizer: Tokenizer = MockTokenizer()

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def registry(self) -> ProviderRegistry:
        return self._registry

    @property
    def cache(self) -> LLMCache:
        return self._cache

    @property
    def metrics(self) -> LLMMetrics:
        return self._metrics

    def initialize(self) -> LLMManager:
        with self._lock:
            if self._initialized:
                return self
            self._registry.initialize()
            self._cache.initialize()
            self._initialized = True
            self.logger.info("LLMManager initialized (default=%s)", self._config.default_provider)
        return self

    def register_provider(self, provider: LLMProvider, aliases: tuple[str, ...] = ()) -> None:
        self._require_initialized()
        self._registry.register(provider, aliases)

    def remove_provider(self, name: str) -> bool:
        self._require_initialized()
        return self._registry.unregister(name)

    def provider(self, name: str = "") -> LLMProvider | None:
        self._require_initialized()
        if name:
            return self._registry.get(name)
        return self._registry.default_provider()

    def generate(self, request: LLMRequest, provider_name: str = "") -> LLMResponse:
        self._require_initialized()
        provider = self._resolve_provider(provider_name)
        if self._config.cache.enabled:
            cached = self._cache.get(request)
            if cached is not None:
                self._metrics.record_cache_hit()
                return cached
            self._metrics.record_cache_miss()

        start = time.monotonic()
        last_error: Exception | None = None
        attempts = self._config.max_retries if hasattr(self._config, "max_retries") else 1
        for attempt in range(attempts):
            try:
                response = provider.generate(request)
                latency = time.monotonic() - start
                self._metrics.record_request(provider.name, True, latency, response.usage.total_tokens)
                if self._config.cache.enabled:
                    self._cache.put(request, response)
                return response
            except Exception as e:
                last_error = e
                self._metrics.record_retry()
                self.logger.warning("Provider '%s' attempt %d failed: %s", provider.name, attempt + 1, e)
                if not self._config.fallback_enabled:
                    break
                fallback = self._find_fallback(provider.name)
                if fallback is not None:
                    provider = fallback
                    self.logger.info("Falling back to provider '%s'", provider.name)

        latency = time.monotonic() - start
        self._metrics.record_request(provider.name, False, latency)
        raise LLMProviderError(
            f"Generation failed after {attempts} attempt(s): {last_error}",
            provider=provider.name,
        )

    def stream(self, request: LLMRequest, provider_name: str = "") -> LLMStream:
        self._require_initialized()
        provider = self._resolve_provider(provider_name)
        self._metrics.record_stream()
        source = provider.stream(request)
        return LLMStream(source)

    def embed(self, request: EmbeddingRequest, provider_name: str = "") -> EmbeddingResponse:
        self._require_initialized()
        provider = self._resolve_provider(provider_name)
        start = time.monotonic()
        try:
            response = provider.embed(request)
            latency = time.monotonic() - start
            self._metrics.record_request(provider.name, True, latency)
            self._metrics.record_embedding()
            return response
        except Exception as e:
            latency = time.monotonic() - start
            self._metrics.record_request(provider.name, False, latency)
            raise LLMProviderError(f"Embedding failed: {e}", provider=provider.name) from e

    def count_tokens(self, text: str) -> int:
        self._require_initialized()
        return self._tokenizer.count_tokens(text)

    def statistics(self) -> LLMStatistics:
        self._require_initialized()
        m = self._metrics.statistics()
        return LLMStatistics(
            requests=m["requests"],
            successes=m["successes"],
            failures=m["failures"],
            average_latency=m["average_latency"],
            cache_hits=m["cache_hits"],
            cache_misses=m["cache_misses"],
            tokens_generated=m["tokens_generated"],
        )

    def validate(self) -> ValidationResult:
        result = ValidationResult()
        reg_result = self._registry.validate()
        cache_result = self._cache.validate()
        result.warnings.extend(reg_result.warnings)
        result.errors.extend(reg_result.errors)
        result.errors.extend(cache_result.errors)
        if not reg_result.is_valid or not cache_result.is_valid:
            result.is_valid = False
        return result

    def reload(self) -> LLMManager:
        self.logger.info("Reloading LLMManager")
        with self._lock:
            self._registry.reload()
            self._cache.reload()
            self._metrics.reset()
            self._initialized = False
        return self

    def shutdown(self) -> None:
        self.logger.info("Shutting down LLMManager")
        with self._lock:
            for name in self._registry.list():
                provider = self._registry.get(name)
                if provider is not None:
                    try:
                        provider.shutdown()
                    except Exception:
                        self.logger.exception("Error shutting down provider '%s'", name)
            self._initialized = False

    def _resolve_provider(self, name: str = "") -> LLMProvider:
        provider = self.provider(name)
        if provider is None:
            target = name or self._config.default_provider
            raise LLMProviderError(f"Provider '{target}' not found", provider=name)
        return provider

    def _find_fallback(self, exclude: str) -> LLMProvider | None:
        for name in self._registry.list():
            if name != exclude:
                p = self._registry.get(name)
                if p is not None and p.health():
                    return p
        return None

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise LLMProviderError("LLMManager has not been initialized")
