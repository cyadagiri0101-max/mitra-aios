"""AIOS Multi-Agent Framework — coordination, consensus, and communication."""

from aios.multiagent.agent import MultiAgent
from aios.multiagent.agents import (
    CriticAgent,
    ExecutionAgent,
    PlannerAgent,
    ResearchAgent,
    SupervisorAgent,
    WorkerAgent,
)
from aios.multiagent.consensus import ConsensusEngine
from aios.multiagent.coordinator import Coordinator
from aios.multiagent.message_bus import MessageBus
from aios.multiagent.models import (
    AgentMessage,
    AgentRole,
    ConsensusMethod,
    ConsensusResult,
    MultiAgentStatistics,
    MultiAgentValidationResult,
    SharedMemory,
    Task,
    TaskStatus,
    Vote,
)
from aios.multiagent.shared_memory import SharedMemoryStore
from aios.multiagent.task_manager import TaskManager

__all__ = [
    "AgentMessage",
    "AgentRole",
    "ConsensusEngine",
    "ConsensusMethod",
    "ConsensusResult",
    "Coordinator",
    "CriticAgent",
    "ExecutionAgent",
    "MessageBus",
    "MultiAgent",
    "MultiAgentStatistics",
    "MultiAgentValidationResult",
    "PlannerAgent",
    "ResearchAgent",
    "SharedMemory",
    "SharedMemoryStore",
    "SupervisorAgent",
    "Task",
    "TaskManager",
    "TaskStatus",
    "Vote",
    "WorkerAgent",
]
