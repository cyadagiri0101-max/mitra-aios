"""Tests for AIOS RegistryManager."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from aios.core.config import AIOSConfig
from aios.core.exceptions import RegistryManagerError
from aios.eos.loader import EOS_DIR_NAME, EOSLoader, EOSRegistryEntry
from aios.eos.registry import RegistryManager, RegistryValidationResult

REPO_ROOT = Path(__file__).resolve().parents[1]


def _make_eos_tree(
    base: Path,
    *,
    kernel_files: tuple[str, ...] | None = None,
    registries: dict[str, dict] | None = None,
    readme: str | None = None,
) -> Path:
    ai_dir = base / EOS_DIR_NAME
    ai_dir.mkdir(parents=True, exist_ok=True)

    for d in ("kernel", "engines", "index"):
        (ai_dir / d).mkdir(exist_ok=True)

    if kernel_files is None:
        kernel_files = (
            "CONSTITUTION.md",
            "IDENTITY.md",
            "MISSION.md",
            "ENGINEERING_LAWS.md",
        )
    for fname in kernel_files:
        (ai_dir / "kernel" / fname).write_text(
            f"# {fname}\ncontent", encoding="utf-8"
        )

    if registries is not None:
        for name, data in registries.items():
            path = ai_dir / "index" / f"{name}-registry.json"
            path.write_text(json.dumps(data), encoding="utf-8")

    if readme is not None:
        (ai_dir / "README.md").write_text(readme, encoding="utf-8")

    return ai_dir


def _config(repo_root: Path) -> AIOSConfig:
    return AIOSConfig(repo_root=repo_root)


def _make_entry(
    entry_id: str = "test::item",
    title: str = "Test",
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


def _initialized_loader(base: Path, registries: dict[str, dict] | None = None) -> EOSLoader:
    _make_eos_tree(base, registries=registries)
    loader = EOSLoader(_config(base))
    loader.initialize()
    return loader


class TestInitialization:
    def test_initialize_with_valid_loader(self):
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(Path(tmp))
            mgr = RegistryManager()
            result = mgr.initialize(loader)
            assert result is mgr
            assert mgr.is_initialized

    def test_initialize_with_uninitialized_loader_raises(self):
        with tempfile.TemporaryDirectory() as tmp:
            loader = EOSLoader(_config(Path(tmp)))
            mgr = RegistryManager()
            with pytest.raises(RegistryManagerError, match="must be initialized"):
                mgr.initialize(loader)

    def test_loader_property_raises_before_init(self):
        mgr = RegistryManager()
        with pytest.raises(RegistryManagerError, match="not been initialized"):
            _ = mgr.loader


class TestTypedAccessors:
    def test_engines_returns_entries(self):
        registry = _make_registry("engines", [_make_entry("engines::TEST")])
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(Path(tmp), {"engine": registry})
            mgr = RegistryManager().initialize(loader)
            entries = mgr.engines()
            assert len(entries) == 1
            assert isinstance(entries[0], EOSRegistryEntry)
            assert entries[0].id == "engines::TEST"

    def test_agents_returns_entries(self):
        registry = _make_registry("agents", [_make_entry("agents::arch")])
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(Path(tmp), {"agent": registry})
            mgr = RegistryManager().initialize(loader)
            assert len(mgr.agents()) == 1

    def test_playbooks_returns_entries(self):
        registry = _make_registry("playbooks", [_make_entry("playbooks::BUGFIX")])
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(Path(tmp), {"playbook": registry})
            mgr = RegistryManager().initialize(loader)
            assert len(mgr.playbooks()) == 1

    def test_templates_returns_entries(self):
        registry = _make_registry("templates", [_make_entry("templates::ADR")])
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(Path(tmp), {"template": registry})
            mgr = RegistryManager().initialize(loader)
            assert len(mgr.templates()) == 1

    def test_knowledge_returns_entries(self):
        registry = _make_registry(
            "knowledge_documents", [_make_entry("knowledge::PATTERNS")]
        )
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(Path(tmp), {"knowledge": registry})
            mgr = RegistryManager().initialize(loader)
            assert len(mgr.knowledge()) == 1

    def test_capabilities_returns_empty_for_scaffolding(self):
        registry = {
            "schemaVersion": "1.0.0",
            "status": "scaffolding",
            "data": {"capabilities": []},
        }
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(Path(tmp), {"capability": registry})
            mgr = RegistryManager().initialize(loader)
            assert mgr.capabilities() == []

    def test_prompts_returns_entries(self):
        registry = _make_registry("prompts", [_make_entry("prompts::BOOTSTRAP")])
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(Path(tmp), {"prompt": registry})
            mgr = RegistryManager().initialize(loader)
            assert len(mgr.prompts()) == 1

    def test_documents_returns_entries(self):
        registry = _make_registry("documents", [_make_entry("DOC1", path="doc.md")])
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(Path(tmp), {"document": registry})
            mgr = RegistryManager().initialize(loader)
            assert len(mgr.documents()) == 1

    def test_get_returns_entries_for_known_registry(self):
        registry = _make_registry("engines", [_make_entry("engines::X")])
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(Path(tmp), {"engine": registry})
            mgr = RegistryManager().initialize(loader)
            entries = mgr.get("engine")
            assert len(entries) == 1

    def test_get_raises_for_unknown_registry(self):
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(Path(tmp))
            mgr = RegistryManager().initialize(loader)
            with pytest.raises(RegistryManagerError, match="not available"):
                mgr.get("nonexistent")


class TestCaching:
    def test_repeated_calls_return_same_data(self):
        registry = _make_registry(
            "engines",
            [_make_entry("engines::A"), _make_entry("engines::B")],
        )
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(Path(tmp), {"engine": registry})
            mgr = RegistryManager().initialize(loader)
            first = mgr.engines()
            second = mgr.engines()
            assert len(first) == len(second) == 2
            assert first[0].id == second[0].id

    def test_cache_returns_independent_copies(self):
        registry = _make_registry("engines", [_make_entry("engines::A")])
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(Path(tmp), {"engine": registry})
            mgr = RegistryManager().initialize(loader)
            first = mgr.engines()
            second = mgr.engines()
            assert first is not second


class TestValidation:
    def test_valid_registries_pass(self):
        doc_reg = _make_registry(
            "documents",
            [_make_entry("DOC1", path="engines/TEST.md")],
        )
        eng_reg = _make_registry(
            "engines",
            [_make_entry(
                "engines::TEST",
                path="engines/TEST.md",
                resolved_links=("engines/TEST.md",),
            )],
        )
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(
                Path(tmp), {"document": doc_reg, "engine": eng_reg}
            )
            mgr = RegistryManager().initialize(loader)
            result = mgr.validate()
            assert isinstance(result, RegistryValidationResult)
            assert result.is_valid
            assert result.schema_issues == []
            assert result.duplicate_ids == []

    def test_schema_validation_missing_field(self):
        bad_registry = {
            "status": "generated",
            "data": {"engines": []},
        }
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(Path(tmp), {"engine": bad_registry})
            mgr = RegistryManager().initialize(loader)
            result = mgr.validate()
            assert not result.is_valid
            assert any("schemaVersion" in issue for issue in result.schema_issues)

    def test_entry_validation_missing_title(self):
        registry = {
            "schemaVersion": "1.0.0",
            "status": "generated",
            "data": {
                "engines": [
                    {"id": "engines::BAD", "title": "", "path": "x.md"}
                ]
            },
        }
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(Path(tmp), {"engine": registry})
            mgr = RegistryManager().initialize(loader)
            result = mgr.validate()
            assert any("title" in issue for issue in result.schema_issues)

    def test_duplicate_id_detection(self):
        doc_reg = _make_registry(
            "documents",
            [_make_entry("shared::ID", path="a.md")],
        )
        eng_reg = _make_registry(
            "engines",
            [_make_entry("shared::ID", path="b.md")],
        )
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(
                Path(tmp), {"document": doc_reg, "engine": eng_reg}
            )
            mgr = RegistryManager().initialize(loader)
            result = mgr.validate()
            assert not result.is_valid
            assert "shared::ID" in result.duplicate_ids

    def test_orphan_reference_detection(self):
        doc_reg = _make_registry(
            "documents",
            [_make_entry("DOC1", path="real.md")],
        )
        eng_reg = _make_registry(
            "engines",
            [
                _make_entry(
                    "engines::TEST",
                    path="engines/TEST.md",
                    resolved_links=("nonexistent.md",),
                )
            ],
        )
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(
                Path(tmp), {"document": doc_reg, "engine": eng_reg}
            )
            mgr = RegistryManager().initialize(loader)
            result = mgr.validate()
            assert len(result.orphan_references) == 1
            assert result.orphan_references[0] == ("engines::TEST", "nonexistent.md")

    def test_no_orphans_when_links_match_documents(self):
        doc_reg = _make_registry(
            "documents",
            [
                _make_entry("DOC1", path="real.md"),
                _make_entry("DOC2", path="other.md"),
            ],
        )
        eng_reg = _make_registry(
            "engines",
            [
                _make_entry(
                    "engines::TEST",
                    path="engines/TEST.md",
                    resolved_links=("real.md", "other.md"),
                )
            ],
        )
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(
                Path(tmp), {"document": doc_reg, "engine": eng_reg}
            )
            mgr = RegistryManager().initialize(loader)
            result = mgr.validate()
            assert result.orphan_references == []


class TestReload:
    def test_reload_clears_cache(self):
        registry = _make_registry("engines", [_make_entry("engines::A")])
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(Path(tmp), {"engine": registry})
            mgr = RegistryManager().initialize(loader)
            assert len(mgr.engines()) == 1
            result = mgr.reload()
            assert result is mgr
            assert mgr.is_initialized

    def test_reload_re_fetches_data(self):
        registry = _make_registry(
            "engines",
            [_make_entry("engines::A"), _make_entry("engines::B")],
        )
        with tempfile.TemporaryDirectory() as tmp:
            loader = _initialized_loader(Path(tmp), {"engine": registry})
            mgr = RegistryManager().initialize(loader)
            assert len(mgr.engines()) == 2
            mgr.reload()
            assert len(mgr.engines()) == 2


class TestRealRepo:
    def test_all_typed_accessors_work(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        mgr = RegistryManager().initialize(loader)

        assert len(mgr.engines()) > 0
        assert len(mgr.agents()) > 0
        assert len(mgr.playbooks()) > 0
        assert len(mgr.templates()) > 0
        assert len(mgr.knowledge()) > 0
        assert isinstance(mgr.capabilities(), list)
        assert len(mgr.prompts()) > 0
        assert len(mgr.documents()) > 0

    def test_validate_on_real_repo(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        mgr = RegistryManager().initialize(loader)
        result = mgr.validate()
        assert isinstance(result, RegistryValidationResult)
        assert result.schema_issues == []

    def test_engine_entries_have_resolved_links(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        mgr = RegistryManager().initialize(loader)
        engines = mgr.engines()
        assert all(isinstance(e, EOSRegistryEntry) for e in engines)
        assert any(len(e.resolved_links) > 0 for e in engines)

    def test_document_entries_indexed_by_path(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        mgr = RegistryManager().initialize(loader)
        docs = mgr.documents()
        paths = {d.path for d in docs}
        assert "AGENTS.md" in paths
