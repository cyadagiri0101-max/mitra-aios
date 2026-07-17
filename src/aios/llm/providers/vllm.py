"""vLLM local LLM provider adapter."""

from __future__ import annotations

import threading

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


class VLLMProvider(LLMProvider):
    def __init__(self, config: ProviderConfig | None = None) -> None:
        self.logger = get_logger("aios.llm.vllm_provider")
        self._config = config or ProviderConfig(
            name="vllm",
            api_base="http://localhost:8000/v1",
            model="local-model",
        )
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._requests: int = 0
        self._successes: int = 0
        self._failures: int = 0
        self._latency_sum: float = 0.0
        self._tokens_generated: int = 0

    @property
    def name(self) -> str:
        return "vllm"

    @property
    def capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(
            streaming=True,
            embeddings=True,
            tool_calling=False,
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

    def initialize(self) -> VLLMProvider:
        self._initialized = True
        self.logger.info("VLLMProvider initialized (model=%s, base=%s)", self._config.model, self._config.api_base)
        return self

    def generate(self, request: LLMRequest) -> LLMResponse:
        self._require_initialized()
        raise NotImplementedError("vLLM API transport not implemented")

    def stream(self, request: LLMRequest) -> list[str]:
        self._require_initialized()
        raise NotImplementedError("vLLM streaming transport not implemented")

    def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        self._require_initialized()
        raise NotImplementedError("vLLM embedding transport not implemented")

    def count_tokens(self, text: str) -> int:
        if not text:
            return 0
        return max(1, int(len(text) * 0.25))

    def health(self) -> bool:
        return self._initialized

    def validate(self) -> ValidationResult:
        result = ValidationResult()
        if not self._config.api_base:
            result.errors.append("vLLM API base URL not configured")
            result.is_valid = False
        if not self._config.model:
            result.errors.append("vLLM model not configured")
            result.is_valid = False
        return result

    def reload(self) -> VLLMProvider:
        self.logger.info("Reloading VLLMProvider")
        with self._lock:
            self._requests = 0
            self._successes = 0
            self._failures = 0
            self._latency_sum = 0.0
            self._tokens_generated = 0
        return self

    def shutdown(self) -> None:
        self.logger.info("Shutting down VLLMProvider")
        self._initialized = False

    def _require_initialized(self) -> None:
        from aios.core.exceptions import LLMProviderError
        if not self._initialized:
            raise LLMProviderError("VLLMProvider has not been initialized", provider=self.name)
