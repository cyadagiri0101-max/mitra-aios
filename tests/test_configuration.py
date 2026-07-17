"""Comprehensive tests for AIOS Configuration System — 80-100 tests."""

from __future__ import annotations

import json
import threading
from pathlib import Path

import pytest

from aios.config.defaults import get_component_defaults, get_defaults
from aios.config.environment import get_env_mappings, load_env_overrides
from aios.config.loader import (
    detect_format,
    discover_files,
    load_all_dotenv,
    load_dotenv,
    load_file,
    load_file_as_source,
)
from aios.config.manager import ConfigManager, ConfigSchema
from aios.config.merger import (
    count_keys,
    deep_merge,
    deep_merge_copy,
    flatten,
    merge_multiple,
    resolve_dotted,
    set_dotted,
)
from aios.config.models import (
    ConfigSchemaEntry,
    ConfigSection,
    ConfigSource,
    ConfigStatistics,
    ConfigValidationResult,
    ConfigValue,
    EnvironmentVariable,
    EnvMappingMode,
    MergeStrategy,
    SecretValue,
)
from aios.config.secrets import SecretsManager as SM
from aios.config.validator import validate_config
from aios.core.exceptions import ConfigurationError

# =====================================================================
# Models
# =====================================================================


class TestModels:
    def test_config_source_frozen(self):
        src = ConfigSource(path="x", format="json", data={})
        with pytest.raises(AttributeError):
            src.path = "y"  # type: ignore[misc]

    def test_config_source_slots(self):
        src = ConfigSource(path="x", format="json", data={})
        assert not hasattr(src, "__dict__")

    def test_config_value(self):
        cv = ConfigValue(key="a.b", value=42, source="env")
        assert cv.key == "a.b"
        assert cv.value == 42

    def test_config_section(self):
        cs = ConfigSection(name="llm", values={"model": "gpt"})
        assert cs.name == "llm"
        assert cs.values["model"] == "gpt"

    def test_config_schema_entry(self):
        e = ConfigSchemaEntry(key="x", type=int, default=0, required=True)
        assert e.key == "x"
        assert e.type is int

    def test_config_schema_entry_with_enum(self):
        e = ConfigSchemaEntry(key="x", type=str, enum_values=("a", "b"))
        assert e.enum_values == ("a", "b")

    def test_config_schema_entry_with_range(self):
        e = ConfigSchemaEntry(key="x", type=int, min_value=0, max_value=100)
        assert e.min_value == 0
        assert e.max_value == 100

    def test_config_schema_entry_with_pattern(self):
        e = ConfigSchemaEntry(key="x", type=str, pattern=r"^\d{4}-\d{2}$")
        assert e.pattern == r"^\d{4}-\d{2}$"

    def test_config_validation_result(self):
        r = ConfigValidationResult(is_valid=False, errors=["err"], warnings=["warn"], checked_keys=5)
        assert r.is_valid is False
        assert len(r.errors) == 1

    def test_config_statistics(self):
        s = ConfigStatistics(total_sources=3, total_keys=42)
        assert s.total_sources == 3
        assert s.total_keys == 42

    def test_secret_value_display(self):
        sv = SecretValue(name="db_password")
        assert sv.name == "db_password"
        assert str(sv) == "***"
        assert repr(sv) == "SecretValue(name='db_password')"

    def test_merge_strategy_enum(self):
        assert MergeStrategy.REPLACE.value == "replace"
        assert MergeStrategy.APPEND.value == "append"
        assert MergeStrategy.UNIQUE.value == "unique"

    def test_env_mapping_mode_enum(self):
        assert EnvMappingMode.SINGLE_UNDERSCORE.value == "single"
        assert EnvMappingMode.DOUBLE_UNDERSCORE.value == "double"

    def test_environment_variable(self):
        ev = EnvironmentVariable("MITRA_X", "x.key", int, 10, "desc")
        assert ev.env_key == "MITRA_X"
        assert ev.config_key == "x.key"
        assert ev.value_type is int

    def test_config_schema_backward_compat(self):
        assert ConfigSchema is ConfigSchemaEntry


# =====================================================================
# Loader
# =====================================================================


