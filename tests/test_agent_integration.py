"""Tests for ToolRegistry and AgentExecutor."""

from __future__ import annotations

import pytest

from aios.eos.agent_integration import (
    AgentExecutor,
    AgentStatistics,
    ToolDefinition,
    ToolParameter,
    ToolRegistry,
)
from aios.eos.workflow_engine import (
    ExecutionCost,
    ExecutionDuration,
    ExecutionMode,
    ExecutionState,
    Workflow,
    WorkflowEngine,
    WorkflowStep,
)


@pytest.fixture
def workflow_engine() -> WorkflowEngine:
    we = WorkflowEngine()
    we._initialized = True
    return we


class TestToolRegistry:
    def test_register_and_get(self) -> None:
        reg = ToolRegistry()
        tool = ToolDefinition(
            name="test_tool",
            description="A test tool",
            handler=lambda: "done",
        )
        reg.register(tool)
        retrieved = reg.get("test_tool")
        assert retrieved is not None
        assert retrieved.name == "test_tool"
        assert retrieved.description == "A test tool"

    def test_register_empty_name_raises(self) -> None:
        reg = ToolRegistry()
        with pytest.raises(Exception):
            reg.register(ToolDefinition(name="", description="", handler=lambda: None))

    def test_register_non_callable_raises(self) -> None:
        reg = ToolRegistry()
        with pytest.raises(Exception):
            reg.register(ToolDefinition(name="bad", description="", handler="not_callable"))

    def test_register_overwrites(self) -> None:
        reg = ToolRegistry()
        t1 = ToolDefinition(name="t", description="first", handler=lambda: 1)
        t2 = ToolDefinition(name="t", description="second", handler=lambda: 2)
        reg.register(t1)
        reg.register(t2)
        assert reg.get("t").description == "second"

    def test_get_nonexistent(self) -> None:
        reg = ToolRegistry()
        assert reg.get("nonexistent") is None

    def test_unregister(self) -> None:
        reg = ToolRegistry()
        reg.register(ToolDefinition(name="t", description="", handler=lambda: None))
        assert reg.unregister("t")
        assert not reg.unregister("t")

    def test_list_tools(self) -> None:
        reg = ToolRegistry()
        reg.register(ToolDefinition(name="a", description="", handler=lambda: None))
        reg.register(ToolDefinition(name="b", description="", handler=lambda: None))
        assert len(reg.list_tools()) == 2

    def test_clear(self) -> None:
        reg = ToolRegistry()
        reg.register(ToolDefinition(name="a", description="", handler=lambda: None))
        assert reg.clear() == 1
        assert reg.tool_count() == 0

    def test_has_tool(self) -> None:
        reg = ToolRegistry()
        reg.register(ToolDefinition(name="t", description="", handler=lambda: None))
        assert reg.has_tool("t")
        assert not reg.has_tool("nonexistent")

    def test_tool_count(self) -> None:
        reg = ToolRegistry()
        assert reg.tool_count() == 0
        reg.register(ToolDefinition(name="t", description="", handler=lambda: None))
        assert reg.tool_count() == 1

    def test_find_by_tag(self) -> None:
        reg = ToolRegistry()
        reg.register(ToolDefinition(
            name="t1", description="", handler=lambda: None, tags=("alpha",),
        ))
        reg.register(ToolDefinition(
            name="t2", description="", handler=lambda: None, tags=("beta",),
        ))
        assert len(reg.find_by_tag("alpha")) == 1
        assert len(reg.find_by_tag("gamma")) == 0

    def test_find_by_description(self) -> None:
        reg = ToolRegistry()
        reg.register(ToolDefinition(
            name="search_engine", description="finds things", handler=lambda: None,
        ))
        assert len(reg.find_by_description("find")) == 1
        assert len(reg.find_by_description("nope")) == 0

    def test_tool_parameters(self) -> None:
        params = (
            ToolParameter(name="input", type="string", description="text input"),
            ToolParameter(
                name="optional_flag", type="boolean", description="optional",
                required=False, default=False,
            ),
        )
        tool = ToolDefinition(
            name="param_tool",
            description="tool with params",
            parameters=params,
            handler=lambda: None,
        )
        assert tool.parameter_count == 2
        assert tool.parameters[0].name == "input"
        assert tool.parameters[0].required
        assert not tool.parameters[1].required


