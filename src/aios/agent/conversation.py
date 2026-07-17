"""Conversation manager for agent interactions."""

from __future__ import annotations

import threading

from aios.agent.models import AgentValidationResult, ConversationMessage
from aios.core.logger import get_logger


class ConversationManager:
    def __init__(self, max_history: int = 100) -> None:
        self.logger = get_logger("aios.agent.conversation")
        self._history: list[ConversationMessage] = []
        self._max_history = max_history
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> ConversationManager:
        self._initialized = True
        self.logger.info("ConversationManager initialized (max_history=%d)", self._max_history)
        return self

    def add_message(self, role: str, content: str, name: str = "") -> None:
        self._require_initialized()
        with self._lock:
            self._history.append(ConversationMessage(role=role, content=content, name=name))
            while len(self._history) > self._max_history:
                self._history.pop(0)

    def get_history(self) -> list[ConversationMessage]:
        self._require_initialized()
        with self._lock:
            return list(self._history)

    def get_last_message(self) -> ConversationMessage | None:
        self._require_initialized()
        with self._lock:
            return self._history[-1] if self._history else None

    def clear(self) -> None:
        with self._lock:
            self._history.clear()

    def count(self) -> int:
        with self._lock:
            return len(self._history)

    def reload(self) -> ConversationManager:
        self.logger.info("Reloading ConversationManager")
        with self._lock:
            self._history.clear()
        return self

    def validate(self) -> AgentValidationResult:
        result = AgentValidationResult()
        if self._max_history <= 0:
            result.errors.append("max_history must be positive")
            result.is_valid = False
        return result

    def _require_initialized(self) -> None:
        if not self._initialized:
            from aios.core.exceptions import AgentLayerError
            raise AgentLayerError("ConversationManager has not been initialized")
