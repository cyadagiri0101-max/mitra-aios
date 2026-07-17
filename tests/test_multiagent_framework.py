"""Tests for AIOS Multi-Agent Framework."""

from __future__ import annotations

import threading

import pytest

from aios.core.exceptions import MultiAgentError
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

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class TestModels:
    def test_task_defaults(self):
        task = Task()
        assert task.id == ""
        assert task.description == ""
        assert task.status == TaskStatus.PENDING
        assert task.priority == 0

    def test_task_with_values(self):
        task = Task(
            id="task-1",
            description="Test task",
            assigned_to="agent-1",
            status=TaskStatus.IN_PROGRESS,
            priority=5,
        )
        assert task.id == "task-1"
        assert task.description == "Test task"
        assert task.assigned_to == "agent-1"
        assert task.status == TaskStatus.IN_PROGRESS
        assert task.priority == 5

    def test_vote_defaults(self):
        vote = Vote()
        assert vote.agent_id == ""
        assert vote.decision == ""
        assert vote.confidence == 0.0
        assert vote.reasoning == ""

    def test_vote_with_values(self):
        vote = Vote(
            agent_id="agent-1",
            decision="approve",
            confidence=0.9,
            reasoning="Good solution",
        )
        assert vote.agent_id == "agent-1"
        assert vote.decision == "approve"
        assert vote.confidence == 0.9
        assert vote.reasoning == "Good solution"

    def test_consensus_result_defaults(self):
        result = ConsensusResult()
        assert result.decision == ""
        assert result.method == ConsensusMethod.MAJORITY
        assert result.votes == ()
        assert result.confidence == 0.0

    def test_shared_memory_defaults(self):
        memory = SharedMemory()
        assert memory.key == ""
        assert memory.value == ""
        assert memory.created_by == ""
        assert memory.timestamp == 0.0

    def test_agent_message_defaults(self):
        message = AgentMessage()
        assert message.sender == ""
        assert message.receiver == ""
        assert message.content == ""
        assert message.message_type == "info"

    def test_multi_agent_statistics_defaults(self):
        stats = MultiAgentStatistics()
        assert stats.total_agents == 0
        assert stats.active_agents == 0
        assert stats.tasks_completed == 0
        assert stats.tasks_failed == 0
        assert stats.consensus_reached == 0
        assert stats.messages_exchanged == 0

    def test_multi_agent_validation_result_defaults(self):
        result = MultiAgentValidationResult()
        assert result.is_valid is True
        assert result.warnings == []
        assert result.errors == []

    def test_agent_role_values(self):
        assert AgentRole.WORKER.value == "worker"
        assert AgentRole.SUPERVISOR.value == "supervisor"
        assert AgentRole.CRITIC.value == "critic"
        assert AgentRole.PLANNER.value == "planner"
        assert AgentRole.RESEARCHER.value == "researcher"
        assert AgentRole.EXECUTOR.value == "executor"
        assert AgentRole.COORDINATOR.value == "coordinator"

    def test_consensus_method_values(self):
        assert ConsensusMethod.MAJORITY.value == "majority"
        assert ConsensusMethod.UNANIMOUS.value == "unanimous"
        assert ConsensusMethod.WEIGHTED.value == "weighted"
        assert ConsensusMethod.ARBITRATION.value == "arbitration"

    def test_task_status_values(self):
        assert TaskStatus.PENDING.value == "pending"
        assert TaskStatus.ASSIGNED.value == "assigned"
        assert TaskStatus.IN_PROGRESS.value == "in_progress"
        assert TaskStatus.COMPLETED.value == "completed"
        assert TaskStatus.FAILED.value == "failed"
        assert TaskStatus.CANCELLED.value == "cancelled"


# ---------------------------------------------------------------------------
# SharedMemoryStore
# ---------------------------------------------------------------------------


