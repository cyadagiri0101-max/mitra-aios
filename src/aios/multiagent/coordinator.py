"""Coordinator for multi-agent orchestration."""

from __future__ import annotations

import threading
from typing import Any

from aios.core.exceptions import MultiAgentError
from aios.core.logger import get_logger
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
from aios.multiagent.message_bus import MessageBus
from aios.multiagent.models import (
    AgentRole,
    ConsensusMethod,
    ConsensusResult,
    MultiAgentStatistics,
    MultiAgentValidationResult,
    Task,
    TaskStatus,
)
from aios.multiagent.shared_memory import SharedMemoryStore
from aios.multiagent.task_manager import TaskManager


class Coordinator:
    """Coordinator for multi-agent orchestration."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.multiagent.coordinator")
        self._agents: dict[str, MultiAgent] = {}
        self._message_bus = MessageBus()
        self._shared_memory = SharedMemoryStore()
        self._task_manager = TaskManager()
        self._consensus_engine = ConsensusEngine()
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def message_bus(self) -> MessageBus:
        return self._message_bus

    @property
    def shared_memory(self) -> SharedMemoryStore:
        return self._shared_memory

    @property
    def task_manager(self) -> TaskManager:
        return self._task_manager

    @property
    def consensus_engine(self) -> ConsensusEngine:
        return self._consensus_engine

    def initialize(self) -> Coordinator:
        """Initialize the coordinator and all shared components."""
        with self._lock:
            if self._initialized:
                return self
            self._message_bus.initialize()
            self._shared_memory.initialize()
            self._task_manager.initialize()
            self._consensus_engine.initialize()
            self._initialized = True
            self.logger.info("Coordinator initialized")
        return self

    def register_agent(self, agent: MultiAgent) -> None:
        """Register an agent with the coordinator."""
        self._require_initialized()
        with self._lock:
            if agent.agent_id in self._agents:
                raise MultiAgentError(f"Agent '{agent.agent_id}' already registered", agent_id=agent.agent_id)
            agent.initialize(
                message_bus=self._message_bus,
                shared_memory=self._shared_memory,
                task_manager=self._task_manager,
                consensus_engine=self._consensus_engine,
            )
            self._agents[agent.agent_id] = agent
            self._message_bus.register_agent(agent.agent_id)
            self.logger.info("Registered agent '%s' with role %s", agent.agent_id, agent.role.value)

    def unregister_agent(self, agent_id: str) -> bool:
        """Unregister an agent."""
        self._require_initialized()
        with self._lock:
            if agent_id not in self._agents:
                return False
            agent = self._agents[agent_id]
            agent.shutdown()
            del self._agents[agent_id]
            self.logger.info("Unregistered agent '%s'", agent_id)
            return True

    def get_agent(self, agent_id: str) -> MultiAgent | None:
        """Get an agent by ID."""
        self._require_initialized()
        with self._lock:
            return self._agents.get(agent_id)

    def list_agents(self, role: AgentRole | None = None) -> list[str]:
        """List all agent IDs, optionally filtered by role."""
        self._require_initialized()
        with self._lock:
            agents = list(self._agents.values())
            if role:
                agents = [a for a in agents if a.role == role]
            return [a.agent_id for a in agents]

    def create_worker(self, agent_id: str) -> WorkerAgent:
        """Create and register a worker agent."""
        self._require_initialized()
        worker = WorkerAgent(agent_id)
        self.register_agent(worker)
        return worker

    def create_supervisor(self, agent_id: str) -> SupervisorAgent:
        """Create and register a supervisor agent."""
        self._require_initialized()
        supervisor = SupervisorAgent(agent_id)
        self.register_agent(supervisor)
        return supervisor

    def create_critic(self, agent_id: str) -> CriticAgent:
        """Create and register a critic agent."""
        self._require_initialized()
        critic = CriticAgent(agent_id)
        self.register_agent(critic)
        return critic

    def create_planner(self, agent_id: str) -> PlannerAgent:
        """Create and register a planner agent."""
        self._require_initialized()
        planner = PlannerAgent(agent_id)
        self.register_agent(planner)
        return planner

    def create_researcher(self, agent_id: str) -> ResearchAgent:
        """Create and register a research agent."""
        self._require_initialized()
        researcher = ResearchAgent(agent_id)
        self.register_agent(researcher)
        return researcher

    def create_executor(self, agent_id: str) -> ExecutionAgent:
        """Create and register an execution agent."""
        self._require_initialized()
        executor = ExecutionAgent(agent_id)
        self.register_agent(executor)
        return executor

    def delegate_task(self, task_description: str, agent_id: str, priority: int = 0) -> Task:
        """Create and delegate a task to an agent."""
        self._require_initialized()
        agent = self.get_agent(agent_id)
        if not agent:
            raise MultiAgentError(f"Agent '{agent_id}' not found", agent_id=agent_id)

        task = self._task_manager.create_task(
            description=task_description,
            assigned_to=agent_id,
            priority=priority,
        )
        self._task_manager.assign_task(task.id, agent_id)
        self._task_manager.update_status(task.id, TaskStatus.IN_PROGRESS)

        try:
            result = agent.execute_task(task)
            self._task_manager.update_status(task.id, TaskStatus.COMPLETED, result)
        except Exception as e:
            self._task_manager.update_status(task.id, TaskStatus.FAILED, str(e))
            raise

        # Return the updated task
        updated_task = self._task_manager.get_task(task.id)
        return updated_task if updated_task else task

    def reach_consensus(
        self,
        topic: str,
        method: ConsensusMethod = ConsensusMethod.MAJORITY,
    ) -> ConsensusResult:
        """Reach consensus among all agents."""
        self._require_initialized()
        return self._consensus_engine.reach_consensus(topic, method)

    def broadcast_message(self, sender: str, content: str) -> int:
        """Broadcast a message to all agents."""
        self._require_initialized()
        return self._message_bus.broadcast(sender, content)

    def statistics(self) -> MultiAgentStatistics:
        """Get overall multi-agent statistics."""
        self._require_initialized()
        with self._lock:
            total_agents = len(self._agents)
            active_agents = sum(1 for a in self._agents.values() if a.is_initialized)
            tasks_completed = self._task_manager.count(TaskStatus.COMPLETED)
            tasks_failed = self._task_manager.count(TaskStatus.FAILED)
            consensus_reached = self._consensus_engine.consensus_count
            messages_exchanged = self._message_bus.message_count

            return MultiAgentStatistics(
                total_agents=total_agents,
                active_agents=active_agents,
                tasks_completed=tasks_completed,
                tasks_failed=tasks_failed,
                consensus_reached=consensus_reached,
                messages_exchanged=messages_exchanged,
            )

    def validate(self) -> MultiAgentValidationResult:
        """Validate the coordinator and all components."""
        self._require_initialized()
        result = MultiAgentValidationResult()

        # Validate shared components
        components: list[Any] = [self._message_bus, self._shared_memory, self._task_manager, self._consensus_engine]
        for component in components:
            sub_result = component.validate()
            result.warnings.extend(sub_result.warnings)
            result.errors.extend(sub_result.errors)
            if not sub_result.is_valid:
                result.is_valid = False

        # Validate agents
        with self._lock:
            if not self._agents:
                result.warnings.append("No agents registered")
            for agent in self._agents.values():
                agent_result = agent.validate()
                result.warnings.extend(agent_result.warnings)
                result.errors.extend(agent_result.errors)
                if not agent_result.is_valid:
                    result.is_valid = False

        return result

    def reload(self) -> Coordinator:
        """Reload the coordinator."""
        self.logger.info("Reloading Coordinator")
        with self._lock:
            for agent in self._agents.values():
                agent.shutdown()
            self._agents.clear()
            self._message_bus.reload()
            self._shared_memory.reload()
            self._task_manager.reload()
            self._consensus_engine.reload()
            self._initialized = False
        return self

    def shutdown(self) -> None:
        """Shutdown the coordinator and all agents."""
        self.logger.info("Shutting down Coordinator")
        with self._lock:
            for agent in self._agents.values():
                agent.shutdown()
            self._agents.clear()
            self._initialized = False

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise MultiAgentError("Coordinator has not been initialized")
