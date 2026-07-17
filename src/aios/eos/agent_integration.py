"""Agent/Tool Integration — tool registry and agent executor for EOS workflows."""

from __future__ import annotations

import threading
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field

from aios.core.exceptions import EOSLoaderError
from aios.core.logger import get_logger
from aios.eos.workflow_engine import (
    ExecutionOrder,
    Workflow,
    WorkflowEngine,
    WorkflowStep,
)


@dataclass(frozen=True, slots=True)
class ToolParameter:
    name: str
    type: str
    description: str = ""
    required: bool = True
    default: object = None


@dataclass(frozen=True, slots=True)
class ToolDefinition:
    name: str
    description: str
    parameters: tuple[ToolParameter, ...] = ()
    handler: Callable[..., object] | None = None
    tags: tuple[str, ...] = ()
    timeout_seconds: float = 30.0

    @property
    def parameter_count(self) -> int:
        return len(self.parameters)


@dataclass(frozen=True, slots=True)
class ToolResult:
    success: bool
    output: object = None
    error: str | None = None
    duration_seconds: float = 0.0
    tool_name: str = ""
    step_id: str = ""
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class AgentExecutionResult:
    execution_id: str
    workflow_task: str
    step_results: tuple[ToolResult, ...] = ()
    total_duration: float = 0.0
    success_count: int = 0
    failure_count: int = 0
    skipped_count: int = 0
    all_successful: bool = False


@dataclass(slots=True)
class AgentStatistics:
    total_executions: int = 0
    successful_executions: int = 0
    failed_executions: int = 0
    total_tool_calls: int = 0
    successful_tool_calls: int = 0
    failed_tool_calls: int = 0
    registered_tools: int = 0
    average_execution_time: float = 0.0


class ToolRegistry:
    """Registry for tool definitions that can be used by agents.

    Thread-safe. Tools are keyed by name (case-sensitive).
    """

    def __init__(self) -> None:
        self.logger = get_logger("aios.eos.tool_registry")
        self._tools: dict[str, ToolDefinition] = {}
        self._lock = threading.Lock()

    @property
    def is_initialized(self) -> bool:
        return True

    def register(self, tool: ToolDefinition) -> str:
        if not tool.name:
            raise EOSLoaderError("Tool name must not be empty")
        if not callable(tool.handler):
            raise EOSLoaderError("Tool handler must be callable")
        with self._lock:
            if tool.name in self._tools:
                self.logger.warning("Overwriting existing tool: %s", tool.name)
            self._tools[tool.name] = tool
        self.logger.info("Registered tool: %s", tool.name)
        return tool.name

    def get(self, name: str) -> ToolDefinition | None:
        with self._lock:
            return self._tools.get(name)

    def unregister(self, name: str) -> bool:
        with self._lock:
            if name in self._tools:
                del self._tools[name]
                self.logger.info("Unregistered tool: %s", name)
                return True
            return False

    def list_tools(self) -> list[ToolDefinition]:
        with self._lock:
            return list(self._tools.values())

    def clear(self) -> int:
        with self._lock:
            count = len(self._tools)
            self._tools.clear()
            self.logger.info("Cleared %d tools", count)
            return count

    def has_tool(self, name: str) -> bool:
        with self._lock:
            return name in self._tools

    def tool_count(self) -> int:
        with self._lock:
            return len(self._tools)

    def find_by_tag(self, tag: str) -> list[ToolDefinition]:
        with self._lock:
            return [t for t in self._tools.values() if tag in t.tags]

    def find_by_description(self, query: str) -> list[ToolDefinition]:
        q = query.lower()
        with self._lock:
            return [
                t for t in self._tools.values()
                if q in t.name.lower() or q in t.description.lower()
            ]


