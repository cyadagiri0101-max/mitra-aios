"""Data models for LLM provider layer."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class MessageRole(StrEnum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class FinishReason(StrEnum):
    STOP = "stop"
    LENGTH = "length"
    TOOL_CALLS = "tool_calls"
    CONTENT_FILTER = "content_filter"
    ERROR = "error"


class ResponseFormat(StrEnum):
    TEXT = "text"
    JSON = "json"


@dataclass(frozen=True, slots=True)
class ToolCall:
    id: str = ""
    name: str = ""
    arguments: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class LLMMessage:
    role: MessageRole = MessageRole.USER
    content: str = ""
    name: str = ""
    tool_call_id: str = ""
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class LLMRequest:
    messages: tuple[LLMMessage, ...] = ()
    temperature: float = 0.7
    top_p: float = 1.0
    max_tokens: int = 1024
    stop: tuple[str, ...] = ()
    stream: bool = False
    tools: tuple[str, ...] = ()
    response_format: ResponseFormat = ResponseFormat.TEXT
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class TokenUsage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


@dataclass(frozen=True, slots=True)
class LLMResponse:
    content: str = ""
    model: str = ""
    provider: str = ""
    finish_reason: FinishReason = FinishReason.STOP
    usage: TokenUsage = field(default_factory=TokenUsage)
    tool_calls: tuple[ToolCall, ...] = ()
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class EmbeddingRequest:
    texts: tuple[str, ...] = ()
    model: str = ""


@dataclass(frozen=True, slots=True)
class EmbeddingResponse:
    vectors: tuple[tuple[float, ...], ...] = ()
    dimensions: int = 0
    provider: str = ""


@dataclass(frozen=True, slots=True)
class ProviderCapabilities:
    streaming: bool = False
    embeddings: bool = False
    tool_calling: bool = False
    json_mode: bool = False
    vision: bool = False
    audio: bool = False


@dataclass(slots=True)
class LLMStatistics:
    requests: int = 0
    successes: int = 0
    failures: int = 0
    average_latency: float = 0.0
    cache_hits: int = 0
    cache_misses: int = 0
    tokens_generated: int = 0


@dataclass(slots=True)
class ValidationResult:
    is_valid: bool = True
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
