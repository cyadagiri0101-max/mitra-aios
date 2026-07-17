"""Tests for AIOS Agent Layer."""

from __future__ import annotations

import threading

import pytest

from aios.agent.agent import Agent
from aios.agent.agent_manager import AgentManager
from aios.agent.agent_registry import AgentRegistry
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
    ConversationMessage,
    StepType,
)
from aios.agent.planner import Planner
from aios.agent.reflection import ReflectionEngine
from aios.agent.session import AgentSession
from aios.agent.tool_coordinator import ToolCoordinator
from aios.core.exceptions import AgentLayerError

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class TestModels:
    def test_agent_config_defaults(self):
        c = AgentConfig()
        assert c.name == ""
        assert c.max_steps == 20

    def test_agent_step_defaults(self):
        s = AgentStep()
        assert s.step_type == StepType.THINK
        assert s.content == ""

    def test_agent_result_defaults(self):
        r = AgentResult()
        assert r.output == ""
        assert r.status == AgentStatus.COMPLETED

    def test_conversation_message(self):
        m = ConversationMessage(role="user", content="hello")
        assert m.role == "user"
        assert m.content == "hello"

    def test_agent_statistics_defaults(self):
        s = AgentStatistics()
        assert s.executions == 0

    def test_agent_validation_result_defaults(self):
        v = AgentValidationResult()
        assert v.is_valid is True

    def test_step_types(self):
        assert StepType.THINK.value == "think"
        assert StepType.ACT.value == "act"
        assert StepType.OBSERVE.value == "observe"
        assert StepType.REFLECT.value == "reflect"
        assert StepType.PLAN.value == "plan"

    def test_agent_statuses(self):
        assert AgentStatus.IDLE.value == "idle"
        assert AgentStatus.RUNNING.value == "running"
        assert AgentStatus.COMPLETED.value == "completed"
        assert AgentStatus.FAILED.value == "failed"


# ---------------------------------------------------------------------------
# AgentSession
# ---------------------------------------------------------------------------

class TestAgentSession:
    def test_create_session(self):
        s = AgentSession(agent_name="test")
        assert s.agent_name == "test"
        assert s.status == AgentStatus.IDLE

    def test_add_message(self):
        s = AgentSession()
        s.add_message("user", "hello")
        assert len(s.messages) == 1
        assert s.messages[0].content == "hello"

    def test_add_step(self):
        s = AgentSession()
        s.add_step(AgentStep(step_type=StepType.THINK, content="thinking"))
        assert len(s.steps) == 1

    def test_set_status(self):
        s = AgentSession()
        s.set_status(AgentStatus.RUNNING)
        assert s.status == AgentStatus.RUNNING

    def test_clear(self):
        s = AgentSession()
        s.add_message("user", "hello")
        s.add_step(AgentStep())
        s.set_status(AgentStatus.RUNNING)
        s.clear()
        assert len(s.messages) == 0
        assert len(s.steps) == 0
        assert s.status == AgentStatus.IDLE

    def test_to_result(self):
        s = AgentSession()
        s.add_message("assistant", "done")
        s.set_status(AgentStatus.COMPLETED)
        result = s.to_result()
        assert result.output == "done"
        assert result.status == AgentStatus.COMPLETED


# ---------------------------------------------------------------------------
# ConversationManager
# ---------------------------------------------------------------------------

class TestConversationManager:
    def test_initialize(self):
        cm = ConversationManager().initialize()
        assert cm.is_initialized is True

    def test_add_message(self):
        cm = ConversationManager().initialize()
        cm.add_message("user", "hello")
        assert cm.count() == 1

    def test_get_history(self):
        cm = ConversationManager().initialize()
        cm.add_message("user", "hello")
        cm.add_message("assistant", "hi")
        history = cm.get_history()
        assert len(history) == 2

    def test_get_last_message(self):
        cm = ConversationManager().initialize()
        cm.add_message("user", "hello")
        last = cm.get_last_message()
        assert last is not None
        assert last.content == "hello"

    def test_max_history(self):
        cm = ConversationManager(max_history=2).initialize()
        cm.add_message("user", "1")
        cm.add_message("user", "2")
        cm.add_message("user", "3")
        assert cm.count() == 2

    def test_clear(self):
        cm = ConversationManager().initialize()
        cm.add_message("user", "hello")
        cm.clear()
        assert cm.count() == 0

    def test_uninitialized_raises(self):
        cm = ConversationManager()
        with pytest.raises(AgentLayerError):
            cm.add_message("user", "hello")


# ---------------------------------------------------------------------------
# Planner
# ---------------------------------------------------------------------------

