"""Agent session management."""

from __future__ import annotations

import threading
import time

from aios.agent.models import AgentResult, AgentStatus, AgentStep, ConversationMessage
from aios.core.logger import get_logger


class AgentSession:
    def __init__(self, session_id: str = "", agent_name: str = "") -> None:
        self.logger = get_logger("aios.agent.session")
        self._session_id = session_id or f"session-{int(time.time() * 1000)}"
        self._agent_name = agent_name
        self._messages: list[ConversationMessage] = []
        self._steps: list[AgentStep] = []
        self._status: AgentStatus = AgentStatus.IDLE
        self._lock = threading.Lock()
        self._created_at: float = time.time()
        self._last_activity: float = time.time()

    @property
    def session_id(self) -> str:
        return self._session_id

    @property
    def agent_name(self) -> str:
        return self._agent_name

    @property
    def status(self) -> AgentStatus:
        return self._status

    @property
    def messages(self) -> list[ConversationMessage]:
        with self._lock:
            return list(self._messages)

    @property
    def steps(self) -> list[AgentStep]:
        with self._lock:
            return list(self._steps)

    def add_message(self, role: str, content: str) -> None:
        with self._lock:
            self._messages.append(ConversationMessage(role=role, content=content))
            self._last_activity = time.time()

    def add_step(self, step: AgentStep) -> None:
        with self._lock:
            self._steps.append(step)
            self._last_activity = time.time()

    def set_status(self, status: AgentStatus) -> None:
        with self._lock:
            self._status = status
            self._last_activity = time.time()

    def clear(self) -> None:
        with self._lock:
            self._messages.clear()
            self._steps.clear()
            self._status = AgentStatus.IDLE

    def to_result(self) -> AgentResult:
        with self._lock:
            output = self._messages[-1].content if self._messages else ""
            return AgentResult(
                output=output,
                status=self._status,
                steps=tuple(self._steps),
            )
