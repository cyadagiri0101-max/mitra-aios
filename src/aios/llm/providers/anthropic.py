"""Anthropic LLM provider adapter."""

from __future__ import annotations

import threading
from collections.abc import Iterator

from aios.core.logger import get_logger
from aios.llm.config import ProviderConfig
from aios.llm.models import (
    EmbeddingRequest,
    EmbeddingResponse,
    LLMRequest,
    LLMResponse,
    LLMStatistics,
    ProviderCapabilities,
    ValidationResult,
)
from aios.llm.provider import LLMProvider


class AnthropicProvider(LLMProvider):
    def __init__(self, config: ProviderConfig | None = None) -> None:
        self.logger = get_logger("aios.llm.anthropic_provider")
        self._config = config or ProviderConfig(name="anthropic", model="claude-3-opus")
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._requests: int = 0
        self._successes: int = 0
        self._failures: int = 0
        self._latency_sum: float = 0.0
        self._tokens_generated: int = 0

    @property
    def name(self) -> str:
        return "anthropic"

    @property
    def capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(
            streaming=True,
            embeddings=False,
            tool_calling=True,
            json_mode=False,
            vision=True,
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

    def initialize(self) -> AnthropicProvider:
        self._initialized = True
        self.logger.info("AnthropicProvider initialized (model=%s)", self._config.model)
        return self

    def generate(self, request: LLMRequest) -> LLMResponse:
        self._require_initialized()
        self._validate_config()
        raise NotImplementedError("Anthropic API transport not implemented")

    def stream(self, request: LLMRequest) -> Iterator[str]:
        self._require_initialized()
        self._validate_config()
        raise NotImplementedError("Anthropic streaming transport not implemented")

    def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        self._require_initialized()
        raise NotImplementedError("Anthropic does not support embeddings")

    def count_tokens(self, text: str) -> int:
        if not text:
            return 0
        return max(1, int(len(text) * 0.25))

    def health(self) -> bool:
        return self._initialized and bool(self._config.api_key)

    def validate(self) -> ValidationResult:
        result = ValidationResult()
        if not self._config.api_key:
            result.warnings.append("Anthropic API key not configured")
        if not self._config.model:
            result.errors.append("Anthropic model not configured")
            result.is_valid = False
        return result

    def reload(self) -> AnthropicProvider:
        self.logger.info("Reloading AnthropicProvider")
        with self._lock:
            self._requests = 0
            self._successes = 0
            self._failures = 0
            self._latency_sum = 0.0
            self._tokens_generated = 0
        return self

    def shutdown(self) -> None:
        self.logger.info("Shutting down AnthropicProvider")
        self._initialized = False

    def _validate_config(self) -> None:
        from aios.core.exceptions import LLMProviderError
        if not self._config.api_key:
            raise LLMProviderError("Anthropic API key not configured", provider=self.name)

    def _require_initialized(self) -> None:
        from aios.core.exceptions import LLMProviderError
        if not self._initialized:
            raise LLMProviderError("AnthropicProvider has not been initialized", provider=self.name)