class TestLoader:
    def test_detect_format_toml(self):
        assert detect_format(Path("x.toml")) == "toml"

    def test_detect_format_yaml(self):
        assert detect_format(Path("x.yaml")) == "yaml"
        assert detect_format(Path("x.yml")) == "yaml"

    def test_detect_format_json(self):
        assert detect_format(Path("x.json")) == "json"

    def test_detect_format_unknown(self):
        assert detect_format(Path("x.txt")) is None

    def test_load_json(self, tmp_path: Path):
        f = tmp_path / "config.json"
        f.write_text('{"a": 1, "b": {"c": 2}}')
        data = load_file(f)
        assert data["a"] == 1
        assert data["b"]["c"] == 2

    def test_load_toml(self, tmp_path: Path):
        f = tmp_path / "config.toml"
        f.write_text('a = "hello"\n[b]\nc = 42\n')
        data = load_file(f)
        assert data["a"] == "hello"
        assert data["b"]["c"] == 42

    def test_load_yaml(self, tmp_path: Path):
        f = tmp_path / "config.yaml"
        f.write_text("a: hello\nb:\n  c: 42\n")
        data = load_file(f)
        assert data["a"] == "hello"
        assert data["b"]["c"] == 42

    def test_load_unsupported(self, tmp_path: Path):
        f = tmp_path / "config.xml"
        f.write_text("<x/>")
        with pytest.raises(ConfigurationError):
            load_file(f)

    def test_load_malformed_json(self, tmp_path: Path):
        f = tmp_path / "config.json"
        f.write_text("{invalid json}")
        with pytest.raises(ConfigurationError):
            load_file(f)

    def test_load_malformed_toml(self, tmp_path: Path):
        f = tmp_path / "config.toml"
        f.write_text("= invalid")
        with pytest.raises(ConfigurationError):
            load_file(f)

    def test_load_non_dict_root(self, tmp_path: Path):
        f = tmp_path / "config.json"
        f.write_text('[1, 2, 3]')
        with pytest.raises(ConfigurationError):
            load_file(f)

    def test_load_file_as_source(self, tmp_path: Path):
        f = tmp_path / "config.json"
        f.write_text('{"x": 1}')
        src = load_file_as_source(f, priority=5)
        assert src is not None
        assert src.format == "json"
        assert src.priority == 5

    def test_load_file_as_source_bad_format(self, tmp_path: Path):
        f = tmp_path / "config.txt"
        f.write_text("hello")
        src = load_file_as_source(f)
        assert src is None

    def test_load_dotenv(self, tmp_path: Path):
        f = tmp_path / ".env"
        f.write_text('KEY1=val1\nKEY2="quoted"\n# comment\nKEY3=123\n')
        data = load_dotenv(f)
        assert data["KEY1"] == "val1"
        assert data["KEY2"] == "quoted"
        assert data["KEY3"] == "123"

    def test_load_dotenv_missing(self, tmp_path: Path):
        data = load_dotenv(tmp_path / "nonexistent.env")
        assert data == {}

    def test_discover_files(self, tmp_path: Path):
        (tmp_path / "config.json").write_text("{}")
        (tmp_path / "config.toml").write_text("")
        files = discover_files(tmp_path)
        assert len(files) == 2

    def test_load_all_dotenv(self, tmp_path: Path):
        (tmp_path / ".env").write_text("A=1\n")
        (tmp_path / ".env.local").write_text("B=2\n")
        data = load_all_dotenv(tmp_path)
        assert data["A"] == "1"
        assert data["B"] == "2"


# =====================================================================
# Merger
# =====================================================================


