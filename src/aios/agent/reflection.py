"""Reflection engine for agent self-correction."""

from __future__ import annotations

import threading

from aios.agent.models import AgentStep, AgentValidationResult, StepType
from aios.core.logger import get_logger


class ReflectionEngine:
    def __init__(self) -> None:
        self.logger = get_logger("aios.agent.reflection")
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._reflections: int = 0

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> ReflectionEngine:
        self._initialized = True
        self.logger.info("ReflectionEngine initialized")
        return self

    def reflect(self, steps: list[AgentStep], goal: str) -> AgentStep:
        self._require_initialized()
        with self._lock:
            self._reflections += 1
        return AgentStep(
            step_type=StepType.REFLECT,
            content=f"Reflected on {len(steps)} steps toward: {goal}",
        )

    def should_continue(self, steps: list[AgentStep], goal: str) -> bool:
        self._require_initialized()
        return len(steps) < 20

    @property
    def reflection_count(self) -> int:
        with self._lock:
            return self._reflections

    def validate(self) -> AgentValidationResult:
        return AgentValidationResult()

    def reload(self) -> ReflectionEngine:
        with self._lock:
            self._reflections = 0
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            from aios.core.exceptions import AgentLayerError
            raise AgentLayerError("ReflectionEngine has not been initialized")
