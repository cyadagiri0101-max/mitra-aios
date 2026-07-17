"""Embedding provider abstraction and mock implementation."""

from __future__ import annotations

from abc import ABC, abstractmethod

from aios.core.logger import get_logger


class EmbeddingProvider(ABC):
    @abstractmethod
    def generate_embedding(self, text: str) -> list[float]:
        ...

    @abstractmethod
    def dimension(self) -> int:
        ...

    @property
    @abstractmethod
    def provider_name(self) -> str:
        ...


class MockEmbeddingProvider(EmbeddingProvider):
    def __init__(self, dimension: int = 128) -> None:
        self.logger = get_logger("aios.memory.mock_embeddings")
        self._dimension = dimension

    def generate_embedding(self, text: str) -> list[float]:
        deterministic = sum(ord(c) for c in text)
        rng = _SimpleRNG(deterministic)
        return [rng.next() for _ in range(self._dimension)]

    def dimension(self) -> int:
        return self._dimension

    @property
    def provider_name(self) -> str:
        return "mock"


class _SimpleRNG:
    def __init__(self, seed: int) -> None:
        self._state = seed % 2147483647
        if self._state <= 0:
            self._state = 1

    def next(self) -> float:
        self._state = (self._state * 16807) % 2147483647
        return self._state / 2147483647
