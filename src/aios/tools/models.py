"""Data models for tool execution layer."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class ToolStatus(StrEnum):
    SUCCESS = "success"
    ERROR = "error"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"
    PERMISSION_DENIED = "permission_denied"


class PermissionLevel(StrEnum):
    NONE = "none"
    READ = "read"
    WRITE = "write"
    EXECUTE = "execute"
    ADMIN = "admin"


@dataclass(frozen=True, slots=True)
class ToolParameter:
    name: str = ""
    type: str = "string"
    description: str = ""
    required: bool = False
    default: str = ""


@dataclass(frozen=True, slots=True)
class ToolDefinition:
    name: str = ""
    description: str = ""
    provider: str = ""
    parameters: tuple[ToolParameter, ...] = ()
    returns: str = ""
    timeout: float = 30.0
    requires_permission: PermissionLevel = PermissionLevel.READ
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class ToolRequest:
    tool_name: str = ""
    arguments: dict = field(default_factory=dict)
    timeout: float = 30.0
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class ToolResponse:
    result: str = ""
    status: ToolStatus = ToolStatus.SUCCESS
    error: str = ""
    execution_time: float = 0.0
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class ToolCapabilities:
    streaming: bool = False
    async_execution: bool = False
    caching: bool = True
    retry: bool = True
    sandbox: bool = False


@dataclass(slots=True)
class ToolStatistics:
    executions: int = 0
    successes: int = 0
    failures: int = 0
    timeouts: int = 0
    average_latency: float = 0.0
    cache_hits: int = 0
    cache_misses: int = 0


@dataclass(slots=True)
class ToolValidationResult:
    is_valid: bool = True
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
