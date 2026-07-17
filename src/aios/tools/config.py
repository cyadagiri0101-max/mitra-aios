"""Configuration for tool execution layer."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class SandboxConfig:
    enabled: bool = True
    timeout: float = 30.0
    max_memory_mb: int = 256
    allowed_paths: tuple[str, ...] = ()
    blocked_commands: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class ToolCacheConfig:
    enabled: bool = True
    ttl: float = 300.0
    max_size: int = 500


@dataclass(frozen=True, slots=True)
class ToolConfig:
    default_timeout: float = 30.0
    max_retries: int = 3
    sandbox: SandboxConfig = field(default_factory=SandboxConfig)
    cache: ToolCacheConfig = field(default_factory=ToolCacheConfig)
    metadata: dict = field(default_factory=dict)
