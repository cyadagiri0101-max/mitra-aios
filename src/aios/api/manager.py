"""API Manager - main facade for the API server."""

from __future__ import annotations

import threading
import time

from aios.api.models import (
    APIRequest,
    APIResponse,
    APIStatistics,
    APIValidationResult,
    RateLimitConfig,
)
from aios.api.rate_limiter import RateLimiter
from aios.core.exceptions import APIError
from aios.core.logger import get_logger


class APIManager:
    """Main facade for the API server."""

    def __init__(self, rate_limit_config: RateLimitConfig | None = None) -> None:
        self.logger = get_logger("aios.api.manager")
        self._rate_limiter = RateLimiter(rate_limit_config)
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._running: bool = False

        # Statistics
        self._total_requests: int = 0
        self._successful_requests: int = 0
        self._failed_requests: int = 0
        self._total_response_time: float = 0.0
        self._active_connections: int = 0

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def rate_limiter(self) -> RateLimiter:
        return self._rate_limiter

    def initialize(self) -> APIManager:
        """Initialize the API manager."""
        with self._lock:
            if self._initialized:
                return self

            self._rate_limiter.initialize()
            self._initialized = True
            self.logger.info("APIManager initialized")

        return self

    def handle_request(self, request: APIRequest, client_id: str = "anonymous") -> APIResponse:
        """Handle an API request."""
        self._require_initialized()
        start_time = time.time()

        try:
            # Check rate limit
            self._rate_limiter.require(client_id)

            # Route request to appropriate handler
            response = self._route_request(request)

            # Update statistics
            with self._lock:
                self._total_requests += 1
                self._successful_requests += 1
                self._total_response_time += (time.time() - start_time)

            return response

        except Exception as e:
            # Determine status code from APIError or default to 500
            status_code = getattr(e, "status_code", 500)

            # Update statistics
            with self._lock:
                self._total_requests += 1
                self._failed_requests += 1
                self._total_response_time += (time.time() - start_time)

            self.logger.error("Request failed: %s", e)
            return APIResponse(
                status_code=status_code,
                error=str(e),
            )

    def _route_request(self, request: APIRequest) -> APIResponse:
        """Route request to appropriate handler."""
        # Simplified routing - in production, this would route to actual handlers
        endpoint = request.endpoint.lower()

        if endpoint == "/health":
            return APIResponse(status_code=200, body={"status": "healthy"})
        elif endpoint == "/metrics":
            return APIResponse(status_code=200, body={"metrics": "data"})
        elif endpoint == "/chat":
            return APIResponse(status_code=200, body={"response": "chat response"})
        elif endpoint == "/tools":
            return APIResponse(status_code=200, body={"tools": []})
        elif endpoint == "/agents":
            return APIResponse(status_code=200, body={"agents": []})
        else:
            return APIResponse(status_code=404, error="Endpoint not found")

    def start(self, host: str = "0.0.0.0", port: int = 8000) -> None:
        """Start the API server."""
        self._require_initialized()

        with self._lock:
            self._running = True

        self.logger.info("API server started on %s:%d", host, port)

    def stop(self) -> None:
        """Stop the API server."""
        with self._lock:
            self._running = False

        self.logger.info("API server stopped")

    def get_statistics(self) -> APIStatistics:
        """Get API statistics."""
        self._require_initialized()

        with self._lock:
            avg_response_time = (
                self._total_response_time / self._total_requests
                if self._total_requests > 0
                else 0.0
            )

            return APIStatistics(
                total_requests=self._total_requests,
                successful_requests=self._successful_requests,
                failed_requests=self._failed_requests,
                average_response_time=avg_response_time,
                active_connections=self._active_connections,
            )

    def validate(self) -> APIValidationResult:
        """Validate the API manager."""
        self._require_initialized()

        result = APIValidationResult()

        # Validate rate limiter
        rate_limiter_result = self._rate_limiter.validate()
        result.warnings.extend(rate_limiter_result.warnings)
        result.errors.extend(rate_limiter_result.errors)
        if not rate_limiter_result.is_valid:
            result.is_valid = False

        return result

    def reload(self) -> APIManager:
        """Reload the API manager."""
        self.logger.info("Reloading APIManager")

        with self._lock:
            self._rate_limiter.reload()
            self._initialized = False

        return self

    def shutdown(self) -> None:
        """Shutdown the API manager."""
        self.logger.info("Shutting down APIManager")

        self.stop()

        with self._lock:
            self._initialized = False

    def _require_initialized(self) -> None:
        """Check if manager is initialized."""
        if not self._initialized:
            raise APIError("APIManager has not been initialized", endpoint="manager")
