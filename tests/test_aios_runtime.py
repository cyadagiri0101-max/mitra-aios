"""Tests for AIOS RC1.1 runtime modules."""

from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime
from pathlib import Path

from typer.testing import CliRunner

from aios.cli.app import app
from aios.core.config import AIOSConfig, load_config
from aios.plugins.base import PluginResult
from aios.plugins.indexer.plugin import IndexerPlugin
from aios.plugins.scanner.plugin import ScannerPlugin
from aios.repository.snapshot import RepositorySnapshot

runner = CliRunner()
REPO_ROOT = Path(__file__).resolve().parents[1]


# ---------------------------------------------------------------------------
# Core – config
# ---------------------------------------------------------------------------


class TestConfig:
    def test_default_config(self):
        config = AIOSConfig(repo_root=REPO_ROOT)
        assert config.mode == "discovery"
        assert config.token_budget == 12_000
        assert config.checksum_algorithm == "sha256"

    def test_config_from_dict(self):
        config = AIOSConfig.from_dict(REPO_ROOT, {"mode": "test", "token_budget": 999})
        assert config.mode == "test"
        assert config.token_budget == 999

    def test_config_env_overrides(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            config_path = Path(temp_dir) / "config.json"
            config_path.write_text(json.dumps({"mode": "test"}), encoding="utf-8")
            os.environ["AIOS_LOG_LEVEL"] = "DEBUG"
            try:
                config = load_config(Path(temp_dir), config_path=config_path)
                assert config.mode == "test"
                assert config.log_level == "DEBUG"
            finally:
                os.environ.pop("AIOS_LOG_LEVEL", None)

    def test_config_ensure_directories(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            config = AIOSConfig(repo_root=Path(temp_dir))
            config.ensure_directories()
            assert config.cache_dir.exists()
            assert config.state_dir.exists()
            assert config.index_dir.exists()


# ---------------------------------------------------------------------------
# Repository – walker, snapshot
# ---------------------------------------------------------------------------


class TestRepositorySnapshot:
    def test_scan_returns_structure(self):
        snapshot = RepositorySnapshot(REPO_ROOT)
        result = snapshot.scan()
        assert "schemaVersion" in result
        assert result["schemaVersion"] == "1.1.0"
        assert "summary" in result
        assert "data" in result
        assert result["summary"]["totalFiles"] >= 0

    def test_files_have_required_fields(self):
        snapshot = RepositorySnapshot(REPO_ROOT)
        result = snapshot.scan()
        for f in result["data"]["files"]:
            assert "path" in f
            assert "checksum" in f
            # Path and name must always be present
            assert f["path"]
            assert f["name"]

    def test_save_writes_file(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            snapshot = RepositorySnapshot(REPO_ROOT)
            out = snapshot.save(Path(temp_dir) / "index.json")
            assert out.exists()
            data = json.loads(out.read_text(encoding="utf-8"))
            assert data["schemaVersion"] == "1.1.0"


# ---------------------------------------------------------------------------
# Scanner Plugin
# ---------------------------------------------------------------------------


class TestScannerPlugin:
    def test_plugin_lifecycle(self):
        config = AIOSConfig(repo_root=REPO_ROOT)
        plugin = ScannerPlugin(config)
        result = plugin.run()
        assert result.is_ok
        assert result.plugin_name == "scanner"
        assert "summary" in result.payload

    def test_plugin_validate(self):
        config = AIOSConfig(repo_root=REPO_ROOT)
        plugin = ScannerPlugin(config)
        result = plugin.run()
        validation = result.validation
        assert validation["ok"] is True


# ---------------------------------------------------------------------------
# Indexer Plugin
# ---------------------------------------------------------------------------


class TestIndexerPlugin:
    def test_plugin_requires_scan(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        plugin = IndexerPlugin(config)
        result = plugin.run()
        # Plugin returns ok but payload indicates skipped
        assert result.is_ok
        assert result.payload.get("status") == "skipped"

    def test_plugin_lifecycle_with_scan(self, tmp_path):
        config = AIOSConfig(repo_root=tmp_path)
        config.index_dir.mkdir(parents=True, exist_ok=True)
        # Write a minimal scan.json
        scan = {
            "schemaVersion": "1.1.0",
            "data": {
                "files": [
                    {
                        "path": "test.py",
                        "name": "test.py",
                        "extension": ".py",
                        "size": 42,
                        "modified": datetime.now().isoformat(),
                        "checksum": "abc123",
                        "fileType": "source",
                        "language": "Python",
                    }
                ],
            },
            "summary": {
                "totalFiles": 1,
                "totalDirectories": 0,
                "fileTypes": {".py": 1},
            },
        }
        (config.index_dir / "scan.json").write_text(json.dumps(scan), encoding="utf-8")
        plugin = IndexerPlugin(config)
        result = plugin.run()
        assert result.is_ok
        assert result.payload["registryCount"] >= 1


# ---------------------------------------------------------------------------
# State Engine
# ---------------------------------------------------------------------------


class TestStateEngine:
    __test__ = False


# ---------------------------------------------------------------------------
# State Validator
# ---------------------------------------------------------------------------


class TestStateValidator:
    __test__ = False


# ---------------------------------------------------------------------------
# Context Builder
# ---------------------------------------------------------------------------


class TestContextBuilder:
    __test__ = False

    # TODO: migrate to EOSContextBuilder tests in test_context_builder.py


# ---------------------------------------------------------------------------
# Event Bus
# ---------------------------------------------------------------------------


class TestEventBus:
    __test__ = False


# ---------------------------------------------------------------------------
# Event Store
# ---------------------------------------------------------------------------


class TestEventStore:
    __test__ = False

    # TODO: migrate to EventBus integration tests for durability


# ---------------------------------------------------------------------------
# Recovery Engine
# ---------------------------------------------------------------------------


class TestRecoveryEngine:
    __test__ = False

    # TODO: migrate to MemoryManager snapshot/restore tests


# ---------------------------------------------------------------------------
# Plugin Base
# ---------------------------------------------------------------------------


class TestPluginResult:
    def test_is_ok_defaults_true(self):
        r = PluginResult(plugin_name="test")
        assert r.is_ok

    def test_is_ok_with_errors(self):
        r = PluginResult(plugin_name="test", status="failed", errors=["err"])
        assert not r.is_ok

    def test_is_ok_with_failed_status(self):
        r = PluginResult(plugin_name="test", status="failed")
        assert not r.is_ok


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


class TestCLI:
    def test_help(self):
        result = runner.invoke(app, ["--help"])
        assert result.exit_code == 0
        assert "AIOS 1.2.0rc2" in result.output

    def test_scan_help(self):
        result = runner.invoke(app, ["scan", "--help"])
        assert result.exit_code == 0

    def test_index_help(self):
        result = runner.invoke(app, ["index", "--help"])
        assert result.exit_code == 0

    def test_state_help(self):
        result = runner.invoke(app, ["state", "--help"])
        assert result.exit_code == 0

    def test_context_help(self):
        result = runner.invoke(app, ["context", "--help"])
        assert result.exit_code == 0

    def test_checkpoint_help(self):
        result = runner.invoke(app, ["checkpoint", "--help"])
        assert result.exit_code == 0

    def test_state_statistics(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "state", "statistics"])
        assert result.exit_code == 0
        assert "entries" in result.output

    def test_state_validate(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "state", "validate"])
        assert result.exit_code == 0

    def test_checkpoint_statistics(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "checkpoint", "statistics"])
        assert result.exit_code == 0
        assert "entries" in result.output or "Persistence" in result.output

    def test_checkpoint_validate(self, tmp_path):
        result = runner.invoke(app, ["--root", str(tmp_path), "checkpoint", "validate"])
        assert result.exit_code == 0

    def test_context_invalid(self):
        result = runner.invoke(
            app, ["--root", str(REPO_ROOT), "context", "nonexistent"]
        )
        assert result.exit_code == 0

    def test_context_build(self):
        result = runner.invoke(
            app, ["--root", str(REPO_ROOT), "context", "implementation"]
        )
        assert result.exit_code == 0
        assert "Context built" in result.output


# ---------------------------------------------------------------------------
# Profiles
# ---------------------------------------------------------------------------


class TestProfiles:
    __test__ = False