class TestMerger:
    def test_deep_merge_simple(self):
        base = {"a": 1}
        override = {"b": 2}
        deep_merge(base, override)
        assert base == {"a": 1, "b": 2}

    def test_deep_merge_nested(self):
        base = {"a": {"b": 1, "c": 2}}
        override = {"a": {"c": 3, "d": 4}}
        deep_merge(base, override)
        assert base == {"a": {"b": 1, "c": 3, "d": 4}}

    def test_deep_merge_list_replace(self):
        base = {"a": [1, 2]}
        override = {"a": [3, 4]}
        deep_merge(base, override, list_strategy=MergeStrategy.REPLACE)
        assert base["a"] == [3, 4]

    def test_deep_merge_list_append(self):
        base = {"a": [1, 2]}
        override = {"a": [3, 4]}
        deep_merge(base, override, list_strategy=MergeStrategy.APPEND)
        assert base["a"] == [1, 2, 3, 4]

    def test_deep_merge_list_unique(self):
        base = {"a": [1, 2]}
        override = {"a": [2, 3]}
        deep_merge(base, override, list_strategy=MergeStrategy.UNIQUE)
        assert base["a"] == [1, 2, 3]

    def test_deep_merge_copy(self):
        base = {"a": 1}
        result = deep_merge_copy(base, {"a": 2, "b": 3})
        assert result == {"a": 2, "b": 3}
        assert base == {"a": 1}

    def test_merge_multiple(self):
        r = merge_multiple({"a": 1}, {"b": 2}, {"c": 3})
        assert r == {"a": 1, "b": 2, "c": 3}

    def test_merge_multiple_overlap(self):
        r = merge_multiple({"a": 1}, {"a": 2}, {"a": 3})
        assert r == {"a": 3}

    def test_resolve_dotted(self):
        data = {"a": {"b": {"c": 42}}}
        assert resolve_dotted(data, "a.b.c") == 42
        assert resolve_dotted(data, "a.b.x", "default") == "default"
        assert resolve_dotted(data, "x.y.z") is None

    def test_set_dotted(self):
        data: dict = {}
        set_dotted(data, "a.b.c", 42)
        assert data == {"a": {"b": {"c": 42}}}

    def test_set_dotted_overwrite(self):
        data = {"a": {"b": 1}}
        set_dotted(data, "a.b", 2)
        assert data["a"]["b"] == 2

    def test_count_keys(self):
        data = {"a": {"b": 1, "c": 2}, "d": 3}
        assert count_keys(data) == 3

    def test_count_keys_empty(self):
        assert count_keys({}) == 0

    def test_flatten(self):
        data = {"a": {"b": 1, "c": {"d": 2}}}
        flat = flatten(data)
        assert flat == {"a.b": 1, "a.c.d": 2}

    def test_flatten_empty(self):
        assert flatten({}) == {}


# =====================================================================
# Environment
# =====================================================================


class TestEnvironment:
    def test_load_env_overrides(self, monkeypatch):
        monkeypatch.setenv("MITRA_LLM_PROVIDER", "openai")
        monkeypatch.setenv("MITRA_LLM_MODEL", "gpt-4")
        data = load_env_overrides()
        assert data.get("llm", {}).get("provider") == "openai"
        assert data.get("llm", {}).get("model") == "gpt-4"

    def test_load_env_bool(self, monkeypatch):
        monkeypatch.setenv("MITRA_TOOLS_SANDBOX", "false")
        data = load_env_overrides()
        assert data.get("tools", {}).get("sandbox_enabled") is False

    def test_load_env_int(self, monkeypatch):
        monkeypatch.setenv("MITRA_API_PORT", "9090")
        data = load_env_overrides()
        assert data.get("api", {}).get("port") == 9090

    def test_load_env_float(self, monkeypatch):
        monkeypatch.setenv("MITRA_LLM_TEMPERATURE", "0.5")
        data = load_env_overrides()
        assert data.get("llm", {}).get("temperature") == 0.5

    def test_load_env_list(self, monkeypatch):
        monkeypatch.setenv("MITRA_CUSTOM_LIST", "a,b,c")
        data = load_env_overrides()
        assert data.get("custom", {}).get("list") == ["a", "b", "c"]

    def test_env_mappings(self):
        mappings = get_env_mappings()
        assert len(mappings) > 0
        assert any(m.config_key == "llm.provider" for m in mappings)

    def test_custom_prefix(self, monkeypatch):
        monkeypatch.setenv("CUSTOM_FOO", "bar")
        data = load_env_overrides(prefix="CUSTOM_")
        assert data.get("foo") == "bar"

    def test_double_underscore_mode(self, monkeypatch):
        monkeypatch.setenv("MITRA_A__B__C", "deep")
        data = load_env_overrides(mode=EnvMappingMode.DOUBLE_UNDERSCORE)
        assert data.get("a", {}).get("b", {}).get("c") == "deep"

    def test_empty_env_ignored(self, monkeypatch):
        monkeypatch.setenv("MITRA_EMPTY", "")
        data = load_env_overrides()
        assert "empty" not in data


# =====================================================================
# Validator
# =====================================================================


