"""Base agent for multi-agent framework."""

from __future__ import annotations

import threading

from aios.core.exceptions import MultiAgentError
from aios.core.logger import get_logger
from aios.multiagent.consensus import ConsensusEngine
from aios.multiagent.message_bus import MessageBus
from aios.multiagent.models import (
    AgentMessage,
    AgentRole,
    MultiAgentStatistics,
    MultiAgentValidationResult,
    SharedMemory,
    Task,
    Vote,
)
from aios.multiagent.shared_memory import SharedMemoryStore
from aios.multiagent.task_manager import TaskManager


class MultiAgent:
    """Base agent for multi-agent coordination."""

    def __init__(self, agent_id: str, role: AgentRole = AgentRole.WORKER) -> None:
        self.logger = get_logger(f"aios.multiagent.agent.{agent_id}")
        self._agent_id = agent_id
        self._role = role
        self._lock = threading.Lock()
        self._initialized: bool = False
        self._tasks_completed: int = 0
        self._tasks_failed: int = 0

        # Shared components (set by coordinator)
        self._message_bus: MessageBus | None = None
        self._shared_memory: SharedMemoryStore | None = None
        self._task_manager: TaskManager | None = None
        self._consensus_engine: ConsensusEngine | None = None

    @property
    def agent_id(self) -> str:
        return self._agent_id

    @property
    def role(self) -> AgentRole:
        return self._role

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def statistics(self) -> MultiAgentStatistics:
        with self._lock:
            return MultiAgentStatistics(
                total_agents=1,
                active_agents=1 if self._initialized else 0,
                tasks_completed=self._tasks_completed,
                tasks_failed=self._tasks_failed,
            )

    def initialize(
        self,
        message_bus: MessageBus,
        shared_memory: SharedMemoryStore,
        task_manager: TaskManager,
        consensus_engine: ConsensusEngine,
    ) -> MultiAgent:
        """Initialize agent with shared components."""
        self._message_bus = message_bus
        self._shared_memory = shared_memory
        self._task_manager = task_manager
        self._consensus_engine = consensus_engine
        self._initialized = True
        self.logger.info("Agent '%s' initialized with role %s", self._agent_id, self._role.value)
        return self

    def execute_task(self, task: Task) -> str:
        """Execute a task and return the result."""
        self._require_initialized()
        self.logger.info("Agent '%s' executing task '%s'", self._agent_id, task.id)

        try:
            # Simulate task execution
            result = f"Task '{task.description}' completed by {self._agent_id}"
            with self._lock:
                self._tasks_completed += 1
            return result
        except Exception as e:
            with self._lock:
                self._tasks_failed += 1
            raise MultiAgentError(f"Task execution failed: {e}", agent_id=self._agent_id) from e

    def send_message(self, receiver: str, content: str, message_type: str = "info") -> None:
        """Send a message to another agent."""
        self._require_initialized()
        if not self._message_bus:
            raise MultiAgentError("Message bus not initialized", agent_id=self._agent_id)

        message = AgentMessage(
            sender=self._agent_id,
            receiver=receiver,
            content=content,
            message_type=message_type,
        )
        self._message_bus.send(message)

    def receive_messages(self, limit: int = 10) -> list[AgentMessage]:
        """Receive messages for this agent."""
        self._require_initialized()
        if not self._message_bus:
            raise MultiAgentError("Message bus not initialized", agent_id=self._agent_id)
        return self._message_bus.receive(self._agent_id, limit)

    def store_memory(self, key: str, value: str, metadata: dict | None = None) -> SharedMemory:
        """Store a value in shared memory."""
        self._require_initialized()
        if not self._shared_memory:
            raise MultiAgentError("Shared memory not initialized", agent_id=self._agent_id)
        return self._shared_memory.store(key, value, self._agent_id, metadata)

    def retrieve_memory(self, key: str) -> SharedMemory | None:
        """Retrieve a value from shared memory."""
        self._require_initialized()
        if not self._shared_memory:
            raise MultiAgentError("Shared memory not initialized", agent_id=self._agent_id)
        return self._shared_memory.retrieve(key)

    def submit_vote(self, topic: str, decision: str, confidence: float = 1.0, reasoning: str = "") -> None:
        """Submit a vote on a topic."""
        self._require_initialized()
        if not self._consensus_engine:
            raise MultiAgentError("Consensus engine not initialized", agent_id=self._agent_id)

        vote = Vote(
            agent_id=self._agent_id,
            decision=decision,
            confidence=confidence,
            reasoning=reasoning,
        )
        self._consensus_engine.submit_vote(topic, vote)

    def validate(self) -> MultiAgentValidationResult:
        """Validate agent state."""
        result = MultiAgentValidationResult()
        if not self._initialized:
            result.warnings.append(f"Agent '{self._agent_id}' not initialized")
        if not self._message_bus:
            result.errors.append("Message bus not set")
            result.is_valid = False
        if not self._shared_memory:
            result.errors.append("Shared memory not set")
            result.is_valid = False
        if not self._task_manager:
            result.errors.append("Task manager not set")
            result.is_valid = False
        if not self._consensus_engine:
            result.errors.append("Consensus engine not set")
            result.is_valid = False
        return result

    def shutdown(self) -> None:
        """Shutdown the agent."""
        self.logger.info("Shutting down agent '%s'", self._agent_id)
        self._initialized = False

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise MultiAgentError(f"Agent '{self._agent_id}' has not been initialized", agent_id=self._agent_id)