class TestSharedMemoryStore:
    def test_initialize(self):
        store = SharedMemoryStore()
        assert store.is_initialized is False
        store.initialize()
        assert store.is_initialized is True

    def test_store_and_retrieve(self):
        store = SharedMemoryStore().initialize()
        memory = store.store("key1", "value1", "agent-1")
        assert memory.key == "key1"
        assert memory.value == "value1"
        assert memory.created_by == "agent-1"

        retrieved = store.retrieve("key1")
        assert retrieved is not None
        assert retrieved.value == "value1"

    def test_retrieve_nonexistent(self):
        store = SharedMemoryStore().initialize()
        retrieved = store.retrieve("nonexistent")
        assert retrieved is None

    def test_delete(self):
        store = SharedMemoryStore().initialize()
        store.store("key1", "value1", "agent-1")
        assert store.delete("key1") is True
        assert store.retrieve("key1") is None

    def test_delete_nonexistent(self):
        store = SharedMemoryStore().initialize()
        assert store.delete("nonexistent") is False

    def test_list_keys(self):
        store = SharedMemoryStore().initialize()
        store.store("key1", "value1", "agent-1")
        store.store("key2", "value2", "agent-2")
        keys = store.list_keys()
        assert "key1" in keys
        assert "key2" in keys
        assert len(keys) == 2

    def test_clear(self):
        store = SharedMemoryStore().initialize()
        store.store("key1", "value1", "agent-1")
        store.store("key2", "value2", "agent-2")
        store.clear()
        assert store.count() == 0

    def test_count(self):
        store = SharedMemoryStore().initialize()
        store.store("key1", "value1", "agent-1")
        store.store("key2", "value2", "agent-2")
        assert store.count() == 2

    def test_validate(self):
        store = SharedMemoryStore().initialize()
        result = store.validate()
        assert isinstance(result, MultiAgentValidationResult)

    def test_reload(self):
        store = SharedMemoryStore().initialize()
        store.store("key1", "value1", "agent-1")
        store.reload()
        assert store.count() == 0

    def test_uninitialized_raises(self):
        store = SharedMemoryStore()
        with pytest.raises(MultiAgentError):
            store.store("key1", "value1", "agent-1")


# ---------------------------------------------------------------------------
# MessageBus
# ---------------------------------------------------------------------------


class TestMessageBus:
    def test_initialize(self):
        bus = MessageBus()
        assert bus.is_initialized is False
        bus.initialize()
        assert bus.is_initialized is True

    def test_send_and_receive(self):
        bus = MessageBus().initialize()
        message = AgentMessage(
            sender="agent-1",
            receiver="agent-2",
            content="Hello",
            message_type="info",
        )
        bus.send(message)

        messages = bus.receive("agent-2")
        assert len(messages) == 1
        assert messages[0].content == "Hello"
        assert messages[0].sender == "agent-1"

    def test_receive_empty(self):
        bus = MessageBus().initialize()
        messages = bus.receive("agent-1")
        assert len(messages) == 0

    def test_receive_with_limit(self):
        bus = MessageBus().initialize()
        for i in range(5):
            bus.send(AgentMessage(sender="agent-1", receiver="agent-2", content=f"Message {i}"))

        messages = bus.receive("agent-2", limit=3)
        assert len(messages) == 3

    def test_broadcast(self):
        bus = MessageBus().initialize()
        # Register some receivers
        bus.send(AgentMessage(sender="agent-1", receiver="agent-2", content="init"))
        bus.send(AgentMessage(sender="agent-1", receiver="agent-3", content="init"))

        count = bus.broadcast("agent-1", "Broadcast message")
        assert count == 2  # agent-2 and agent-3

        messages2 = bus.receive("agent-2")
        messages3 = bus.receive("agent-3")
        assert len(messages2) == 2  # init + broadcast
        assert len(messages3) == 2  # init + broadcast

    def test_has_messages(self):
        bus = MessageBus().initialize()
        assert bus.has_messages("agent-1") is False

        bus.send(AgentMessage(sender="agent-2", receiver="agent-1", content="Hello"))
        assert bus.has_messages("agent-1") is True

        bus.receive("agent-1")
        assert bus.has_messages("agent-1") is False

    def test_clear_specific_agent(self):
        bus = MessageBus().initialize()
        bus.send(AgentMessage(sender="agent-1", receiver="agent-2", content="Hello"))
        bus.send(AgentMessage(sender="agent-1", receiver="agent-3", content="Hello"))

        bus.clear("agent-2")
        assert bus.has_messages("agent-2") is False
        assert bus.has_messages("agent-3") is True

    def test_clear_all(self):
        bus = MessageBus().initialize()
        bus.send(AgentMessage(sender="agent-1", receiver="agent-2", content="Hello"))
        bus.send(AgentMessage(sender="agent-1", receiver="agent-3", content="Hello"))

        bus.clear()
        assert bus.has_messages("agent-2") is False
        assert bus.has_messages("agent-3") is False

    def test_message_count(self):
        bus = MessageBus().initialize()
        assert bus.message_count == 0

        bus.send(AgentMessage(sender="agent-1", receiver="agent-2", content="Hello"))
        bus.send(AgentMessage(sender="agent-1", receiver="agent-3", content="Hello"))
        assert bus.message_count == 2

    def test_validate(self):
        bus = MessageBus().initialize()
        result = bus.validate()
        assert isinstance(result, MultiAgentValidationResult)

    def test_reload(self):
        bus = MessageBus().initialize()
        bus.send(AgentMessage(sender="agent-1", receiver="agent-2", content="Hello"))
        bus.reload()
        assert bus.message_count == 0

    def test_uninitialized_raises(self):
        bus = MessageBus()
        with pytest.raises(MultiAgentError):
            bus.send(AgentMessage(sender="agent-1", receiver="agent-2", content="Hello"))


