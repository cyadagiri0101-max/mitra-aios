"""Context manager for agent context assembly."""

from __future__ import annotations

import threading

from aios.agent.models import AgentValidationResult, ConversationMessage
from aios.core.logger import get_logger


class ContextManager:
    def __init__(self, max_tokens: int = 4096) -> None:
        self.logger = get_logger("aios.agent.context")
        self._max_tokens = max_tokens
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def max_tokens(self) -> int:
        return self._max_tokens

    def initialize(self) -> ContextManager:
        self._initialized = True
        self.logger.info("ContextManager initialized (max_tokens=%d)", self._max_tokens)
        return self

    def build_context(self, messages: list[ConversationMessage], system_prompt: str = "") -> list[ConversationMessage]:
        self._require_initialized()
        context: list[ConversationMessage] = []
        if system_prompt:
            context.append(ConversationMessage(role="system", content=system_prompt))
        context.extend(messages)
        return context

    def trim_context(self, messages: list[ConversationMessage]) -> list[ConversationMessage]:
        self._require_initialized()
        total = sum(len(m.content.split()) for m in messages)
        if total <= self._max_tokens:
            return messages
        trimmed: list[ConversationMessage] = []
        running = 0
        for m in reversed(messages):
            words = len(m.content.split())
            if running + words > self._max_tokens:
                break
            trimmed.insert(0, m)
            running += words
        return trimmed

    def validate(self) -> AgentValidationResult:
        result = AgentValidationResult()
        if self._max_tokens <= 0:
            result.errors.append("max_tokens must be positive")
            result.is_valid = False
        return result

    def reload(self) -> ContextManager:
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            from aios.core.exceptions import AgentLayerError
            raise AgentLayerError("ContextManager has not been initialized")
