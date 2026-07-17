"""Tests for AIOS EOSContextBuilder."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from aios.core.config import AIOSConfig
from aios.core.exceptions import ContextBuilderError
from aios.eos.capability_discovery import CapabilityDiscovery
from aios.eos.context_builder import (
    ContextItem,
    ContextStatistics,
    ContextValidationResult,
    EOSContextBuilder,
    ExecutionContext,
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
) -> tuple[EOSLoader, RegistryManager, CapabilityDiscovery, KnowledgeService, EOSContextBuilder]:
    _make_eos_tree(base, registries=registries)
    loader = EOSLoader(_config(base))
    loader.initialize()
    rm = RegistryManager().initialize(loader)
    cd = CapabilityDiscovery().initialize(rm)
    ks = KnowledgeService().initialize(cd)
    cb = EOSContextBuilder(token_budget=token_budget).initialize(ks)
    return loader, rm, cd, ks, cb


class TestInitialization:
    def test_initialize_with_valid_knowledge_service(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks, _ = _build_full_stack(Path(tmp))
            cb = EOSContextBuilder()
            result = cb.initialize(ks)
            assert result is cb
            assert cb.is_initialized

    def test_initialize_with_uninitialized_ks_raises(self):
        ks = KnowledgeService()
        cb = EOSContextBuilder()
        with pytest.raises(ContextBuilderError, match="must be initialized"):
            cb.initialize(ks)

    def test_knowledge_service_property_raises_before_init(self):
        cb = EOSContextBuilder()
        with pytest.raises(ContextBuilderError, match="not been initialized"):
            _ = cb.knowledge_service

    def test_capability_discovery_property_raises_before_init(self):
        cb = EOSContextBuilder()
        with pytest.raises(ContextBuilderError, match="not been initialized"):
            _ = cb.capability_discovery

    def test_custom_token_budget(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks, _ = _build_full_stack(Path(tmp))
            cb = EOSContextBuilder(token_budget=5_000).initialize(ks)
            assert cb._token_budget == 5_000


class TestBuild:
    def test_build_returns_execution_context(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
            _make_entry("engines::RISK", title="Risk Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp), {"engine": eng_reg})
            ctx = cb.build("design a new architecture for the system")
            assert isinstance(ctx, ExecutionContext)
            assert ctx.task_description == "design a new architecture for the system"
            assert not ctx.is_empty

    def test_build_empty_task_raises(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp))
            with pytest.raises(ContextBuilderError, match="must not be empty"):
                cb.build("")
            with pytest.raises(ContextBuilderError, match="must not be empty"):
                cb.build("   ")

    def test_build_items_are_context_items(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp), {"engine": eng_reg})
            ctx = cb.build("architecture design")
            assert all(isinstance(item, ContextItem) for item in ctx.items)

    def test_build_deduplicates_by_id(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        doc_reg = _make_registry("documents", [
            _make_entry("engines::ARCH", title="Architecture Engine Doc", category="engines", path="engines/ARCHITECTURE_ENGINE.md", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(
                Path(tmp), {"engine": eng_reg, "document": doc_reg}
            )
            ctx = cb.build("architecture engine")
            ids = [item.item_id for item in ctx.items]
            assert len(ids) == len(set(ids))

    def test_build_deterministic_ordering(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
            _make_entry("engines::RISK", title="Risk Engine", category="engines", status="Active"),
            _make_entry("engines::QUALITY", title="Quality Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp), {"engine": eng_reg})
            ctx1 = cb.build("engine")
            cb.reload()
            ctx2 = cb.build("engine")
            assert [item.item_id for item in ctx1.items] == [item.item_id for item in ctx2.items]

    def test_build_respects_token_budget(self):
        entries = [
            _make_entry(f"engines::E{i}", title=f"Engine Number {i}" * 20, category="engines", status="Active")
            for i in range(50)
        ]
        eng_reg = _make_registry("engines", entries)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(
                Path(tmp), {"engine": eng_reg}, token_budget=500
            )
            ctx = cb.build("engine")
            assert ctx.tokens_used <= ctx.token_budget

    def test_build_caches_results(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp), {"engine": eng_reg})
            ctx1 = cb.build("architecture design")
            ctx2 = cb.build("architecture design")
            assert [item.item_id for item in ctx1.items] == [item.item_id for item in ctx2.items]

    def test_build_items_sorted_by_score_descending(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
            _make_entry("engines::RISK", title="Risk Analysis Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp), {"engine": eng_reg})
            ctx = cb.build("architecture risk")
            for i in range(len(ctx.items) - 1):
                assert ctx.items[i].score >= ctx.items[i + 1].score

    def test_build_utilization_percent(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp), {"engine": eng_reg})
            ctx = cb.build("architecture")
            assert 0 <= ctx.utilization_percent <= 100

    def test_build_available_tokens(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp), {"engine": eng_reg})
            ctx = cb.build("architecture")
            assert ctx.available_tokens == ctx.token_budget - ctx.tokens_used
            assert ctx.available_tokens >= 0


class TestExpand:
    def test_expand_adds_related_items(self):
        eng_reg = _make_registry("engines", [
            _make_entry(
                "engines::ARCH",
                title="Architecture Engine",
                category="engines",
                status="Active",
                resolved_links=("engines/RISK_ENGINE.md",),
            ),
            _make_entry("engines::RISK", title="Risk Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp), {"engine": eng_reg})
            ctx = cb.build("architecture")
            expanded = cb.expand(ctx)
            assert len(expanded.items) >= len(ctx.items)

    def test_expand_respects_budget(self):
        entries = [
            _make_entry(
                f"engines::E{i}",
                title=f"Engine {i}" * 20,
                category="engines",
                status="Active",
                resolved_links=(f"engines/E{(i+1) % 10}.md",),
            )
            for i in range(10)
        ]
        eng_reg = _make_registry("engines", entries)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(
                Path(tmp), {"engine": eng_reg}, token_budget=500
            )
            ctx = cb.build("engine")
            expanded = cb.expand(ctx)
            assert expanded.tokens_used <= expanded.token_budget

    def test_expand_preserves_task_description(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp), {"engine": eng_reg})
            ctx = cb.build("architecture design")
            expanded = cb.expand(ctx)
            assert expanded.task_description == ctx.task_description

    def test_expand_no_duplicates(self):
        eng_reg = _make_registry("engines", [
            _make_entry(
                "engines::ARCH",
                title="Architecture Engine",
                category="engines",
                status="Active",
                resolved_links=("engines/RISK_ENGINE.md",),
            ),
            _make_entry("engines::RISK", title="Risk Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp), {"engine": eng_reg})
            ctx = cb.build("architecture risk")
            expanded = cb.expand(ctx)
            ids = [item.item_id for item in expanded.items]
            assert len(ids) == len(set(ids))


class TestCompress:
    def test_compress_removes_lowest_scored_items(self):
        items = [
            ContextItem("a", "High", "test", "knowledge", 10.0, 100),
            ContextItem("b", "Medium", "test", "knowledge", 5.0, 100),
            ContextItem("c", "Low", "test", "knowledge", 1.0, 100),
        ]
        ctx = ExecutionContext(
            task_description="test",
            items=items,
            token_budget=200,
            tokens_used=300,
        )
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp))
            compressed = cb.compress(ctx)
            assert compressed.tokens_used <= compressed.token_budget
            assert len(compressed.items) <= 3

    def test_compress_preserves_highest_scored(self):
        items = [
            ContextItem("a", "High", "test", "knowledge", 10.0, 100),
            ContextItem("b", "Medium", "test", "knowledge", 5.0, 100),
            ContextItem("c", "Low", "test", "knowledge", 1.0, 100),
        ]
        ctx = ExecutionContext(
            task_description="test",
            items=items,
            token_budget=200,
            tokens_used=300,
        )
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp))
            compressed = cb.compress(ctx)
            ids = {item.item_id for item in compressed.items}
            assert "a" in ids

    def test_compress_already_under_budget(self):
        items = [
            ContextItem("a", "High", "test", "knowledge", 10.0, 50),
            ContextItem("b", "Medium", "test", "knowledge", 5.0, 50),
        ]
        ctx = ExecutionContext(
            task_description="test",
            items=items,
            token_budget=200,
            tokens_used=100,
        )
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp))
            compressed = cb.compress(ctx)
            assert len(compressed.items) == 2

    def test_compress_empty_context(self):
        ctx = ExecutionContext(task_description="test", items=[], token_budget=200, tokens_used=0)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp))
            compressed = cb.compress(ctx)
            assert compressed.is_empty


class TestRank:
    def test_rank_sorts_by_score_descending(self):
        items = [
            ContextItem("c", "Low", "test", "knowledge", 1.0, 50),
            ContextItem("a", "High", "test", "knowledge", 10.0, 50),
            ContextItem("b", "Medium", "test", "knowledge", 5.0, 50),
        ]
        ctx = ExecutionContext(task_description="test", items=items, token_budget=200, tokens_used=150)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp))
            ranked = cb.rank(ctx)
            assert ranked.items[0].item_id == "a"
            assert ranked.items[1].item_id == "b"
            assert ranked.items[2].item_id == "c"

    def test_rank_deterministic_for_equal_scores(self):
        items = [
            ContextItem("z_item", "Z", "test", "knowledge", 5.0, 50),
            ContextItem("a_item", "A", "test", "knowledge", 5.0, 50),
            ContextItem("m_item", "M", "test", "knowledge", 5.0, 50),
        ]
        ctx = ExecutionContext(task_description="test", items=items, token_budget=200, tokens_used=150)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp))
            ranked = cb.rank(ctx)
            ids = [item.item_id for item in ranked.items]
            assert ids == sorted(ids)

    def test_rank_preserves_task_description(self):
        items = [ContextItem("a", "A", "test", "knowledge", 5.0, 50)]
        ctx = ExecutionContext(task_description="my task", items=items, token_budget=200, tokens_used=50)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp))
            ranked = cb.rank(ctx)
            assert ranked.task_description == "my task"


class TestValidate:
    def test_validate_valid_context(self):
        items = [
            ContextItem("a", "High", "test", "knowledge", 10.0, 50),
            ContextItem("b", "Medium", "test", "knowledge", 5.0, 50),
        ]
        ctx = ExecutionContext(task_description="test", items=items, token_budget=200, tokens_used=100)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp))
            result = cb.validate(ctx)
            assert isinstance(result, ContextValidationResult)
            assert result.is_valid

    def test_validate_detects_duplicates(self):
        items = [
            ContextItem("a", "High", "test", "knowledge", 10.0, 50),
            ContextItem("a", "High Dup", "test", "knowledge", 8.0, 50),
        ]
        ctx = ExecutionContext(task_description="test", items=items, token_budget=200, tokens_used=100)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp))
            result = cb.validate(ctx)
            assert not result.is_valid
            assert "a" in result.duplicate_items

    def test_validate_detects_empty_context(self):
        ctx = ExecutionContext(task_description="test", items=[], token_budget=200, tokens_used=0)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp))
            result = cb.validate(ctx)
            assert result.empty_context
            assert any("empty" in w.lower() for w in result.warnings)

    def test_validate_detects_budget_exceeded(self):
        items = [
            ContextItem("a", "High", "test", "knowledge", 10.0, 150),
            ContextItem("b", "Medium", "test", "knowledge", 5.0, 100),
        ]
        ctx = ExecutionContext(task_description="test", items=items, token_budget=200, tokens_used=250)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp))
            result = cb.validate(ctx)
            assert not result.is_valid
            assert result.budget_exceeded

    def test_validate_detects_unstable_ordering(self):
        items = [
            ContextItem("b", "Low", "test", "knowledge", 1.0, 50),
            ContextItem("a", "High", "test", "knowledge", 10.0, 50),
        ]
        ctx = ExecutionContext(task_description="test", items=items, token_budget=200, tokens_used=100)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp))
            result = cb.validate(ctx)
            assert result.ordering_unstable

    def test_validate_stable_ordering_passes(self):
        items = [
            ContextItem("a", "High", "test", "knowledge", 10.0, 50),
            ContextItem("b", "Low", "test", "knowledge", 1.0, 50),
        ]
        ctx = ExecutionContext(task_description="test", items=items, token_budget=200, tokens_used=100)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp))
            result = cb.validate(ctx)
            assert not result.ordering_unstable


class TestStatistics:
    def test_statistics_returns_structure(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp), {"engine": eng_reg})
            stats = cb.statistics()
            assert isinstance(stats, ContextStatistics)
            assert stats.default_token_budget == 12_000
            assert stats.cached_contexts == 0

    def test_statistics_tracks_cached_contexts(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp), {"engine": eng_reg})
            cb.build("architecture design")
            stats = cb.statistics()
            assert stats.cached_contexts == 1

    def test_statistics_counts_capabilities_and_knowledge(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
            _make_entry("engines::RISK", title="Risk Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp), {"engine": eng_reg})
            stats = cb.statistics()
            assert stats.capability_count >= 2
            assert stats.knowledge_count >= 0
            assert stats.total_items_available >= 2


class TestReload:
    def test_reload_clears_cache(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp), {"engine": eng_reg})
            cb.build("architecture design")
            assert cb.statistics().cached_contexts == 1
            result = cb.reload()
            assert result is cb
            assert cb.statistics().cached_contexts == 0

    def test_reload_is_idempotent(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, _, cb = _build_full_stack(Path(tmp), {"engine": eng_reg})
            cb.build("architecture design")
            cb.reload()
            cb.reload()
            assert cb.statistics().cached_contexts == 0


class TestRealRepo:
    def test_build_real_task(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)

        ctx = cb.build("implement a new API endpoint with validation and testing")
        assert isinstance(ctx, ExecutionContext)
        assert not ctx.is_empty
        assert ctx.tokens_used <= ctx.token_budget

    def test_expand_real_context(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)

        ctx = cb.build("architecture design review")
        expanded = cb.expand(ctx)
        assert isinstance(expanded, ExecutionContext)
        assert expanded.tokens_used <= expanded.token_budget

    def test_validate_real_context(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)

        ctx = cb.build("implement a new feature with testing")
        result = cb.validate(ctx)
        assert isinstance(result, ContextValidationResult)
        assert result.is_valid
        assert not result.ordering_unstable

    def test_statistics_real_repo(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)

        stats = cb.statistics()
        assert stats.capability_count > 0
        assert stats.knowledge_count > 0
        assert stats.total_items_available > 0

    def test_compress_real_context(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder(token_budget=500).initialize(ks)

        ctx = cb.build("architecture design review with validation")
        assert ctx.tokens_used <= ctx.token_budget

    def test_rank_real_context(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)
        cb = EOSContextBuilder().initialize(ks)

        ctx = cb.build("implement a new feature")
        ranked = cb.rank(ctx)
        for i in range(len(ranked.items) - 1):
            assert ranked.items[i].score >= ranked.items[i + 1].score
