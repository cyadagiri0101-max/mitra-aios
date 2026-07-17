"""Metrics tracking for tool execution."""

from __future__ import annotations

import threading

from aios.core.logger import get_logger


class ToolMetrics:
    def __init__(self) -> None:
        self.logger = get_logger("aios.tools.metrics")
        self._lock = threading.Lock()
        self._executions: int = 0
        self._successes: int = 0
        self._failures: int = 0
        self._timeouts: int = 0
        self._latency_sum: float = 0.0
        self._cache_hits: int = 0
        self._cache_misses: int = 0
        self._tool_stats: dict[str, dict[str, int]] = {}

    def record_execution(
        self,
        tool_name: str,
        success: bool,
        latency: float,
        timeout: bool = False,
    ) -> None:
        with self._lock:
            self._executions += 1
            if success:
                self._successes += 1
            else:
                self._failures += 1
            if timeout:
                self._timeouts += 1
            self._latency_sum += latency
            if tool_name not in self._tool_stats:
                self._tool_stats[tool_name] = {"executions": 0, "successes": 0, "failures": 0}
            self._tool_stats[tool_name]["executions"] += 1
            if success:
                self._tool_stats[tool_name]["successes"] += 1
            else:
                self._tool_stats[tool_name]["failures"] += 1

    def record_cache_hit(self) -> None:
        with self._lock:
            self._cache_hits += 1

    def record_cache_miss(self) -> None:
        with self._lock:
            self._cache_misses += 1

    def statistics(self) -> dict:
        with self._lock:
            avg_latency = self._latency_sum / self._executions if self._executions > 0 else 0.0
            return {
                "executions": self._executions,
                "successes": self._successes,
                "failures": self._failures,
                "timeouts": self._timeouts,
                "average_latency": round(avg_latency, 6),
                "cache_hits": self._cache_hits,
                "cache_misses": self._cache_misses,
                "tools": dict(self._tool_stats),
            }

    def reset(self) -> None:
        with self._lock:
            self._executions = 0
            self._successes = 0
            self._failures = 0
            self._timeouts = 0
            self._latency_sum = 0.0
            self._cache_hits = 0
            self._cache_misses = 0
            self._tool_stats.clear()
