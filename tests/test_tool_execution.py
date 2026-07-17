"""Tests for AIOS Tool Execution Layer."""

from __future__ import annotations

import threading
import time

import pytest

from aios.core.exceptions import ToolError
from aios.tools.cache import ToolCache
from aios.tools.config import SandboxConfig, ToolCacheConfig, ToolConfig
from aios.tools.manager import ToolManager
from aios.tools.metrics import ToolMetrics
from aios.tools.models import (
    PermissionLevel,
    ToolCapabilities,
    ToolDefinition,
    ToolParameter,
    ToolRequest,
    ToolResponse,
    ToolStatistics,
    ToolStatus,
    ToolValidationResult,
)
from aios.tools.permission import PermissionManager
from aios.tools.providers.filesystem import FilesystemProvider
from aios.tools.providers.mock import MockToolProvider
from aios.tools.providers.shell import ShellProvider
from aios.tools.sandbox import ToolSandbox
from aios.tools.tool_registry import ToolRegistry
from aios.tools.validation import ValidationEngine

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_request(tool_name: str = "echo", **kwargs) -> ToolRequest:
    return ToolRequest(tool_name=tool_name, **kwargs)


def _make_mock_provider() -> MockToolProvider:
    return MockToolProvider().initialize()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class TestModels:
    def test_tool_parameter_defaults(self):
        p = ToolParameter()
        assert p.name == ""
        assert p.type == "string"
        assert p.required is False

    def test_tool_definition_defaults(self):
        d = ToolDefinition()
        assert d.name == ""
        assert d.timeout == 30.0
        assert d.requires_permission == PermissionLevel.READ

    def test_tool_request_defaults(self):
        r = ToolRequest()
        assert r.tool_name == ""
        assert r.arguments == {}
        assert r.timeout == 30.0

    def test_tool_response_defaults(self):
        r = ToolResponse()
        assert r.result == ""
        assert r.status == ToolStatus.SUCCESS

    def test_tool_capabilities_defaults(self):
        c = ToolCapabilities()
        assert c.streaming is False
        assert c.caching is True

    def test_tool_statistics_defaults(self):
        s = ToolStatistics()
        assert s.executions == 0
        assert s.average_latency == 0.0

    def test_tool_validation_result_defaults(self):
        v = ToolValidationResult()
        assert v.is_valid is True
        assert v.errors == []

    def test_permission_levels(self):
        assert PermissionLevel.NONE.value == "none"
        assert PermissionLevel.READ.value == "read"
        assert PermissionLevel.WRITE.value == "write"
        assert PermissionLevel.EXECUTE.value == "execute"
        assert PermissionLevel.ADMIN.value == "admin"

    def test_tool_statuses(self):
        assert ToolStatus.SUCCESS.value == "success"
        assert ToolStatus.ERROR.value == "error"
        assert ToolStatus.TIMEOUT.value == "timeout"


# ---------------------------------------------------------------------------
# MockToolProvider
# ---------------------------------------------------------------------------

class TestMockToolProvider:
    def test_initialize(self):
        p = MockToolProvider()
        assert p.is_initialized is False
        p.initialize()
        assert p.is_initialized is True

    def test_name(self):
        p = MockToolProvider()
        assert p.name == "mock"

    def test_capabilities(self):
        p = MockToolProvider()
        assert p.capabilities.streaming is True
        assert p.capabilities.caching is True

    def test_execute_echo(self):
        p = _make_mock_provider()
        req = _make_request("echo", arguments={"message": "hello"})
        resp = p.execute(req)
        assert resp.result == "hello"
        assert resp.status == ToolStatus.SUCCESS

    def test_execute_add(self):
        p = _make_mock_provider()
        req = _make_request("add", arguments={"a": 3, "b": 5})
        resp = p.execute(req)
        assert resp.result == "8"

    def test_execute_fail(self):
        p = _make_mock_provider()
        req = _make_request("fail")
        with pytest.raises(RuntimeError):
            p.execute(req)

    def test_execute_unknown_tool(self):
        p = _make_mock_provider()
        req = _make_request("unknown")
        resp = p.execute(req)
        assert "mock result" in resp.result

    def test_stream(self):
        p = _make_mock_provider()
        req = _make_request("echo", arguments={"message": "hello world"})
        chunks = list(p.stream(req))
        assert chunks == ["hello", "world"]

    def test_list_tools(self):
        p = _make_mock_provider()
        tools = p.list_tools()
        assert len(tools) == 3
        names = {t.name for t in tools}
        assert "echo" in names
        assert "add" in names
        assert "fail" in names

    def test_health(self):
        p = MockToolProvider()
        assert p.health() is False
        p.initialize()
        assert p.health() is True

    def test_validate(self):
        p = MockToolProvider()
        result = p.validate()
        assert len(result.warnings) > 0
        p.initialize()
        result = p.validate()
        assert result.is_valid is True

    def test_reload(self):
        p = _make_mock_provider()
        p.execute(_make_request("echo", arguments={"message": "x"}))
        assert p.statistics.executions > 0
        p.reload()
        assert p.statistics.executions == 0

    def test_shutdown(self):
        p = _make_mock_provider()
        p.shutdown()
        assert p.is_initialized is False

    def test_statistics(self):
        p = _make_mock_provider()
        p.execute(_make_request("echo", arguments={"message": "x"}))
        stats = p.statistics
        assert stats.executions == 1
        assert stats.successes == 1

    def test_uninitialized_raises(self):
        p = MockToolProvider()
        with pytest.raises(ToolError):
            p.execute(_make_request())


