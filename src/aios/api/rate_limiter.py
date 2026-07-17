"""Rate limiter for API server."""

from __future__ import annotations

import threading
import time
from collections import defaultdict

from aios.api.models import APIValidationResult, RateLimitConfig
from aios.core.exceptions import APIError
from aios.core.logger import get_logger


class RateLimiter:
    """Rate limiter for API requests."""

    def __init__(self, config: RateLimitConfig | None = None) -> None:
        self.logger = get_logger("aios.api.rate_limiter")
        self._config = config or RateLimitConfig()
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> RateLimiter:
        """Initialize the rate limiter."""
        self._initialized = True
        self.logger.info("RateLimiter initialized (rpm=%d)", self._config.requests_per_minute)
        return self

    def check(self, client_id: str) -> bool:
        """Check if a client can make a request."""
        self._require_initialized()

        if not self._config.enabled:
            return True

        now = time.time()
        window_start = now - 60.0  # 1 minute window

        with self._lock:
            # Clean old requests
            self._requests[client_id] = [
                t for t in self._requests[client_id] if t > window_start
            ]

            # Check if under limit
            if len(self._requests[client_id]) >= self._config.requests_per_minute:
                self.logger.warning("Rate limit exceeded for client '%s'", client_id)
                return False

            # Record request
            self._requests[client_id].append(now)
            return True

    def require(self, client_id: str) -> None:
        """Require rate limit check, raising error if exceeded."""
        if not self.check(client_id):
            raise APIError(
                f"Rate limit exceeded for client '{client_id}'",
                endpoint="rate_limit",
                status_code=429,
            )

    def reset(self, client_id: str | None = None) -> None:
        """Reset rate limit for a client or all clients."""
        with self._lock:
            if client_id:
                self._requests.pop(client_id, None)
            else:
                self._requests.clear()

    def validate(self) -> APIValidationResult:
        """Validate the rate limiter."""
        result = APIValidationResult()

        if self._config.requests_per_minute <= 0:
            result.errors.append("Requests per minute must be positive")
            result.is_valid = False

        return result

    def reload(self) -> RateLimiter:
        """Reload the rate limiter."""
        self.logger.info("Reloading RateLimiter")
        self.reset()
        return self

    def _require_initialized(self) -> None:
        """Check if limiter is initialized."""
        if not self._initialized:
            raise APIError("RateLimiter has not been initialized", endpoint="rate_limit")