# ---------------------------------------------------------------------------
# ConsensusEngine
# ---------------------------------------------------------------------------


class TestConsensusEngine:
    def test_initialize(self):
        engine = ConsensusEngine()
        assert engine.is_initialized is False
        engine.initialize()
        assert engine.is_initialized is True

    def test_submit_vote(self):
        engine = ConsensusEngine().initialize()
        vote = Vote(agent_id="agent-1", decision="approve", confidence=0.9)
        engine.submit_vote("topic-1", vote)
        # No exception means success

    def test_reach_consensus_majority(self):
        engine = ConsensusEngine().initialize()
        engine.submit_vote("topic-1", Vote(agent_id="agent-1", decision="approve", confidence=0.9))
        engine.submit_vote("topic-1", Vote(agent_id="agent-2", decision="approve", confidence=0.8))
        engine.submit_vote("topic-1", Vote(agent_id="agent-3", decision="reject", confidence=0.7))

        result = engine.reach_consensus("topic-1", ConsensusMethod.MAJORITY)
        assert result.decision == "approve"
        assert result.method == ConsensusMethod.MAJORITY
        assert len(result.votes) == 3
        assert result.confidence > 0.5

    def test_reach_consensus_unanimous(self):
        engine = ConsensusEngine().initialize()
        engine.submit_vote("topic-1", Vote(agent_id="agent-1", decision="approve", confidence=0.9))
        engine.submit_vote("topic-1", Vote(agent_id="agent-2", decision="approve", confidence=0.8))

        result = engine.reach_consensus("topic-1", ConsensusMethod.UNANIMOUS)
        assert result.decision == "approve"
        assert result.method == ConsensusMethod.UNANIMOUS

    def test_reach_consensus_unanimous_fails(self):
        engine = ConsensusEngine().initialize()
        engine.submit_vote("topic-1", Vote(agent_id="agent-1", decision="approve", confidence=0.9))
        engine.submit_vote("topic-1", Vote(agent_id="agent-2", decision="reject", confidence=0.8))

        result = engine.reach_consensus("topic-1", ConsensusMethod.UNANIMOUS)
        assert result.decision == ""
        assert result.confidence == 0.0

    def test_reach_consensus_weighted(self):
        engine = ConsensusEngine().initialize()
        engine.submit_vote("topic-1", Vote(agent_id="agent-1", decision="approve", confidence=0.9))
        engine.submit_vote("topic-1", Vote(agent_id="agent-2", decision="reject", confidence=0.3))

        result = engine.reach_consensus("topic-1", ConsensusMethod.WEIGHTED)
        assert result.decision == "approve"
        assert result.method == ConsensusMethod.WEIGHTED

    def test_reach_consensus_arbitration(self):
        engine = ConsensusEngine().initialize()
        engine.submit_vote("topic-1", Vote(agent_id="agent-1", decision="approve", confidence=0.9))
        engine.submit_vote("topic-1", Vote(agent_id="agent-2", decision="reject", confidence=0.95))

        result = engine.reach_consensus("topic-1", ConsensusMethod.ARBITRATION)
        assert result.decision == "reject"
        assert result.method == ConsensusMethod.ARBITRATION

    def test_reach_consensus_empty(self):
        engine = ConsensusEngine().initialize()
        result = engine.reach_consensus("topic-1", ConsensusMethod.MAJORITY)
        assert result.decision == ""
        assert result.confidence == 0.0

    def test_clear_votes_specific_topic(self):
        engine = ConsensusEngine().initialize()
        engine.submit_vote("topic-1", Vote(agent_id="agent-1", decision="approve"))
        engine.submit_vote("topic-2", Vote(agent_id="agent-1", decision="approve"))

        engine.clear_votes("topic-1")
        result1 = engine.reach_consensus("topic-1")
        result2 = engine.reach_consensus("topic-2")

        assert result1.decision == ""
        assert result2.decision == "approve"

    def test_clear_votes_all(self):
        engine = ConsensusEngine().initialize()
        engine.submit_vote("topic-1", Vote(agent_id="agent-1", decision="approve"))
        engine.submit_vote("topic-2", Vote(agent_id="agent-1", decision="approve"))

        engine.clear_votes()
        result1 = engine.reach_consensus("topic-1")
        result2 = engine.reach_consensus("topic-2")

        assert result1.decision == ""
        assert result2.decision == ""

    def test_consensus_count(self):
        engine = ConsensusEngine().initialize()
        assert engine.consensus_count == 0

        engine.submit_vote("topic-1", Vote(agent_id="agent-1", decision="approve"))
        engine.reach_consensus("topic-1")
        assert engine.consensus_count == 1

    def test_validate(self):
        engine = ConsensusEngine().initialize()
        result = engine.validate()
        assert isinstance(result, MultiAgentValidationResult)

    def test_reload(self):
        engine = ConsensusEngine().initialize()
        engine.submit_vote("topic-1", Vote(agent_id="agent-1", decision="approve"))
        engine.reach_consensus("topic-1")
        engine.reload()
        assert engine.consensus_count == 0

    def test_uninitialized_raises(self):
        engine = ConsensusEngine()
        with pytest.raises(MultiAgentError):
            engine.submit_vote("topic-1", Vote(agent_id="agent-1", decision="approve"))


