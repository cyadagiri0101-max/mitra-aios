"""Executor for running agent steps."""

from __future__ import annotations

import threading

from aios.agent.models import AgentStep, AgentValidationResult, StepType
from aios.core.logger import get_logger


class Executor:
    def __init__(self) -> None:
        self.logger = get_logger("aios.agent.executor")
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._executed: int = 0

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def executed_count(self) -> int:
        with self._lock:
            return self._executed

    def initialize(self) -> Executor:
        self._initialized = True
        self.logger.info("Executor initialized")
        return self

    def execute_step(self, step: AgentStep) -> AgentStep:
        self._require_initialized()
        result = step
        if step.step_type == StepType.ACT and step.tool_name:
            result = AgentStep(
                step_type=step.step_type,
                content=step.content,
                tool_name=step.tool_name,
                tool_args=step.tool_args,
                tool_result=f"Executed {step.tool_name}",
                metadata=step.metadata,
            )
        elif step.step_type == StepType.THINK:
            result = AgentStep(
                step_type=step.step_type,
                content=step.content + " [processed]",
                metadata=step.metadata,
            )
        with self._lock:
            self._executed += 1
        return result

    def validate(self) -> AgentValidationResult:
        return AgentValidationResult()

    def reload(self) -> Executor:
        self.logger.info("Reloading Executor")
        with self._lock:
            self._executed = 0
        return self

    def _require_initialized(self) -> None:
        if not self._initialized:
            from aios.core.exceptions import AgentLayerError
            raise AgentLayerError("Executor has not been initialized")
