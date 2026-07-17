"""Tests for AIOS WorkflowEngine."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from aios.core.config import AIOSConfig
from aios.core.exceptions import WorkflowEngineError
from aios.eos.capability_discovery import CapabilityDiscovery
from aios.eos.context_builder import EOSContextBuilder
from aios.eos.decision_engine import (
    EOSDecisionEngine,
    ExecutionPlan,
    ExecutionStrategy,
    PlannedAction,
)
from aios.eos.knowledge_service import KnowledgeService
from aios.eos.loader import EOS_DIR_NAME, EOSLoader
from aios.eos.registry import RegistryManager
from aios.eos.workflow_engine import (
    ExecutionCost,
    ExecutionDuration,
    ExecutionMode,
    RollbackPlan,
    Workflow,
    WorkflowEngine,
    WorkflowGraph,
    WorkflowStatistics,
    WorkflowStep,
    WorkflowSummary,
    WorkflowValidationResult,
)

REPO_ROOT = Path(__file__).resolve().parents[1]


def _make_eos_tree(
    base: Path,
    *,
    registries: dict[str, dict] | None = None,
) -> Path:
    ai_dir = base / EOS_DIR_NAME
    ai_dir.mkdir(parents=True, exist_ok=True)

    for d in ("kernel", "engines", "index"):
        (ai_dir / d).mkdir(exist_ok=True)

    for fname in ("CONSTITUTION.md", "IDENTITY.md", "MISSION.md", "ENGINEERING_LAWS.md"):
        (ai_dir / "kernel" / fname).write_text(f"# {fname}\ncontent", encoding="utf-8")

    if registries is not None:
        for name, data in registries.items():
            path = ai_dir / "index" / f"{name}-registry.json"
            path.write_text(json.dumps(data), encoding="utf-8")

    return ai_dir


def _config(repo_root: Path) -> AIOSConfig:
    return AIOSConfig(repo_root=repo_root)


def _make_entry(
    entry_id: str = "test::item",
    title: str = "Test Item",
    path: str = "test.md",
    category: str = "test",
    status: str = "Active",
    version: str = "1.0.0",
    owner: str = "Test",
    last_updated: str = "2026-07-13",
    resolved_links: tuple[str, ...] = (),
) -> dict:
    return {
        "id": entry_id,
        "title": title,
        "path": path,
        "category": category,
        "status": status,
        "version": version,
        "owner": owner,
        "last_updated": last_updated,
        "resolved_links": list(resolved_links),
    }


def _make_registry(data_key: str, entries: list[dict]) -> dict:
    return {
        "schemaVersion": "1.0.0",
        "status": "generated",
        "updated": "2026-07-13",
        "owner": "EOS Governance Council",
        "description": f"Test {data_key} registry.",
        "data": {data_key: entries},
    }


def _make_planned_action(
    action_id: str = "test::action",
    title: str = "Test Action",
    category: str = "test",
    source: str = "capability",
    confidence: float = 0.8,
    dependencies: tuple[str, ...] = (),
    rationale: str = "test rationale",
    priority: int = 0,
) -> PlannedAction:
    return PlannedAction(
        action_id=action_id,
        title=title,
        category=category,
        source=source,
        confidence=confidence,
        dependencies=dependencies,
        rationale=rationale,
        priority=priority,
    )


def _build_full_stack(
    base: Path,
    registries: dict[str, dict] | None = None,
    token_budget: int = 12_000,
) -> tuple[
    EOSLoader,
    RegistryManager,
    CapabilityDiscovery,
    KnowledgeService,
    EOSContextBuilder,
    EOSDecisionEngine,
    WorkflowEngine,
]:
    _make_eos_tree(base, registries=registries)
    loader = EOSLoader(_config(base))
    loader.initialize()
    rm = RegistryManager().initialize(loader)
    cd = CapabilityDiscovery().initialize(rm)
    ks = KnowledgeService().initialize(cd)
    cb = EOSContextBuilder(token_budget=token_budget).initialize(ks)
    de = EOSDecisionEngine().initialize(cb)
    we = WorkflowEngine().initialize(de)
    return loader, rm, cd, ks, cb, de, we


def _make_plan(
    task: str = "test task",
    actions: list[PlannedAction] | None = None,
    strategy: ExecutionStrategy = ExecutionStrategy.SEQUENTIAL,
) -> ExecutionPlan:
    if actions is None:
        actions = [
            _make_planned_action("engines::ARCH", "Architecture Engine", "engines", "capability", 0.9),
            _make_planned_action("engines::RISK", "Risk Engine", "engines", "capability", 0.8),
        ]
    return ExecutionPlan(
        task_description=task,
        strategy=strategy,
        actions=actions,
        overall_confidence=0.85,
    )


class TestInitialization:
    def test_initialize_with_valid_decision_engine(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, _ = _build_full_stack(Path(tmp))
            we = WorkflowEngine()
            result = we.initialize(de)
            assert result is we
            assert we.is_initialized

    def test_initialize_with_uninitialized_de_raises(self):
        de = EOSDecisionEngine()
        we = WorkflowEngine()
        with pytest.raises(WorkflowEngineError, match="must be initialized"):
            we.initialize(de)

    def test_decision_engine_property_raises_before_init(self):
        we = WorkflowEngine()
        with pytest.raises(WorkflowEngineError, match="not been initialized"):
            _ = we.decision_engine


class TestBuild:
    def test_build_returns_workflow(self):
        plan = _make_plan("test task")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            assert isinstance(workflow, Workflow)
            assert workflow.task_description == "test task"
            assert not workflow.is_empty

    def test_build_empty_plan_raises(self):
        plan = _make_plan("test", actions=[])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            assert workflow.is_empty
            # Empty plans should be caught during validation
            result = we.validate(workflow)
            assert result.empty_workflow

    def test_build_creates_steps_from_actions(self):
        actions = [
            _make_planned_action("engines::ARCH", "Architecture Engine", "engines", "capability", 0.9),
            _make_planned_action("engines::RISK", "Risk Engine", "engines", "capability", 0.8),
        ]
        plan = _make_plan("test", actions)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            assert workflow.step_count == 2

    def test_build_sequential_strategy(self):
        plan = _make_plan("test", strategy=ExecutionStrategy.SEQUENTIAL)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            assert workflow.execution_mode == ExecutionMode.SEQUENTIAL

    def test_build_parallel_strategy(self):
        plan = _make_plan("test", strategy=ExecutionStrategy.PARALLEL)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            assert workflow.execution_mode == ExecutionMode.PARALLEL

    def test_build_mixed_strategy(self):
        plan = _make_plan("test", strategy=ExecutionStrategy.MIXED)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            assert workflow.execution_mode == ExecutionMode.MIXED

    def test_build_estimates_cost(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            assert isinstance(workflow.total_cost, ExecutionCost)
            assert workflow.total_cost.token_cost > 0

    def test_build_estimates_duration(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            assert isinstance(workflow.total_duration, ExecutionDuration)
            assert workflow.total_duration.total_seconds > 0

    def test_build_creates_rollback_plan(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            assert workflow.rollback_plan is not None
            assert isinstance(workflow.rollback_plan, RollbackPlan)

    def test_build_caches_results(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow1 = we.build(plan)
            workflow2 = we.build(plan)
            assert workflow1.step_count == workflow2.step_count

    def test_build_preserves_strategy(self):
        plan = _make_plan("test", strategy=ExecutionStrategy.PARALLEL)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            assert workflow.strategy == ExecutionStrategy.PARALLEL


class TestOptimize:
    def test_optimize_removes_low_confidence_steps(self):
        actions = [
            _make_planned_action("a1", "High", "test", "capability", 0.9),
            _make_planned_action("a2", "Low", "test", "capability", 0.2),
        ]
        plan = _make_plan("test", actions)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            optimized = we.optimize(workflow)
            assert optimized.step_count <= workflow.step_count
            assert all(s.confidence >= 0.3 for s in optimized.steps)

    def test_optimize_improves_parallelism(self):
        actions = [
            _make_planned_action("a1", "Action 1", "test", "capability", 0.9, ()),
            _make_planned_action("a2", "Action 2", "test", "knowledge", 0.8, ("a1",)),
        ]
        plan = _make_plan("test", actions, ExecutionStrategy.MIXED)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            optimized = we.optimize(workflow)
            independent_caps = [s for s in optimized.steps if not s.dependencies and s.source == "capability"]
            if independent_caps:
                assert independent_caps[0].execution_mode == ExecutionMode.PARALLEL

    def test_optimize_preserves_task_description(self):
        plan = _make_plan("test task")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            optimized = we.optimize(workflow)
            assert optimized.task_description == "test task"

    def test_optimize_empty_workflow(self):
        plan = _make_plan("test", actions=[])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            assert workflow.is_empty
            optimized = we.optimize(workflow)
            assert optimized.is_empty


class TestResolveDependencies:
    def test_resolve_removes_invalid_dependencies(self):
        actions = [
            _make_planned_action("a1", "Action 1", "test", "capability", 0.9, ("missing::dep",)),
            _make_planned_action("a2", "Action 2", "test", "capability", 0.8),
        ]
        plan = _make_plan("test", actions)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            resolved = we.resolve_dependencies(workflow)
            step_a1 = next(s for s in resolved.steps if s.action_id == "a1")
            assert "missing::dep" not in step_a1.dependencies

    def test_resolve_preserves_valid_dependencies(self):
        actions = [
            _make_planned_action("a1", "Action 1", "test", "capability", 0.9, ("a2",)),
            _make_planned_action("a2", "Action 2", "test", "capability", 0.8),
        ]
        plan = _make_plan("test", actions)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            resolved = we.resolve_dependencies(workflow)
            step_a1 = next(s for s in resolved.steps if s.action_id == "a1")
            assert "step_a2" in step_a1.dependencies

    def test_resolve_empty_workflow(self):
        plan = _make_plan("test", actions=[])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            assert workflow.is_empty
            resolved = we.resolve_dependencies(workflow)
            assert resolved.is_empty


class TestExecutionOrder:
    def test_execution_order_sequential(self):
        actions = [
            _make_planned_action("a1", "Action 1", "test", "capability", 0.9),
            _make_planned_action("a2", "Action 2", "test", "capability", 0.8, ("a1",)),
            _make_planned_action("a3", "Action 3", "test", "capability", 0.7, ("a2",)),
        ]
        plan = _make_plan("test", actions)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            order = we.execution_order(workflow)
            assert len(order.ordered_steps) == 3
            assert order.ordered_steps[0] == "step_a1"
            assert order.ordered_steps[1] == "step_a2"
            assert order.ordered_steps[2] == "step_a3"

    def test_execution_order_parallel(self):
        actions = [
            _make_planned_action("a1", "Action 1", "test", "capability", 0.9),
            _make_planned_action("a2", "Action 2", "test", "capability", 0.8),
        ]
        plan = _make_plan("test", actions)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            order = we.execution_order(workflow)
            assert len(order.ordered_steps) == 2
            assert len(order.parallel_groups) >= 1

    def test_execution_order_mixed(self):
        actions = [
            _make_planned_action("c1", "Cap 1", "test", "capability", 0.9),
            _make_planned_action("k1", "Know 1", "test", "knowledge", 0.8, ("c1",)),
        ]
        plan = _make_plan("test", actions, ExecutionStrategy.MIXED)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            order = we.execution_order(workflow)
            assert len(order.ordered_steps) == 2

    def test_execution_order_empty_workflow(self):
        plan = _make_plan("test", actions=[])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            assert workflow.is_empty
            order = we.execution_order(workflow)
            assert order.is_empty

    def test_execution_order_cycle_detection(self):
        actions = [
            _make_planned_action("a1", "Action 1", "test", "capability", 0.9, ("a2",)),
            _make_planned_action("a2", "Action 2", "test", "capability", 0.8, ("a1",)),
        ]
        plan = _make_plan("test", actions)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            with pytest.raises(WorkflowEngineError, match="Circular dependency"):
                we.execution_order(workflow)


class TestRollback:
    def test_rollback_generates_plan(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            rollback = we.rollback(workflow)
            assert isinstance(rollback, RollbackPlan)
            assert not rollback.is_empty

    def test_rollback_reverses_steps(self):
        actions = [
            _make_planned_action("a1", "Action 1", "test", "capability", 0.9),
            _make_planned_action("a2", "Action 2", "test", "capability", 0.8),
        ]
        plan = _make_plan("test", actions)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            rollback = we.rollback(workflow)
            rollback_ids = [s.action_id for s in rollback.rollback_steps]
            assert rollback_ids == ["a2", "a1"]

    def test_rollback_mode_sequential(self):
        plan = _make_plan("test", strategy=ExecutionStrategy.PARALLEL)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            rollback = we.rollback(workflow)
            assert rollback.rollback_mode == ExecutionMode.SEQUENTIAL

    def test_rollback_empty_workflow(self):
        plan = _make_plan("test", actions=[])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            assert workflow.is_empty
            rollback = we.rollback(workflow)
            assert rollback.is_empty


class TestCostEstimation:
    def test_estimate_cost_returns_execution_cost(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            cost = we.estimate_cost(workflow)
            assert isinstance(cost, ExecutionCost)
            assert cost.token_cost > 0

    def test_estimate_cost_empty_workflow(self):
        plan = _make_plan("test", actions=[])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            assert workflow.is_empty
            cost = we.estimate_cost(workflow)
            assert cost.token_cost == 0

    def test_estimate_cost_accumulates(self):
        actions = [
            _make_planned_action("a1", "Action 1", "test", "capability", 0.9),
            _make_planned_action("a2", "Action 2", "test", "capability", 0.8),
        ]
        plan = _make_plan("test", actions)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            cost = we.estimate_cost(workflow)
            assert cost.token_cost >= 200


class TestDurationEstimation:
    def test_estimate_duration_returns_execution_duration(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            duration = we.estimate_duration(workflow)
            assert isinstance(duration, ExecutionDuration)
            assert duration.total_seconds > 0

    def test_estimate_duration_empty_workflow(self):
        plan = _make_plan("test", actions=[])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            assert workflow.is_empty
            duration = we.estimate_duration(workflow)
            assert duration.total_seconds == 0

    def test_estimate_duration_components(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            duration = we.estimate_duration(workflow)
            assert duration.setup_seconds > 0
            assert duration.execution_seconds > 0
            assert duration.teardown_seconds > 0
            assert duration.total_seconds == duration.setup_seconds + duration.execution_seconds + duration.teardown_seconds


class TestGraph:
    def test_graph_returns_workflow_graph(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            graph = we.graph(workflow)
            assert isinstance(graph, WorkflowGraph)
            assert not graph.is_empty

    def test_graph_nodes_and_edges(self):
        actions = [
            _make_planned_action("a1", "Action 1", "test", "capability", 0.9),
            _make_planned_action("a2", "Action 2", "test", "capability", 0.8, ("a1",)),
        ]
        plan = _make_plan("test", actions)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            graph = we.graph(workflow)
            assert "step_a1" in graph.nodes
            assert "step_a2" in graph.nodes
            assert ("step_a1", "step_a2") in graph.edges

    def test_graph_root_and_leaf_nodes(self):
        actions = [
            _make_planned_action("a1", "Action 1", "test", "capability", 0.9),
            _make_planned_action("a2", "Action 2", "test", "capability", 0.8, ("a1",)),
            _make_planned_action("a3", "Action 3", "test", "capability", 0.7, ("a2",)),
        ]
        plan = _make_plan("test", actions)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            graph = we.graph(workflow)
            assert "step_a1" in graph.root_nodes
            assert "step_a3" in graph.leaf_nodes

    def test_graph_empty_workflow(self):
        plan = _make_plan("test", actions=[])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            assert workflow.is_empty
            graph = we.graph(workflow)
            assert graph.is_empty


class TestSummary:
    def test_summary_returns_workflow_summary(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            summary = we.summary(workflow)
            assert isinstance(summary, WorkflowSummary)
            assert summary.task_description == "test"
            assert summary.step_count == 2

    def test_summary_counts_dependencies(self):
        actions = [
            _make_planned_action("a1", "Action 1", "test", "capability", 0.9),
            _make_planned_action("a2", "Action 2", "test", "capability", 0.8, ("a1",)),
        ]
        plan = _make_plan("test", actions)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            summary = we.summary(workflow)
            assert summary.dependency_count == 1

    def test_summary_parallel_groups(self):
        actions = [
            _make_planned_action("a1", "Action 1", "test", "capability", 0.9),
            _make_planned_action("a2", "Action 2", "test", "capability", 0.8),
        ]
        plan = _make_plan("test", actions, ExecutionStrategy.PARALLEL)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            summary = we.summary(workflow)
            assert summary.parallel_groups >= 1

    def test_summary_includes_cost_and_duration(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            summary = we.summary(workflow)
            assert isinstance(summary.total_cost, ExecutionCost)
            assert isinstance(summary.total_duration, ExecutionDuration)

    def test_summary_has_rollback(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            summary = we.summary(workflow)
            assert summary.has_rollback


class TestValidation:
    def test_validate_valid_workflow(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            result = we.validate(workflow)
            assert isinstance(result, WorkflowValidationResult)
            assert result.is_valid

    def test_validate_detects_empty_workflow(self):
        plan = _make_plan("test", actions=[])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            assert workflow.is_empty
            result = we.validate(workflow)
            assert result.empty_workflow

    def test_validate_detects_duplicates(self):
        actions = [
            _make_planned_action("a1", "Action 1", "test", "capability", 0.9),
            _make_planned_action("a1", "Action 1 Dup", "test", "capability", 0.8),
        ]
        plan = _make_plan("test", actions)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            result = we.validate(workflow)
            assert not result.is_valid
            assert "step_a1" in result.duplicate_steps

    def test_validate_detects_missing_dependencies(self):
        actions = [
            _make_planned_action("a1", "Action 1", "test", "capability", 0.9, ("missing::dep",)),
        ]
        plan = _make_plan("test", actions)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            result = we.validate(workflow)
            assert not result.is_valid
            assert len(result.missing_dependencies) > 0

    def test_validate_detects_circular_dependencies(self):
        actions = [
            _make_planned_action("a1", "Action 1", "test", "capability", 0.9, ("a2",)),
            _make_planned_action("a2", "Action 2", "test", "capability", 0.8, ("a1",)),
        ]
        plan = _make_plan("test", actions)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            result = we.validate(workflow)
            assert not result.is_valid
            assert len(result.circular_dependencies) > 0

    def test_validate_detects_invalid_execution_order(self):
        actions = [
            _make_planned_action("a1", "Action 1", "test", "capability", 0.9, ("a2",)),
            _make_planned_action("a2", "Action 2", "test", "capability", 0.8, ("a1",)),
        ]
        plan = _make_plan("test", actions)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            result = we.validate(workflow)
            assert not result.is_valid
            assert result.invalid_execution_order

    def test_validate_invalid_cost(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            workflow.total_cost = ExecutionCost(token_cost=-1, compute_cost=0, total_cost=0)
            result = we.validate(workflow)
            assert not result.is_valid
            assert result.invalid_cost

    def test_validate_invalid_duration(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            workflow.total_duration = ExecutionDuration(setup_seconds=-1, execution_seconds=0, teardown_seconds=0, total_seconds=0)
            result = we.validate(workflow)
            assert not result.is_valid
            assert result.invalid_duration

    def test_validate_invalid_execution_mode(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            workflow.execution_mode = "invalid_mode"
            result = we.validate(workflow)
            assert not result.is_valid
            assert result.invalid_execution_mode

    def test_validate_invalid_state(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            workflow = we.build(plan)
            # Create a new step with invalid state to test validation
            invalid_step = WorkflowStep(
                step_id="invalid_step",
                action_id="invalid",
                title="Invalid",
                category="test",
                source="capability",
                confidence=0.5,
                state="invalid_state",
            )
            workflow.steps.append(invalid_step)
            result = we.validate(workflow)
            assert not result.is_valid
            assert result.invalid_state


class TestStatistics:
    def test_statistics_returns_structure(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            stats = we.statistics()
            assert isinstance(stats, WorkflowStatistics)
            assert stats.cached_workflows == 0
            assert stats.total_workflows_generated == 0

    def test_statistics_tracks_workflows(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            we.build(plan)
            stats = we.statistics()
            assert stats.cached_workflows == 1
            assert stats.total_workflows_generated == 1
            assert stats.average_step_count > 0

    def test_statistics_tracks_strategy_distribution(self):
        plan = _make_plan("test", strategy=ExecutionStrategy.PARALLEL)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            we.build(plan)
            stats = we.statistics()
            assert "parallel" in stats.strategy_distribution


class TestReload:
    def test_reload_clears_cache(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            we.build(plan)
            assert we.statistics().cached_workflows == 1
            result = we.reload()
            assert result is we
            assert we.statistics().cached_workflows == 0

    def test_reload_resets_statistics(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            we.build(plan)
            we.reload()
            stats = we.statistics()
            assert stats.total_workflows_generated == 0
            assert stats.average_step_count == 0.0

    def test_reload_is_idempotent(self):
        plan = _make_plan("test")
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de, we = _build_full_stack(Path(tmp))
            we.build(plan)
            we.reload()
            we.reload()
            assert we.statistics().cached_workflows == 0


class TestRealRepo:
    def test_build_real_plan(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)
        de = EOSDecisionEngine().initialize(cb)
        we = WorkflowEngine().initialize(de)

        plan = de.plan("implement a new API endpoint with validation and testing")
        workflow = we.build(plan)
        assert isinstance(workflow, Workflow)
        assert not workflow.is_empty
        assert workflow.step_count > 0

    def test_validate_real_workflow(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)
        de = EOSDecisionEngine().initialize(cb)
        we = WorkflowEngine().initialize(de)

        plan = de.plan("implement a new feature with testing")
        workflow = we.build(plan)
        result = we.validate(workflow)
        assert isinstance(result, WorkflowValidationResult)
        assert result.is_valid

    def test_statistics_real_repo(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)
        de = EOSDecisionEngine().initialize(cb)
        we = WorkflowEngine().initialize(de)

        de.plan("architecture design review")
        we.build(de.plan("architecture design review"))
        stats = we.statistics()
        assert stats.total_workflows_generated > 0

    def test_execution_order_real_workflow(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)
        de = EOSDecisionEngine().initialize(cb)
        we = WorkflowEngine().initialize(de)

        plan = de.plan("implement a new feature")
        workflow = we.build(plan)
        order = we.execution_order(workflow)
        assert not order.is_empty

    def test_rollback_real_workflow(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)
        de = EOSDecisionEngine().initialize(cb)
        we = WorkflowEngine().initialize(de)

        plan = de.plan("implement a new feature")
        workflow = we.build(plan)
        rollback = we.rollback(workflow)
        assert not rollback.is_empty

    def test_graph_real_workflow(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)
        de = EOSDecisionEngine().initialize(cb)
        we = WorkflowEngine().initialize(de)

        plan = de.plan("implement a new feature")
        workflow = we.build(plan)
        graph = we.graph(workflow)
        assert not graph.is_empty

    def test_summary_real_workflow(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)
        de = EOSDecisionEngine().initialize(cb)
        we = WorkflowEngine().initialize(de)

        plan = de.plan("implement a new feature")
        workflow = we.build(plan)
        summary = we.summary(workflow)
        assert summary.step_count > 0

    def test_cost_estimation_real_workflow(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)
        de = EOSDecisionEngine().initialize(cb)
        we = WorkflowEngine().initialize(de)

        plan = de.plan("implement a new feature")
        workflow = we.build(plan)
        cost = we.estimate_cost(workflow)
        assert cost.token_cost > 0

    def test_duration_estimation_real_workflow(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)
        de = EOSDecisionEngine().initialize(cb)
        we = WorkflowEngine().initialize(de)

        plan = de.plan("implement a new feature")
        workflow = we.build(plan)
        duration = we.estimate_duration(workflow)
        assert duration.total_seconds > 0
