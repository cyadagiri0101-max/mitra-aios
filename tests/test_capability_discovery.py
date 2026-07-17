"""Tests for AIOS CapabilityDiscovery."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from aios.core.config import AIOSConfig
from aios.core.exceptions import CapabilityDiscoveryError
from aios.eos.capability_discovery import (
    Capability,
    CapabilityDiscovery,
    CapabilityMatch,
    CapabilityValidationResult,
)
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


def _build_stack(
    base: Path,
    registries: dict[str, dict] | None = None,
) -> tuple[EOSLoader, RegistryManager, CapabilityDiscovery]:
    _make_eos_tree(base, registries=registries)
    loader = EOSLoader(_config(base))
    loader.initialize()
    rm = RegistryManager().initialize(loader)
    cd = CapabilityDiscovery().initialize(rm)
    return loader, rm, cd


class TestInitialization:
    def test_initialize_with_valid_registry_manager(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, rm, _ = _build_stack(Path(tmp))
            cd = CapabilityDiscovery()
            result = cd.initialize(rm)
            assert result is cd
            assert cd.is_initialized

    def test_initialize_with_uninitialized_rm_raises(self):
        rm = RegistryManager()
        cd = CapabilityDiscovery()
        with pytest.raises(CapabilityDiscoveryError, match="must be initialized"):
            cd.initialize(rm)

    def test_registry_manager_property_raises_before_init(self):
        cd = CapabilityDiscovery()
        with pytest.raises(CapabilityDiscoveryError, match="not been initialized"):
            _ = cd.registry_manager


class TestDiscover:
    def test_discover_aggregates_all_registries(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines"),
        ])
        agent_reg = _make_registry("agents", [
            _make_entry("agents::arch", title="Architect Agent", category="agents"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(
                Path(tmp),
                {"engine": eng_reg, "agent": agent_reg},
            )
            caps = cd.discover()
            assert len(caps) >= 2
            ids = {c.entry.id for c in caps}
            assert "engines::ARCH" in ids
            assert "agents::arch" in ids

    def test_discover_marks_deprecated(self):
        reg = _make_registry("engines", [
            _make_entry("engines::OLD", title="Old Engine", status="Deprecated"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            caps = cd.discover()
            dep = [c for c in caps if c.entry.id == "engines::OLD"]
            assert len(dep) == 1
            assert dep[0].is_deprecated

    def test_discover_returns_capability_objects(self):
        reg = _make_registry("engines", [
            _make_entry("engines::TEST", title="Test Engine"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            caps = cd.discover()
            assert all(isinstance(c, Capability) for c in caps)
            assert all(c.source_registry == "engine" for c in caps)


class TestFind:
    def test_find_returns_capability_by_id(self):
        reg = _make_registry("engines", [
            _make_entry("engines::RISK", title="Risk Engine"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            cap = cd.find("engines::RISK")
            assert cap is not None
            assert cap.entry.title == "Risk Engine"

    def test_find_returns_none_for_unknown_id(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp))
            assert cd.find("nonexistent::ID") is None


class TestSearch:
    def test_search_by_title(self):
        reg = _make_registry("engines", [
            _make_entry("engines::RISK", title="Risk Engine", category="engines"),
            _make_entry("engines::QUALITY", title="Quality Engine", category="engines"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            results = cd.search("risk")
            assert len(results) >= 1
            assert results[0].capability.entry.id == "engines::RISK"

    def test_search_by_category(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::A", title="Engine A", category="engines"),
        ])
        agent_reg = _make_registry("agents", [
            _make_entry("agents::B", title="Agent B", category="agents"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(
                Path(tmp), {"engine": eng_reg, "agent": agent_reg}
            )
            results = cd.search("engines")
            assert any(r.capability.entry.id == "engines::A" for r in results)

    def test_search_returns_scored_matches(self):
        reg = _make_registry("engines", [
            _make_entry("engines::TEST", title="Test Engine"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            results = cd.search("test engine")
            assert len(results) >= 1
            assert isinstance(results[0], CapabilityMatch)
            assert results[0].score > 0
            assert results[0].match_reason

    def test_search_empty_query_returns_empty(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp))
            assert cd.search("") == []
            assert cd.search("   ") == []

    def test_search_no_match_returns_empty(self):
        reg = _make_registry("engines", [
            _make_entry("engines::RISK", title="Risk Engine"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            results = cd.search("zzzznonexistent")
            assert results == []

    def test_search_ranks_by_relevance(self):
        reg = _make_registry("engines", [
            _make_entry("engines::RISK", title="Risk Engine", category="engines"),
            _make_entry("engines::RISK_ASSESS", title="Risk Assessment Tool", category="engines"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            results = cd.search("risk engine")
            assert len(results) >= 2
            assert results[0].score >= results[1].score

    def test_search_filters_stop_words(self):
        reg = _make_registry("engines", [
            _make_entry("engines::TEST", title="Test Engine"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            results = cd.search("the and test")
            assert len(results) >= 1

    def test_search_matches_resolved_links(self):
        reg = _make_registry("engines", [
            _make_entry(
                "engines::ARCH",
                title="Architecture Engine",
                resolved_links=("kernel/CONSTITUTION.md",),
            ),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            results = cd.search("constitution")
            assert len(results) >= 1


class TestRecommend:
    def test_recommend_returns_ranked_capabilities(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
            _make_entry("engines::RISK", title="Risk Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": eng_reg})
            results = cd.recommend("design a new architecture for the system")
            assert len(results) >= 1
            assert all(isinstance(r, CapabilityMatch) for r in results)

    def test_recommend_excludes_deprecated(self):
        reg = _make_registry("engines", [
            _make_entry("engines::OLD", title="Old Architecture", status="Deprecated"),
            _make_entry("engines::NEW", title="New Architecture", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            results = cd.recommend("architecture design")
            ids = {r.capability.entry.id for r in results}
            assert "engines::OLD" not in ids

    def test_recommend_respects_limit(self):
        entries = [
            _make_entry(f"engines::E{i}", title=f"Engine {i}", status="Active")
            for i in range(20)
        ]
        reg = _make_registry("engines", entries)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            results = cd.recommend("engine", limit=5)
            assert len(results) <= 5

    def test_recommend_empty_description_returns_empty(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp))
            assert cd.recommend("") == []

    def test_recommend_boosts_active_status(self):
        reg = _make_registry("engines", [
            _make_entry("engines::ACTIVE", title="Test Engine", status="Active"),
            _make_entry("engines::DRAFT", title="Test Engine Draft", status="Draft"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            results = cd.recommend("test engine")
            if len(results) >= 2:
                active_idx = next(
                    (i for i, r in enumerate(results) if r.capability.entry.id == "engines::ACTIVE"),
                    None,
                )
                draft_idx = next(
                    (i for i, r in enumerate(results) if r.capability.entry.id == "engines::DRAFT"),
                    None,
                )
                if active_idx is not None and draft_idx is not None:
                    assert active_idx < draft_idx


class TestByCategory:
    def test_by_category_returns_matching(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::A", title="Engine A", category="engines"),
            _make_entry("engines::B", title="Engine B", category="engines"),
        ])
        agent_reg = _make_registry("agents", [
            _make_entry("agents::C", title="Agent C", category="agents"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(
                Path(tmp), {"engine": eng_reg, "agent": agent_reg}
            )
            engines = cd.by_category("engines")
            assert len(engines) == 2
            assert all(c.entry.category == "engines" for c in engines)

    def test_by_category_empty_for_unknown(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp))
            assert cd.by_category("nonexistent") == []


class TestStatusFilters:
    def test_implemented_returns_active(self):
        reg = _make_registry("engines", [
            _make_entry("engines::A", status="Active"),
            _make_entry("engines::B", status="Deprecated"),
            _make_entry("engines::C", status="Draft"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            active = cd.implemented()
            assert len(active) == 1
            assert active[0].entry.id == "engines::A"

    def test_pending_returns_draft_and_scaffolding(self):
        reg = _make_registry("engines", [
            _make_entry("engines::A", status="Active"),
            _make_entry("engines::B", status="Draft"),
            _make_entry("engines::C", status="Scaffolding"),
            _make_entry("engines::D", status="Proposed"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            pending = cd.pending()
            assert len(pending) == 3
            ids = {c.entry.id for c in pending}
            assert "engines::A" not in ids

    def test_deprecated_returns_deprecated_only(self):
        reg = _make_registry("engines", [
            _make_entry("engines::A", status="Active"),
            _make_entry("engines::B", status="Deprecated"),
            _make_entry("engines::C", status="Deprecated — Pending Maintainer Removal"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            dep = cd.deprecated()
            assert len(dep) == 2


class TestValidation:
    def test_validate_clean_registries(self):
        reg = _make_registry("engines", [
            _make_entry("engines::A", title="Engine A", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            result = cd.validate()
            assert isinstance(result, CapabilityValidationResult)
            assert result.is_valid

    def test_validate_detects_deprecated(self):
        reg = _make_registry("engines", [
            _make_entry("engines::OLD", status="Deprecated"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            result = cd.validate()
            assert "engines::OLD" in result.deprecated_capabilities

    def test_validate_detects_missing_implementations(self):
        reg = {
            "schemaVersion": "1.0.0",
            "status": "scaffolding",
            "data": {
                "capabilities": [
                    _make_entry("cap::PLACEHOLDER", status="Scaffolding", category="capabilities"),
                ]
            },
        }
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"capability": reg})
            result = cd.validate()
            assert "cap::PLACEHOLDER" in result.missing_implementations

    def test_validate_detects_circular_references(self):
        reg = _make_registry("engines", [
            _make_entry(
                "engines::A",
                title="Engine A",
                resolved_links=("engines/B.md",),
            ),
            _make_entry(
                "engines::B",
                title="Engine B",
                resolved_links=("engines/A.md",),
            ),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            result = cd.validate()
            assert len(result.circular_references) > 0
            assert not result.is_valid

    def test_validate_no_circular_for_linear_chain(self):
        reg = _make_registry("engines", [
            _make_entry("engines::A", title="Engine A", resolved_links=("engines/B.md",)),
            _make_entry("engines::B", title="Engine B", resolved_links=("engines/C.md",)),
            _make_entry("engines::C", title="Engine C"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            result = cd.validate()
            assert result.circular_references == []


class TestReload:
    def test_reload_clears_and_rediscovers(self):
        reg = _make_registry("engines", [
            _make_entry("engines::A", title="Engine A"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            assert cd.find("engines::A") is not None
            result = cd.reload()
            assert result is cd
            assert cd.find("engines::A") is not None

    def test_reload_is_idempotent(self):
        reg = _make_registry("engines", [
            _make_entry("engines::A", title="Engine A"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd = _build_stack(Path(tmp), {"engine": reg})
            cd.reload()
            cd.reload()
            assert cd.find("engines::A") is not None


class TestRealRepo:
    def test_discovers_real_capabilities(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)

        assert cd.is_initialized
        caps = cd.discover()
        assert len(caps) > 0

    def test_find_real_engine(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)

        cap = cd.find("engines::RISK_ENGINE")
        assert cap is not None
        assert cap.source_registry == "engine"

    def test_search_real_repo(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)

        results = cd.search("architecture")
        assert len(results) > 0

    def test_recommend_real_task(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)

        results = cd.recommend("implement a new API endpoint with validation")
        assert len(results) > 0

    def test_implemented_has_entries(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)

        active = cd.implemented()
        assert len(active) > 0

    def test_validate_real_repo(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)

        result = cd.validate()
        assert isinstance(result, CapabilityValidationResult)

    def test_by_category_engines(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)

        engines = cd.by_category("engines")
        assert len(engines) > 0
        assert all(c.entry.category == "engines" for c in engines)