class TestValidator:
    def test_validate_empty_schema(self):
        result = validate_config({"a": 1}, [])
        assert result.is_valid is True
        assert result.checked_keys == 0

    def test_validate_pass(self):
        schema = [ConfigSchemaEntry("x", int, required=True)]
        result = validate_config({"x": 42}, schema)
        assert result.is_valid is True

    def test_validate_missing_required(self):
        schema = [ConfigSchemaEntry("x", int, required=True)]
        result = validate_config({}, schema)
        assert result.is_valid is False
        assert "required" in result.errors[0]

    def test_validate_type_mismatch(self):
        schema = [ConfigSchemaEntry("x", int)]
        result = validate_config({"x": "not_int"}, schema)
        assert result.is_valid is False

    def test_validate_enum_pass(self):
        schema = [ConfigSchemaEntry("x", str, enum_values=("a", "b"))]
        result = validate_config({"x": "a"}, schema)
        assert result.is_valid is True

    def test_validate_enum_fail(self):
        schema = [ConfigSchemaEntry("x", str, enum_values=("a", "b"))]
        result = validate_config({"x": "c"}, schema)
        assert result.is_valid is False

    def test_validate_min_value(self):
        schema = [ConfigSchemaEntry("x", int, min_value=0)]
        result = validate_config({"x": -1}, schema)
        assert result.is_valid is False

    def test_validate_max_value(self):
        schema = [ConfigSchemaEntry("x", int, max_value=100)]
        result = validate_config({"x": 101}, schema)
        assert result.is_valid is False

    def test_validate_range_pass(self):
        schema = [ConfigSchemaEntry("x", int, min_value=0, max_value=100)]
        result = validate_config({"x": 50}, schema)
        assert result.is_valid is True

    def test_validate_pattern_pass(self):
        schema = [ConfigSchemaEntry("x", str, pattern=r"^\d{4}$")]
        result = validate_config({"x": "2024"}, schema)
        assert result.is_valid is True

    def test_validate_pattern_fail(self):
        schema = [ConfigSchemaEntry("x", str, pattern=r"^\d{4}$")]
        result = validate_config({"x": "abcd"}, schema)
        assert result.is_valid is False

    def test_validate_default_value(self):
        schema = [ConfigSchemaEntry("x", str, default="fallback")]
        result = validate_config({}, schema)
        assert result.warnings  # should warn about using default

    def test_validate_nested(self):
        nested = [ConfigSchemaEntry("inner", int, required=True)]
        schema = [ConfigSchemaEntry("group", dict, nested_schema=nested)]
        result = validate_config({"group": {"inner": 42}}, schema)
        assert result.is_valid is True

    def test_validate_nested_missing(self):
        nested = [ConfigSchemaEntry("inner", int, required=True)]
        schema = [ConfigSchemaEntry("group", dict, nested_schema=nested)]
        result = validate_config({"group": {}}, schema)
        assert result.is_valid is False

    def test_validate_int_not_bool(self):
        schema = [ConfigSchemaEntry("x", int)]
        result = validate_config({"x": True}, schema)
        assert result.is_valid is False

    def test_validate_float_from_int(self):
        schema = [ConfigSchemaEntry("x", float)]
        result = validate_config({"x": 42}, schema)
        assert result.is_valid is True


# =====================================================================
# SecretsManager (comprehensive)
# =====================================================================