# ---------------------------------------------------------------------------
# FilesystemProvider
# ---------------------------------------------------------------------------

class TestFilesystemProvider:
    def test_initialize(self, tmp_path):
        p = FilesystemProvider(str(tmp_path)).initialize()
        assert p.is_initialized is True
        assert p.name == "filesystem"

    def test_write_and_read(self, tmp_path):
        p = FilesystemProvider(str(tmp_path)).initialize()
        p.execute(ToolRequest(tool_name="write_file", arguments={"path": "test.txt", "content": "hello"}))
        resp = p.execute(ToolRequest(tool_name="read_file", arguments={"path": "test.txt"}))
        assert resp.result == "hello"

    def test_list_dir(self, tmp_path):
        (tmp_path / "a.txt").write_text("a")
        (tmp_path / "b.txt").write_text("b")
        p = FilesystemProvider(str(tmp_path)).initialize()
        resp = p.execute(ToolRequest(tool_name="list_dir", arguments={"path": "."}))
        assert "a.txt" in resp.result
        assert "b.txt" in resp.result

    def test_file_exists(self, tmp_path):
        (tmp_path / "exists.txt").write_text("x")
        p = FilesystemProvider(str(tmp_path)).initialize()
        r1 = p.execute(ToolRequest(tool_name="file_exists", arguments={"path": "exists.txt"}))
        r2 = p.execute(ToolRequest(tool_name="file_exists", arguments={"path": "missing.txt"}))
        assert r1.result == "True"
        assert r2.result == "False"

    def test_read_missing_file(self, tmp_path):
        p = FilesystemProvider(str(tmp_path)).initialize()
        resp = p.execute(ToolRequest(tool_name="read_file", arguments={"path": "missing.txt"}))
        assert resp.status == ToolStatus.ERROR

    def test_path_traversal_is_rejected(self, tmp_path):
        outside = tmp_path.parent / "outside.txt"
        outside.write_text("secret", encoding="utf-8")
        p = FilesystemProvider(str(tmp_path)).initialize()
        resp = p.execute(ToolRequest(tool_name="read_file", arguments={"path": "../outside.txt"}))
        assert resp.status == ToolStatus.ERROR
        assert "outside base path" in resp.error.lower()

    def test_list_tools(self, tmp_path):
        p = FilesystemProvider(str(tmp_path)).initialize()
        assert len(p.list_tools()) == 4

    def test_health(self, tmp_path):
        p = FilesystemProvider(str(tmp_path)).initialize()
        assert p.health() is True

    def test_validate_invalid_path(self):
        p = FilesystemProvider("/nonexistent/path")
        result = p.validate()
        assert result.is_valid is False


# ---------------------------------------------------------------------------
# ShellProvider
# ---------------------------------------------------------------------------

class TestShellProvider:
    def test_initialize(self):
        p = ShellProvider().initialize()
        assert p.is_initialized is True

    def test_execute_allowed_command(self):
        p = ShellProvider(allowed_commands=("echo",)).initialize()
        resp = p.execute(ToolRequest(tool_name="run_command", arguments={"command": "echo hello"}))
        assert resp.status == ToolStatus.SUCCESS
        assert "hello" in resp.result

    def test_execute_blocked_command(self):
        p = ShellProvider(allowed_commands=("echo",)).initialize()
        resp = p.execute(ToolRequest(tool_name="run_command", arguments={"command": "rm -rf /"}))
        assert resp.status == ToolStatus.ERROR
        assert "not allowed" in resp.error

    def test_execute_command_injection_is_blocked(self):
        p = ShellProvider(allowed_commands=("echo",)).initialize()
        resp = p.execute(ToolRequest(tool_name="run_command", arguments={"command": "echo hello && pwd"}))
        assert resp.status == ToolStatus.ERROR
        assert "not allowed" in resp.error

    def test_list_tools(self):
        p = ShellProvider().initialize()
        assert len(p.list_tools()) == 1
        assert p.list_tools()[0].name == "run_command"