# ---------------------------------------------------------------------------
# TaskManager
# ---------------------------------------------------------------------------


class TestTaskManager:
    def test_initialize(self):
        manager = TaskManager()
        assert manager.is_initialized is False
        manager.initialize()
        assert manager.is_initialized is True

    def test_create_task(self):
        manager = TaskManager().initialize()
        task = manager.create_task("Test task", "agent-1", priority=5)
        assert task.id != ""
        assert task.description == "Test task"
        assert task.assigned_to == "agent-1"
        assert task.priority == 5
        assert task.status == TaskStatus.ASSIGNED

    def test_create_task_without_assignment(self):
        manager = TaskManager().initialize()
        task = manager.create_task("Test task")
        assert task.assigned_to == ""
        assert task.status == TaskStatus.PENDING

    def test_get_task(self):
        manager = TaskManager().initialize()
        task = manager.create_task("Test task")
        retrieved = manager.get_task(task.id)
        assert retrieved is not None
        assert retrieved.id == task.id

    def test_get_nonexistent_task(self):
        manager = TaskManager().initialize()
        retrieved = manager.get_task("nonexistent")
        assert retrieved is None

    def test_assign_task(self):
        manager = TaskManager().initialize()
        task = manager.create_task("Test task")
        assert manager.assign_task(task.id, "agent-1") is True

        retrieved = manager.get_task(task.id)
        assert retrieved.assigned_to == "agent-1"
        assert retrieved.status == TaskStatus.ASSIGNED

    def test_assign_nonexistent_task(self):
        manager = TaskManager().initialize()
        assert manager.assign_task("nonexistent", "agent-1") is False

    def test_update_status(self):
        manager = TaskManager().initialize()
        task = manager.create_task("Test task", "agent-1")
        assert manager.update_status(task.id, TaskStatus.COMPLETED, "Done") is True

        retrieved = manager.get_task(task.id)
        assert retrieved.status == TaskStatus.COMPLETED
        assert retrieved.result == "Done"

    def test_update_nonexistent_task(self):
        manager = TaskManager().initialize()
        assert manager.update_status("nonexistent", TaskStatus.COMPLETED) is False

    def test_list_tasks_all(self):
        manager = TaskManager().initialize()
        manager.create_task("Task 1")
        manager.create_task("Task 2")
        tasks = manager.list_tasks()
        assert len(tasks) == 2

    def test_list_tasks_by_status(self):
        manager = TaskManager().initialize()
        task1 = manager.create_task("Task 1", "agent-1")
        manager.create_task("Task 2", "agent-1")
        manager.update_status(task1.id, TaskStatus.COMPLETED)

        completed = manager.list_tasks(TaskStatus.COMPLETED)
        pending = manager.list_tasks(TaskStatus.ASSIGNED)

        assert len(completed) == 1
        assert len(pending) == 1

    def test_delete_task(self):
        manager = TaskManager().initialize()
        task = manager.create_task("Test task")
        assert manager.delete_task(task.id) is True
        assert manager.get_task(task.id) is None

    def test_delete_nonexistent_task(self):
        manager = TaskManager().initialize()
        assert manager.delete_task("nonexistent") is False

    def test_count_all(self):
        manager = TaskManager().initialize()
        manager.create_task("Task 1")
        manager.create_task("Task 2")
        assert manager.count() == 2

    def test_count_by_status(self):
        manager = TaskManager().initialize()
        task1 = manager.create_task("Task 1", "agent-1")
        manager.create_task("Task 2", "agent-1")
        manager.update_status(task1.id, TaskStatus.COMPLETED)

        assert manager.count(TaskStatus.COMPLETED) == 1
        assert manager.count(TaskStatus.ASSIGNED) == 1

    def test_validate(self):
        manager = TaskManager().initialize()
        result = manager.validate()
        assert isinstance(result, MultiAgentValidationResult)

    def test_reload(self):
        manager = TaskManager().initialize()
        manager.create_task("Task 1")
        manager.reload()
        assert manager.count() == 0

    def test_uninitialized_raises(self):
        manager = TaskManager()
        with pytest.raises(MultiAgentError):
            manager.create_task("Test task")


