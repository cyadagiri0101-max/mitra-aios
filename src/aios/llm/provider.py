"""Abstract LLM provider interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterator

from aios.llm.models import (
    EmbeddingRequest,
    EmbeddingResponse,
    LLMRequest,
    LLMResponse,
    LLMStatistics,
    ProviderCapabilities,
    ValidationResult,
)


class LLMProvider(ABC):
    @abstractmethod
    def initialize(self) -> LLMProvider: ...

    @abstractmethod
    def generate(self, request: LLMRequest) -> LLMResponse: ...

    @abstractmethod
    def stream(self, request: LLMRequest) -> Iterator[str]: ...

    @abstractmethod
    def embed(self, request: EmbeddingRequest) -> EmbeddingResponse: ...

    @abstractmethod
    def count_tokens(self, text: str) -> int: ...

    @abstractmethod
    def health(self) -> bool: ...

    @abstractmethod
    def validate(self) -> ValidationResult: ...

    @abstractmethod
    def reload(self) -> LLMProvider: ...

    @abstractmethod
    def shutdown(self) -> None: ...

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def capabilities(self) -> ProviderCapabilities: ...

    @property
    @abstractmethod
    def is_initialized(self) -> bool: ...

    @property
    @abstractmethod
    def statistics(self) -> LLMStatistics: ...
