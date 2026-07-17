"""Data models for agent layer."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class AgentStatus(StrEnum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StepType(StrEnum):
    THINK = "think"
    ACT = "act"
    OBSERVE = "observe"
    REFLECT = "reflect"
    PLAN = "plan"


@dataclass(frozen=True, slots=True)
class AgentStep:
    step_type: StepType = StepType.THINK
    content: str = ""
    tool_name: str = ""
    tool_args: dict = field(default_factory=dict)
    tool_result: str = ""
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class AgentConfig:
    name: str = ""
    model: str = ""
    max_steps: int = 20
    temperature: float = 0.7
    system_prompt: str = ""
    tools: tuple[str, ...] = ()
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class ConversationMessage:
    role: str = "user"
    content: str = ""
    name: str = ""
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class AgentResult:
    output: str = ""
    status: AgentStatus = AgentStatus.COMPLETED
    steps: tuple[AgentStep, ...] = ()
    error: str = ""
    metadata: dict = field(default_factory=dict)


@dataclass(slots=True)
class AgentStatistics:
    executions: int = 0
    successes: int = 0
    failures: int = 0
    total_steps: int = 0
    average_steps: float = 0.0


@dataclass(slots=True)
class AgentValidationResult:
    is_valid: bool = True
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