# ---------------------------------------------------------------------------
# MultiAgent (Base)
# ---------------------------------------------------------------------------


class TestMultiAgent:
    def test_initialize(self):
        agent = MultiAgent("agent-1", AgentRole.WORKER)
        assert agent.agent_id == "agent-1"
        assert agent.role == AgentRole.WORKER
        assert agent.is_initialized is False

        message_bus = MessageBus().initialize()
        shared_memory = SharedMemoryStore().initialize()
        task_manager = TaskManager().initialize()
        consensus_engine = ConsensusEngine().initialize()

        agent.initialize(message_bus, shared_memory, task_manager, consensus_engine)
        assert agent.is_initialized is True

    def test_execute_task(self):
        agent = MultiAgent("agent-1", AgentRole.WORKER)
        message_bus = MessageBus().initialize()
        shared_memory = SharedMemoryStore().initialize()
        task_manager = TaskManager().initialize()
        consensus_engine = ConsensusEngine().initialize()
        agent.initialize(message_bus, shared_memory, task_manager, consensus_engine)

        task = Task(id="task-1", description="Test task")
        result = agent.execute_task(task)
        assert "completed" in result.lower()

    def test_send_and_receive_message(self):
        agent1 = MultiAgent("agent-1", AgentRole.WORKER)
        agent2 = MultiAgent("agent-2", AgentRole.WORKER)
        message_bus = MessageBus().initialize()
        shared_memory = SharedMemoryStore().initialize()
        task_manager = TaskManager().initialize()
        consensus_engine = ConsensusEngine().initialize()

        agent1.initialize(message_bus, shared_memory, task_manager, consensus_engine)
        agent2.initialize(message_bus, shared_memory, task_manager, consensus_engine)

        agent1.send_message("agent-2", "Hello")
        messages = agent2.receive_messages()
        assert len(messages) == 1
        assert messages[0].content == "Hello"

    def test_store_and_retrieve_memory(self):
        agent = MultiAgent("agent-1", AgentRole.WORKER)
        message_bus = MessageBus().initialize()
        shared_memory = SharedMemoryStore().initialize()
        task_manager = TaskManager().initialize()
        consensus_engine = ConsensusEngine().initialize()
        agent.initialize(message_bus, shared_memory, task_manager, consensus_engine)

        agent.store_memory("key1", "value1")
        retrieved = agent.retrieve_memory("key1")
        assert retrieved is not None
        assert retrieved.value == "value1"

    def test_submit_vote(self):
        agent = MultiAgent("agent-1", AgentRole.WORKER)
        message_bus = MessageBus().initialize()
        shared_memory = SharedMemoryStore().initialize()
        task_manager = TaskManager().initialize()
        consensus_engine = ConsensusEngine().initialize()
        agent.initialize(message_bus, shared_memory, task_manager, consensus_engine)

        agent.submit_vote("topic-1", "approve", 0.9, "Good solution")
        # No exception means success

    def test_validate(self):
        agent = MultiAgent("agent-1", AgentRole.WORKER)
        result = agent.validate()
        assert isinstance(result, MultiAgentValidationResult)
        assert result.is_valid is False  # Not initialized

    def test_shutdown(self):
        agent = MultiAgent("agent-1", AgentRole.WORKER)
        message_bus = MessageBus().initialize()
        shared_memory = SharedMemoryStore().initialize()
        task_manager = TaskManager().initialize()
        consensus_engine = ConsensusEngine().initialize()
        agent.initialize(message_bus, shared_memory, task_manager, consensus_engine)

        agent.shutdown()
        assert agent.is_initialized is False

    def test_uninitialized_raises(self):
        agent = MultiAgent("agent-1", AgentRole.WORKER)
        with pytest.raises(MultiAgentError):
            agent.execute_task(Task())


