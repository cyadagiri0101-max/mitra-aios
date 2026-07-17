"""Tests for AIOS API Server."""

from __future__ import annotations

import pytest

from aios.api.manager import APIManager
from aios.api.models import (
    APIEndpoint,
    APIRequest,
    APIResponse,
    APIStatistics,
    APIValidationResult,
    EndpointType,
    RateLimitConfig,
)
from aios.api.rate_limiter import RateLimiter
from aios.core.exceptions import APIError

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class TestModels:
    def test_api_endpoint_creation(self):
        endpoint = APIEndpoint(
            path="/api/chat",
            method="POST",
            endpoint_type=EndpointType.CHAT,
            description="Chat endpoint",
            requires_auth=True,
        )
        assert endpoint.path == "/api/chat"
        assert endpoint.method == "POST"
        assert endpoint.endpoint_type == EndpointType.CHAT
        assert endpoint.requires_auth is True

    def test_api_request_creation(self):
        request = APIRequest(
            endpoint="/api/chat",
            method="POST",
            headers={"Authorization": "Bearer token"},
            body={"message": "hello"},
        )
        assert request.endpoint == "/api/chat"
        assert request.method == "POST"
        assert request.body == {"message": "hello"}

    def test_api_response_creation(self):
        response = APIResponse(
            status_code=200,
            body={"response": "hello"},
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 200
        assert response.body == {"response": "hello"}

    def test_rate_limit_config_creation(self):
        config = RateLimitConfig(
            enabled=True,
            requests_per_minute=100,
            burst_size=20,
        )
        assert config.enabled is True
        assert config.requests_per_minute == 100
        assert config.burst_size == 20

    def test_api_statistics_creation(self):
        stats = APIStatistics(
            total_requests=1000,
            successful_requests=950,
            failed_requests=50,
            average_response_time=0.1,
            active_connections=10,
        )
        assert stats.total_requests == 1000
        assert stats.successful_requests == 950
        assert stats.failed_requests == 50

    def test_endpoint_type_enum(self):
        assert EndpointType.CHAT.value == "chat"
        assert EndpointType.EXECUTE.value == "execute"
        assert EndpointType.HEALTH.value == "health"
        assert EndpointType.METRICS.value == "metrics"


# ---------------------------------------------------------------------------
# RateLimiter
# ---------------------------------------------------------------------------


class TestRateLimiter:
    def test_initialize(self):
        limiter = RateLimiter()
        assert limiter.is_initialized is False
        limiter.initialize()
        assert limiter.is_initialized is True

    def test_check_within_limit(self):
        limiter = RateLimiter(RateLimitConfig(requests_per_minute=10)).initialize()
        assert limiter.check("client1") is True

    def test_check_exceeds_limit(self):
        limiter = RateLimiter(RateLimitConfig(requests_per_minute=2)).initialize()
        assert limiter.check("client1") is True
        assert limiter.check("client1") is True
        assert limiter.check("client1") is False

    def test_check_disabled(self):
        limiter = RateLimiter(RateLimitConfig(enabled=False)).initialize()
        for _ in range(100):
            assert limiter.check("client1") is True

    def test_require_within_limit(self):
        limiter = RateLimiter(RateLimitConfig(requests_per_minute=10)).initialize()
        limiter.require("client1")  # Should not raise

    def test_require_exceeds_limit(self):
        limiter = RateLimiter(RateLimitConfig(requests_per_minute=1)).initialize()
        limiter.require("client1")
        with pytest.raises(APIError):
            limiter.require("client1")

    def test_reset_client(self):
        limiter = RateLimiter(RateLimitConfig(requests_per_minute=1)).initialize()
        limiter.check("client1")
        limiter.reset("client1")
        assert limiter.check("client1") is True

    def test_reset_all(self):
        limiter = RateLimiter(RateLimitConfig(requests_per_minute=1)).initialize()
        limiter.check("client1")
        limiter.check("client2")
        limiter.reset()
        assert limiter.check("client1") is True
        assert limiter.check("client2") is True

    def test_validate(self):
        limiter = RateLimiter().initialize()
        result = limiter.validate()
        assert isinstance(result, APIValidationResult)

    def test_validate_invalid_config(self):
        limiter = RateLimiter(RateLimitConfig(requests_per_minute=-1)).initialize()
        result = limiter.validate()
        assert result.is_valid is False

    def test_reload(self):
        limiter = RateLimiter().initialize()
        limiter.check("client1")
        limiter.reload()
        assert limiter.check("client1") is True

    def test_uninitialized_raises(self):
        limiter = RateLimiter()
        with pytest.raises(APIError):
            limiter.check("client1")


# ---------------------------------------------------------------------------
# APIManager
# ---------------------------------------------------------------------------


class TestAPIManager:
    def test_initialize(self):
        manager = APIManager()
        assert manager.is_initialized is False
        manager.initialize()
        assert manager.is_initialized is True

    def test_double_initialize(self):
        manager = APIManager().initialize()
        manager.initialize()
        assert manager.is_initialized is True

    def test_handle_health_request(self):
        manager = APIManager().initialize()
        request = APIRequest(endpoint="/health", method="GET")
        response = manager.handle_request(request)
        assert response.status_code == 200
        assert "status" in response.body

    def test_handle_metrics_request(self):
        manager = APIManager().initialize()
        request = APIRequest(endpoint="/metrics", method="GET")
        response = manager.handle_request(request)
        assert response.status_code == 200

    def test_handle_chat_request(self):
        manager = APIManager().initialize()
        request = APIRequest(endpoint="/chat", method="POST", body={"message": "hello"})
        response = manager.handle_request(request)
        assert response.status_code == 200

    def test_handle_unknown_endpoint(self):
        manager = APIManager().initialize()
        request = APIRequest(endpoint="/unknown", method="GET")
        response = manager.handle_request(request)
        assert response.status_code == 404

    def test_rate_limiting(self):
        manager = APIManager(RateLimitConfig(requests_per_minute=2)).initialize()
        request = APIRequest(endpoint="/health", method="GET")

        manager.handle_request(request)
        manager.handle_request(request)
        response = manager.handle_request(request)
        assert response.status_code == 429  # Rate limit exceeded

    def test_start_stop(self):
        manager = APIManager().initialize()
        assert manager.is_running is False
        manager.start()
        assert manager.is_running is True
        manager.stop()
        assert manager.is_running is False

    def test_get_statistics(self):
        manager = APIManager().initialize()
        request = APIRequest(endpoint="/health", method="GET")
        manager.handle_request(request)
        manager.handle_request(request)

        stats = manager.get_statistics()
        assert isinstance(stats, APIStatistics)
        assert stats.total_requests == 2
        assert stats.successful_requests == 2

    def test_validate(self):
        manager = APIManager().initialize()
        result = manager.validate()
        assert isinstance(result, APIValidationResult)

    def test_reload(self):
        manager = APIManager().initialize()
        manager.handle_request(APIRequest(endpoint="/health"))
        manager.reload()
        assert manager.is_initialized is False

    def test_shutdown(self):
        manager = APIManager().initialize()
        manager.start()
        manager.shutdown()
        assert manager.is_initialized is False
        assert manager.is_running is False

    def test_uninitialized_raises(self):
        manager = APIManager()
        with pytest.raises(APIError):
            manager.handle_request(APIRequest(endpoint="/health"))

    def test_rate_limiter_accessible(self):
        manager = APIManager().initialize()
        assert manager.rate_limiter is not None


# ---------------------------------------------------------------------------
# Integration
# ---------------------------------------------------------------------------


class TestIntegration:
    def test_full_api_workflow(self):
        manager = APIManager(RateLimitConfig(requests_per_minute=100)).initialize()

        # Start server
        manager.start(host="127.0.0.1", port=8080)
        assert manager.is_running is True

        # Handle multiple requests
        health_response = manager.handle_request(APIRequest(endpoint="/health"))
        assert health_response.status_code == 200

        metrics_response = manager.handle_request(APIRequest(endpoint="/metrics"))
        assert metrics_response.status_code == 200

        chat_response = manager.handle_request(
            APIRequest(endpoint="/chat", method="POST", body={"message": "hello"})
        )
        assert chat_response.status_code == 200

        tools_response = manager.handle_request(APIRequest(endpoint="/tools"))
        assert tools_response.status_code == 200

        agents_response = manager.handle_request(APIRequest(endpoint="/agents"))
        assert agents_response.status_code == 200

        # Get statistics
        stats = manager.get_statistics()
        assert stats.total_requests == 5
        assert stats.successful_requests == 5

        # Validate
        validation = manager.validate()
        assert validation.is_valid is True

        # Stop server
        manager.stop()
        assert manager.is_running is False

        manager.shutdown()
