"""Data models for multi-agent framework."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class AgentRole(StrEnum):
    WORKER = "worker"
    SUPERVISOR = "supervisor"
    CRITIC = "critic"
    PLANNER = "planner"
    RESEARCHER = "researcher"
    EXECUTOR = "executor"
    COORDINATOR = "coordinator"


class ConsensusMethod(StrEnum):
    MAJORITY = "majority"
    UNANIMOUS = "unanimous"
    WEIGHTED = "weighted"
    ARBITRATION = "arbitration"


class TaskStatus(StrEnum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass(frozen=True, slots=True)
class Task:
    id: str = ""
    description: str = ""
    assigned_to: str = ""
    status: TaskStatus = TaskStatus.PENDING
    priority: int = 0
    dependencies: tuple[str, ...] = ()
    result: str = ""
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class Vote:
    agent_id: str = ""
    decision: str = ""
    confidence: float = 0.0
    reasoning: str = ""


@dataclass(frozen=True, slots=True)
class ConsensusResult:
    decision: str = ""
    method: ConsensusMethod = ConsensusMethod.MAJORITY
    votes: tuple[Vote, ...] = ()
    confidence: float = 0.0
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class SharedMemory:
    key: str = ""
    value: str = ""
    created_by: str = ""
    timestamp: float = 0.0
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class AgentMessage:
    sender: str = ""
    receiver: str = ""
    content: str = ""
    message_type: str = "info"
    metadata: dict = field(default_factory=dict)


@dataclass(slots=True)
class MultiAgentStatistics:
    total_agents: int = 0
    active_agents: int = 0
    tasks_completed: int = 0
    tasks_failed: int = 0
    consensus_reached: int = 0
    messages_exchanged: int = 0


@dataclass(slots=True)
class MultiAgentValidationResult:
    is_valid: bool = True
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
