"""Agent registry with agent management."""

from __future__ import annotations

import threading

from aios.agent.agent import Agent
from aios.agent.models import AgentValidationResult
from aios.core.exceptions import AgentLayerError
from aios.core.logger import get_logger


class AgentRegistry:
    def __init__(self) -> None:
        self.logger = get_logger("aios.agent.registry")
        self._agents: dict[str, Agent] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> AgentRegistry:
        self._initialized = True
        self.logger.info("AgentRegistry initialized")
        return self

    def register(self, agent: Agent) -> None:
        self._require_initialized()
        with self._lock:
            if agent.name in self._agents:
                raise AgentLayerError(f"Agent '{agent.name}' already registered", agent_name=agent.name)
            self._agents[agent.name] = agent
            self.logger.info("Registered agent '%s'", agent.name)

    def unregister(self, name: str) -> bool:
        self._require_initialized()
        with self._lock:
            if name not in self._agents:
                return False
            del self._agents[name]
            self.logger.info("Unregistered agent '%s'", name)
            return True

    def get(self, name: str) -> Agent | None:
        self._require_initialized()
        with self._lock:
            return self._agents.get(name)

    def list(self) -> list[str]:
        self._require_initialized()
        with self._lock:
            return list(self._agents.keys())

    def validate(self) -> AgentValidationResult:
        result = AgentValidationResult()
        with self._lock:
            if not self._agents:
                result.warnings.append("No agents registered")
            for name, agent in self._agents.items():
                if not agent.is_initialized:
                    result.warnings.append(f"Agent '{name}' not initialized")
        return result

    def reload(self) -> AgentRegistry:
        self.logger.info("Reloading AgentRegistry")
        with self._lock:
            self._agents.clear()
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise AgentLayerError("AgentRegistry has not been initialized")