# ---------------------------------------------------------------------------
# Specialized Agents
# ---------------------------------------------------------------------------


class TestSpecializedAgents:
    def test_worker_agent(self):
        agent = WorkerAgent("worker-1")
        assert agent.role == AgentRole.WORKER

        message_bus = MessageBus().initialize()
        shared_memory = SharedMemoryStore().initialize()
        task_manager = TaskManager().initialize()
        consensus_engine = ConsensusEngine().initialize()
        agent.initialize(message_bus, shared_memory, task_manager, consensus_engine)

        task = Task(id="task-1", description="Test task")
        result = agent.execute_task(task)
        assert "completed" in result.lower()

    def test_supervisor_agent(self):
        agent = SupervisorAgent("supervisor-1")
        assert agent.role == AgentRole.SUPERVISOR

        message_bus = MessageBus().initialize()
        shared_memory = SharedMemoryStore().initialize()
        task_manager = TaskManager().initialize()
        consensus_engine = ConsensusEngine().initialize()
        agent.initialize(message_bus, shared_memory, task_manager, consensus_engine)

        agent.add_worker("worker-1")
        status = agent.monitor_workers()
        assert "worker-1" in status

    def test_critic_agent(self):
        agent = CriticAgent("critic-1")
        assert agent.role == AgentRole.CRITIC

        message_bus = MessageBus().initialize()
        shared_memory = SharedMemoryStore().initialize()
        task_manager = TaskManager().initialize()
        consensus_engine = ConsensusEngine().initialize()
        agent.initialize(message_bus, shared_memory, task_manager, consensus_engine)

        evaluation = agent.evaluate("Test content", "quality")
        assert "score" in evaluation
        assert "feedback" in evaluation

    def test_planner_agent(self):
        agent = PlannerAgent("planner-1")
        assert agent.role == AgentRole.PLANNER

        message_bus = MessageBus().initialize()
        shared_memory = SharedMemoryStore().initialize()
        task_manager = TaskManager().initialize()
        consensus_engine = ConsensusEngine().initialize()
        agent.initialize(message_bus, shared_memory, task_manager, consensus_engine)

        tasks = agent.create_plan("Achieve goal")
        assert len(tasks) > 0

    def test_research_agent(self):
        agent = ResearchAgent("researcher-1")
        assert agent.role == AgentRole.RESEARCHER

        message_bus = MessageBus().initialize()
        shared_memory = SharedMemoryStore().initialize()
        task_manager = TaskManager().initialize()
        consensus_engine = ConsensusEngine().initialize()
        agent.initialize(message_bus, shared_memory, task_manager, consensus_engine)

        findings = agent.research("AI trends")
        assert "research findings" in findings.lower()

        analysis = agent.analyze("Test data")
        assert "summary" in analysis
        assert "insights" in analysis

    def test_execution_agent(self):
        agent = ExecutionAgent("executor-1")
        assert agent.role == AgentRole.EXECUTOR

        message_bus = MessageBus().initialize()
        shared_memory = SharedMemoryStore().initialize()
        task_manager = TaskManager().initialize()
        consensus_engine = ConsensusEngine().initialize()
        agent.initialize(message_bus, shared_memory, task_manager, consensus_engine)

        result = agent.execute_operation("test_op", {"param": "value"})
        assert result["status"] == "completed"

        batch_results = agent.batch_execute([("op1", {}), ("op2", {})])
        assert len(batch_results) == 2