class TestAgentExecutor:
    def test_initialize(self, workflow_engine: WorkflowEngine) -> None:
        reg = ToolRegistry()
        executor = AgentExecutor(workflow_engine, reg)
        executor.initialize()
        assert executor.is_initialized

    def test_initialize_fails_with_uninitialized_we(self) -> None:
        we = WorkflowEngine()
        reg = ToolRegistry()
        executor = AgentExecutor(we, reg)
        with pytest.raises(Exception):
            executor.initialize()

    def test_execute_empty_workflow(self, workflow_engine: WorkflowEngine) -> None:
        reg = ToolRegistry()
        executor = AgentExecutor(workflow_engine, reg)
        executor.initialize()
        wf = Workflow(
            task_description="empty",
            strategy=ExecutionMode.SEQUENTIAL,
            steps=[],
            execution_mode=ExecutionMode.SEQUENTIAL,
            total_cost=ExecutionCost(),
            total_duration=ExecutionDuration(),
        )
        result = executor.execute(wf)
        assert result.all_successful
        assert result.failure_count == 0

    def test_execute_with_tool(self, workflow_engine: WorkflowEngine) -> None:
        reg = ToolRegistry()
        reg.register(ToolDefinition(
            name="greet",
            description="says hello",
            handler=lambda: "hello world",
        ))
        executor = AgentExecutor(workflow_engine, reg)
        executor.initialize()
        step = WorkflowStep(
            step_id="step_1",
            action_id="greet",
            title="Greet",
            category="test",
            source="test",
            confidence=1.0,
            dependencies=[],
            execution_mode=ExecutionMode.SEQUENTIAL,
            state=ExecutionState.PENDING,
            estimated_cost=ExecutionCost(),
            estimated_duration=ExecutionDuration(),
        )
        wf = Workflow(
            task_description="greeting",
            strategy=ExecutionMode.SEQUENTIAL,
            steps=[step],
            execution_mode=ExecutionMode.SEQUENTIAL,
            total_cost=ExecutionCost(),
            total_duration=ExecutionDuration(),
        )
        result = executor.execute(wf)
        assert result.all_successful
        assert result.success_count == 1
        assert result.step_results[0].tool_name == "greet"

    def test_execute_with_missing_tool(self, workflow_engine: WorkflowEngine) -> None:
        reg = ToolRegistry()
        executor = AgentExecutor(workflow_engine, reg)
        executor.initialize()
        step = WorkflowStep(
            step_id="step_1",
            action_id="missing_tool",
            title="Missing",
            category="test", source="test", confidence=1.0,
            dependencies=[], execution_mode=ExecutionMode.SEQUENTIAL,
            state=ExecutionState.PENDING,
            estimated_cost=ExecutionCost(), estimated_duration=ExecutionDuration(),
        )
        wf = Workflow(
            task_description="missing",
            strategy=ExecutionMode.SEQUENTIAL, steps=[step],
            execution_mode=ExecutionMode.SEQUENTIAL,
            total_cost=ExecutionCost(), total_duration=ExecutionDuration(),
        )
        result = executor.execute(wf)
        assert not result.all_successful
        assert result.failure_count == 1

    def test_execute_step_direct(self, workflow_engine: WorkflowEngine) -> None:
        reg = ToolRegistry()
        reg.register(ToolDefinition(
            name="echo", description="echoes", handler=lambda: "echoed",
        ))
        executor = AgentExecutor(workflow_engine, reg)
        executor.initialize()
        step = WorkflowStep(
            step_id="s1", action_id="echo", title="Echo",
            category="test", source="test", confidence=1.0,
            dependencies=[], execution_mode=ExecutionMode.SEQUENTIAL,
            state=ExecutionState.PENDING,
            estimated_cost=ExecutionCost(), estimated_duration=ExecutionDuration(),
        )
        result = executor.execute_step_direct(step)
        assert result.success
        assert result.output == "echoed"

    def test_parallel_execution(self, workflow_engine: WorkflowEngine) -> None:
        reg = ToolRegistry()
        reg.register(ToolDefinition(
            name="p1", description="", handler=lambda: "p1",
        ))
        reg.register(ToolDefinition(
            name="p2", description="", handler=lambda: "p2",
        ))
        executor = AgentExecutor(workflow_engine, reg)
        executor.initialize()
        steps = [
            WorkflowStep(
                step_id=f"s{i}", action_id=f"p{i+1}", title=f"P{i+1}",
                category="test", source="test", confidence=1.0,
                dependencies=[], execution_mode=ExecutionMode.PARALLEL,
                state=ExecutionState.PENDING,
                estimated_cost=ExecutionCost(), estimated_duration=ExecutionDuration(),
            )
            for i in range(2)
        ]
        wf = Workflow(
            task_description="parallel", strategy=ExecutionMode.SEQUENTIAL,
            steps=steps, execution_mode=ExecutionMode.MIXED,
            total_cost=ExecutionCost(), total_duration=ExecutionDuration(),
        )
        result = executor.execute(wf)
        assert result.all_successful
        assert result.success_count == 2

    def test_get_result(self, workflow_engine: WorkflowEngine) -> None:
        reg = ToolRegistry()
        executor = AgentExecutor(workflow_engine, reg)
        executor.initialize()
        wf = Workflow(
            task_description="test", strategy=ExecutionMode.SEQUENTIAL,
            steps=[], execution_mode=ExecutionMode.SEQUENTIAL,
            total_cost=ExecutionCost(), total_duration=ExecutionDuration(),
        )
        result = executor.execute(wf)
        retrieved = executor.get_result(result.execution_id)
        assert retrieved is not None
        assert retrieved.execution_id == result.execution_id

    def test_get_nonexistent_result(self, workflow_engine: WorkflowEngine) -> None:
        reg = ToolRegistry()
        executor = AgentExecutor(workflow_engine, reg)
        executor.initialize()
        assert executor.get_result("nonexistent") is None

    def test_statistics(self, workflow_engine: WorkflowEngine) -> None:
        reg = ToolRegistry()
        executor = AgentExecutor(workflow_engine, reg)
        executor.initialize()
        stats = executor.statistics()
        assert isinstance(stats, AgentStatistics)
        assert stats.total_executions == 0

    def test_statistics_after_execution(self, workflow_engine: WorkflowEngine) -> None:
        reg = ToolRegistry()
        executor = AgentExecutor(workflow_engine, reg)
        executor.initialize()
        wf = Workflow(
            task_description="test", strategy=ExecutionMode.SEQUENTIAL,
            steps=[], execution_mode=ExecutionMode.SEQUENTIAL,
            total_cost=ExecutionCost(), total_duration=ExecutionDuration(),
        )
        executor.execute(wf)
        stats = executor.statistics()
        assert stats.total_executions == 1

    def test_reload(self, workflow_engine: WorkflowEngine) -> None:
        reg = ToolRegistry()
        executor = AgentExecutor(workflow_engine, reg)
        executor.initialize()
        wf = Workflow(
            task_description="test", strategy=ExecutionMode.SEQUENTIAL,
            steps=[], execution_mode=ExecutionMode.SEQUENTIAL,
            total_cost=ExecutionCost(), total_duration=ExecutionDuration(),
        )
        executor.execute(wf)
        executor.reload()
        stats = executor.statistics()
        assert stats.total_executions == 0

    def test_tool_raises_exception(self, workflow_engine: WorkflowEngine) -> None:
        reg = ToolRegistry()

        def failing_handler() -> None:
            msg = "tool failure"
            raise ValueError(msg)

        reg.register(ToolDefinition(
            name="failing", description="", handler=failing_handler,
        ))
        executor = AgentExecutor(workflow_engine, reg)
        executor.initialize()
        step = WorkflowStep(
            step_id="s1", action_id="failing", title="Failing",
            category="test", source="test", confidence=1.0,
            dependencies=[], execution_mode=ExecutionMode.SEQUENTIAL,
            state=ExecutionState.PENDING,
            estimated_cost=ExecutionCost(), estimated_duration=ExecutionDuration(),
        )
        result = executor.execute_step_direct(step)
        assert not result.success
        assert "tool failure" in result.error
