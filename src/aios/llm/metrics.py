"""Metrics tracking for LLM provider layer."""

from __future__ import annotations

import threading

from aios.core.logger import get_logger


class LLMMetrics:
    def __init__(self) -> None:
        self.logger = get_logger("aios.llm.metrics")
        self._lock = threading.Lock()
        self._requests: int = 0
        self._successes: int = 0
        self._failures: int = 0
        self._latency_sum: float = 0.0
        self._cache_hits: int = 0
        self._cache_misses: int = 0
        self._tokens_generated: int = 0
        self._stream_count: int = 0
        self._embedding_count: int = 0
        self._retry_count: int = 0
        self._provider_stats: dict[str, dict[str, int]] = {}

    def record_request(
        self,
        provider: str,
        success: bool,
        latency: float,
        tokens: int = 0,
    ) -> None:
        with self._lock:
            self._requests += 1
            if success:
                self._successes += 1
            else:
                self._failures += 1
            self._latency_sum += latency
            self._tokens_generated += tokens
            if provider not in self._provider_stats:
                self._provider_stats[provider] = {"requests": 0, "successes": 0, "failures": 0}
            self._provider_stats[provider]["requests"] += 1
            if success:
                self._provider_stats[provider]["successes"] += 1
            else:
                self._provider_stats[provider]["failures"] += 1

    def record_cache_hit(self) -> None:
        with self._lock:
            self._cache_hits += 1

    def record_cache_miss(self) -> None:
        with self._lock:
            self._cache_misses += 1

    def record_stream(self) -> None:
        with self._lock:
            self._stream_count += 1

    def record_embedding(self) -> None:
        with self._lock:
            self._embedding_count += 1

    def record_retry(self) -> None:
        with self._lock:
            self._retry_count += 1

    def statistics(self) -> dict:
        with self._lock:
            avg_latency = self._latency_sum / self._requests if self._requests > 0 else 0.0
            return {
                "requests": self._requests,
                "successes": self._successes,
                "failures": self._failures,
                "average_latency": round(avg_latency, 6),
                "cache_hits": self._cache_hits,
                "cache_misses": self._cache_misses,
                "tokens_generated": self._tokens_generated,
                "stream_count": self._stream_count,
                "embedding_count": self._embedding_count,
                "retry_count": self._retry_count,
                "providers": dict(self._provider_stats),
            }

    def reset(self) -> None:
        with self._lock:
            self._requests = 0
            self._successes = 0
            self._failures = 0
            self._latency_sum = 0.0
            self._cache_hits = 0
            self._cache_misses = 0
            self._tokens_generated = 0
            self._stream_count = 0
            self._embedding_count = 0
            self._retry_count = 0
            self._provider_stats.clear()
