"""Data models for API server."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class EndpointType(StrEnum):
    """Endpoint types."""
    CHAT = "chat"
    EXECUTE = "execute"
    MEMORY = "memory"
    WORKFLOW = "workflow"
    TOOLS = "tools"
    HEALTH = "health"
    METRICS = "metrics"
    AGENTS = "agents"
    EMBEDDINGS = "embeddings"
    VECTOR_STORE = "vector_store"


@dataclass(frozen=True, slots=True)
class APIEndpoint:
    """API endpoint model."""
    path: str = ""
    method: str = "GET"
    endpoint_type: EndpointType = EndpointType.HEALTH
    description: str = ""
    requires_auth: bool = False
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class APIRequest:
    """API request model."""
    endpoint: str = ""
    method: str = "GET"
    headers: dict = field(default_factory=dict)
    body: dict = field(default_factory=dict)
    query_params: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class APIResponse:
    """API response model."""
    status_code: int = 200
    body: dict = field(default_factory=dict)
    headers: dict = field(default_factory=dict)
    error: str = ""


@dataclass(frozen=True, slots=True)
class RateLimitConfig:
    """Rate limit configuration."""
    enabled: bool = True
    requests_per_minute: int = 60
    burst_size: int = 10


@dataclass(slots=True)
class APIStatistics:
    """API statistics."""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    average_response_time: float = 0.0
    active_connections: int = 0


@dataclass(slots=True)
class APIValidationResult:
    """API validation result."""
    is_valid: bool = True
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
