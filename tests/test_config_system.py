"""Tests for AIOS Configuration System (backward-compat + full coverage)."""

from __future__ import annotations

from pathlib import Path

import pytest

from aios.config.manager import ConfigManager, ConfigSchema, SecretsManager
from aios.config.models import ConfigValidationResult

# ---------------------------------------------------------------------------
# ConfigManager
# ---------------------------------------------------------------------------


class TestConfigManager:
    def test_initialize(self):
        mgr = ConfigManager(".")
        assert mgr.is_initialized is False
        mgr.initialize()
        assert mgr.is_initialized is True

    def test_double_initialize(self):
        mgr = ConfigManager(".").initialize()
        mgr.initialize()
        assert mgr.is_initialized is True

    def test_get_default(self):
        mgr = ConfigManager(".").initialize()
        assert mgr.get("nonexistent", "fallback") == "fallback"

    def test_get_returns_none_for_missing(self):
        mgr = ConfigManager(".").initialize()
        assert mgr.get("missing.key") is None

    def test_set_and_get(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("my.nested.key", 42)
        assert mgr.get("my.nested.key") == 42

    def test_set_dotted_key(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("a.b.c.d", "deep")
        assert mgr.get("a.b.c.d") == "deep"
        assert mgr.get("a.b") == {"c": {"d": "deep"}}

    def test_delete(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("to_delete", "value")
        assert mgr.delete("to_delete") is True
        assert mgr.get("to_delete") is None
        assert mgr.delete("nonexistent") is False

    def test_exists(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("existing", "yes")
        assert mgr.exists("existing") is True
        assert mgr.exists("nope") is False

    def test_get_section(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("section.a", 1)
        mgr.set("section.b", 2)
        section = mgr.get_section("section")
        assert section == {"a": 1, "b": 2}

    def test_get_section_missing(self):
        mgr = ConfigManager(".").initialize()
        assert mgr.get_section("nonexistent") == {}

    def test_set_section(self):
        mgr = ConfigManager(".").initialize()
        mgr.set_section("new_section", {"x": 1, "y": 2})
        assert mgr.get("new_section.x") == 1
        assert mgr.get("new_section.y") == 2

    def test_merge(self):
        mgr = ConfigManager(".").initialize()
        mgr.merge({"x": 1, "y": {"z": 2}})
        assert mgr.get("x") == 1
        assert mgr.get("y.z") == 2

    def test_merge_overwrite(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("key", "original")
        mgr.merge({"key": "updated"})
        assert mgr.get("key") == "updated"

    def test_as_dict(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("test", "value")
        d = mgr.as_dict()
        assert isinstance(d, dict)
        assert d["test"] == "value"

    def test_flatten(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("a.b.c", 1)
        flat = mgr.flatten()
        assert "a.b.c" in flat
        assert flat["a.b.c"] == 1

    def test_sources_info(self):
        mgr = ConfigManager(".").initialize()
        sources = mgr.sources_info()
        assert isinstance(sources, list)

    def test_export_json(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("export_test", "value")
        exported = mgr.export_json()
        assert "export_test" in exported
        assert "value" in exported

    def test_validate_no_schema(self):
        mgr = ConfigManager(".").initialize()
        result = mgr.validate()
        assert isinstance(result, ConfigValidationResult)
        assert result.is_valid is True

    def test_validate_pass(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("name", "test")
        mgr.set_schema([ConfigSchema(key="name", type=str, required=True)])
        result = mgr.validate()
        assert result.is_valid is True

    def test_validate_required_missing(self):
        mgr = ConfigManager(".").initialize()
        mgr.set_schema([ConfigSchema(key="required_key", type=str, required=True)])
        result = mgr.validate()
        assert result.is_valid is False
        assert len(result.errors) == 1
        assert "required_key" in result.errors[0]

    def test_validate_type_mismatch(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("count", "not_a_number")
        mgr.set_schema([ConfigSchema(key="count", type=int)])
        result = mgr.validate()
        assert result.is_valid is False
        assert "count" in result.errors[0]

    def test_validate_default_applied(self):
        mgr = ConfigManager(".").initialize()
        mgr.set_schema([ConfigSchema(key="with_default", type=str, default="default_val")])
        mgr.validate()
        assert mgr.get("with_default") == "default_val"

    def test_reload(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("temp", "data")
        mgr.reload()
        assert mgr.is_initialized is True

    def test_shutdown(self):
        mgr = ConfigManager(".").initialize()
        mgr.shutdown()
        assert mgr.is_initialized is False

    def test_uninitialized_raises(self):
        mgr = ConfigManager(".")
        with pytest.raises(Exception):
            mgr.get("key")

    def test_watch(self):
        mgr = ConfigManager(".").initialize()
        mgr.watch("some.key")
        assert "some.key" in mgr.get_watched_keys()

    def test_statistics(self):
        mgr = ConfigManager(".").initialize()
        stats = mgr.statistics()
        assert stats.total_sources >= 0
        assert stats.total_keys >= 0

    def test_with_json_config(self, tmp_path: Path):
        config_file = tmp_path / "config.json"
        config_file.write_text('{"my_key": "my_value", "nested": {"inner": 42}}')
        mgr = ConfigManager(tmp_path)
        mgr.initialize()
        assert mgr.get("my_key") == "my_value"
        assert mgr.get("nested.inner") == 42

    def test_with_toml_config(self, tmp_path: Path):
        config_file = tmp_path / "config.toml"
        config_file.write_text('my_key = "toml_value"\n[nested]\ninner = 99\n')
        mgr = ConfigManager(tmp_path)
        mgr.initialize()
        assert mgr.get("my_key") == "toml_value"
        assert mgr.get("nested.inner") == 99

    def test_with_yaml_config(self, tmp_path: Path):
        config_file = tmp_path / "config.yaml"
        config_file.write_text("my_key: yaml_value\nnested:\n  inner: 7\n")
        mgr = ConfigManager(tmp_path)
        mgr.initialize()
        assert mgr.get("my_key") == "yaml_value"
        assert mgr.get("nested.inner") == 7

    def test_env_override(self, tmp_path: Path, monkeypatch):
        monkeypatch.setenv("MITRA_TEST_ENV_KEY", "env_value")
        mgr = ConfigManager(tmp_path).initialize()
        assert mgr.get("test.env.key") == "env_value"

    def test_env_bool_override(self, tmp_path: Path, monkeypatch):
        monkeypatch.setenv("MITRA_FLAG", "true")
        mgr = ConfigManager(tmp_path).initialize()
        assert mgr.get("flag") is True

    def test_env_int_override(self, tmp_path: Path, monkeypatch):
        monkeypatch.setenv("MITRA_COUNT", "42")
        mgr = ConfigManager(tmp_path).initialize()
        assert mgr.get("count") == 42


# ---------------------------------------------------------------------------
# SecretsManager
# ---------------------------------------------------------------------------


class TestSecretsManager:
    def test_initialize(self):
        mgr = SecretsManager()
        assert mgr.is_initialized is False
        mgr.initialize()
        assert mgr.is_initialized is True

    def test_double_initialize(self):
        mgr = SecretsManager().initialize()
        mgr.initialize()
        assert mgr.is_initialized is True

    def test_get_set(self):
        mgr = SecretsManager().initialize()
        mgr.set_secret("api_key", "secret123")
        assert mgr.get_secret("api_key") == "secret123"

    def test_get_default(self):
        mgr = SecretsManager().initialize()
        assert mgr.get_secret("missing", "default") == "default"

    def test_list_secrets(self):
        mgr = SecretsManager().initialize()
        mgr.set_secret("a_key", "a")
        mgr.set_secret("b_key", "b")
        keys = mgr.list_secrets()
        assert "a_key" in keys
        assert "b_key" in keys

    def test_has(self):
        mgr = SecretsManager().initialize()
        mgr.set_secret("exists", "yes")
        assert mgr.has_secret("exists") is True
        assert mgr.has_secret("nope") is False

    def test_count(self):
        mgr = SecretsManager().initialize()
        assert mgr.count() == 0
        mgr.set_secret("a", "1")
        mgr.set_secret("b", "2")
        assert mgr.count() == 2

    def test_delete(self):
        mgr = SecretsManager().initialize()
        mgr.set_secret("to_delete", "value")
        assert mgr.delete_secret("to_delete") is True
        assert mgr.has_secret("to_delete") is False
        assert mgr.delete_secret("nonexistent") is False

    def test_validate_empty_secret(self):
        mgr = SecretsManager().initialize()
        mgr.set_secret("empty", "")
        errors = mgr.validate()
        assert len(errors) == 1
        assert "empty" in errors[0]

    def test_validate_pass(self):
        mgr = SecretsManager().initialize()
        mgr.set_secret("valid", "value")
        assert mgr.validate() == []

    def test_get_as_config_value(self):
        mgr = SecretsManager().initialize()
        mgr.set_secret("key", "val")
        cv = mgr.get_as_config_value("key")
        assert cv is not None
        assert cv.name == "key"
        assert str(cv) == "***"

    def test_get_as_config_value_missing(self):
        mgr = SecretsManager().initialize()
        assert mgr.get_as_config_value("missing") is None

    def test_reload(self):
        mgr = SecretsManager().initialize()
        mgr.set_secret("key", "val")
        mgr.reload()
        assert mgr.has_secret("key") is False

    def test_shutdown(self):
        mgr = SecretsManager().initialize()
        mgr.set_secret("key", "val")
        mgr.shutdown()
        assert mgr.is_initialized is False

    def test_uninitialized_raises(self):
        mgr = SecretsManager()
        with pytest.raises(Exception):
            mgr.get_secret("key")

    def test_env_secrets(self, tmp_path: Path, monkeypatch):
        monkeypatch.setenv("MITRA_SECRET_DB_PASS", "s3cret")
        monkeypatch.setenv("MITRA_SECRET_API_TOKEN", "tok123")
        mgr = SecretsManager().initialize()
        assert mgr.get_secret("db_pass") == "s3cret"
        assert mgr.get_secret("api_token") == "tok123"

    def test_empty_name_raises(self):
        mgr = SecretsManager().initialize()
        from aios.core.exceptions import SecretsError
        with pytest.raises(SecretsError):
            mgr.set_secret("", "value")


# ---------------------------------------------------------------------------
# ConfigSchema
# ---------------------------------------------------------------------------


class TestConfigSchema:
    def test_creation(self):
        schema = ConfigSchema(key="name", type=str, default="test", description="A name")
        assert schema.key == "name"
        assert schema.type is str
        assert schema.default == "test"
        assert schema.required is False

    def test_required(self):
        schema = ConfigSchema(key="key", type=str, required=True)
        assert schema.required is True


# ---------------------------------------------------------------------------
# Integration
# ---------------------------------------------------------------------------


class TestIntegration:
    def test_full_config_workflow(self, tmp_path: Path):
        config_file = tmp_path / "config.toml"
        config_file.write_text('app_name = "mitra"\nversion = "1.0"\n[server]\nport = 8080\n')

        mgr = ConfigManager(tmp_path).initialize()
        assert mgr.get("app_name") == "mitra"
        assert mgr.get("version") == "1.0"
        assert mgr.get("server.port") == 8080

        mgr.set_schema([ConfigSchema(key="app_name", type=str, required=True)])
        result = mgr.validate()
        assert result.is_valid is True

        mgr.merge({"server": {"host": "localhost"}})
        assert mgr.get("server.host") == "localhost"
        assert mgr.get("server.port") == 8080

        info = mgr.sources_info()
        assert len(info) >= 1

        d = mgr.as_dict()
        assert d["app_name"] == "mitra"

    def test_config_with_secrets(self, tmp_path: Path, monkeypatch):
        monkeypatch.setenv("MITRA_SECRET_KEY", "super_secret")

        mgr = ConfigManager(tmp_path).initialize()
        secrets = mgr.secrets

        secrets.set_secret("password", "hunter2")
        assert secrets.get_secret("password") == "hunter2"
        assert secrets.get_secret("key") == "super_secret"
        assert secrets.validate() == []
