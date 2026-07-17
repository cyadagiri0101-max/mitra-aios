"""Agent Manager — unified facade over all agent subsystems."""

from __future__ import annotations

import threading

from aios.agent.agent import Agent
from aios.agent.agent_registry import AgentRegistry
from aios.agent.models import (
    AgentConfig,
    AgentResult,
    AgentStatistics,
    AgentValidationResult,
)
from aios.core.exceptions import AgentLayerError
from aios.core.logger import get_logger


class AgentManager:
    def __init__(self) -> None:
        self.logger = get_logger("aios.agent.manager")
        self._lock = threading.Lock()
        self._initialized: bool = False

        self._registry = AgentRegistry()

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def registry(self) -> AgentRegistry:
        return self._registry

    def initialize(self) -> AgentManager:
        with self._lock:
            if self._initialized:
                return self
            self._registry.initialize()
            self._initialized = True
            self.logger.info("AgentManager initialized")
        return self

    def create_agent(self, config: AgentConfig | None = None) -> Agent:
        self._require_initialized()
        agent = Agent(config)
        agent.initialize()
        self._registry.register(agent)
        return agent

    def get_agent(self, name: str) -> Agent | None:
        self._require_initialized()
        return self._registry.get(name)

    def run_agent(self, name: str, goal: str) -> AgentResult:
        self._require_initialized()
        agent = self._registry.get(name)
        if agent is None:
            raise AgentLayerError(f"Agent '{name}' not found", agent_name=name)
        return agent.run(goal)

    def chat(self, name: str, message: str) -> str:
        self._require_initialized()
        agent = self._registry.get(name)
        if agent is None:
            raise AgentLayerError(f"Agent '{name}' not found", agent_name=name)
        return agent.chat(message)

    def list_agents(self) -> list[str]:
        self._require_initialized()
        return self._registry.list()

    def remove_agent(self, name: str) -> bool:
        self._require_initialized()
        return self._registry.unregister(name)

    def statistics(self) -> dict[str, AgentStatistics]:
        self._require_initialized()
        result: dict[str, AgentStatistics] = {}
        for name in self._registry.list():
            agent = self._registry.get(name)
            if agent is not None:
                result[name] = agent.statistics
        return result

    def validate(self) -> AgentValidationResult:
        result = AgentValidationResult()
        reg_result = self._registry.validate()
        result.warnings.extend(reg_result.warnings)
        result.errors.extend(reg_result.errors)
        if not reg_result.is_valid:
            result.is_valid = False
        return result

    def reload(self) -> AgentManager:
        self.logger.info("Reloading AgentManager")
        with self._lock:
            self._registry.reload()
            self._initialized = False
        return self

    def shutdown(self) -> None:
        self.logger.info("Shutting down AgentManager")
        with self._lock:
            for name in self._registry.list():
                agent = self._registry.get(name)
                if agent is not None:
                    try:
                        agent.shutdown()
                    except Exception:
                        self.logger.exception("Error shutting down agent '%s'", name)
            self._initialized = False

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise AgentLayerError("AgentManager has not been initialized")
