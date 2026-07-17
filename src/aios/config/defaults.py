"""Default configuration for all MITRA components."""

from __future__ import annotations

from typing import Any

DEFAULT_CONFIG: dict[str, Any] = {
    "memory": {
        "backend": "in_memory",
        "max_entries": 10000,
        "ttl_seconds": 86400,
        "embedding_enabled": True,
        "consolidation_enabled": True,
    },
    "llm": {
        "provider": "mock",
        "model": "default",
        "temperature": 0.7,
        "max_tokens": 4096,
        "timeout_seconds": 60,
        "cache_enabled": True,
        "streaming_enabled": False,
        "retry_attempts": 3,
    },
    "tools": {
        "sandbox_enabled": True,
        "timeout_seconds": 30,
        "max_concurrent": 5,
        "cache_enabled": True,
        "permission_default": "read",
    },
    "agent": {
        "max_turns": 20,
        "reflection_enabled": True,
        "planning_enabled": True,
        "memory_coordination": True,
        "tool_coordination": True,
        "context_window": 8192,
    },
    "multiagent": {
        "enabled": False,
        "max_agents": 10,
        "consensus_algorithm": "majority",
        "message_bus_enabled": True,
        "shared_memory_enabled": True,
        "heartbeat_interval_seconds": 30,
    },
    "rag": {
        "enabled": False,
        "chunk_size": 512,
        "chunk_overlap": 50,
        "top_k": 5,
        "hybrid_search_enabled": True,
        "citation_enabled": True,
    },
    "embedding": {
        "provider": "mock",
        "model": "default",
        "dimensions": 1536,
        "batch_size": 100,
        "cache_enabled": True,
    },
    "vectorstore": {
        "provider": "in_memory",
        "dimensions": 1536,
        "similarity_metric": "cosine",
        "index_type": "flat",
    },
    "plugins": {
        "enabled": True,
        "auto_discover": True,
        "sandbox_enabled": True,
        "max_plugins": 50,
    },
    "scheduler": {
        "enabled": True,
        "max_concurrent_jobs": 10,
        "default_queue_size": 1000,
        "job_timeout_seconds": 300,
    },
    "observability": {
        "metrics_enabled": True,
        "tracing_enabled": False,
        "audit_enabled": True,
        "health_check_interval_seconds": 60,
        "log_retention_days": 30,
    },
    "security": {
        "encryption_enabled": True,
        "token_expiry_seconds": 3600,
        "policy_enforcement": True,
        "secret_rotation_enabled": False,
    },
    "api": {
        "host": "0.0.0.0",
        "port": 8000,
        "rate_limit_rpm": 100,
        "cors_enabled": True,
        "auth_required": False,
    },
    "cli": {
        "output_format": "text",
        "verbose": False,
        "log_level": "INFO",
    },
    "config": {
        "watch_enabled": False,
        "reload_on_change": False,
        "format": "toml",
    },
}


def get_defaults() -> dict[str, Any]:
    """Return a deep copy of the default configuration."""
    import copy
    return copy.deepcopy(DEFAULT_CONFIG)


def get_component_defaults(component: str) -> dict[str, Any] | None:
    """Return defaults for a specific component."""
    import copy
    val = DEFAULT_CONFIG.get(component)
    return copy.deepcopy(val) if val is not None else None
