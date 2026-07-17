"""Agent — autonomous reasoning entity."""

from __future__ import annotations

import threading

from aios.agent.context_manager import ContextManager
from aios.agent.conversation import ConversationManager
from aios.agent.executor import Executor
from aios.agent.memory_coordinator import MemoryCoordinator
from aios.agent.models import (
    AgentConfig,
    AgentResult,
    AgentStatistics,
    AgentStatus,
    AgentStep,
    AgentValidationResult,
)
from aios.agent.planner import Planner
from aios.agent.reflection import ReflectionEngine
from aios.agent.session import AgentSession
from aios.agent.tool_coordinator import ToolCoordinator
from aios.core.logger import get_logger


class Agent:
    def __init__(self, config: AgentConfig | None = None) -> None:
        self.logger = get_logger("aios.agent.agent")
        self._config = config or AgentConfig(name="default")
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._status: AgentStatus = AgentStatus.IDLE
        self._executions: int = 0
        self._successes: int = 0
        self._failures: int = 0
        self._total_steps: int = 0

        self._planner = Planner(max_steps=self._config.max_steps)
        self._executor = Executor()
        self._reflection = ReflectionEngine()
        self._memory = MemoryCoordinator()
        self._tools = ToolCoordinator()
        self._conversation = ConversationManager()
        self._context = ContextManager()

    @property
    def name(self) -> str:
        return self._config.name

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def status(self) -> AgentStatus:
        return self._status

    @property
    def statistics(self) -> AgentStatistics:
        with self._lock:
            avg = self._total_steps / self._executions if self._executions > 0 else 0.0
            return AgentStatistics(
                executions=self._executions,
                successes=self._successes,
                failures=self._failures,
                total_steps=self._total_steps,
                average_steps=round(avg, 2),
            )

    def initialize(self) -> Agent:
        self._planner.initialize()
        self._executor.initialize()
        self._reflection.initialize()
        self._memory.initialize()
        self._tools.initialize()
        self._conversation.initialize()
        self._context.initialize()
        self._initialized = True
        self.logger.info("Agent '%s' initialized", self._config.name)
        return self

    def run(self, goal: str, session: AgentSession | None = None) -> AgentResult:
        self._require_initialized()
        sess = session or AgentSession(agent_name=self._config.name)
        sess.set_status(AgentStatus.RUNNING)
        self._status = AgentStatus.RUNNING

        steps: list[AgentStep] = []
        try:
            plan = self._planner.plan(goal)
            steps.extend(plan)
            for step in plan:
                executed = self._executor.execute_step(step)
                steps.append(executed)
                sess.add_step(executed)

            if self._reflection.should_continue(steps, goal):
                reflection = self._reflection.reflect(steps, goal)
                steps.append(reflection)
                sess.add_step(reflection)

            output = f"Completed: {goal}"
            sess.add_message("assistant", output)
            sess.set_status(AgentStatus.COMPLETED)
            self._status = AgentStatus.COMPLETED

            with self._lock:
                self._executions += 1
                self._successes += 1
                self._total_steps += len(steps)

            return AgentResult(
                output=output,
                status=AgentStatus.COMPLETED,
                steps=tuple(steps),
            )
        except Exception as e:
            self._status = AgentStatus.FAILED
            sess.set_status(AgentStatus.FAILED)
            with self._lock:
                self._executions += 1
                self._failures += 1
                self._total_steps += len(steps)
            return AgentResult(
                output="",
                status=AgentStatus.FAILED,
                steps=tuple(steps),
                error=str(e),
            )

    def chat(self, message: str) -> str:
        self._require_initialized()
        self._conversation.add_message("user", message)
        result = self.run(message)
        return result.output

    def validate(self) -> AgentValidationResult:
        result = AgentValidationResult()
        if not self._config.name:
            result.errors.append("Agent name is required")
            result.is_valid = False
        for component in [self._planner, self._executor, self._reflection, self._memory, self._tools, self._conversation, self._context]:
            sub = component.validate()
            result.warnings.extend(sub.warnings)
            result.errors.extend(sub.errors)
            if not sub.is_valid:
                result.is_valid = False
        return result

    def reload(self) -> Agent:
        self.logger.info("Reloading Agent '%s'", self._config.name)
        self._planner.reload()
        self._executor.reload()
        self._reflection.reload()
        self._memory.reload()
        self._tools.reload()
        self._conversation.reload()
        self._context.reload()
        with self._lock:
            self._executions = 0
            self._successes = 0
            self._failures = 0
            self._total_steps = 0
        return self

    def shutdown(self) -> None:
        self.logger.info("Shutting down Agent '%s'", self._config.name)
        self._status = AgentStatus.IDLE
        self._initialized = False

    def _require_initialized(self) -> None:
        if not self._initialized:
            from aios.core.exceptions import AgentLayerError
            raise AgentLayerError(f"Agent '{self._config.name}' has not been initialized", agent_name=self._config.name)
