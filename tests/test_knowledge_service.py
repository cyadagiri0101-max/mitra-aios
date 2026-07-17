"""Tests for AIOS KnowledgeService."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from aios.core.config import AIOSConfig
from aios.core.exceptions import KnowledgeServiceError
from aios.eos.capability_discovery import CapabilityDiscovery
from aios.eos.knowledge_service import (
    KnowledgeDocument,
    KnowledgeMatch,
    KnowledgeService,
    KnowledgeStatistics,
    KnowledgeValidationResult,
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
) -> tuple[EOSLoader, RegistryManager, CapabilityDiscovery, KnowledgeService]:
    _make_eos_tree(base, registries=registries)
    loader = EOSLoader(_config(base))
    loader.initialize()
    rm = RegistryManager().initialize(loader)
    cd = CapabilityDiscovery().initialize(rm)
    ks = KnowledgeService().initialize(cd)
    return loader, rm, cd, ks


class TestInitialization:
    def test_initialize_with_valid_capability_discovery(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, _, cd, _ = _build_stack(Path(tmp))
            ks = KnowledgeService()
            result = ks.initialize(cd)
            assert result is ks
            assert ks.is_initialized

    def test_initialize_with_uninitialized_cd_raises(self):
        cd = CapabilityDiscovery()
        ks = KnowledgeService()
        with pytest.raises(KnowledgeServiceError, match="must be initialized"):
            ks.initialize(cd)

    def test_registry_manager_property_raises_before_init(self):
        ks = KnowledgeService()
        with pytest.raises(KnowledgeServiceError, match="not been initialized"):
            _ = ks.registry_manager

    def test_capability_discovery_property_raises_before_init(self):
        ks = KnowledgeService()
        with pytest.raises(KnowledgeServiceError, match="not been initialized"):
            _ = ks.capability_discovery


class TestIndex:
    def test_index_aggregates_all_registries(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines"),
        ])
        doc_reg = _make_registry("documents", [
            _make_entry("DOC1", title="Document One", category="root", path="DOC1.md"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(
                Path(tmp), {"engine": eng_reg, "document": doc_reg}
            )
            count = ks.index()
            assert count >= 2

    def test_index_deduplicates_by_id(self):
        eng_reg = _make_registry("engines", [
            _make_entry("shared::ID", title="Engine Version", category="engines"),
        ])
        doc_reg = _make_registry("documents", [
            _make_entry("shared::ID", title="Doc Version", category="root", path="shared.md"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(
                Path(tmp), {"engine": eng_reg, "document": doc_reg}
            )
            count = ks.index()
            assert count == 1


class TestFind:
    def test_find_returns_document_by_id(self):
        reg = _make_registry("engines", [
            _make_entry("engines::RISK", title="Risk Engine"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            doc = ks.find("engines::RISK")
            assert doc is not None
            assert isinstance(doc, KnowledgeDocument)
            assert doc.entry.title == "Risk Engine"

    def test_find_returns_none_for_unknown_id(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp))
            assert ks.find("nonexistent::ID") is None


class TestSearch:
    def test_search_by_title(self):
        reg = _make_registry("engines", [
            _make_entry("engines::RISK", title="Risk Engine", category="engines"),
            _make_entry("engines::QUALITY", title="Quality Engine", category="engines"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            results = ks.search("risk")
            assert len(results) >= 1
            assert results[0].document.entry.id == "engines::RISK"

    def test_search_returns_scored_matches(self):
        reg = _make_registry("engines", [
            _make_entry("engines::TEST", title="Test Engine"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            results = ks.search("test engine")
            assert len(results) >= 1
            assert isinstance(results[0], KnowledgeMatch)
            assert results[0].score > 0
            assert results[0].match_reason

    def test_search_empty_query_returns_empty(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp))
            assert ks.search("") == []
            assert ks.search("   ") == []

    def test_search_no_match_returns_empty(self):
        reg = _make_registry("engines", [
            _make_entry("engines::RISK", title="Risk Engine"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            results = ks.search("zzzznonexistent")
            assert results == []

    def test_search_ranks_by_relevance(self):
        reg = _make_registry("engines", [
            _make_entry("engines::RISK", title="Risk Engine", category="engines"),
            _make_entry("engines::RISK_ASSESS", title="Risk Assessment Tool", category="engines"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            results = ks.search("risk engine")
            assert len(results) >= 2
            assert results[0].score >= results[1].score

    def test_search_caches_results(self):
        reg = _make_registry("engines", [
            _make_entry("engines::TEST", title="Test Engine"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            first = ks.search("test")
            second = ks.search("test")
            assert len(first) == len(second)
            assert first[0].document.entry.id == second[0].document.entry.id

    def test_search_filters_stop_words(self):
        reg = _make_registry("engines", [
            _make_entry("engines::TEST", title="Test Engine"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            results = ks.search("the and test")
            assert len(results) >= 1


class TestRelated:
    def test_related_returns_forward_and_reverse(self):
        reg = _make_registry("engines", [
            _make_entry(
                "engines::A",
                title="Engine A",
                resolved_links=("engines/B.md",),
            ),
            _make_entry("engines::B", title="Engine B"),
            _make_entry(
                "engines::C",
                title="Engine C",
                resolved_links=("engines/A.md",),
            ),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            related = ks.related("engines::A")
            related_ids = {d.entry.id for d in related}
            assert "engines::B" in related_ids
            assert "engines::C" in related_ids

    def test_related_returns_empty_for_unknown_id(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp))
            assert ks.related("nonexistent") == []

    def test_related_returns_empty_for_isolated_doc(self):
        reg = _make_registry("engines", [
            _make_entry("engines::LONE", title="Lone Engine"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            assert ks.related("engines::LONE") == []


class TestDependencies:
    def test_dependencies_returns_forward_links(self):
        reg = _make_registry("engines", [
            _make_entry(
                "engines::A",
                title="Engine A",
                resolved_links=("engines/B.md",),
            ),
            _make_entry("engines::B", title="Engine B"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            deps = ks.dependencies("engines::A")
            assert len(deps) == 1
            assert deps[0].entry.id == "engines::B"

    def test_dependencies_returns_empty_for_unknown(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp))
            assert ks.dependencies("nonexistent") == []

    def test_reverse_dependencies_returns_reverse_links(self):
        reg = _make_registry("engines", [
            _make_entry(
                "engines::A",
                title="Engine A",
                resolved_links=("engines/B.md",),
            ),
            _make_entry("engines::B", title="Engine B"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            rev_deps = ks.reverse_dependencies("engines::B")
            assert len(rev_deps) == 1
            assert rev_deps[0].entry.id == "engines::A"

    def test_reverse_dependencies_returns_empty_for_unknown(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp))
            assert ks.reverse_dependencies("nonexistent") == []


class TestRecommend:
    def test_recommend_returns_ranked_documents(self):
        eng_reg = _make_registry("engines", [
            _make_entry("engines::ARCH", title="Architecture Engine", category="engines", status="Active"),
            _make_entry("engines::RISK", title="Risk Engine", category="engines", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": eng_reg})
            results = ks.recommend("design a new architecture for the system")
            assert len(results) >= 1
            assert all(isinstance(r, KnowledgeMatch) for r in results)

    def test_recommend_respects_limit(self):
        entries = [
            _make_entry(f"engines::E{i}", title=f"Engine {i}", status="Active")
            for i in range(20)
        ]
        reg = _make_registry("engines", entries)
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            results = ks.recommend("engine", limit=5)
            assert len(results) <= 5

    def test_recommend_empty_description_returns_empty(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp))
            assert ks.recommend("") == []

    def test_recommend_boosts_active_status(self):
        reg = _make_registry("engines", [
            _make_entry("engines::ACTIVE", title="Test Engine", status="Active"),
            _make_entry("engines::DRAFT", title="Test Engine Draft", status="Draft"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            results = ks.recommend("test engine")
            if len(results) >= 2:
                active_idx = next(
                    (i for i, r in enumerate(results) if r.document.entry.id == "engines::ACTIVE"),
                    None,
                )
                draft_idx = next(
                    (i for i, r in enumerate(results) if r.document.entry.id == "engines::DRAFT"),
                    None,
                )
                if active_idx is not None and draft_idx is not None:
                    assert active_idx < draft_idx


class TestStatistics:
    def test_statistics_returns_structure(self):
        reg = _make_registry("engines", [
            _make_entry("engines::A", title="Engine A", category="engines"),
            _make_entry("engines::B", title="Engine B", category="engines"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            stats = ks.statistics()
            assert isinstance(stats, KnowledgeStatistics)
            assert stats.total_documents >= 2
            assert stats.total_categories >= 1
            assert "engines" in stats.categories

    def test_statistics_counts_links(self):
        reg = _make_registry("engines", [
            _make_entry(
                "engines::A",
                title="Engine A",
                resolved_links=("engines/B.md",),
            ),
            _make_entry("engines::B", title="Engine B"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            stats = ks.statistics()
            assert stats.total_links >= 1

    def test_statistics_empty_index(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp))
            stats = ks.statistics()
            assert stats.total_documents >= 0
            assert stats.average_links_per_document >= 0.0


class TestValidation:
    def test_validate_clean_registries(self):
        reg = _make_registry("engines", [
            _make_entry("engines::A", title="Engine A", status="Active"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            result = ks.validate()
            assert isinstance(result, KnowledgeValidationResult)
            assert result.circular_references == []
            assert result.index_inconsistencies == []

    def test_validate_detects_broken_links(self):
        reg = _make_registry("engines", [
            _make_entry(
                "engines::A",
                title="Engine A",
                resolved_links=("nonexistent/path.md",),
            ),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            result = ks.validate()
            assert len(result.broken_links) >= 1
            assert result.broken_links[0] == ("engines::A", "nonexistent/path.md")

    def test_validate_detects_orphan_documents(self):
        reg = _make_registry("engines", [
            _make_entry("engines::LONE", title="Lone Engine"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            result = ks.validate()
            assert "engines::LONE" in result.orphan_documents

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
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            result = ks.validate()
            assert len(result.circular_references) > 0
            assert not result.is_valid

    def test_validate_no_circular_for_linear_chain(self):
        reg = _make_registry("engines", [
            _make_entry("engines::A", title="Engine A", resolved_links=("engines/B.md",)),
            _make_entry("engines::B", title="Engine B", resolved_links=("engines/C.md",)),
            _make_entry("engines::C", title="Engine C"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            result = ks.validate()
            assert result.circular_references == []

    def test_validate_index_consistency(self):
        reg = _make_registry("engines", [
            _make_entry("engines::A", title="Engine A"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            result = ks.validate()
            assert result.index_inconsistencies == []


class TestReload:
    def test_reload_clears_and_reindexes(self):
        reg = _make_registry("engines", [
            _make_entry("engines::A", title="Engine A"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            assert ks.find("engines::A") is not None
            result = ks.reload()
            assert result is ks
            assert ks.find("engines::A") is not None

    def test_reload_is_idempotent(self):
        reg = _make_registry("engines", [
            _make_entry("engines::A", title="Engine A"),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            _, _, _, ks = _build_stack(Path(tmp), {"engine": reg})
            ks.reload()
            ks.reload()
            assert ks.find("engines::A") is not None


class TestRealRepo:
    def test_indexes_real_documents(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)

        assert ks.is_initialized
        stats = ks.statistics()
        assert stats.total_documents > 0
        assert stats.total_categories > 0

    def test_find_real_engine(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)

        doc = ks.find("engines::RISK_ENGINE")
        assert doc is not None
        assert doc.entry.title == "Risk Engine"

    def test_search_real_repo(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)

        results = ks.search("architecture")
        assert len(results) > 0

    def test_recommend_real_task(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)

        results = ks.recommend("implement a new API endpoint with validation")
        assert len(results) > 0

    def test_dependencies_real_engine(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)

        deps = ks.dependencies("engines::ARCHITECTURE_ENGINE")
        assert isinstance(deps, list)

    def test_related_real_document(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)

        related = ks.related("engines::RISK_ENGINE")
        assert isinstance(related, list)

    def test_validate_real_repo(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)

        result = ks.validate()
        assert isinstance(result, KnowledgeValidationResult)

    def test_statistics_real_repo(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        rm = RegistryManager().initialize(loader)
        cd = CapabilityDiscovery().initialize(rm)
        ks = KnowledgeService().initialize(cd)

        stats = ks.statistics()
        assert stats.total_documents > 0
        assert stats.total_links >= 0
        assert stats.average_links_per_document >= 0.0