class TestPlanner:
    def test_initialize(self):
        p = Planner().initialize()
        assert p.is_initialized is True

    def test_plan(self):
        p = Planner().initialize()
        steps = p.plan("solve problem")
        assert len(steps) >= 1

    def test_next_step(self):
        p = Planner(max_steps=5).initialize()
        step = p.next_step("goal", [])
        assert step is not None

    def test_max_steps_reached(self):
        p = Planner(max_steps=2).initialize()
        step = p.next_step("goal", [AgentStep(), AgentStep()])
        assert step is None

    def test_validate(self):
        p = Planner(max_steps=-1)
        result = p.validate()
        assert result.is_valid is False

    def test_uninitialized_raises(self):
        p = Planner()
        with pytest.raises(AgentLayerError):
            p.plan("goal")


# ---------------------------------------------------------------------------
# Executor
# ---------------------------------------------------------------------------

class TestExecutor:
    def test_initialize(self):
        e = Executor().initialize()
        assert e.is_initialized is True

    def test_execute_think_step(self):
        e = Executor().initialize()
        step = AgentStep(step_type=StepType.THINK, content="thinking")
        result = e.execute_step(step)
        assert "processed" in result.content

    def test_execute_act_step(self):
        e = Executor().initialize()
        step = AgentStep(step_type=StepType.ACT, tool_name="echo", tool_args={"msg": "hi"})
        result = e.execute_step(step)
        assert result.tool_result != ""

    def test_executed_count(self):
        e = Executor().initialize()
        e.execute_step(AgentStep())
        e.execute_step(AgentStep())
        assert e.executed_count == 2

    def test_uninitialized_raises(self):
        e = Executor()
        with pytest.raises(AgentLayerError):
            e.execute_step(AgentStep())


# ---------------------------------------------------------------------------
# ReflectionEngine
# ---------------------------------------------------------------------------

class TestReflectionEngine:
    def test_initialize(self):
        r = ReflectionEngine().initialize()
        assert r.is_initialized is True

    def test_reflect(self):
        r = ReflectionEngine().initialize()
        steps = [AgentStep(), AgentStep()]
        result = r.reflect(steps, "goal")
        assert result.step_type == StepType.REFLECT
        assert "2 steps" in result.content

    def test_should_continue(self):
        r = ReflectionEngine().initialize()
        assert r.should_continue([], "goal") is True
        assert r.should_continue([AgentStep() for _ in range(25)], "goal") is False

    def test_reflection_count(self):
        r = ReflectionEngine().initialize()
        r.reflect([], "goal")
        r.reflect([], "goal")
        assert r.reflection_count == 2


# ---------------------------------------------------------------------------
# MemoryCoordinator
# ---------------------------------------------------------------------------

class TestMemoryCoordinator:
    def test_initialize(self):
        mc = MemoryCoordinator().initialize()
        assert mc.is_initialized is True

    def test_store(self):
        mc = MemoryCoordinator().initialize()
        mc.store("content")
        assert mc.stored_count == 1

    def test_retrieve(self):
        mc = MemoryCoordinator().initialize()
        results = mc.retrieve("query")
        assert len(results) >= 1
        assert mc.retrieved_count == 1


# ---------------------------------------------------------------------------
# ToolCoordinator
# ---------------------------------------------------------------------------

class TestToolCoordinator:
    def test_initialize(self):
        tc = ToolCoordinator().initialize()
        assert tc.is_initialized is True

    def test_execute_tool(self):
        tc = ToolCoordinator().initialize()
        result = tc.execute_tool("echo", {"msg": "hi"})
        assert "echo" in result
        assert tc.execution_count == 1

    def test_list_available_tools(self):
        tc = ToolCoordinator().initialize()
        tools = tc.list_available_tools()
        assert len(tools) >= 1


# ---------------------------------------------------------------------------
# ContextManager
# ---------------------------------------------------------------------------

class TestContextManager:
    def test_initialize(self):
        cm = ContextManager().initialize()
        assert cm.is_initialized is True

    def test_build_context(self):
        cm = ContextManager().initialize()
        messages = [ConversationMessage(role="user", content="hello")]
        context = cm.build_context(messages, system_prompt="You are helpful")
        assert len(context) == 2
        assert context[0].role == "system"

    def test_trim_context(self):
        cm = ContextManager(max_tokens=5).initialize()
        messages = [
            ConversationMessage(role="user", content="one two three"),
            ConversationMessage(role="assistant", content="four five six seven eight nine ten"),
        ]
        trimmed = cm.trim_context(messages)
        assert len(trimmed) < len(messages)

    def test_validate(self):
        cm = ContextManager(max_tokens=-1)
        result = cm.validate()
        assert result.is_valid is False


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------

