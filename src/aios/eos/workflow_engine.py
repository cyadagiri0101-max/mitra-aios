"""WorkflowEngine — convert ExecutionPlan into executable engineering workflows."""

from __future__ import annotations

import threading
from dataclasses import dataclass, field
from enum import StrEnum
from aios.core.exceptions import WorkflowEngineError
from aios.eos.types import HealthStatus
from aios.core.logger import get_logger
from aios.eos.decision_engine import (
    EOSDecisionEngine,
    ExecutionPlan,
    ExecutionStrategy,
    PlannedAction,
)


class ExecutionMode(StrEnum):
    """Execution mode for workflow steps."""

    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    MIXED = "mixed"


class ExecutionState(StrEnum):
    """Execution state for workflow steps."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass(frozen=True, slots=True)
class ExecutionCost:
    """Estimated execution cost for a workflow."""

    token_cost: int = 0
    compute_cost: float = 0.0
    total_cost: float = 0.0


@dataclass(frozen=True, slots=True)
class ExecutionDuration:
    """Estimated execution duration for a workflow."""

    setup_seconds: float = 0.0
    execution_seconds: float = 0.0
    teardown_seconds: float = 0.0
    total_seconds: float = 0.0


@dataclass(frozen=True, slots=True)
class WorkflowStep:
    """A single step in the workflow."""

    step_id: str
    action_id: str
    title: str
    category: str
    source: str
    confidence: float
    dependencies: tuple[str, ...] = ()
    execution_mode: ExecutionMode = ExecutionMode.SEQUENTIAL
    state: ExecutionState = ExecutionState.PENDING
    estimated_cost: ExecutionCost = field(default_factory=ExecutionCost)
    estimated_duration: ExecutionDuration = field(default_factory=ExecutionDuration)


@dataclass(slots=True)
class Workflow:
    """Executable workflow derived from ExecutionPlan."""

    task_description: str
    strategy: ExecutionStrategy
    steps: list[WorkflowStep] = field(default_factory=list)
    execution_mode: ExecutionMode = ExecutionMode.SEQUENTIAL
    total_cost: ExecutionCost = field(default_factory=ExecutionCost)
    total_duration: ExecutionDuration = field(default_factory=ExecutionDuration)
    rollback_plan: RollbackPlan | None = None

    @property
    def is_empty(self) -> bool:
        return len(self.steps) == 0

    @property
    def step_count(self) -> int:
        return len(self.steps)


@dataclass(frozen=True, slots=True)
class RollbackPlan:
    """Rollback plan for workflow recovery."""

    rollback_steps: tuple[WorkflowStep, ...] = ()
    rollback_mode: ExecutionMode = ExecutionMode.SEQUENTIAL

    @property
    def is_empty(self) -> bool:
        return len(self.rollback_steps) == 0


@dataclass(frozen=True, slots=True)
class ExecutionOrder:
    """Resolved execution order for workflow steps."""

    ordered_steps: tuple[str, ...] = ()
    parallel_groups: tuple[tuple[str, ...], ...] = ()

    @property
    def is_empty(self) -> bool:
        return len(self.ordered_steps) == 0


@dataclass(frozen=True, slots=True)
class ExecutionGraph:
    """Execution graph representing workflow dependencies."""

    nodes: tuple[str, ...] = ()
    edges: tuple[tuple[str, str], ...] = ()
    has_cycles: bool = False

    @property
    def is_empty(self) -> bool:
        return len(self.nodes) == 0


@dataclass(frozen=True, slots=True)
class WorkflowGraph:
    """Graph representation of workflow structure."""

    nodes: tuple[str, ...] = ()
    edges: tuple[tuple[str, str], ...] = ()
    root_nodes: tuple[str, ...] = ()
    leaf_nodes: tuple[str, ...] = ()

    @property
    def is_empty(self) -> bool:
        return len(self.nodes) == 0


@dataclass(frozen=True, slots=True)
class WorkflowSummary:
    """Summary of workflow characteristics."""

    task_description: str
    strategy: ExecutionStrategy
    execution_mode: ExecutionMode
    step_count: int
    dependency_count: int
    parallel_groups: int
    total_cost: ExecutionCost
    total_duration: ExecutionDuration
    has_rollback: bool


@dataclass(slots=True)
class WorkflowValidationResult:
    """Outcome of workflow validation."""

    is_valid: bool = True
    empty_workflow: bool = False
    duplicate_steps: list[str] = field(default_factory=list)
    missing_dependencies: list[str] = field(default_factory=list)
    circular_dependencies: list[str] = field(default_factory=list)
    invalid_execution_order: bool = False
    invalid_rollback: bool = False
    invalid_graph: bool = False
    invalid_execution_mode: bool = False
    invalid_state: bool = False
    invalid_cost: bool = False
    invalid_duration: bool = False
    warnings: list[str] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class WorkflowStatistics:
    """Summary statistics about the workflow engine."""

    cached_workflows: int
    total_workflows_generated: int
    average_step_count: float
    strategy_distribution: dict[str, int]


class WorkflowEngine:
    """Convert ExecutionPlan into executable engineering workflows.

    Sits above EOSDecisionEngine. Produces deterministic, dependency-aware
    workflows with execution order resolution, cycle detection, cost estimation,
    and rollback support.
    """

    def __init__(self) -> None:
        self.logger = get_logger("aios.eos.workflow_engine")
        self._decision_engine: EOSDecisionEngine | None = None
        self._workflow_cache: dict[str, Workflow] = {}
        self._total_workflows: int = 0
        self._total_steps: int = 0
        self._strategy_counts: dict[str, int] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def decision_engine(self) -> EOSDecisionEngine:
        if self._decision_engine is None:
            raise WorkflowEngineError(
                "WorkflowEngine has not been initialized"
            )
        return self._decision_engine

    def initialize(
        self, decision_engine: EOSDecisionEngine
    ) -> WorkflowEngine:
        """Bind to an initialized EOSDecisionEngine."""
        if not decision_engine.is_initialized:
            raise WorkflowEngineError(
                "EOSDecisionEngine must be initialized before passing to WorkflowEngine"
            )

        with self._lock:
            self._decision_engine = decision_engine
            self._workflow_cache.clear()
            self._total_workflows = 0
            self._total_steps = 0
            self._strategy_counts.clear()

        self._initialized = True

        self.logger.info("WorkflowEngine initialized")
        return self

    def build(self, plan: ExecutionPlan) -> Workflow:
        """Build Workflow from ExecutionPlan.

        Converts planned actions into executable workflow steps with
        dependency resolution, execution order, cost estimation, and
        rollback support.
        """
        cache_key = plan.task_description.strip().lower()
        with self._lock:
            cached = self._workflow_cache.get(cache_key)
            if cached is not None:
                return Workflow(
                    task_description=cached.task_description,
                    strategy=cached.strategy,
                    steps=list(cached.steps),
                    execution_mode=cached.execution_mode,
                    total_cost=cached.total_cost,
                    total_duration=cached.total_duration,
                    rollback_plan=cached.rollback_plan,
                )

        if plan.is_empty:
            workflow = Workflow(
                task_description=plan.task_description,
                strategy=plan.strategy,
                steps=[],
                execution_mode=self._determine_execution_mode(plan.strategy),
                total_cost=ExecutionCost(),
                total_duration=ExecutionDuration(),
                rollback_plan=RollbackPlan(),
            )
        else:
            steps = self._convert_actions_to_steps(plan.actions, plan.strategy)
            execution_mode = self._determine_execution_mode(plan.strategy)
            total_cost = self._calculate_total_cost(steps)
            total_duration = self._calculate_total_duration(steps)
            rollback_plan = self._generate_rollback_plan(steps)

            workflow = Workflow(
                task_description=plan.task_description,
                strategy=plan.strategy,
                steps=steps,
                execution_mode=execution_mode,
                total_cost=total_cost,
                total_duration=total_duration,
                rollback_plan=rollback_plan,
            )

        with self._lock:
            self._workflow_cache[cache_key] = Workflow(
                task_description=workflow.task_description,
                strategy=workflow.strategy,
                steps=list(workflow.steps),
                execution_mode=workflow.execution_mode,
                total_cost=workflow.total_cost,
                total_duration=workflow.total_duration,
                rollback_plan=workflow.rollback_plan,
            )
            self._total_workflows += 1
            self._total_steps += len(workflow.steps)
            strategy_name = plan.strategy.value
            self._strategy_counts[strategy_name] = (
                self._strategy_counts.get(strategy_name, 0) + 1
            )

        self.logger.info(
            "Built workflow for task — strategy=%s, steps=%d, mode=%s",
            workflow.strategy.value,
            workflow.step_count,
            workflow.execution_mode.value,
        )
        return workflow

    def optimize(self, workflow: Workflow) -> Workflow:
        """Optimize workflow by removing redundant steps and improving parallelism."""
        if workflow.is_empty:
            return workflow

        optimized_steps = self._remove_redundant_steps(workflow.steps)
        optimized_steps = self._improve_parallelism(optimized_steps)

        total_cost = self._calculate_total_cost(optimized_steps)
        total_duration = self._calculate_total_duration(optimized_steps)

        return Workflow(
            task_description=workflow.task_description,
            strategy=workflow.strategy,
            steps=optimized_steps,
            execution_mode=workflow.execution_mode,
            total_cost=total_cost,
            total_duration=total_duration,
            rollback_plan=workflow.rollback_plan,
        )

    def resolve_dependencies(self, workflow: Workflow) -> Workflow:
        """Resolve and validate all dependencies in the workflow."""
        if workflow.is_empty:
            return workflow

        resolved_steps = self._resolve_step_dependencies(workflow.steps)

        return Workflow(
            task_description=workflow.task_description,
            strategy=workflow.strategy,
            steps=resolved_steps,
            execution_mode=workflow.execution_mode,
            total_cost=workflow.total_cost,
            total_duration=workflow.total_duration,
            rollback_plan=workflow.rollback_plan,
        )

    def execution_order(self, workflow: Workflow) -> ExecutionOrder:
        """Determine execution order using topological sort."""
        if workflow.is_empty:
            return ExecutionOrder()

        ordered, parallel_groups = self._topological_sort(workflow.steps)

        return ExecutionOrder(
            ordered_steps=tuple(ordered),
            parallel_groups=tuple(tuple(group) for group in parallel_groups),
        )

    def rollback(self, workflow: Workflow) -> RollbackPlan:
        """Generate rollback plan for workflow recovery."""
        if workflow.is_empty:
            return RollbackPlan()

        return self._generate_rollback_plan(workflow.steps)

    def estimate_cost(self, workflow: Workflow) -> ExecutionCost:
        """Estimate total execution cost for the workflow."""
        if workflow.is_empty:
            return ExecutionCost()

        return self._calculate_total_cost(workflow.steps)

    def estimate_duration(self, workflow: Workflow) -> ExecutionDuration:
        """Estimate total execution duration for the workflow."""
        if workflow.is_empty:
            return ExecutionDuration()

        return self._calculate_total_duration(workflow.steps)

    def graph(self, workflow: Workflow) -> WorkflowGraph:
        """Generate graph representation of workflow structure."""
        if workflow.is_empty:
            return WorkflowGraph()

        nodes = tuple(step.step_id for step in workflow.steps)
        edges: list[tuple[str, str]] = []

        for step in workflow.steps:
            for dep_id in step.dependencies:
                edges.append((dep_id, step.step_id))

        root_nodes = self._find_root_nodes(workflow.steps)
        leaf_nodes = self._find_leaf_nodes(workflow.steps)

        return WorkflowGraph(
            nodes=nodes,
            edges=tuple(edges),
            root_nodes=tuple(root_nodes),
            leaf_nodes=tuple(leaf_nodes),
        )

    def summary(self, workflow: Workflow) -> WorkflowSummary:
        """Generate summary of workflow characteristics."""
        dependency_count = sum(len(step.dependencies) for step in workflow.steps)
        execution_order = self.execution_order(workflow)
        parallel_groups = len(execution_order.parallel_groups)

        return WorkflowSummary(
            task_description=workflow.task_description,
            strategy=workflow.strategy,
            execution_mode=workflow.execution_mode,
            step_count=workflow.step_count,
            dependency_count=dependency_count,
            parallel_groups=parallel_groups,
            total_cost=workflow.total_cost,
            total_duration=workflow.total_duration,
            has_rollback=workflow.rollback_plan is not None and not workflow.rollback_plan.is_empty,
        )

    def validate(self, workflow: Workflow) -> WorkflowValidationResult:
        """Validate workflow integrity."""
        result = WorkflowValidationResult()

        self._check_empty(workflow, result)
        self._check_duplicates(workflow, result)
        self._check_missing_dependencies(workflow, result)
        self._check_circular_dependencies(workflow, result)
        self._check_execution_order(workflow, result)
        self._check_rollback(workflow, result)
        self._check_graph(workflow, result)
        self._check_execution_mode(workflow, result)
        self._check_state(workflow, result)
        self._check_cost(workflow, result)
        self._check_duration(workflow, result)

        if workflow.is_empty:
            result.warnings.append("Workflow is empty")
        if result.duplicate_steps:
            result.is_valid = False
        if result.missing_dependencies:
            result.is_valid = False
        if result.circular_dependencies:
            result.is_valid = False
        if result.invalid_execution_order:
            result.is_valid = False
        if result.invalid_rollback:
            result.is_valid = False
        if result.invalid_graph:
            result.is_valid = False
        if result.invalid_execution_mode:
            result.is_valid = False
        if result.invalid_state:
            result.is_valid = False
        if result.invalid_cost:
            result.is_valid = False
        if result.invalid_duration:
            result.is_valid = False

        self.logger.info(
            "Workflow validation: valid=%s, empty=%s, duplicates=%d, circular=%d",
            result.is_valid,
            result.empty_workflow,
            len(result.duplicate_steps),
            len(result.circular_dependencies),
        )
        return result

    def statistics(self) -> WorkflowStatistics:
        """Return summary statistics about the workflow engine."""
        avg_steps = (
            self._total_steps / self._total_workflows
            if self._total_workflows > 0
            else 0.0
        )

        return WorkflowStatistics(
            cached_workflows=len(self._workflow_cache),
            total_workflows_generated=self._total_workflows,
            average_step_count=round(avg_steps, 2),
            strategy_distribution=dict(self._strategy_counts),
        )

    def reload(self) -> WorkflowEngine:
        """Clear all caches and reset statistics."""
        self.logger.info("Reloading WorkflowEngine")
        with self._lock:
            self._workflow_cache.clear()
            self._total_workflows = 0
            self._total_steps = 0
            self._strategy_counts.clear()
        return self

    def health(self) -> HealthStatus:
        """Check WorkflowEngine health.

        Returns:
            HealthStatus: Subsystem health with compilation metrics.
        """
        with self._lock:
            if not self._initialized:
                return HealthStatus(
                    healthy=False,
                    status="not_initialized",
                    initialized=False,
                    active_executions=0,
                    total_executions=self._total_workflows,
                    failed_executions=0,
                    cancelled_executions=0,
                    message="WorkflowEngine not initialized",
                )

            cache_utilization = len(self._workflow_cache)
            is_healthy = self._initialized and len(self._strategy_counts) > 0
            status = "healthy" if is_healthy else "degraded"

            message = f"Cached workflows: {cache_utilization}, Total compiled: {self._total_workflows}, Total steps: {self._total_steps}, Strategies: {len(self._strategy_counts)}"

            return HealthStatus(
                healthy=is_healthy,
                status=status,
                initialized=True,
                active_executions=cache_utilization,
                total_executions=self._total_workflows,
                failed_executions=0,
                cancelled_executions=0,
                message=message,
            )

    def shutdown(self) -> None:
        """Gracefully shutdown the WorkflowEngine.

        Clears caches and releases resources. Idempotent—safe to call multiple times.
        """
        with self._lock:
            if not self._initialized:
                return

            # Clear all caches
            self._workflow_cache.clear()
            self._strategy_counts.clear()

            # Reset statistics
            self._total_workflows = 0
            self._total_steps = 0

            self._initialized = False

        self.logger.info("WorkflowEngine shutdown complete")

    def _convert_actions_to_steps(
        self, actions: list[PlannedAction], strategy: ExecutionStrategy
    ) -> list[WorkflowStep]:
        """Convert PlannedActions into WorkflowSteps."""
        steps: list[WorkflowStep] = []

        for action in actions:
            execution_mode = self._determine_step_mode(action, strategy)
            estimated_cost = self._estimate_step_cost(action)
            estimated_duration = self._estimate_step_duration(action)

            step = WorkflowStep(
                step_id=f"step_{action.action_id}",
                action_id=action.action_id,
                title=action.title,
                category=action.category,
                source=action.source,
                confidence=action.confidence,
                dependencies=tuple(f"step_{dep}" for dep in action.dependencies),
                execution_mode=execution_mode,
                state=ExecutionState.PENDING,
                estimated_cost=estimated_cost,
                estimated_duration=estimated_duration,
            )
            steps.append(step)

        return steps

    def _determine_execution_mode(self, strategy: ExecutionStrategy) -> ExecutionMode:
        """Determine execution mode from strategy."""
        if strategy == ExecutionStrategy.PARALLEL:
            return ExecutionMode.PARALLEL
        if strategy == ExecutionStrategy.MIXED:
            return ExecutionMode.MIXED
        return ExecutionMode.SEQUENTIAL

    def _determine_step_mode(
        self, action: PlannedAction, strategy: ExecutionStrategy
    ) -> ExecutionMode:
        """Determine execution mode for individual step."""
        if strategy == ExecutionStrategy.PARALLEL:
            return ExecutionMode.PARALLEL
        if strategy == ExecutionStrategy.MIXED:
            if action.source == "capability":
                return ExecutionMode.PARALLEL
            return ExecutionMode.SEQUENTIAL
        return ExecutionMode.SEQUENTIAL

    def _estimate_step_cost(self, action: PlannedAction) -> ExecutionCost:
        """Estimate cost for a single step."""
        base_token_cost = 100
        confidence_multiplier = 1.0 + (1.0 - action.confidence)
        token_cost = int(base_token_cost * confidence_multiplier)
        compute_cost = token_cost * 0.001
        total_cost = compute_cost

        return ExecutionCost(
            token_cost=token_cost,
            compute_cost=compute_cost,
            total_cost=total_cost,
        )

    def _estimate_step_duration(self, action: PlannedAction) -> ExecutionDuration:
        """Estimate duration for a single step."""
        base_seconds = 1.0
        confidence_multiplier = 1.0 + (1.0 - action.confidence)
        execution_seconds = base_seconds * confidence_multiplier
        setup_seconds = 0.1
        teardown_seconds = 0.1
        total_seconds = setup_seconds + execution_seconds + teardown_seconds

        return ExecutionDuration(
            setup_seconds=setup_seconds,
            execution_seconds=execution_seconds,
            teardown_seconds=teardown_seconds,
            total_seconds=total_seconds,
        )

    def _calculate_total_cost(self, steps: list[WorkflowStep]) -> ExecutionCost:
        """Calculate total cost for all steps."""
        total_token_cost = sum(step.estimated_cost.token_cost for step in steps)
        total_compute_cost = sum(step.estimated_cost.compute_cost for step in steps)
        total_cost = sum(step.estimated_cost.total_cost for step in steps)

        return ExecutionCost(
            token_cost=total_token_cost,
            compute_cost=total_compute_cost,
            total_cost=total_cost,
        )

    def _calculate_total_duration(self, steps: list[WorkflowStep]) -> ExecutionDuration:
        """Calculate total duration for all steps."""
        total_setup = sum(step.estimated_duration.setup_seconds for step in steps)
        total_execution = sum(step.estimated_duration.execution_seconds for step in steps)
        total_teardown = sum(step.estimated_duration.teardown_seconds for step in steps)
        total_seconds = total_setup + total_execution + total_teardown

        return ExecutionDuration(
            setup_seconds=total_setup,
            execution_seconds=total_execution,
            teardown_seconds=total_teardown,
            total_seconds=total_seconds,
        )

    def _generate_rollback_plan(self, steps: list[WorkflowStep]) -> RollbackPlan:
        """Generate rollback plan by reversing step order."""
        if not steps:
            return RollbackPlan()

        rollback_steps = tuple(reversed(steps))
        rollback_mode = ExecutionMode.SEQUENTIAL

        return RollbackPlan(
            rollback_steps=rollback_steps,
            rollback_mode=rollback_mode,
        )

    def _remove_redundant_steps(self, steps: list[WorkflowStep]) -> list[WorkflowStep]:
        """Remove redundant steps with low confidence."""
        return [step for step in steps if step.confidence >= 0.3]

    def _improve_parallelism(self, steps: list[WorkflowStep]) -> list[WorkflowStep]:
        """Improve parallelism by updating execution modes."""
        improved: list[WorkflowStep] = []

        for step in steps:
            if not step.dependencies and step.source == "capability":
                improved_step = WorkflowStep(
                    step_id=step.step_id,
                    action_id=step.action_id,
                    title=step.title,
                    category=step.category,
                    source=step.source,
                    confidence=step.confidence,
                    dependencies=step.dependencies,
                    execution_mode=ExecutionMode.PARALLEL,
                    state=step.state,
                    estimated_cost=step.estimated_cost,
                    estimated_duration=step.estimated_duration,
                )
                improved.append(improved_step)
            else:
                improved.append(step)

        return improved

    def _resolve_step_dependencies(self, steps: list[WorkflowStep]) -> list[WorkflowStep]:
        """Resolve and validate step dependencies."""
        step_ids = {step.step_id for step in steps}
        resolved: list[WorkflowStep] = []

        for step in steps:
            valid_deps = tuple(dep for dep in step.dependencies if dep in step_ids)
            if valid_deps != step.dependencies:
                resolved_step = WorkflowStep(
                    step_id=step.step_id,
                    action_id=step.action_id,
                    title=step.title,
                    category=step.category,
                    source=step.source,
                    confidence=step.confidence,
                    dependencies=valid_deps,
                    execution_mode=step.execution_mode,
                    state=step.state,
                    estimated_cost=step.estimated_cost,
                    estimated_duration=step.estimated_duration,
                )
                resolved.append(resolved_step)
            else:
                resolved.append(step)

        return resolved

    def _topological_sort(
        self, steps: list[WorkflowStep]
    ) -> tuple[list[str], list[list[str]]]:
        """Perform topological sort to determine execution order."""
        if not steps:
            return [], []

        graph: dict[str, set[str]] = {}
        in_degree: dict[str, int] = {}

        for step in steps:
            graph[step.step_id] = set()
            in_degree[step.step_id] = 0

        for step in steps:
            for dep_id in step.dependencies:
                if dep_id in graph:
                    graph[dep_id].add(step.step_id)
                    in_degree[step.step_id] += 1

        queue = [step_id for step_id, degree in in_degree.items() if degree == 0]
        ordered: list[str] = []
        parallel_groups: list[list[str]] = []

        while queue:
            queue.sort()
            parallel_groups.append(list(queue))
            next_queue: list[str] = []

            for step_id in queue:
                ordered.append(step_id)
                for neighbor in sorted(graph[step_id]):
                    in_degree[neighbor] -= 1
                    if in_degree[neighbor] == 0:
                        next_queue.append(neighbor)

            queue = next_queue

        if len(ordered) != len(steps):
            raise WorkflowEngineError(
                "Circular dependency detected in workflow",
                issues=["Circular dependency prevents topological sort"],
            )

        return ordered, parallel_groups

    def _find_root_nodes(self, steps: list[WorkflowStep]) -> list[str]:
        """Find root nodes (no dependencies)."""
        return [step.step_id for step in steps if not step.dependencies]

    def _find_leaf_nodes(self, steps: list[WorkflowStep]) -> list[str]:
        """Find leaf nodes (no dependents)."""
        all_deps: set[str] = set()
        for step in steps:
            all_deps.update(step.dependencies)

        return [step.step_id for step in steps if step.step_id not in all_deps]

    def _check_empty(
        self, workflow: Workflow, result: WorkflowValidationResult
    ) -> None:
        if workflow.is_empty:
            result.empty_workflow = True

    def _check_duplicates(
        self, workflow: Workflow, result: WorkflowValidationResult
    ) -> None:
        seen: set[str] = set()
        for step in workflow.steps:
            if step.step_id in seen:
                result.duplicate_steps.append(step.step_id)
            seen.add(step.step_id)

    def _check_missing_dependencies(
        self, workflow: Workflow, result: WorkflowValidationResult
    ) -> None:
        step_ids = {step.step_id for step in workflow.steps}
        for step in workflow.steps:
            for dep in step.dependencies:
                if dep not in step_ids:
                    result.missing_dependencies.append(
                        f"{step.step_id} -> {dep}"
                    )

    def _check_circular_dependencies(
        self, workflow: Workflow, result: WorkflowValidationResult
    ) -> None:
        try:
            self._topological_sort(workflow.steps)
        except WorkflowEngineError:
            result.circular_dependencies.append("Circular dependency detected")

    def _check_execution_order(
        self, workflow: Workflow, result: WorkflowValidationResult
    ) -> None:
        try:
            self.execution_order(workflow)
        except WorkflowEngineError:
            result.invalid_execution_order = True

    def _check_rollback(
        self, workflow: Workflow, result: WorkflowValidationResult
    ) -> None:
        if workflow.rollback_plan is not None:
            if workflow.is_empty and not workflow.rollback_plan.is_empty:
                result.invalid_rollback = True

    def _check_graph(
        self, workflow: Workflow, result: WorkflowValidationResult
    ) -> None:
        graph = self.graph(workflow)
        if not workflow.is_empty and graph.is_empty:
            result.invalid_graph = True

    def _check_execution_mode(
        self, workflow: Workflow, result: WorkflowValidationResult
    ) -> None:
        valid_modes = {ExecutionMode.SEQUENTIAL, ExecutionMode.PARALLEL, ExecutionMode.MIXED}
        if workflow.execution_mode not in valid_modes:
            result.invalid_execution_mode = True

    def _check_state(
        self, workflow: Workflow, result: WorkflowValidationResult
    ) -> None:
        valid_states = {
            ExecutionState.PENDING,
            ExecutionState.RUNNING,
            ExecutionState.COMPLETED,
            ExecutionState.FAILED,
            ExecutionState.SKIPPED,
        }
        for step in workflow.steps:
            if step.state not in valid_states:
                result.invalid_state = True
                break

    def _check_cost(
        self, workflow: Workflow, result: WorkflowValidationResult
    ) -> None:
        if workflow.total_cost.token_cost < 0:
            result.invalid_cost = True
        if workflow.total_cost.compute_cost < 0:
            result.invalid_cost = True
        if workflow.total_cost.total_cost < 0:
            result.invalid_cost = True

    def _check_duration(
        self, workflow: Workflow, result: WorkflowValidationResult
    ) -> None:
        if workflow.total_duration.setup_seconds < 0:
            result.invalid_duration = True
        if workflow.total_duration.execution_seconds < 0:
            result.invalid_duration = True
        if workflow.total_duration.teardown_seconds < 0:
            result.invalid_duration = True
        if workflow.total_duration.total_seconds < 0:
            result.invalid_duration = True