# ---------------------------------------------------------------------------
# PermissionManager
# ---------------------------------------------------------------------------

class TestPermissionManager:
    def test_initialize(self):
        pm = PermissionManager().initialize()
        assert pm.is_initialized is True

    def test_grant_and_check(self):
        pm = PermissionManager().initialize()
        tool_def = ToolDefinition(name="test", requires_permission=PermissionLevel.WRITE)
        pm.grant("test", PermissionLevel.WRITE)
        assert pm.check(tool_def, PermissionLevel.WRITE) is True
        assert pm.check(tool_def, PermissionLevel.READ) is True
        assert pm.check(tool_def, PermissionLevel.ADMIN) is False

    def test_revoke(self):
        pm = PermissionManager().initialize()
        pm.grant("test", PermissionLevel.READ)
        assert pm.revoke("test") is True
        assert pm.revoke("missing") is False

    def test_require_denied(self):
        pm = PermissionManager().initialize()
        tool_def = ToolDefinition(name="test", requires_permission=PermissionLevel.WRITE)
        with pytest.raises(ToolError):
            pm.require(tool_def, PermissionLevel.WRITE)

    def test_list_permissions(self):
        pm = PermissionManager().initialize()
        pm.grant("a", PermissionLevel.READ)
        pm.grant("b", PermissionLevel.WRITE)
        perms = pm.list_permissions()
        assert perms["a"] == "read"
        assert perms["b"] == "write"

    def test_reload(self):
        pm = PermissionManager().initialize()
        pm.grant("test", PermissionLevel.READ)
        pm.reload()
        assert pm.list_permissions() == {}

    def test_uninitialized_raises(self):
        pm = PermissionManager()
        with pytest.raises(ToolError):
            pm.grant("test", PermissionLevel.READ)


# ---------------------------------------------------------------------------
# ToolSandbox
# ---------------------------------------------------------------------------

class TestToolSandbox:
    def test_initialize(self):
        s = ToolSandbox().initialize()
        assert s.is_initialized is True

    def test_validate_path_allowed(self):
        s = ToolSandbox(SandboxConfig(enabled=True, allowed_paths=("/home",))).initialize()
        assert s.validate_path("/home/user/file.txt") is True
        assert s.validate_path("/etc/passwd") is False

    def test_validate_command_blocked(self):
        s = ToolSandbox(SandboxConfig(enabled=True, blocked_commands=("rm",))).initialize()
        assert s.validate_command("rm -rf /") is False
        assert s.validate_command("echo hello") is True

    def test_sandbox_disabled(self):
        s = ToolSandbox(SandboxConfig(enabled=False)).initialize()
        assert s.validate_path("/anything") is True
        assert s.validate_command("anything") is True

    def test_require_path_raises(self):
        s = ToolSandbox(SandboxConfig(enabled=True, allowed_paths=("/home",))).initialize()
        with pytest.raises(ToolError):
            s.require_path("/etc/passwd")

    def test_require_command_raises(self):
        s = ToolSandbox(SandboxConfig(enabled=True, blocked_commands=("rm",))).initialize()
        with pytest.raises(ToolError):
            s.require_command("rm -rf /")

    def test_validate_invalid_config(self):
        s = ToolSandbox(SandboxConfig(timeout=-1))
        result = s.validate()
        assert result.is_valid is False


# ---------------------------------------------------------------------------
# ValidationEngine
# ---------------------------------------------------------------------------

class TestValidationEngine:
    def test_initialize(self):
        v = ValidationEngine().initialize()
        assert v.is_initialized is True

    def test_validate_request_valid(self):
        v = ValidationEngine().initialize()
        defn = ToolDefinition(name="test", parameters=(ToolParameter(name="x", required=True),))
        req = ToolRequest(tool_name="test", arguments={"x": "value"})
        result = v.validate_request(req, defn)
        assert result.is_valid is True

    def test_validate_request_missing_param(self):
        v = ValidationEngine().initialize()
        defn = ToolDefinition(name="test", parameters=(ToolParameter(name="x", required=True),))
        req = ToolRequest(tool_name="test", arguments={})
        result = v.validate_request(req, defn)
        assert result.is_valid is False

    def test_validate_request_name_mismatch(self):
        v = ValidationEngine().initialize()
        defn = ToolDefinition(name="test")
        req = ToolRequest(tool_name="wrong")
        result = v.validate_request(req, defn)
        assert result.is_valid is False

    def test_validate_response_negative_time(self):
        v = ValidationEngine().initialize()
        resp = ToolResponse(execution_time=-1)
        result = v.validate_response(resp)
        assert result.is_valid is False

    def test_validate_definition_no_name(self):
        v = ValidationEngine().initialize()
        defn = ToolDefinition()
        result = v.validate_definition(defn)
        assert result.is_valid is False


