"""Abstract tool provider interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterator

from aios.tools.models import (
    ToolCapabilities,
    ToolDefinition,
    ToolRequest,
    ToolResponse,
    ToolStatistics,
    ToolValidationResult,
)


class ToolProvider(ABC):
    @abstractmethod
    def initialize(self) -> ToolProvider: ...

    @abstractmethod
    def execute(self, request: ToolRequest) -> ToolResponse: ...

    @abstractmethod
    def stream(self, request: ToolRequest) -> Iterator[str]: ...

    @abstractmethod
    def list_tools(self) -> tuple[ToolDefinition, ...]: ...

    @abstractmethod
    def health(self) -> bool: ...

    @abstractmethod
    def validate(self) -> ToolValidationResult: ...

    @abstractmethod
    def reload(self) -> ToolProvider: ...

    @abstractmethod
    def shutdown(self) -> None: ...

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def capabilities(self) -> ToolCapabilities: ...

    @property
    @abstractmethod
    def is_initialized(self) -> bool: ...

    @property
    @abstractmethod
    def statistics(self) -> ToolStatistics: ...