# ---------------------------------------------------------------------------
# Coordinator
# ---------------------------------------------------------------------------


class TestCoordinator:
    def test_initialize(self):
        coordinator = Coordinator()
        assert coordinator.is_initialized is False
        coordinator.initialize()
        assert coordinator.is_initialized is True

    def test_double_initialize(self):
        coordinator = Coordinator().initialize()
        coordinator.initialize()
        assert coordinator.is_initialized is True

    def test_register_agent(self):
        coordinator = Coordinator().initialize()
        agent = MultiAgent("agent-1", AgentRole.WORKER)
        coordinator.register_agent(agent)
        assert coordinator.get_agent("agent-1") is not None

    def test_register_duplicate_raises(self):
        coordinator = Coordinator().initialize()
        agent1 = MultiAgent("agent-1", AgentRole.WORKER)
        agent2 = MultiAgent("agent-1", AgentRole.WORKER)
        coordinator.register_agent(agent1)
        with pytest.raises(MultiAgentError):
            coordinator.register_agent(agent2)

    def test_unregister_agent(self):
        coordinator = Coordinator().initialize()
        agent = MultiAgent("agent-1", AgentRole.WORKER)
        coordinator.register_agent(agent)
        assert coordinator.unregister_agent("agent-1") is True
        assert coordinator.get_agent("agent-1") is None

    def test_unregister_nonexistent(self):
        coordinator = Coordinator().initialize()
        assert coordinator.unregister_agent("nonexistent") is False

    def test_list_agents(self):
        coordinator = Coordinator().initialize()
        coordinator.create_worker("worker-1")
        coordinator.create_worker("worker-2")
        agents = coordinator.list_agents()
        assert len(agents) == 2

    def test_list_agents_by_role(self):
        coordinator = Coordinator().initialize()
        coordinator.create_worker("worker-1")
        coordinator.create_supervisor("supervisor-1")
        workers = coordinator.list_agents(AgentRole.WORKER)
        supervisors = coordinator.list_agents(AgentRole.SUPERVISOR)
        assert len(workers) == 1
        assert len(supervisors) == 1

    def test_create_worker(self):
        coordinator = Coordinator().initialize()
        worker = coordinator.create_worker("worker-1")
        assert isinstance(worker, WorkerAgent)
        assert worker.role == AgentRole.WORKER

    def test_create_supervisor(self):
        coordinator = Coordinator().initialize()
        supervisor = coordinator.create_supervisor("supervisor-1")
        assert isinstance(supervisor, SupervisorAgent)
        assert supervisor.role == AgentRole.SUPERVISOR

    def test_create_critic(self):
        coordinator = Coordinator().initialize()
        critic = coordinator.create_critic("critic-1")
        assert isinstance(critic, CriticAgent)
        assert critic.role == AgentRole.CRITIC

    def test_create_planner(self):
        coordinator = Coordinator().initialize()
        planner = coordinator.create_planner("planner-1")
        assert isinstance(planner, PlannerAgent)
        assert planner.role == AgentRole.PLANNER

    def test_create_researcher(self):
        coordinator = Coordinator().initialize()
        researcher = coordinator.create_researcher("researcher-1")
        assert isinstance(researcher, ResearchAgent)
        assert researcher.role == AgentRole.RESEARCHER

    def test_create_executor(self):
        coordinator = Coordinator().initialize()
        executor = coordinator.create_executor("executor-1")
        assert isinstance(executor, ExecutionAgent)
        assert executor.role == AgentRole.EXECUTOR

    def test_delegate_task(self):
        coordinator = Coordinator().initialize()
        coordinator.create_worker("worker-1")
        task = coordinator.delegate_task("Test task", "worker-1")
        assert task.description == "Test task"
        assert task.assigned_to == "worker-1"
        assert task.status == TaskStatus.COMPLETED

    def test_delegate_task_to_nonexistent_agent(self):
        coordinator = Coordinator().initialize()
        with pytest.raises(MultiAgentError):
            coordinator.delegate_task("Test task", "nonexistent")

    def test_reach_consensus(self):
        coordinator = Coordinator().initialize()
        worker1 = coordinator.create_worker("worker-1")
        worker2 = coordinator.create_worker("worker-2")

        worker1.submit_vote("topic-1", "approve", 0.9)
        worker2.submit_vote("topic-1", "approve", 0.8)

        result = coordinator.reach_consensus("topic-1", ConsensusMethod.MAJORITY)
        assert result.decision == "approve"

    def test_broadcast_message(self):
        coordinator = Coordinator().initialize()
        coordinator.create_worker("worker-1")
        coordinator.create_worker("worker-2")

        count = coordinator.broadcast_message("coordinator", "Broadcast")
        assert count == 2

    def test_statistics(self):
        coordinator = Coordinator().initialize()
        coordinator.create_worker("worker-1")
        coordinator.delegate_task("Test task", "worker-1")

        stats = coordinator.statistics()
        assert isinstance(stats, MultiAgentStatistics)
        assert stats.total_agents == 1
        assert stats.tasks_completed == 1

    def test_validate(self):
        coordinator = Coordinator().initialize()
        result = coordinator.validate()
        assert isinstance(result, MultiAgentValidationResult)

    def test_reload(self):
        coordinator = Coordinator().initialize()
        coordinator.create_worker("worker-1")
        coordinator.reload()
        assert coordinator.is_initialized is False
        coordinator.initialize()
        assert len(coordinator.list_agents()) == 0

    def test_shutdown(self):
        coordinator = Coordinator().initialize()
        coordinator.create_worker("worker-1")
        coordinator.shutdown()
        assert coordinator.is_initialized is False

    def test_uninitialized_raises(self):
        coordinator = Coordinator()
        with pytest.raises(MultiAgentError):
            coordinator.create_worker("worker-1")


