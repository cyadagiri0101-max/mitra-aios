"""Tokenizer abstraction for token counting."""

from __future__ import annotations

from abc import ABC, abstractmethod

from aios.core.logger import get_logger


class Tokenizer(ABC):
    @abstractmethod
    def count_tokens(self, text: str) -> int: ...

    @property
    @abstractmethod
    def name(self) -> str: ...


class MockTokenizer(Tokenizer):
    def __init__(self) -> None:
        self.logger = get_logger("aios.llm.mock_tokenizer")

    def count_tokens(self, text: str) -> int:
        if not text:
            return 0
        return len(text.split())

    @property
    def name(self) -> str:
        return "mock"


class ProviderTokenizer(Tokenizer):
    def __init__(self, provider_name: str, tokens_per_char: float = 0.25) -> None:
        self.logger = get_logger(f"aios.llm.provider_tokenizer.{provider_name}")
        self._provider_name = provider_name
        self._tokens_per_char = tokens_per_char

    def count_tokens(self, text: str) -> int:
        if not text:
            return 0
        return max(1, int(len(text) * self._tokens_per_char))

    @property
    def name(self) -> str:
        return f"provider:{self._provider_name}"