class TestAgent:
    def test_initialize(self):
        a = Agent(AgentConfig(name="test")).initialize()
        assert a.is_initialized is True
        assert a.name == "test"

    def test_run(self):
        a = Agent(AgentConfig(name="test")).initialize()
        result = a.run("solve problem")
        assert result.status == AgentStatus.COMPLETED
        assert result.output != ""
        assert len(result.steps) > 0

    def test_chat(self):
        a = Agent(AgentConfig(name="test")).initialize()
        response = a.chat("hello")
        assert response != ""

    def test_statistics(self):
        a = Agent(AgentConfig(name="test")).initialize()
        a.run("goal1")
        a.run("goal2")
        stats = a.statistics
        assert stats.executions == 2
        assert stats.successes == 2

    def test_validate(self):
        a = Agent(AgentConfig(name="")).initialize()
        result = a.validate()
        assert result.is_valid is False

    def test_reload(self):
        a = Agent(AgentConfig(name="test")).initialize()
        a.run("goal")
        a.reload()
        assert a.statistics.executions == 0

    def test_shutdown(self):
        a = Agent(AgentConfig(name="test")).initialize()
        a.shutdown()
        assert a.is_initialized is False

    def test_uninitialized_raises(self):
        a = Agent(AgentConfig(name="test"))
        with pytest.raises(AgentLayerError):
            a.run("goal")


# ---------------------------------------------------------------------------
# AgentRegistry
# ---------------------------------------------------------------------------

class TestAgentRegistry:
    def test_initialize(self):
        r = AgentRegistry().initialize()
        assert r.is_initialized is True

    def test_register(self):
        r = AgentRegistry().initialize()
        a = Agent(AgentConfig(name="test")).initialize()
        r.register(a)
        assert "test" in r.list()

    def test_register_duplicate_raises(self):
        r = AgentRegistry().initialize()
        a1 = Agent(AgentConfig(name="test")).initialize()
        a2 = Agent(AgentConfig(name="test")).initialize()
        r.register(a1)
        with pytest.raises(AgentLayerError):
            r.register(a2)

    def test_unregister(self):
        r = AgentRegistry().initialize()
        a = Agent(AgentConfig(name="test")).initialize()
        r.register(a)
        assert r.unregister("test") is True
        assert "test" not in r.list()

    def test_get(self):
        r = AgentRegistry().initialize()
        a = Agent(AgentConfig(name="test")).initialize()
        r.register(a)
        assert r.get("test") is a

    def test_validate(self):
        r = AgentRegistry().initialize()
        result = r.validate()
        assert len(result.warnings) > 0


# ---------------------------------------------------------------------------
# AgentManager
# ---------------------------------------------------------------------------

class TestAgentManager:
    def test_initialize(self):
        m = AgentManager().initialize()
        assert m.is_initialized is True

    def test_create_agent(self):
        m = AgentManager().initialize()
        a = m.create_agent(AgentConfig(name="test"))
        assert a.is_initialized is True
        assert "test" in m.list_agents()

    def test_run_agent(self):
        m = AgentManager().initialize()
        m.create_agent(AgentConfig(name="test"))
        result = m.run_agent("test", "solve problem")
        assert result.status == AgentStatus.COMPLETED

    def test_chat(self):
        m = AgentManager().initialize()
        m.create_agent(AgentConfig(name="test"))
        response = m.chat("test", "hello")
        assert response != ""

    def test_remove_agent(self):
        m = AgentManager().initialize()
        m.create_agent(AgentConfig(name="test"))
        assert m.remove_agent("test") is True
        assert "test" not in m.list_agents()

    def test_statistics(self):
        m = AgentManager().initialize()
        m.create_agent(AgentConfig(name="test"))
        m.run_agent("test", "goal")
        stats = m.statistics()
        assert "test" in stats
        assert stats["test"].executions == 1

    def test_validate(self):
        m = AgentManager().initialize()
        result = m.validate()
        assert len(result.warnings) > 0

    def test_reload(self):
        m = AgentManager().initialize()
        m.create_agent(AgentConfig(name="test"))
        m.reload()
        assert m.is_initialized is False

    def test_shutdown(self):
        m = AgentManager().initialize()
        m.create_agent(AgentConfig(name="test"))
        m.shutdown()
        assert m.is_initialized is False

    def test_uninitialized_raises(self):
        m = AgentManager()
        with pytest.raises(AgentLayerError):
            m.run_agent("test", "goal")

    def test_agent_not_found(self):
        m = AgentManager().initialize()
        with pytest.raises(AgentLayerError):
            m.run_agent("missing", "goal")


# ---------------------------------------------------------------------------
# Thread Safety
# ---------------------------------------------------------------------------

class TestThreadSafety:
    def test_concurrent_agent_run(self):
        a = Agent(AgentConfig(name="test")).initialize()
        n = 10
        barrier = threading.Barrier(n)
        results: list[AgentResult] = []
        lock = threading.Lock()

        def worker():
            barrier.wait()
            result = a.run("goal")
            with lock:
                results.append(result)

        threads = [threading.Thread(target=worker) for _ in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert len(results) == n

    def test_concurrent_conversation(self):
        cm = ConversationManager().initialize()
        n = 20
        barrier = threading.Barrier(n)

        def worker(i):
            barrier.wait()
            cm.add_message("user", f"message {i}")

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert cm.count() == n
