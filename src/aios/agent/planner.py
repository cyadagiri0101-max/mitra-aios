"""Planner for multi-step agent reasoning."""

from __future__ import annotations

import threading

from aios.agent.models import AgentStep, AgentValidationResult, StepType
from aios.core.logger import get_logger


class Planner:
    def __init__(self, max_steps: int = 20) -> None:
        self.logger = get_logger("aios.agent.planner")
        self._max_steps = max_steps
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def max_steps(self) -> int:
        return self._max_steps

    def initialize(self) -> Planner:
        self._initialized = True
        self.logger.info("Planner initialized (max_steps=%d)", self._max_steps)
        return self

    def plan(self, goal: str) -> list[AgentStep]:
        self._require_initialized()
        steps: list[AgentStep] = []
        steps.append(AgentStep(step_type=StepType.THINK, content=f"Analyzing goal: {goal}"))
        steps.append(AgentStep(step_type=StepType.PLAN, content=f"Breaking down: {goal}"))
        return steps

    def next_step(self, goal: str, completed: list[AgentStep]) -> AgentStep | None:
        self._require_initialized()
        if len(completed) >= self._max_steps:
            return None
        return AgentStep(step_type=StepType.THINK, content=f"Step {len(completed) + 1} for: {goal}")

    def validate(self) -> AgentValidationResult:
        result = AgentValidationResult()
        if self._max_steps <= 0:
            result.errors.append("max_steps must be positive")
            result.is_valid = False
        return result

    def reload(self) -> Planner:
        self.logger.info("Reloading Planner")
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            from aios.core.exceptions import AgentLayerError
            raise AgentLayerError("Planner has not been initialized")
