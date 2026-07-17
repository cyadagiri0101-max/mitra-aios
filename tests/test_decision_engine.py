"""Tests for AIOS EOSDecisionEngine."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from aios.core.config import AIOSConfig
from aios.core.exceptions import DecisionEngineError
from aios.eos.capability_discovery import CapabilityDiscovery
from aios.eos.context_builder import (
    ContextItem,
    EOSContextBuilder,
    ExecutionContext,
)
from aios.eos.decision_engine import (
    DecisionStatistics,
    DecisionValidationResult,
    EOSDecisionEngine,
    ExecutionPlan,
    ExecutionStrategy,
    PlannedAction,
    ReasoningTrace,
)
from aios.eos.knowledge_service import KnowledgeService
from aios.eos.loader import EOS_DIR_NAME, EOSLoader
from aios.eos.registry import RegistryManager

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


def _build_full_stack(
    base: Path,
    registries: dict[str, dict] | None = None,
    token_budget: int = 12_000,
) -> tuple[EOSLoader, RegistryManager, CapabilityDiscovery, KnowledgeService, EOSContextBuilder, EOSDecisionEngine]:
    _make_eos_tree(base, registries=registries)
    loader = EOSLoader(_config(base))
    loader.initialize()
    rm = RegistryManager().initialize(loader)
    cd = CapabilityDiscovery().initialize(rm)
    ks = KnowledgeService().initialize(cd)
    cb = EOSContextBuilder(token_budget=token_budget).initialize(ks)
    de = EOSDecisionEngine().initialize(cb)
    return loader, rm, cd, ks, cb, de


class TestInitialization:
    def test_initialize_with_valid_context_builder(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb, _ = _build_full_stack(Path(tmp))
            de = EOSDecisionEngine()
            result = de.initialize(cb)
            assert result is de
            assert de.is_initialized

    def test_initialize_with_uninitialized_cb_raises(self):
        cb = EOSContextBuilder()
        de = EOSDecisionEngine()
        with pytest.raises(DecisionEngineError, match="must be initialized"):
            de.initialize(cb)

    def test_context_builder_property_raises_before_init(self):
        de = EOSDecisionEngine()
        with pytest.raises(DecisionEngineError, match="not been initialized"):
            _ = de.context_builder


class TestPlan:
    def test_plan_returns_execution_plan(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
            _make_entry("engines::RISK", title="Risk Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp), {"engine": eng_reg})
            plan = de.plan("design a new architecture for the system")
            assert isinstance(plan, ExecutionPlan)
            assert plan.task_description == "design a new architecture for the system"
            assert not plan.is_empty

    def test_plan_empty_task_raises(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            with pytest.raises(DecisionEngineError, match="must not be empty"):
                de.plan("")
            with pytest.raises(DecisionEngineError, match="must not be empty"):
                de.plan("   ")

    def test_plan_has_strategy(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp), {"engine": eng_reg})
            plan = de.plan("architecture design")
            assert isinstance(plan.strategy, ExecutionStrategy)

    def test_plan_has_actions(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp), {"engine": eng_reg})
            plan = de.plan("architecture design")
            assert all(isinstance(a, PlannedAction) for a in plan.actions)

    def test_plan_has_confidence(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp), {"engine": eng_reg})
            plan = de.plan("architecture design")
            assert 0.0 <= plan.overall_confidence <= 1.0

    def test_plan_has_reasoning_trace(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp), {"engine": eng_reg})
            plan = de.plan("architecture design")
            assert isinstance(plan.reasoning_trace, ReasoningTrace)
            assert len(plan.reasoning_trace.steps) > 0

    def test_plan_caches_results(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp), {"engine": eng_reg})
            plan1 = de.plan("architecture design")
            plan2 = de.plan("architecture design")
            assert plan1.strategy == plan2.strategy
            assert len(plan1.actions) == len(plan2.actions)

    def test_plan_deterministic_ordering(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
            _make_entry("engines::RISK", title="Risk Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp), {"engine": eng_reg})
            plan1 = de.plan("architecture risk")
            de.reload()
            plan2 = de.plan("architecture risk")
            ids1 = [a.action_id for a in plan1.actions]
            ids2 = [a.action_id for a in plan2.actions]
            assert ids1 == ids2


class TestEvaluate:
    def test_evaluate_returns_execution_plan(self):
        items = [
            ContextItem("engines::ARCH", "Architecture Engine", "engines", "capability", 10.0, 50),
            ContextItem("engines::RISK", "Risk Engine", "engines", "knowledge", 8.0, 50),
        ]
        context = ExecutionContext(task_description="test", items=items, token_budget=200, tokens_used=100)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            plan = de.evaluate(context)
            assert isinstance(plan, ExecutionPlan)
            assert plan.task_description == "test"

    def test_evaluate_empty_context(self):
        context = ExecutionContext(task_description="test", items=[], token_budget=200, tokens_used=0)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            plan = de.evaluate(context)
            assert plan.is_empty


class TestSelectStrategy:
    def test_select_strategy_sequential_for_knowledge_dominant(self):
        items = [
            ContextItem("k1", "Knowledge 1", "test", "knowledge", 10.0, 50),
            ContextItem("k2", "Knowledge 2", "test", "knowledge", 8.0, 50),
            ContextItem("k3", "Knowledge 3", "test", "knowledge", 6.0, 50),
            ContextItem("c1", "Capability 1", "test", "capability", 5.0, 50),
        ]
        context = ExecutionContext(task_description="test", items=items, token_budget=200, tokens_used=200)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            strategy = de.select_strategy(context)
            assert strategy == ExecutionStrategy.SEQUENTIAL

    def test_select_strategy_parallel_for_capability_dominant(self):
        items = [
            ContextItem("c1", "Capability 1", "test", "capability", 10.0, 50),
            ContextItem("c2", "Capability 2", "test", "capability", 8.0, 50),
            ContextItem("c3", "Capability 3", "test", "capability", 6.0, 50),
            ContextItem("k1", "Knowledge 1", "test", "knowledge", 5.0, 50),
        ]
        context = ExecutionContext(task_description="test", items=items, token_budget=200, tokens_used=200)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            strategy = de.select_strategy(context)
            assert strategy == ExecutionStrategy.PARALLEL

    def test_select_strategy_mixed_for_balanced(self):
        items = [
            ContextItem("c1", "Capability 1", "test", "capability", 10.0, 50),
            ContextItem("k1", "Knowledge 1", "test", "knowledge", 8.0, 50),
        ]
        context = ExecutionContext(task_description="test", items=items, token_budget=200, tokens_used=100)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            strategy = de.select_strategy(context)
            assert strategy == ExecutionStrategy.MIXED

    def test_select_strategy_empty_context(self):
        context = ExecutionContext(task_description="test", items=[], token_budget=200, tokens_used=0)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            strategy = de.select_strategy(context)
            assert strategy == ExecutionStrategy.SEQUENTIAL


class TestRankActions:
    def test_rank_actions_returns_list(self):
        items = [
            ContextItem("engines::ARCH", "Architecture Engine", "engines", "capability", 10.0, 50),
            ContextItem("engines::RISK", "Risk Engine", "engines", "knowledge", 8.0, 50),
        ]
        context = ExecutionContext(task_description="test", items=items, token_budget=200, tokens_used=100)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            actions = de.rank_actions(context)
            assert isinstance(actions, list)
            assert all(isinstance(a, PlannedAction) for a in actions)

    def test_rank_actions_sorted_by_confidence(self):
        items = [
            ContextItem("engines::ARCH", "Architecture Engine", "engines", "capability", 10.0, 50),
            ContextItem("engines::RISK", "Risk Engine", "engines", "knowledge", 8.0, 50),
        ]
        context = ExecutionContext(task_description="test", items=items, token_budget=200, tokens_used=100)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            actions = de.rank_actions(context)
            for i in range(len(actions) - 1):
                assert actions[i].confidence >= actions[i + 1].confidence

    def test_rank_actions_empty_context(self):
        context = ExecutionContext(task_description="test", items=[], token_budget=200, tokens_used=0)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            actions = de.rank_actions(context)
            assert actions == []

    def test_rank_actions_deduplicates(self):
        items = [
            ContextItem("engines::ARCH", "Architecture Engine", "engines", "capability", 10.0, 50),
            ContextItem("engines::ARCH", "Architecture Engine Dup", "engines", "capability", 8.0, 50),
        ]
        context = ExecutionContext(task_description="test", items=items, token_budget=200, tokens_used=100)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            actions = de.rank_actions(context)
            ids = [a.action_id for a in actions]
            assert len(ids) == len(set(ids))


class TestConfidence:
    def test_confidence_returns_float(self):
        actions = [
            PlannedAction("a1", "Action 1", "test", "capability", 0.8, (), "rationale", 0),
            PlannedAction("a2", "Action 2", "test", "knowledge", 0.6, (), "rationale", 1),
        ]
        plan = ExecutionPlan(
            task_description="test",
            strategy=ExecutionStrategy.SEQUENTIAL,
            actions=actions,
            overall_confidence=0.7,
        )
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            confidence = de.confidence(plan)
            assert isinstance(confidence, float)
            assert 0.0 <= confidence <= 1.0

    def test_confidence_empty_plan(self):
        plan = ExecutionPlan(
            task_description="test",
            strategy=ExecutionStrategy.SEQUENTIAL,
            actions=[],
            overall_confidence=0.0,
        )
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            confidence = de.confidence(plan)
            assert confidence == 0.0


class TestExplain:
    def test_explain_returns_reasoning_trace(self):
        trace = ReasoningTrace(
            steps=("step1", "step2"),
            strategy_rationale="test rationale",
            confidence_factors={"factor1": 0.5},
        )
        plan = ExecutionPlan(
            task_description="test",
            strategy=ExecutionStrategy.SEQUENTIAL,
            actions=[],
            overall_confidence=0.5,
            reasoning_trace=trace,
        )
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            result = de.explain(plan)
            assert isinstance(result, ReasoningTrace)
            assert result.strategy_rationale == "test rationale"


class TestValidate:
    def test_validate_valid_plan(self):
        actions = [
            PlannedAction("a1", "Action 1", "test", "capability", 0.8, (), "rationale", 0),
            PlannedAction("a2", "Action 2", "test", "knowledge", 0.6, (), "rationale", 1),
        ]
        plan = ExecutionPlan(
            task_description="test",
            strategy=ExecutionStrategy.SEQUENTIAL,
            actions=actions,
            overall_confidence=0.7,
        )
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            result = de.validate(plan)
            assert isinstance(result, DecisionValidationResult)
            assert result.is_valid

    def test_validate_detects_empty_plan(self):
        plan = ExecutionPlan(
            task_description="test",
            strategy=ExecutionStrategy.SEQUENTIAL,
            actions=[],
            overall_confidence=0.0,
        )
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            result = de.validate(plan)
            assert result.empty_plan

    def test_validate_detects_duplicates(self):
        actions = [
            PlannedAction("a1", "Action 1", "test", "capability", 0.8, (), "rationale", 0),
            PlannedAction("a1", "Action 1 Dup", "test", "capability", 0.6, (), "rationale", 1),
        ]
        plan = ExecutionPlan(
            task_description="test",
            strategy=ExecutionStrategy.SEQUENTIAL,
            actions=actions,
            overall_confidence=0.7,
        )
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            result = de.validate(plan)
            assert not result.is_valid
            assert "a1" in result.duplicate_actions

    def test_validate_detects_missing_rationale(self):
        actions = [
            PlannedAction("a1", "Action 1", "test", "capability", 0.8, (), "", 0),
        ]
        plan = ExecutionPlan(
            task_description="test",
            strategy=ExecutionStrategy.SEQUENTIAL,
            actions=actions,
            overall_confidence=0.8,
        )
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            result = de.validate(plan)
            assert "a1" in result.missing_rationale

    def test_validate_detects_invalid_confidence(self):
        actions = [
            PlannedAction("a1", "Action 1", "test", "capability", 1.5, (), "rationale", 0),
        ]
        plan = ExecutionPlan(
            task_description="test",
            strategy=ExecutionStrategy.SEQUENTIAL,
            actions=actions,
            overall_confidence=0.8,
        )
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            result = de.validate(plan)
            assert not result.is_valid
            assert "a1" in result.invalid_confidence

    def test_validate_detects_missing_dependencies(self):
        actions = [
            PlannedAction("a1", "Action 1", "test", "capability", 0.8, ("a2",), "rationale", 0),
        ]
        plan = ExecutionPlan(
            task_description="test",
            strategy=ExecutionStrategy.SEQUENTIAL,
            actions=actions,
            overall_confidence=0.8,
        )
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            result = de.validate(plan)
            assert not result.is_valid
            assert len(result.missing_dependencies) > 0

    def test_validate_detects_strategy_inconsistency(self):
        actions = [
            PlannedAction("a1", "Action 1", "test", "capability", 0.8, ("a2",), "rationale", 0),
        ]
        plan = ExecutionPlan(
            task_description="test",
            strategy=ExecutionStrategy.PARALLEL,
            actions=actions,
            overall_confidence=0.8,
        )
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp))
            result = de.validate(plan)
            assert result.strategy_inconsistent


class TestStatistics:
    def test_statistics_returns_structure(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp), {"engine": eng_reg})
            stats = de.statistics()
            assert isinstance(stats, DecisionStatistics)
            assert stats.cached_plans == 0
            assert stats.total_plans_generated == 0

    def test_statistics_tracks_plans(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp), {"engine": eng_reg})
            de.plan("architecture design")
            stats = de.statistics()
            assert stats.cached_plans == 1
            assert stats.total_plans_generated == 1
            assert stats.average_confidence > 0.0

    def test_statistics_tracks_strategy_distribution(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp), {"engine": eng_reg})
            de.plan("architecture design")
            stats = de.statistics()
            assert len(stats.strategy_distribution) > 0


class TestReload:
    def test_reload_clears_cache(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp), {"engine": eng_reg})
            de.plan("architecture design")
            assert de.statistics().cached_plans == 1
            result = de.reload()
            assert result is de
            assert de.statistics().cached_plans == 0

    def test_reload_resets_statistics(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp), {"engine": eng_reg})
            de.plan("architecture design")
            de.reload()
            stats = de.statistics()
            assert stats.total_plans_generated == 0
            assert stats.average_confidence == 0.0

    def test_reload_is_idempotent(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, _, de = _build_full_stack(Path(tmp), {"engine": eng_reg})
            de.plan("architecture design")
            de.reload()
            de.reload()
            assert de.statistics().cached_plans == 0


class TestRealRepo:
    def test_plan_real_task(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)
        de = EOSDecisionEngine().initialize(cb)

        plan = de.plan("implement a new API endpoint with validation and testing")
        assert isinstance(plan, ExecutionPlan)
        assert not plan.is_empty
        assert 0.0 <= plan.overall_confidence <= 1.0

    def test_validate_real_plan(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)
        de = EOSDecisionEngine().initialize(cb)

        plan = de.plan("implement a new feature with testing")
        result = de.validate(plan)
        assert isinstance(result, DecisionValidationResult)

    def test_statistics_real_repo(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)
        de = EOSDecisionEngine().initialize(cb)

        de.plan("architecture design review")
        stats = de.statistics()
        assert stats.total_plans_generated > 0
        assert stats.average_confidence > 0.0

    def test_explain_real_plan(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)
        de = EOSDecisionEngine().initialize(cb)

        plan = de.plan("implement a new feature")
        trace = de.explain(plan)
        assert isinstance(trace, ReasoningTrace)
        assert len(trace.steps) > 0