class TestSecretsManagerComprehensive:
    def test_set_get_delete_cycle(self):
        sm = SM().initialize()
        sm.set_secret("k", "v")
        assert sm.get_secret("k") == "v"
        sm.delete_secret("k")
        assert sm.get_secret("k") is None

    def test_thread_safety(self):
        sm = SM().initialize()
        errors: list[str] = []

        def writer(n: int) -> None:
            try:
                for i in range(100):
                    sm.set_secret(f"t_{n}_{i}", str(i))
            except Exception as e:
                errors.append(str(e))

        def reader() -> None:
            try:
                for _ in range(100):
                    sm.list_secrets()
            except Exception as e:
                errors.append(str(e))

        threads = [threading.Thread(target=writer, args=(i,)) for i in range(5)]
        threads += [threading.Thread(target=reader) for _ in range(3)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert errors == []

    def test_list_sorted(self):
        sm = SM().initialize()
        sm.set_secret("z_key", "1")
        sm.set_secret("a_key", "2")
        sm.set_secret("m_key", "3")
        assert sm.list_secrets() == ["a_key", "m_key", "z_key"]

    def test_get_missing_returns_default(self):
        sm = SM().initialize()
        assert sm.get_secret("nope") is None
        assert sm.get_secret("nope", "fallback") == "fallback"

    def test_validate_all_valid(self):
        sm = SM().initialize()
        sm.set_secret("a", "val1")
        sm.set_secret("b", "val2")
        assert sm.validate() == []

    def test_validate_multiple_errors(self):
        sm = SM().initialize()
        sm.set_secret("a", "")
        sm.set_secret("b", "")
        errors = sm.validate()
        assert len(errors) == 2


# =====================================================================
# ConfigManager (comprehensive)
# =====================================================================


class TestConfigManagerComprehensive:
    def test_defaults_loaded(self):
        mgr = ConfigManager(".").initialize()
        assert mgr.get("llm.provider") is not None
        assert mgr.get("memory.backend") is not None

    def test_default_all_components(self):
        defaults = get_defaults()
        components = [
            "memory", "llm", "tools", "agent", "multiagent", "rag",
            "embedding", "vectorstore", "plugins", "scheduler",
            "observability", "security", "api", "cli", "config",
        ]
        for comp in components:
            assert comp in defaults, f"Missing default for {comp}"

    def test_get_component_defaults(self):
        llm = get_component_defaults("llm")
        assert llm is not None
        assert "provider" in llm
        assert get_component_defaults("nonexistent") is None

    def test_file_overrides_defaults(self, tmp_path: Path):
        (tmp_path / "config.json").write_text('{"llm": {"provider": "openai"}}')
        mgr = ConfigManager(tmp_path).initialize()
        assert mgr.get("llm.provider") == "openai"
        # Other defaults still intact
        assert mgr.get("llm.temperature") == 0.7

    def test_env_overrides_file(self, tmp_path: Path, monkeypatch):
        (tmp_path / "config.json").write_text('{"llm": {"provider": "openai"}}')
        monkeypatch.setenv("MITRA_LLM_PROVIDER", "anthropic")
        mgr = ConfigManager(tmp_path).initialize()
        assert mgr.get("llm.provider") == "anthropic"

    def test_delete_nested(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("a.b.c", 1)
        assert mgr.delete("a.b.c") is True
        assert mgr.get("a.b.c") is None

    def test_delete_nonexistent(self):
        mgr = ConfigManager(".").initialize()
        assert mgr.delete("nonexistent.key") is False

    def test_delete_intermediate_non_dict(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("a", "string_value")
        assert mgr.delete("a.b") is False

    def test_exists_after_set(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("x.y.z", 42)
        assert mgr.exists("x.y.z") is True
        assert mgr.exists("x.y.w") is False

    def test_set_section_and_get(self):
        mgr = ConfigManager(".").initialize()
        mgr.set_section("my_section", {"a": 1, "b": 2})
        assert mgr.get_section("my_section") == {"a": 1, "b": 2}

    def test_export_json_structure(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("test.key", "value")
        j = mgr.export_json()
        parsed = json.loads(j)
        assert parsed["test"]["key"] == "value"

    def test_export_yaml(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("export.yaml.test", "yes")
        y = mgr.export_yaml()
        assert "export" in y
        assert "yaml" in y

    def test_export_toml(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("export.toml.test", "yes")
        t = mgr.export_toml()
        assert "export" in t

    def test_validate_returns_result(self):
        mgr = ConfigManager(".").initialize()
        mgr.set_schema([ConfigSchemaEntry("x", int, required=True)])
        r = mgr.validate()
        assert isinstance(r, ConfigValidationResult)

    def test_statistics_after_operations(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("x", 1)
        mgr.merge({"y": 2})
        mgr.set_schema([ConfigSchemaEntry("x", int)])
        mgr.validate()
        stats = mgr.statistics()
        assert stats.total_merges >= 1
        assert stats.total_validations >= 1

    def test_statistics_sources(self, tmp_path: Path):
        (tmp_path / "config.json").write_text("{}")
        mgr = ConfigManager(tmp_path).initialize()
        stats = mgr.statistics()
        assert stats.total_sources >= 1

    def test_reload_clears_state(self):
        mgr = ConfigManager(".").initialize()
        mgr.set("temp_key", "temp_val")
        mgr.reload()
        assert mgr.is_initialized is True

    def test_watch_keys(self):
        mgr = ConfigManager(".").initialize()
        mgr.watch("a.b")
        mgr.watch("c.d")
        keys = mgr.get_watched_keys()
        assert "a.b" in keys
        assert "c.d" in keys

    def test_uninitialized_set_raises(self):
        mgr = ConfigManager(".")
        with pytest.raises(ConfigurationError):
            mgr.set("x", 1)

    def test_uninitialized_delete_raises(self):
        mgr = ConfigManager(".")
        with pytest.raises(ConfigurationError):
            mgr.delete("x")

    def test_uninitialized_exists_raises(self):
        mgr = ConfigManager(".")
        with pytest.raises(ConfigurationError):
            mgr.exists("x")

    def test_uninitialized_get_section_raises(self):
        mgr = ConfigManager(".")
        with pytest.raises(ConfigurationError):
            mgr.get_section("x")

    def test_uninitialized_export_raises(self):
        mgr = ConfigManager(".")
        with pytest.raises(ConfigurationError):
            mgr.export_json()

    def test_secrets_accessible(self):
        mgr = ConfigManager(".").initialize()
        assert mgr.secrets is not None
        mgr.secrets.set_secret("test", "val")
        assert mgr.secrets.get_secret("test") == "val"


# =====================================================================
# Thread Safety
# =====================================================================


class TestThreadSafety:
    def test_concurrent_get_set(self):
        mgr = ConfigManager(".").initialize()
        errors: list[str] = []

        def writer() -> None:
            try:
                for i in range(200):
                    mgr.set(f"key_{i}", i)
            except Exception as e:
                errors.append(str(e))

        def reader() -> None:
            try:
                for _ in range(200):
                    mgr.get("key_0")
            except Exception as e:
                errors.append(str(e))

        threads = [threading.Thread(target=writer) for _ in range(3)]
        threads += [threading.Thread(target=reader) for _ in range(3)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert errors == []


# =====================================================================
# Malformed Configs
# =====================================================================


class TestMalformedConfigs:
    def test_malformed_json(self, tmp_path: Path):
        (tmp_path / "config.json").write_text("{bad json}")
        mgr = ConfigManager(tmp_path)
        # Should not crash — just skip bad file
        mgr.initialize()
        assert mgr.is_initialized is True

    def test_empty_file(self, tmp_path: Path):
        (tmp_path / "config.json").write_text("{}")
        mgr = ConfigManager(tmp_path).initialize()
        assert mgr.is_initialized is True

    def test_array_root(self, tmp_path: Path):
        (tmp_path / "config.json").write_text("[1,2,3]")
        mgr = ConfigManager(tmp_path)
        mgr.initialize()
        assert mgr.is_initialized is True

    def test_missing_config_dir(self):
        mgr = ConfigManager("/nonexistent/path/xyz").initialize()
        assert mgr.is_initialized is True


# =====================================================================
# Lifecycle
# =====================================================================


class TestLifecycle:
    def test_full_lifecycle(self, tmp_path: Path):
        # Create config file
        (tmp_path / "config.json").write_text('{"llm": {"model": "test"}}')

        # Initialize
        mgr = ConfigManager(tmp_path)
        mgr.initialize()
        mgr.secrets.set_secret("key", "val")
        assert mgr.is_initialized is True

        # Read
        assert mgr.get("llm.model") == "test"

        # Modify
        mgr.set("llm.model", "changed")
        assert mgr.get("llm.model") == "changed"

        # Validate
        mgr.set_schema([ConfigSchemaEntry("llm.model", str)])
        r = mgr.validate()
        assert r.is_valid is True

        # Merge
        mgr.merge({"llm": {"temperature": 0.9}})
        assert mgr.get("llm.temperature") == 0.9

        # Export
        j = mgr.export_json()
        assert "changed" in j

        # Stats
        s = mgr.statistics()
        assert s.total_keys > 0

        # Reload
        mgr.reload()
        assert mgr.get("llm.model") == "test"  # back to file value

        # Shutdown
        mgr.shutdown()
        assert mgr.is_initialized is False