# ---------------------------------------------------------------------------
# ToolCache
# ---------------------------------------------------------------------------

class TestToolCache:
    def test_initialize(self):
        c = ToolCache().initialize()
        assert c.is_initialized is True

    def test_put_and_get(self):
        c = ToolCache().initialize()
        req = _make_request("echo", arguments={"message": "test"})
        resp = ToolResponse(result="cached")
        c.put(req, resp)
        result = c.get(req)
        assert result is not None
        assert result.result == "cached"

    def test_get_miss(self):
        c = ToolCache().initialize()
        assert c.get(_make_request("missing")) is None

    def test_ttl_expiry(self):
        c = ToolCache(ToolCacheConfig(ttl=0.01)).initialize()
        req = _make_request("test")
        c.put(req, ToolResponse(result="x"))
        time.sleep(0.02)
        assert c.get(req) is None

    def test_lru_eviction(self):
        c = ToolCache(ToolCacheConfig(max_size=2)).initialize()
        r1 = _make_request("a")
        r2 = _make_request("b")
        r3 = _make_request("c")
        c.put(r1, ToolResponse(result="1"))
        c.put(r2, ToolResponse(result="2"))
        c.put(r3, ToolResponse(result="3"))
        assert c.get(r1) is None
        assert c.get(r2) is not None

    def test_cache_disabled(self):
        c = ToolCache(ToolCacheConfig(enabled=False)).initialize()
        req = _make_request("test")
        c.put(req, ToolResponse(result="x"))
        assert c.get(req) is None

    def test_clear(self):
        c = ToolCache().initialize()
        c.put(_make_request("x"), ToolResponse(result="y"))
        c.clear()
        assert c.size == 0

    def test_statistics(self):
        c = ToolCache().initialize()
        req = _make_request("test")
        c.put(req, ToolResponse(result="x"))
        c.get(req)
        c.get(_make_request("miss"))
        stats = c.statistics()
        assert stats["hits"] == 1
        assert stats["misses"] == 1


# ---------------------------------------------------------------------------
# ToolMetrics
# ---------------------------------------------------------------------------

class TestToolMetrics:
    def test_record_execution(self):
        m = ToolMetrics()
        m.record_execution("echo", True, 0.1)
        stats = m.statistics()
        assert stats["executions"] == 1
        assert stats["successes"] == 1

    def test_record_failure(self):
        m = ToolMetrics()
        m.record_execution("echo", False, 0.1)
        stats = m.statistics()
        assert stats["failures"] == 1

    def test_cache_hit_miss(self):
        m = ToolMetrics()
        m.record_cache_hit()
        m.record_cache_miss()
        stats = m.statistics()
        assert stats["cache_hits"] == 1
        assert stats["cache_misses"] == 1

    def test_reset(self):
        m = ToolMetrics()
        m.record_execution("echo", True, 0.1)
        m.reset()
        assert m.statistics()["executions"] == 0


# ---------------------------------------------------------------------------
# ToolRegistry
# ---------------------------------------------------------------------------

class TestToolRegistry:
    def test_initialize(self):
        r = ToolRegistry().initialize()
        assert r.is_initialized is True

    def test_register_provider(self):
        r = ToolRegistry().initialize()
        p = _make_mock_provider()
        r.register_provider(p)
        assert "mock" in r.list_providers()

    def test_register_duplicate_raises(self):
        r = ToolRegistry().initialize()
        r.register_provider(_make_mock_provider())
        with pytest.raises(ToolError):
            r.register_provider(MockToolProvider().initialize())

    def test_unregister_provider(self):
        r = ToolRegistry().initialize()
        r.register_provider(_make_mock_provider())
        assert r.unregister_provider("mock") is True
        assert "mock" not in r.list_providers()

    def test_get_tool(self):
        r = ToolRegistry().initialize()
        r.register_provider(_make_mock_provider())
        entry = r.get_tool("echo")
        assert entry is not None
        provider, defn = entry
        assert defn.name == "echo"

    def test_list_tools(self):
        r = ToolRegistry().initialize()
        r.register_provider(_make_mock_provider())
        tools = r.list_tools()
        assert len(tools) == 3

    def test_validate(self):
        r = ToolRegistry().initialize()
        result = r.validate()
        assert len(result.warnings) > 0

    def test_reload(self):
        r = ToolRegistry().initialize()
        r.register_provider(_make_mock_provider())
        r.reload()
        assert r.list_providers() == []


