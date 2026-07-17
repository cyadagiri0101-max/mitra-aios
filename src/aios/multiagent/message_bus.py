"""Message bus for inter-agent communication."""

from __future__ import annotations

import threading
from collections import defaultdict

from aios.core.exceptions import MultiAgentError
from aios.core.logger import get_logger
from aios.multiagent.models import (
    AgentMessage,
    MultiAgentValidationResult,
)


class MessageBus:
    """Thread-safe message bus for agent communication."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.multiagent.message_bus")
        self._messages: dict[str, list[AgentMessage]] = defaultdict(list)
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._message_count: int = 0

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def message_count(self) -> int:
        with self._lock:
            return self._message_count

    def initialize(self) -> MessageBus:
        self._initialized = True
        self.logger.info("MessageBus initialized")
        return self

    def register_agent(self, agent_id: str) -> None:
        """Register an agent to receive broadcasts."""
        self._require_initialized()
        with self._lock:
            if agent_id not in self._messages:
                self._messages[agent_id] = []
                self.logger.debug("Registered agent '%s' for message delivery", agent_id)

    def send(self, message: AgentMessage) -> None:
        """Send a message to an agent."""
        self._require_initialized()
        with self._lock:
            self._messages[message.receiver].append(message)
            self._message_count += 1
            self.logger.debug(
                "Message from '%s' to '%s': %s",
                message.sender,
                message.receiver,
                message.content[:50],
            )

    def receive(self, agent_id: str, limit: int = 10) -> list[AgentMessage]:
        """Receive messages for an agent."""
        self._require_initialized()
        with self._lock:
            messages = self._messages.get(agent_id, [])[:limit]
            self._messages[agent_id] = self._messages.get(agent_id, [])[limit:]
            return messages

    def broadcast(self, sender: str, content: str, message_type: str = "broadcast") -> int:
        """Broadcast a message to all agents."""
        self._require_initialized()
        with self._lock:
            receivers = list(self._messages.keys())
            count = 0
            for receiver in receivers:
                if receiver != sender:
                    message = AgentMessage(
                        sender=sender,
                        receiver=receiver,
                        content=content,
                        message_type=message_type,
                    )
                    self._messages[receiver].append(message)
                    self._message_count += 1
                    count += 1
            return count

    def has_messages(self, agent_id: str) -> bool:
        """Check if an agent has pending messages."""
        self._require_initialized()
        with self._lock:
            return len(self._messages.get(agent_id, [])) > 0

    def clear(self, agent_id: str | None = None) -> None:
        """Clear messages for an agent or all agents."""
        self._require_initialized()
        with self._lock:
            if agent_id:
                self._messages[agent_id].clear()
            else:
                self._messages.clear()
            self.logger.info("Cleared messages for %s", agent_id or "all agents")

    def validate(self) -> MultiAgentValidationResult:
        """Validate message bus state."""
        result = MultiAgentValidationResult()
        with self._lock:
            if self._message_count == 0:
                result.warnings.append("No messages have been exchanged")
        return result

    def reload(self) -> MessageBus:
        """Reload message bus."""
        self.logger.info("Reloading MessageBus")
        with self._lock:
            self._messages.clear()
            self._message_count = 0
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise MultiAgentError("MessageBus has not been initialized")
