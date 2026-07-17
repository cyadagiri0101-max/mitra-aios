"""Tests for AIOS EOSLoader."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from aios.core.config import AIOSConfig
from aios.core.exceptions import EOSLoaderError
from aios.eos.loader import (
    EOS_DIR_NAME,
    EOSLoader,
    EOSLoadResult,
    EOSRegistryEntry,
)

REPO_ROOT = Path(__file__).resolve().parents[1]


def _make_eos_tree(
    base: Path,
    *,
    kernel_files: tuple[str, ...] | None = None,
    registries: dict[str, dict] | None = None,
    extra_dirs: tuple[str, ...] = (),
    readme: str | None = None,
) -> Path:
    ai_dir = base / EOS_DIR_NAME
    ai_dir.mkdir(parents=True, exist_ok=True)

    for d in ("kernel", "engines", "index", *extra_dirs):
        (ai_dir / d).mkdir(exist_ok=True)

    if kernel_files is None:
        kernel_files = ("CONSTITUTION.md", "IDENTITY.md", "MISSION.md", "ENGINEERING_LAWS.md")
    for fname in kernel_files:
        (ai_dir / "kernel" / fname).write_text(f"# {fname}\ncontent", encoding="utf-8")

    if registries is not None:
        for name, data in registries.items():
            path = ai_dir / "index" / f"{name}-registry.json"
            path.write_text(json.dumps(data), encoding="utf-8")

    if readme is not None:
        (ai_dir / "README.md").write_text(readme, encoding="utf-8")

    return ai_dir


def _config(repo_root: Path) -> AIOSConfig:
    return AIOSConfig(repo_root=repo_root)


class TestDiscovery:
    def test_discover_finds_ai_dir(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_eos_tree(Path(tmp))
            loader = EOSLoader(_config(Path(tmp)))
            result = loader.initialize()
            assert result.eos_root == Path(tmp) / EOS_DIR_NAME

    def test_discover_fails_without_ai_dir(self):
        with tempfile.TemporaryDirectory() as tmp:
            loader = EOSLoader(_config(Path(tmp)))
            with pytest.raises(EOSLoaderError, match="not found"):
                loader.initialize()

    def test_eos_root_raises_before_init(self):
        with tempfile.TemporaryDirectory() as tmp:
            loader = EOSLoader(_config(Path(tmp)))
            with pytest.raises(EOSLoaderError, match="not been initialized"):
                _ = loader.eos_root


class TestValidation:
    def test_validate_passes_with_full_tree(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_eos_tree(Path(tmp))
            loader = EOSLoader(_config(Path(tmp)))
            loader._eos_root = Path(tmp) / EOS_DIR_NAME
            warnings = loader.validate()
            assert isinstance(warnings, list)

    def test_validate_fails_missing_kernel_dir(self):
        with tempfile.TemporaryDirectory() as tmp:
            ai_dir = Path(tmp) / EOS_DIR_NAME
            ai_dir.mkdir()
            (ai_dir / "engines").mkdir()
            (ai_dir / "index").mkdir()
            loader = EOSLoader(_config(Path(tmp)))
            loader._eos_root = ai_dir
            with pytest.raises(EOSLoaderError, match="validation failed"):
                loader.validate()

    def test_validate_fails_missing_kernel_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_eos_tree(Path(tmp), kernel_files=("CONSTITUTION.md",))
            loader = EOSLoader(_config(Path(tmp)))
            loader._eos_root = Path(tmp) / EOS_DIR_NAME
            with pytest.raises(EOSLoaderError, match="validation failed"):
                loader.validate()

    def test_validate_warns_on_empty_index(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_eos_tree(Path(tmp))
            loader = EOSLoader(_config(Path(tmp)))
            loader._eos_root = Path(tmp) / EOS_DIR_NAME
            warnings = loader.validate()
            assert any("registry" in w.lower() for w in warnings)


class TestLoadKernel:
    def test_load_kernel_returns_all_docs(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_eos_tree(Path(tmp))
            loader = EOSLoader(_config(Path(tmp)))
            loader._eos_root = Path(tmp) / EOS_DIR_NAME
            docs = loader.load_kernel()
            assert "CONSTITUTION" in docs
            assert "IDENTITY" in docs
            assert "MISSION" in docs
            assert "ENGINEERING_LAWS" in docs

    def test_load_kernel_content_is_correct(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_eos_tree(Path(tmp))
            loader = EOSLoader(_config(Path(tmp)))
            loader._eos_root = Path(tmp) / EOS_DIR_NAME
            loader.load_kernel()
            content = loader.get_kernel_doc("CONSTITUTION")
            assert "# CONSTITUTION" in content

    def test_get_kernel_doc_raises_for_unknown(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_eos_tree(Path(tmp))
            loader = EOSLoader(_config(Path(tmp)))
            loader._eos_root = Path(tmp) / EOS_DIR_NAME
            loader.load_kernel()
            with pytest.raises(EOSLoaderError, match="not found"):
                loader.get_kernel_doc("NONEXISTENT")


class TestLoadRegistries:
    def test_load_registries_from_index(self):
        registry_data = {
            "schemaVersion": "1.0.0",
            "status": "generated",
            "data": {
                "engines": [
                    {
                        "id": "engines::TEST",
                        "title": "Test Engine",
                        "path": "engines/TEST.md",
                        "category": "engines",
                        "status": "Active",
                        "version": "1.0.0",
                        "owner": "Test",
                        "last_updated": "2026-07-13",
                        "resolved_links": [],
                    }
                ]
            },
        }
        with tempfile.TemporaryDirectory() as tmp:
            _make_eos_tree(Path(tmp), registries={"engine": registry_data})
            loader = EOSLoader(_config(Path(tmp)))
            loader._eos_root = Path(tmp) / EOS_DIR_NAME
            regs = loader.load_registries()
            assert "engine" in regs
            assert regs["engine"]["schemaVersion"] == "1.0.0"

    def test_get_registry_returns_data(self):
        registry_data = {"schemaVersion": "1.0.0", "data": {}}
        with tempfile.TemporaryDirectory() as tmp:
            _make_eos_tree(Path(tmp), registries={"document": registry_data})
            loader = EOSLoader(_config(Path(tmp)))
            loader._eos_root = Path(tmp) / EOS_DIR_NAME
            loader.load_registries()
            result = loader.get_registry("document")
            assert result["schemaVersion"] == "1.0.0"

    def test_get_registry_raises_for_unknown(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_eos_tree(Path(tmp))
            loader = EOSLoader(_config(Path(tmp)))
            loader._eos_root = Path(tmp) / EOS_DIR_NAME
            loader.load_registries()
            with pytest.raises(EOSLoaderError, match="not found"):
                loader.get_registry("nonexistent")

    def test_get_registry_entries_parses_typed(self):
        registry_data = {
            "schemaVersion": "1.0.0",
            "data": {
                "agents": [
                    {
                        "id": "agents::architect",
                        "title": "Architect",
                        "path": "agents/architect.md",
                        "category": "agents",
                        "status": "Active",
                        "version": "1.0.0",
                        "owner": "Test",
                        "last_updated": "2026-07-13",
                        "resolved_links": ["kernel/CONSTITUTION.md"],
                    }
                ]
            },
        }
        with tempfile.TemporaryDirectory() as tmp:
            _make_eos_tree(Path(tmp), registries={"agent": registry_data})
            loader = EOSLoader(_config(Path(tmp)))
            loader._eos_root = Path(tmp) / EOS_DIR_NAME
            loader.load_registries()
            entries = loader.get_registry_entries("agent")
            assert len(entries) == 1
            assert isinstance(entries[0], EOSRegistryEntry)
            assert entries[0].id == "agents::architect"
            assert entries[0].resolved_links == ("kernel/CONSTITUTION.md",)


class TestGetDocument:
    def test_get_document_reads_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_eos_tree(Path(tmp))
            loader = EOSLoader(_config(Path(tmp)))
            loader._eos_root = Path(tmp) / EOS_DIR_NAME
            content = loader.get_document("kernel/CONSTITUTION.md")
            assert "# CONSTITUTION" in content

    def test_get_document_raises_for_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_eos_tree(Path(tmp))
            loader = EOSLoader(_config(Path(tmp)))
            loader._eos_root = Path(tmp) / EOS_DIR_NAME
            with pytest.raises(EOSLoaderError, match="not found"):
                loader.get_document("nonexistent.md")


class TestMetadata:
    def test_metadata_from_readme(self):
        readme = (
            "# AI Engineering Operating System (EOS)\n\n"
            "**Status:** Active | **Version:** 1.0.0 | **Owner:** Platform Engineering\n\n"
            "This directory is the governing AI layer.\n"
        )
        with tempfile.TemporaryDirectory() as tmp:
            _make_eos_tree(Path(tmp), readme=readme)
            loader = EOSLoader(_config(Path(tmp)))
            loader._eos_root = Path(tmp) / EOS_DIR_NAME
            meta = loader._load_metadata()
            assert meta.version == "1.0.0"
            assert meta.status == "Active"
            assert meta.owner == "Platform Engineering"

    def test_metadata_defaults_when_no_readme(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_eos_tree(Path(tmp))
            loader = EOSLoader(_config(Path(tmp)))
            loader._eos_root = Path(tmp) / EOS_DIR_NAME
            meta = loader._load_metadata()
            assert meta.version == "unknown"
            assert meta.status == "unknown"


class TestInitialize:
    def test_full_initialize(self):
        registry_data = {
            "schemaVersion": "1.0.0",
            "status": "generated",
            "data": {
                "documents": [
                    {
                        "id": "TEST",
                        "title": "Test",
                        "path": "kernel/CONSTITUTION.md",
                        "category": "kernel",
                        "status": "Active",
                        "version": "1.0.0",
                        "owner": "Test",
                        "last_updated": "2026-07-13",
                        "resolved_links": [],
                    }
                ]
            },
        }
        with tempfile.TemporaryDirectory() as tmp:
            _make_eos_tree(Path(tmp), registries={"document": registry_data})
            loader = EOSLoader(_config(Path(tmp)))
            result = loader.initialize()
            assert isinstance(result, EOSLoadResult)
            assert result.eos_root == Path(tmp) / EOS_DIR_NAME
            assert len(result.kernel_files) == 4
            assert "document" in result.registries_loaded
            assert result.documents_indexed == 1
            assert result.elapsed_seconds >= 0
            assert loader.is_initialized

    def test_document_index_built(self):
        registry_data = {
            "schemaVersion": "1.0.0",
            "data": {
                "documents": [
                    {
                        "id": "AGENTS",
                        "title": "Agents",
                        "path": "AGENTS.md",
                        "category": "root",
                        "status": "Active",
                        "version": "1.0.0",
                        "owner": "Test",
                        "last_updated": "2026-07-13",
                    }
                ]
            },
        }
        with tempfile.TemporaryDirectory() as tmp:
            _make_eos_tree(Path(tmp), registries={"document": registry_data})
            loader = EOSLoader(_config(Path(tmp)))
            loader.initialize()
            meta = loader.get_document_metadata("AGENTS.md")
            assert meta is not None
            assert meta["id"] == "AGENTS"

    def test_document_metadata_returns_none_for_unknown(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_eos_tree(Path(tmp))
            loader = EOSLoader(_config(Path(tmp)))
            loader.initialize()
            assert loader.get_document_metadata("nonexistent.md") is None


class TestReload:
    def test_reload_clears_and_reloads(self):
        with tempfile.TemporaryDirectory() as tmp:
            _make_eos_tree(Path(tmp))
            loader = EOSLoader(_config(Path(tmp)))
            result1 = loader.initialize()
            result2 = loader.reload()
            assert isinstance(result2, EOSLoadResult)
            assert result2.kernel_files == result1.kernel_files
            assert loader.is_initialized


class TestRealRepo:
    def test_loads_real_ai_directory(self):
        loader = EOSLoader(_config(REPO_ROOT))
        result = loader.initialize()
        assert result.eos_root == REPO_ROOT / EOS_DIR_NAME
        assert "CONSTITUTION" in result.kernel_files
        assert len(result.registries_loaded) > 0
        assert result.documents_indexed > 0

    def test_real_document_registry_query(self):
        loader = EOSLoader(_config(REPO_ROOT))
        loader.initialize()
        entries = loader.get_registry_entries("document")
        assert len(entries) > 0
        paths = {e.path for e in entries}
        assert "AGENTS.md" in paths
