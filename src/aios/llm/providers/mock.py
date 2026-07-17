"""Mock LLM provider — fully functional, no external dependencies."""

from __future__ import annotations

import hashlib
import threading
import time
from collections.abc import Iterator

from aios.core.logger import get_logger
from aios.llm.models import (
    EmbeddingRequest,
    EmbeddingResponse,
    FinishReason,
    LLMRequest,
    LLMResponse,
    LLMStatistics,
    ProviderCapabilities,
    ResponseFormat,
    TokenUsage,
    ToolCall,
    ValidationResult,
)
from aios.llm.provider import LLMProvider


class MockProvider(LLMProvider):
    def __init__(self, model: str = "mock-model") -> None:
        self.logger = get_logger("aios.llm.mock_provider")
        self._model = model
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._requests: int = 0
        self._successes: int = 0
        self._failures: int = 0
        self._latency_sum: float = 0.0
        self._tokens_generated: int = 0

    @property
    def name(self) -> str:
        return "mock"

    @property
    def capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(
            streaming=True,
            embeddings=True,
            tool_calling=True,
            json_mode=True,
            vision=False,
            audio=False,
        )

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def statistics(self) -> LLMStatistics:
        with self._lock:
            avg = self._latency_sum / self._requests if self._requests > 0 else 0.0
            return LLMStatistics(
                requests=self._requests,
                successes=self._successes,
                failures=self._failures,
                average_latency=round(avg, 6),
                tokens_generated=self._tokens_generated,
            )

    def initialize(self) -> MockProvider:
        self._initialized = True
        self.logger.info("MockProvider initialized (model=%s)", self._model)
        return self

    def generate(self, request: LLMRequest) -> LLMResponse:
        self._require_initialized()
        start = time.monotonic()
        content = self._deterministic_response(request)
        tool_calls = self._extract_tool_calls(request)
        usage = TokenUsage(
            prompt_tokens=sum(self.count_tokens(m.content) for m in request.messages),
            completion_tokens=self.count_tokens(content),
        )
        usage = TokenUsage(
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
            total_tokens=usage.prompt_tokens + usage.completion_tokens,
        )
        finish = FinishReason.TOOL_CALLS if tool_calls else FinishReason.STOP
        latency = time.monotonic() - start
        with self._lock:
            self._requests += 1
            self._successes += 1
            self._latency_sum += latency
            self._tokens_generated += usage.completion_tokens
        return LLMResponse(
            content=content,
            model=self._model,
            provider=self.name,
            finish_reason=finish,
            usage=usage,
            tool_calls=tool_calls,
        )

    def stream(self, request: LLMRequest) -> Iterator[str]:
        self._require_initialized()
        content = self._deterministic_response(request)
        words = content.split()
        return iter(words)

    def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        self._require_initialized()
        vectors = []
        for text in request.texts:
            h = hashlib.sha256(text.encode()).hexdigest()
            vec = tuple(int(h[i : i + 2], 16) / 255.0 for i in range(0, 32, 2))
            vectors.append(vec)
        return EmbeddingResponse(
            vectors=tuple(vectors),
            dimensions=16,
            provider=self.name,
        )

    def count_tokens(self, text: str) -> int:
        if not text:
            return 0
        return len(text.split())

    def health(self) -> bool:
        return self._initialized

    def validate(self) -> ValidationResult:
        result = ValidationResult()
        if not self._initialized:
            result.warnings.append("MockProvider not initialized")
        return result

    def reload(self) -> MockProvider:
        self.logger.info("Reloading MockProvider")
        with self._lock:
            self._requests = 0
            self._successes = 0
            self._failures = 0
            self._latency_sum = 0.0
            self._tokens_generated = 0
        return self

    def shutdown(self) -> None:
        self.logger.info("Shutting down MockProvider")
        self._initialized = False

    def _deterministic_response(self, request: LLMRequest) -> str:
        last_msg = request.messages[-1] if request.messages else None
        if last_msg is None:
            return "mock response"
        content = last_msg.content
        if request.response_format == ResponseFormat.JSON:
            return f'{{"response": "{content[:50]}"}}'
        return f"mock response for: {content[:100]}"

    def _extract_tool_calls(self, request: LLMRequest) -> tuple[ToolCall, ...]:
        if not request.tools:
            return ()
        last_msg = request.messages[-1] if request.messages else None
        if last_msg is None:
            return ()
        tool_name = request.tools[0]
        return (ToolCall(id="call_1", name=tool_name, arguments={"query": last_msg.content[:50]}),)

    def _require_initialized(self) -> None:
        if not self._initialized:
            from aios.core.exceptions import LLMProviderError
            raise LLMProviderError("MockProvider has not been initialized", provider=self.name)