# ---------------------------------------------------------------------------
# ToolManager
# ---------------------------------------------------------------------------

class TestToolManager:
    def test_initialize(self):
        m = ToolManager().initialize()
        assert m.is_initialized is True

    def test_register_and_execute(self):
        m = ToolManager().initialize()
        m.register_provider(_make_mock_provider())
        resp = m.execute(_make_request("echo", arguments={"message": "hello"}))
        assert resp.result == "hello"

    def test_execute_unknown_tool(self):
        m = ToolManager().initialize()
        m.register_provider(_make_mock_provider())
        with pytest.raises(ToolError):
            m.execute(_make_request("unknown"))

    def test_list_tools(self):
        m = ToolManager().initialize()
        m.register_provider(_make_mock_provider())
        tools = m.list_tools()
        assert len(tools) == 3

    def test_statistics(self):
        m = ToolManager().initialize()
        m.register_provider(_make_mock_provider())
        m.execute(_make_request("echo", arguments={"message": "x"}))
        stats = m.statistics()
        assert stats.executions >= 1

    def test_validate(self):
        m = ToolManager().initialize()
        m.register_provider(_make_mock_provider())
        result = m.validate()
        assert result.is_valid is True

    def test_reload(self):
        m = ToolManager().initialize()
        m.register_provider(_make_mock_provider())
        m.reload()
        assert m.is_initialized is False

    def test_shutdown(self):
        m = ToolManager().initialize()
        m.register_provider(_make_mock_provider())
        m.shutdown()
        assert m.is_initialized is False

    def test_uninitialized_raises(self):
        m = ToolManager()
        with pytest.raises(ToolError):
            m.execute(_make_request())

    def test_cache_integration(self):
        m = ToolManager(ToolConfig(cache=ToolCacheConfig(enabled=True))).initialize()
        m.register_provider(_make_mock_provider())
        req = _make_request("echo", arguments={"message": "cached"})
        r1 = m.execute(req)
        r2 = m.execute(req)
        assert r1.result == r2.result
        stats = m.statistics()
        assert stats.cache_hits >= 1


# ---------------------------------------------------------------------------
# Thread Safety
# ---------------------------------------------------------------------------

class TestThreadSafety:
    def test_concurrent_execute(self):
        m = ToolManager().initialize()
        m.register_provider(_make_mock_provider())
        n = 20
        barrier = threading.Barrier(n)
        results: list[ToolResponse] = []
        lock = threading.Lock()

        def worker():
            barrier.wait()
            resp = m.execute(_make_request("echo", arguments={"message": "concurrent"}))
            with lock:
                results.append(resp)

        threads = [threading.Thread(target=worker) for _ in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert len(results) == n

    def test_concurrent_cache(self):
        c = ToolCache().initialize()
        n = 20
        barrier = threading.Barrier(n)

        def worker():
            barrier.wait()
            req = _make_request("test")
            c.put(req, ToolResponse(result="cached"))
            c.get(req)

        threads = [threading.Thread(target=worker) for _ in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert c.size >= 1

    def test_concurrent_metrics(self):
        m = ToolMetrics()
        n = 30
        barrier = threading.Barrier(n)

        def worker():
            barrier.wait()
            m.record_execution("echo", True, 0.1)

        threads = [threading.Thread(target=worker) for _ in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert m.statistics()["executions"] == n


# ---------------------------------------------------------------------------
# Integration
# ---------------------------------------------------------------------------

class TestIntegration:
    def test_full_workflow(self, tmp_path):
        m = ToolManager().initialize()
        m.register_provider(_make_mock_provider())
        m.register_provider(FilesystemProvider(str(tmp_path)).initialize())
        m.execute(ToolRequest(tool_name="write_file", arguments={"path": "test.txt", "content": "hello"}))
        resp = m.execute(ToolRequest(tool_name="read_file", arguments={"path": "test.txt"}))
        assert resp.result == "hello"
        echo_resp = m.execute(_make_request("echo", arguments={"message": "world"}))
        assert echo_resp.result == "world"
        stats = m.statistics()
        assert stats.executions >= 3
        m.shutdown()