class AgentExecutor:
    """Executes Workflow steps by delegating to ToolRegistry handlers.

    Wraps execution ordering from WorkflowEngine but replaces the
    simulation execution with real tool calls.
    """

    def __init__(
        self,
        workflow_engine: WorkflowEngine,
        tool_registry: ToolRegistry,
    ) -> None:
        self.logger = get_logger("aios.eos.agent_executor")
        self._workflow_engine = workflow_engine
        self._tool_registry = tool_registry
        self._results: dict[str, AgentExecutionResult] = {}
        self._duration_sum: float = 0.0
        self._total_executions: int = 0
        self._successful_executions: int = 0
        self._failed_executions: int = 0
        self._total_tool_calls: int = 0
        self._successful_tool_calls: int = 0
        self._failed_tool_calls: int = 0
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def workflow_engine(self) -> WorkflowEngine:
        return self._workflow_engine

    @property
    def tool_registry(self) -> ToolRegistry:
        return self._tool_registry

    def initialize(self) -> AgentExecutor:
        if not self._workflow_engine.is_initialized:
            raise EOSLoaderError(
                "WorkflowEngine must be initialized before AgentExecutor",
            )
        self._initialized = True
        self.logger.info("AgentExecutor initialized")
        return self

    def execute(self, workflow: Workflow) -> AgentExecutionResult:
        execution_id = str(uuid.uuid4())
        start_time = time.time()
        step_results: list[ToolResult] = []
        success_count = 0
        failure_count = 0
        skipped_count = 0

        self.logger.info(
            "Agent executing workflow: %s — steps=%d",
            workflow.task_description,
            len(workflow.steps),
        )

        order: ExecutionOrder = self._workflow_engine.execution_order(workflow)

        if order.is_empty:
            result = AgentExecutionResult(
                execution_id=execution_id,
                workflow_task=workflow.task_description,
                all_successful=True,
            )
            with self._lock:
                self._results[execution_id] = result
                self._total_executions += 1
                self._successful_executions += 1
            return result

        for group in order.parallel_groups:
            group_steps = [s for s in workflow.steps if s.step_id in group]

            if len(group_steps) == 1:
                tr = self._execute_step(group_steps[0])
                step_results.append(tr)
                if tr.success:
                    success_count += 1
                else:
                    failure_count += 1
            else:
                thread_results: list[ToolResult] = [None] * len(group_steps)
                threads = []
                for i, step in enumerate(group_steps):

                    def _run(idx: int, s: WorkflowStep) -> None:
                        thread_results[idx] = self._execute_step(s)

                    t = threading.Thread(target=_run, args=(i, step), daemon=True)
                    threads.append(t)
                    t.start()
                for t in threads:
                    t.join()

                for tr in thread_results:
                    if tr is not None:
                        step_results.append(tr)
                        if tr.success:
                            success_count += 1
                        else:
                            failure_count += 1

        total_duration = time.time() - start_time
        all_ok = failure_count == 0

        result = AgentExecutionResult(
            execution_id=execution_id,
            workflow_task=workflow.task_description,
            step_results=tuple(step_results),
            total_duration=round(total_duration, 3),
            success_count=success_count,
            failure_count=failure_count,
            skipped_count=skipped_count,
            all_successful=all_ok,
        )

        with self._lock:
            self._results[execution_id] = result
            self._total_executions += 1
            self._duration_sum += total_duration
            self._total_tool_calls += len(step_results)
            self._successful_tool_calls += success_count
            self._failed_tool_calls += failure_count
            if all_ok:
                self._successful_executions += 1
            else:
                self._failed_executions += 1

        self.logger.info(
            "Agent execution %s: success=%d, failure=%d, duration=%.3fs",
            execution_id, success_count, failure_count, total_duration,
        )
        return result

    def execute_step_direct(self, step: WorkflowStep) -> ToolResult:
        return self._execute_step(step)

    def get_result(self, execution_id: str) -> AgentExecutionResult | None:
        with self._lock:
            return self._results.get(execution_id)

    def statistics(self) -> AgentStatistics:
        with self._lock:
            avg_time = (
                self._duration_sum / self._total_executions
                if self._total_executions > 0
                else 0.0
            )
            return AgentStatistics(
                total_executions=self._total_executions,
                successful_executions=self._successful_executions,
                failed_executions=self._failed_executions,
                total_tool_calls=self._total_tool_calls,
                successful_tool_calls=self._successful_tool_calls,
                failed_tool_calls=self._failed_tool_calls,
                registered_tools=self._tool_registry.tool_count(),
                average_execution_time=round(avg_time, 3),
            )

    def reload(self) -> AgentExecutor:
        self.logger.info("Reloading AgentExecutor")
        with self._lock:
            self._results.clear()
            self._duration_sum = 0.0
            self._total_executions = 0
            self._successful_executions = 0
            self._failed_executions = 0
            self._total_tool_calls = 0
            self._successful_tool_calls = 0
            self._failed_tool_calls = 0
        return self

    def _execute_step(self, step: WorkflowStep) -> ToolResult:
        step_start = time.time()
        tool = self._tool_registry.get(step.action_id)

        if tool is None or tool.handler is None:
            elapsed = time.time() - step_start
            self.logger.warning("No tool found for action: %s", step.action_id)
            return ToolResult(
                success=False,
                error=f"No tool registered for action: {step.action_id}",
                duration_seconds=round(elapsed, 3),
                tool_name=step.action_id,
                step_id=step.step_id,
            )

        try:
            output = tool.handler()
            elapsed = time.time() - step_start
            self.logger.info(
                "Step %s (%s) completed in %.3fs",
                step.step_id, tool.name, elapsed,
            )
            return ToolResult(
                success=True,
                output=output,
                duration_seconds=round(elapsed, 3),
                tool_name=tool.name,
                step_id=step.step_id,
            )
        except Exception as e:
            elapsed = time.time() - step_start
            self.logger.error(
                "Step %s (%s) failed: %s", step.step_id, tool.name, e,
            )
            return ToolResult(
                success=False,
                error=str(e),
                duration_seconds=round(elapsed, 3),
                tool_name=tool.name,
                step_id=step.step_id,
            )
