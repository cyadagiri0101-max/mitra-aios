"""Configuration for LLM provider layer."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class ProviderConfig:
    name: str = ""
    api_key: str = ""
    api_base: str = ""
    model: str = ""
    timeout: float = 30.0
    max_retries: int = 3
    temperature: float = 0.7
    max_tokens: int = 1024
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class CacheConfig:
    enabled: bool = True
    ttl: float = 3600.0
    max_size: int = 1000


@dataclass(frozen=True, slots=True)
class LLMConfig:
    default_provider: str = "mock"
    providers: tuple[ProviderConfig, ...] = ()
    cache: CacheConfig = field(default_factory=CacheConfig)
    fallback_enabled: bool = True
    retry_on_failure: bool = True
    metadata: dict = field(default_factory=dict)