# ---------------------------------------------------------------------------
# Thread Safety
# ---------------------------------------------------------------------------


class TestThreadSafety:
    def test_concurrent_shared_memory_operations(self):
        store = SharedMemoryStore().initialize()
        n = 20
        barrier = threading.Barrier(n)

        def worker(i):
            barrier.wait()
            store.store(f"key-{i}", f"value-{i}", f"agent-{i}")

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert store.count() == n

    def test_concurrent_message_bus_operations(self):
        bus = MessageBus().initialize()
        n = 20
        barrier = threading.Barrier(n)

        def worker(i):
            barrier.wait()
            bus.send(AgentMessage(sender=f"agent-{i}", receiver="agent-0", content=f"Message {i}"))

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        messages = bus.receive("agent-0", limit=n)
        assert len(messages) == n

    def test_concurrent_task_manager_operations(self):
        manager = TaskManager().initialize()
        n = 20
        barrier = threading.Barrier(n)

        def worker(i):
            barrier.wait()
            manager.create_task(f"Task {i}", f"agent-{i}")

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert manager.count() == n

    def test_concurrent_coordinator_operations(self):
        coordinator = Coordinator().initialize()
        n = 10
        barrier = threading.Barrier(n)

        def worker(i):
            barrier.wait()
            coordinator.create_worker(f"worker-{i}")

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(coordinator.list_agents()) == n


# ---------------------------------------------------------------------------
# Integration
# ---------------------------------------------------------------------------


class TestIntegration:
    def test_full_workflow(self):
        coordinator = Coordinator().initialize()

        # Create agents
        planner = coordinator.create_planner("planner-1")
        researcher = coordinator.create_researcher("researcher-1")
        worker = coordinator.create_worker("worker-1")
        critic = coordinator.create_critic("critic-1")

        # Research phase
        findings = researcher.research("AI trends")
        assert findings != ""

        # Planning phase
        tasks = planner.create_plan("Implement AI system")
        assert len(tasks) > 0

        # Execution phase
        task = coordinator.delegate_task("Execute task", "worker-1")
        assert task.status == TaskStatus.COMPLETED

        # Evaluation phase
        evaluation = critic.evaluate("System output", "quality")
        assert evaluation["score"] > 0

        # Consensus phase
        planner.submit_vote("decision-1", "approve", 0.9)
        researcher.submit_vote("decision-1", "approve", 0.8)
        worker.submit_vote("decision-1", "reject", 0.6)

        consensus = coordinator.reach_consensus("decision-1", ConsensusMethod.MAJORITY)
        assert consensus.decision == "approve"

        # Statistics
        stats = coordinator.statistics()
        assert stats.total_agents == 4
        assert stats.tasks_completed >= 1

        # Validate
        result = coordinator.validate()
        assert result.is_valid is True

        coordinator.shutdown()
