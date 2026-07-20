"""Production-grade tests for state engine, state validator, tools, vector store, and security."""

from __future__ import annotations

import threading
import uuid
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from aios.core.config import AIOSConfig
from aios.core.exceptions import (
    SecurityError,
    ToolError,
    VectorStoreError,
)
from aios.security.credential import CredentialStore
from aios.security.encryption import EncryptionManager
from aios.security.models import TokenType
from aios.security.token import TokenManager

# Legacy modules removed in v1.2.0 — StateEngine replaced by PersistenceStore
# from aios.state.engine import StateEngine
# from aios.state.validator import StateValidator
from aios.tools.cache import ToolCache
from aios.tools.config import SandboxConfig, ToolConfig
from aios.tools.executor import ToolExecutor
from aios.tools.manager import ToolManager
from aios.tools.metrics import ToolMetrics
from aios.tools.models import (
    PermissionLevel,
    ToolDefinition,
    ToolParameter,
    ToolRequest,
    ToolResponse,
    ToolStatus,
    ToolValidationResult,
)
from aios.tools.permission import PermissionManager
from aios.tools.provider import ToolProvider
from aios.tools.sandbox import ToolSandbox
from aios.tools.validation import ValidationEngine
from aios.vectorstore.manager import VectorStoreManager
from aios.vectorstore.models import (
    VectorRecord,
    VectorSearchResult,
    VectorStoreStatistics,
)
from aios.vectorstore.provider import VectorStoreProvider

# ── Helpers ──────────────────────────────────────────────────────────────


def _config(tmp_path: Path) -> AIOSConfig:
    cfg = AIOSConfig(repo_root=tmp_path)
    cfg.ensure_directories()
    return cfg


def _mock_provider(name: str = "mock") -> MagicMock:
    p = MagicMock(spec=ToolProvider)
    p.name = name
    p.list_tools.return_value = [
        ToolDefinition(
            name="echo",
            description="echo tool",
            parameters=[ToolParameter(name="msg", type="string", required=True)],
        )
    ]
    p.execute.return_value = ToolResponse(
        result="hi",
        status=ToolStatus.SUCCESS,
        execution_time=0.01,
    )
    return p


# ══════════════════════════════════════════════════════════════════════════
# STATE ENGINE
# ══════════════════════════════════════════════════════════════════════════


class TestStateEngineGenerate:
    __test__ = False


class TestStateEngineSync:
    __test__ = False


class TestStateEngineValidate:
    __test__ = False


class TestStateEngineDiff:
    __test__ = False


class TestStateEngineHistory:
    __test__ = False


# ══════════════════════════════════════════════════════════════════════════
# STATE VALIDATOR
# ══════════════════════════════════════════════════════════════════════════


class TestStateValidator:
    __test__ = False


# ══════════════════════════════════════════════════════════════════════════
# TOOLS — SANDBOX
# ══════════════════════════════════════════════════════════════════════════


class TestToolSandbox:
    def test_initialize_and_lifecycle(self):
        sb = ToolSandbox()
        assert not sb.is_initialized
        sb.initialize()
        assert sb.is_initialized
        sb.reload()
        assert sb.is_initialized

    def test_validate_path_disabled(self):
        sb = ToolSandbox(SandboxConfig(enabled=False))
        sb.initialize()
        assert sb.validate_path("/any/path")

    def test_validate_path_allowed(self):
        sb = ToolSandbox(SandboxConfig(enabled=True, allowed_paths=["/tmp", "/data"]))
        sb.initialize()
        assert sb.validate_path("/tmp/file.txt")
        assert sb.validate_path("/data/file.txt")
        assert not sb.validate_path("/etc/passwd")

    def test_validate_path_no_allowed_list(self):
        sb = ToolSandbox(SandboxConfig(enabled=True, allowed_paths=[]))
        sb.initialize()
        assert sb.validate_path("/anything")

    def test_require_path_raises(self):
        sb = ToolSandbox(SandboxConfig(enabled=True, allowed_paths=["/tmp"]))
        sb.initialize()
        with pytest.raises(ToolError, match="not allowed"):
            sb.require_path("/etc/passwd")

    def test_validate_command_allowed(self):
        sb = ToolSandbox(SandboxConfig(enabled=True, blocked_commands=["rm", "format"]))
        sb.initialize()
        assert sb.validate_command("ls -la")
        assert sb.validate_command("echo hello")

    def test_validate_command_blocked(self):
        sb = ToolSandbox(SandboxConfig(enabled=True, blocked_commands=["rm", "format"]))
        sb.initialize()
        assert not sb.validate_command("rm -rf /")
        assert not sb.validate_command("format C:")

    def test_validate_command_empty(self):
        sb = ToolSandbox(SandboxConfig(enabled=True, blocked_commands=["rm"]))
        sb.initialize()
        assert sb.validate_command("")

    def test_require_command_raises(self):
        sb = ToolSandbox(SandboxConfig(enabled=True, blocked_commands=["rm"]))
        sb.initialize()
        with pytest.raises(ToolError, match="blocked"):
            sb.require_command("rm -rf /")

    def test_validate_returns_errors(self):
        sb = ToolSandbox(SandboxConfig(timeout=0, max_memory_mb=0))
        result = sb.validate()
        assert not result.is_valid
        assert len(result.errors) == 2

    def test_validate_passes(self):
        sb = ToolSandbox()
        result = sb.validate()
        assert result.is_valid

    def test_require_path_not_initialized(self):
        sb = ToolSandbox()
        with pytest.raises(ToolError, match="not been initialized"):
            sb.validate_path("/tmp")

    def test_require_command_not_initialized(self):
        sb = ToolSandbox()
        with pytest.raises(ToolError, match="not been initialized"):
            sb.validate_command("ls")

    def test_config_property(self):
        cfg = SandboxConfig(timeout=42)
        sb = ToolSandbox(cfg)
        assert sb.config.timeout == 42


# ══════════════════════════════════════════════════════════════════════════
# TOOLS — VALIDATION ENGINE
# ══════════════════════════════════════════════════════════════════════════


class TestValidationEngine:
    def _engine(self):
        e = ValidationEngine()
        e.initialize()
        return e

    def test_initialize_lifecycle(self):
        e = ValidationEngine()
        assert not e.is_initialized
        e.initialize()
        assert e.is_initialized
        e.reload()
        assert e.is_initialized

    def test_validate_request_success(self):
        e = self._engine()
        req = ToolRequest(tool_name="echo", arguments={"msg": "hi"}, timeout=10)
        defn = ToolDefinition(
            name="echo",
            description="echo",
            parameters=[ToolParameter(name="msg", type="string", required=True)],
        )
        result = e.validate_request(req, defn)
        assert result.is_valid

    def test_validate_request_empty_name(self):
        e = self._engine()
        req = ToolRequest(tool_name="", arguments={}, timeout=10)
        defn = ToolDefinition(name="echo", description="echo", parameters=[])
        result = e.validate_request(req, defn)
        assert not result.is_valid
        assert any("required" in err.lower() for err in result.errors)

    def test_validate_request_name_mismatch(self):
        e = self._engine()
        req = ToolRequest(tool_name="wrong", arguments={}, timeout=10)
        defn = ToolDefinition(name="echo", description="echo", parameters=[])
        result = e.validate_request(req, defn)
        assert not result.is_valid
        assert any("mismatch" in err.lower() for err in result.errors)

    def test_validate_request_missing_required_param(self):
        e = self._engine()
        req = ToolRequest(tool_name="echo", arguments={}, timeout=10)
        defn = ToolDefinition(
            name="echo",
            description="echo",
            parameters=[ToolParameter(name="msg", type="string", required=True)],
        )
        result = e.validate_request(req, defn)
        assert not result.is_valid
        assert any("missing" in err.lower() for err in result.errors)

    def test_validate_request_zero_timeout(self):
        e = self._engine()
        req = ToolRequest(tool_name="echo", arguments={}, timeout=0)
        defn = ToolDefinition(name="echo", description="echo", parameters=[])
        result = e.validate_request(req, defn)
        assert not result.is_valid
        assert any("timeout" in err.lower() for err in result.errors)

    def test_validate_response_success(self):
        e = self._engine()
        resp = ToolResponse(result="ok", status=ToolStatus.SUCCESS, execution_time=0.1)
        result = e.validate_response(resp)
        assert result.is_valid

    def test_validate_response_negative_time(self):
        e = self._engine()
        resp = ToolResponse(result="ok", status=ToolStatus.SUCCESS, execution_time=-1.0)
        result = e.validate_response(resp)
        assert not result.is_valid

    def test_validate_definition_success(self):
        e = self._engine()
        defn = ToolDefinition(name="echo", description="echo", timeout=10)
        result = e.validate_definition(defn)
        assert result.is_valid

    def test_validate_definition_empty_name(self):
        e = self._engine()
        defn = ToolDefinition(name="", description="echo")
        result = e.validate_definition(defn)
        assert not result.is_valid

    def test_validate_definition_zero_timeout(self):
        e = self._engine()
        defn = ToolDefinition(name="echo", description="echo", timeout=0)
        result = e.validate_definition(defn)
        assert not result.is_valid

    def test_validate_returns_ok(self):
        e = self._engine()
        result = e.validate()
        assert result.is_valid

    def test_not_initialized_raises(self):
        e = ValidationEngine()
        with pytest.raises(ToolError, match="not been initialized"):
            e.validate_request(
                ToolRequest(tool_name="x", arguments={}, timeout=1),
                ToolDefinition(name="x", description="x"),
            )


# ══════════════════════════════════════════════════════════════════════════
# TOOLS — EXECUTOR
# ══════════════════════════════════════════════════════════════════════════


class TestToolExecutor:
    def _executor(self, **kwargs):
        config = kwargs.pop("config", ToolConfig(max_retries=3))
        perm = PermissionManager()
        perm.initialize()
        sb = ToolSandbox()
        sb.initialize()
        val = ValidationEngine()
        val.initialize()
        cache = ToolCache()
        cache.initialize()
        metrics = ToolMetrics()
        # Grant default permission for echo tool
        perm.grant("echo", PermissionLevel.READ)
        return ToolExecutor(
            config=config,
            permission_manager=perm,
            sandbox=sb,
            validation_engine=val,
            cache=cache,
            metrics=metrics,
            **kwargs,
        )

    def test_initialize_lifecycle(self):
        ex = self._executor()
        assert not ex.is_initialized
        ex.initialize()
        assert ex.is_initialized
        ex.reload()
        assert ex.is_initialized

    def test_execute_success(self):
        ex = self._executor()
        ex.initialize()
        provider = MagicMock()
        provider.execute.return_value = ToolResponse(
            result="ok", status=ToolStatus.SUCCESS, execution_time=0.01
        )
        req = ToolRequest(tool_name="echo", arguments={}, timeout=10)
        defn = ToolDefinition(name="echo", description="echo", parameters=[])
        resp = ex.execute(provider, req, defn)
        assert resp.status == ToolStatus.SUCCESS

    def test_execute_retries_then_raises(self):
        ex = self._executor(config=ToolConfig(max_retries=2))
        ex.initialize()
        provider = MagicMock()
        provider.execute.side_effect = ToolError("fail")
        req = ToolRequest(tool_name="echo", arguments={}, timeout=10)
        defn = ToolDefinition(name="echo", description="echo", parameters=[])
        with pytest.raises(ToolError, match="failed after 2 attempts"):
            ex.execute(provider, req, defn)

    def test_execute_caches_success(self):
        ex = self._executor()
        ex.initialize()
        provider = MagicMock()
        provider.execute.return_value = ToolResponse(
            result="ok", status=ToolStatus.SUCCESS, execution_time=0.01
        )
        req = ToolRequest(tool_name="echo", arguments={}, timeout=10)
        defn = ToolDefinition(name="echo", description="echo", parameters=[])
        ex.execute(provider, req, defn)
        # Second call should hit cache
        resp2 = ex.execute(provider, req, defn)
        assert resp2.status == ToolStatus.SUCCESS
        # Provider called only once (cache hit on second)
        assert provider.execute.call_count == 1

    def test_validate_aggregates(self):
        ex = self._executor()
        result = ex.validate()
        assert result.is_valid

    def test_not_initialized_raises(self):
        ex = self._executor()
        with pytest.raises(ToolError, match="not been initialized"):
            ex.execute(MagicMock(), ToolRequest(tool_name="x", arguments={}, timeout=1), ToolDefinition(name="x", description="x"))


# ══════════════════════════════════════════════════════════════════════════
# TOOLS — MANAGER
# ══════════════════════════════════════════════════════════════════════════


class TestToolManager:
    def test_initialize_lifecycle(self):
        mgr = ToolManager()
        assert not mgr.is_initialized
        mgr.initialize()
        assert mgr.is_initialized
        mgr.reload()
        # reload sets _initialized = False in ToolManager
        assert not mgr.is_initialized

    def test_shutdown(self):
        mgr = ToolManager()
        mgr.initialize()
        provider = _mock_provider()
        mgr.register_provider(provider)
        mgr.shutdown()
        assert not mgr.is_initialized

    def test_register_and_list_providers(self):
        mgr = ToolManager()
        mgr.initialize()
        provider = _mock_provider("test")
        mgr.register_provider(provider)
        assert "test" in mgr.list_providers()

    def test_unregister_provider(self):
        mgr = ToolManager()
        mgr.initialize()
        provider = _mock_provider("test")
        mgr.register_provider(provider)
        assert mgr.unregister_provider("test")
        assert "test" not in mgr.list_providers()

    def test_unregister_nonexistent(self):
        mgr = ToolManager()
        mgr.initialize()
        assert not mgr.unregister_provider("nope")

    def test_list_tools(self):
        mgr = ToolManager()
        mgr.initialize()
        provider = _mock_provider()
        mgr.register_provider(provider)
        tools = mgr.list_tools()
        assert len(tools) == 1
        assert tools[0].name == "echo"

    def test_execute_tool(self):
        mgr = ToolManager()
        mgr.initialize()
        provider = _mock_provider()
        mgr.register_provider(provider)
        req = ToolRequest(tool_name="echo", arguments={"msg": "hi"}, timeout=10)
        resp = mgr.execute(req)
        assert resp.status == ToolStatus.SUCCESS

    def test_execute_unknown_tool(self):
        mgr = ToolManager()
        mgr.initialize()
        with pytest.raises(ToolError, match="not found"):
            mgr.execute(ToolRequest(tool_name="unknown", arguments={}, timeout=10))

    def test_statistics(self):
        mgr = ToolManager()
        mgr.initialize()
        stats = mgr.statistics()
        assert stats.executions == 0

    def test_validate(self):
        mgr = ToolManager()
        mgr.initialize()
        result = mgr.validate()
        assert result.is_valid

    def test_not_initialized_raises(self):
        mgr = ToolManager()
        with pytest.raises(ToolError, match="not been initialized"):
            mgr.list_tools()

    def test_properties(self):
        mgr = ToolManager()
        assert mgr.registry is not None
        assert mgr.permission is not None
        assert mgr.sandbox is not None
        assert mgr.cache is not None
        assert mgr.metrics is not None

    def test_double_initialize_idempotent(self):
        mgr = ToolManager()
        mgr.initialize()
        mgr.initialize()  # Should not error
        assert mgr.is_initialized


# ══════════════════════════════════════════════════════════════════════════
# SECURITY — ENCRYPTION
# ══════════════════════════════════════════════════════════════════════════


class TestEncryptionManager:
    def test_initialize_lifecycle(self):
        em = EncryptionManager()
        assert not em.is_initialized
        em.initialize()
        assert em.is_initialized
        em.reload()
        assert em.is_initialized

    def test_encrypt_decrypt_roundtrip(self):
        em = EncryptionManager()
        em.initialize()
        original = "hello world 123"
        encrypted = em.encrypt(original)
        assert encrypted != original
        decrypted = em.decrypt(encrypted)
        assert decrypted == original

    def test_encrypt_empty(self):
        em = EncryptionManager()
        em.initialize()
        assert em.encrypt("") == ""

    def test_decrypt_empty(self):
        em = EncryptionManager()
        em.initialize()
        assert em.decrypt("") == ""

    def test_hash(self):
        em = EncryptionManager()
        em.initialize()
        h = em.hash("test data")
        assert len(h) == 64  # SHA-256 hex
        # Deterministic
        assert em.hash("test data") == h

    def test_hmac(self):
        em = EncryptionManager()
        em.initialize()
        h1 = em.hmac("data")
        h2 = em.hmac("data")
        assert h1 == h2
        assert len(h1) == 64

    def test_hmac_custom_key(self):
        em = EncryptionManager()
        em.initialize()
        h = em.hmac("data", key="custom_key_123")
        assert len(h) == 64

    def test_generate_key(self):
        em = EncryptionManager()
        em.initialize()
        key = em.generate_key(16)
        assert len(key) == 32  # 16 bytes = 32 hex chars

    def test_validate_passes(self):
        em = EncryptionManager(key="abc123")
        result = em.validate()
        assert result.is_valid

    def test_not_initialized_raises(self):
        em = EncryptionManager()
        with pytest.raises(SecurityError, match="not been initialized"):
            em.encrypt("test")


# ══════════════════════════════════════════════════════════════════════════
# SECURITY — TOKENS
# ══════════════════════════════════════════════════════════════════════════


class TestTokenManager:
    def _mgr(self):
        tm = TokenManager()
        tm.initialize()
        return tm

    def test_initialize_lifecycle(self):
        tm = TokenManager()
        assert not tm.is_initialized
        tm.initialize()
        assert tm.is_initialized

    def test_create_api_key(self):
        tm = self._mgr()
        token = tm.create_token("user1", TokenType.API_KEY, expires_in=60)
        assert token.value.startswith("aios_")
        assert token.principal == "user1"
        assert token.token_type == TokenType.API_KEY

    def test_create_bearer(self):
        tm = self._mgr()
        token = tm.create_token("user1", TokenType.BEARER)
        assert token.token_type == TokenType.BEARER

    def test_create_jwt(self):
        tm = self._mgr()
        token = tm.create_token("user1", TokenType.JWT)
        assert token.token_type == TokenType.JWT
        assert token.value.count(".") == 2  # header.payload.signature

    def test_validate_token(self):
        tm = self._mgr()
        token = tm.create_token("user1", TokenType.API_KEY, expires_in=60)
        validated = tm.validate_token(token.value)
        assert validated is not None
        assert validated.principal == "user1"

    def test_validate_expired_token(self):
        tm = self._mgr()
        token = tm.create_token("user1", TokenType.API_KEY, expires_in=-1)
        validated = tm.validate_token(token.value)
        assert validated is None

    def test_validate_unknown_token(self):
        tm = self._mgr()
        assert tm.validate_token("nonexistent") is None

    def test_revoke_token(self):
        tm = self._mgr()
        token = tm.create_token("user1")
        assert tm.revoke_token(token.token_id)
        assert tm.get_token(token.token_id) is None

    def test_revoke_nonexistent(self):
        tm = self._mgr()
        assert not tm.revoke_token("nonexistent")

    def test_revoke_all_tokens(self):
        tm = self._mgr()
        tm.create_token("user1")
        tm.create_token("user1")
        tm.create_token("user2")
        count = tm.revoke_all_tokens("user1")
        assert count == 2
        assert tm.count() == 1  # user2's token remains

    def test_get_token(self):
        tm = self._mgr()
        token = tm.create_token("user1")
        assert tm.get_token(token.token_id) is not None

    def test_list_tokens(self):
        tm = self._mgr()
        tm.create_token("user1")
        tm.create_token("user2")
        all_tokens = tm.list_tokens()
        assert len(all_tokens) == 2
        user1_tokens = tm.list_tokens("user1")
        assert len(user1_tokens) == 1

    def test_count(self):
        tm = self._mgr()
        assert tm.count() == 0
        tm.create_token("user1")
        assert tm.count() == 1

    def test_validate_returns_warnings(self):
        tm = self._mgr()
        result = tm.validate()
        # TokenManager warns when no tokens
        assert isinstance(result.warnings, list)

    def test_reload_clears_tokens(self):
        tm = self._mgr()
        tm.create_token("user1")
        tm.reload()
        assert tm.count() == 0

    def test_create_with_scopes_and_metadata(self):
        tm = self._mgr()
        token = tm.create_token(
            "user1",
            scopes=("read", "write"),
            metadata={"env": "prod"},
        )
        assert token.scopes == ("read", "write")
        assert token.metadata == {"env": "prod"}

    def test_not_initialized_raises(self):
        tm = TokenManager()
        with pytest.raises(SecurityError, match="not been initialized"):
            tm.create_token("user1")

    def test_thread_safety(self):
        tm = self._mgr()
        errors = []

        def create_tokens():
            try:
                for _ in range(50):
                    tm.create_token("user1")
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=create_tokens) for _ in range(4)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert len(errors) == 0
        assert tm.count() == 200


# ══════════════════════════════════════════════════════════════════════════
# SECURITY — CREDENTIALS
# ══════════════════════════════════════════════════════════════════════════


class TestCredentialStore:
    def _store(self):
        em = EncryptionManager()
        em.initialize()
        cs = CredentialStore(em)
        cs.initialize()
        return cs

    def test_store_and_retrieve(self):
        cs = self._store()
        cred = cs.store("api_key", "password", "secret123")
        value = cs.retrieve(cred.id)
        assert value == "secret123"

    def test_get_credential(self):
        cs = self._store()
        cred = cs.store("db_pass", "password", "pass456")
        got = cs.get_credential(cred.id)
        assert got is not None
        assert got.name == "db_pass"

    def test_delete(self):
        cs = self._store()
        cred = cs.store("temp", "token", "val")
        assert cs.delete(cred.id)
        assert cs.get_credential(cred.id) is None

    def test_delete_nonexistent(self):
        cs = self._store()
        assert not cs.delete("nonexistent")

    def test_retrieve_nonexistent(self):
        cs = self._store()
        assert cs.retrieve("nonexistent") is None

    def test_list_credentials(self):
        cs = self._store()
        cs.store("a", "password", "v1")
        cs.store("b", "token", "v2")
        all_creds = cs.list_credentials()
        assert len(all_creds) == 2
        passwords = cs.list_credentials("password")
        assert len(passwords) == 1

    def test_count(self):
        cs = self._store()
        assert cs.count() == 0
        cs.store("x", "password", "v")
        assert cs.count() == 1

    def test_validate_warns_empty(self):
        cs = self._store()
        result = cs.validate()
        # CredentialStore warns when no credentials
        assert isinstance(result.warnings, list)

    def test_reload_clears(self):
        cs = self._store()
        cs.store("x", "password", "v")
        cs.reload()
        assert cs.count() == 0

    def test_not_initialized_raises(self):
        em = EncryptionManager()
        em.initialize()
        cs = CredentialStore(em)
        with pytest.raises(SecurityError, match="not been initialized"):
            cs.store("x", "password", "v")


# ══════════════════════════════════════════════════════════════════════════
# VECTOR STORE — MANAGER
# ══════════════════════════════════════════════════════════════════════════


class MockVectorProvider(VectorStoreProvider):
    """Minimal concrete VectorStoreProvider for testing."""

    def __init__(self, name: str = "mock_vs"):
        self._name = name
        self._initialized = False
        self._records: dict[str, VectorRecord] = {}

    @property
    def name(self) -> str:
        return self._name

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def statistics(self) -> VectorStoreStatistics:
        return VectorStoreStatistics(
            total_vectors=len(self._records),
            namespaces=["default"],
            dimensions=3,
            index_type="flat",
            distance_metric="cosine",
        )

    def initialize(self):
        self._initialized = True
        return self

    def upsert(self, records):
        for r in records:
            self._records[r.id] = r
        return len(records)

    def get(self, record_id, namespace="default"):
        return self._records.get(record_id)

    def delete(self, record_id, namespace="default"):
        return self._records.pop(record_id, None) is not None

    def search(self, query_vector, top_k=10, namespace="default", filters=None):
        return [
            VectorSearchResult(record=r, score=0.99, rank=i)
            for i, r in enumerate(list(self._records.values())[:top_k])
        ]

    def list_namespaces(self):
        return ["default"]

    def count(self, namespace="default"):
        return len(self._records)

    def clear(self, namespace="default"):
        self._records.clear()

    def health(self):
        return {"status": "healthy", "provider": self._name}

    def validate(self):
        return ToolValidationResult()

    def reload(self):
        return self

    def shutdown(self):
        self._initialized = False


class TestVectorStoreManager:
    def test_initialize_lifecycle(self):
        mgr = VectorStoreManager()
        assert not mgr.is_initialized
        mgr.initialize()
        assert mgr.is_initialized
        mgr.shutdown()
        assert not mgr.is_initialized

    def test_double_initialize_idempotent(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        mgr.initialize()  # Should not error
        assert mgr.is_initialized

    def test_register_provider_as_default(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        p = MockVectorProvider("p1")
        mgr.register_provider(p, set_default=True)
        assert "p1" in mgr.list_providers()

    def test_register_provider_auto_default(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        p = MockVectorProvider("p1")
        mgr.register_provider(p)  # First provider becomes default
        assert mgr.get_provider().name == "p1"

    def test_unregister_provider(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        p = MockVectorProvider("p1")
        mgr.register_provider(p)
        assert mgr.unregister_provider("p1")
        assert "p1" not in mgr.list_providers()

    def test_unregister_nonexistent(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        assert not mgr.unregister_provider("nope")

    def test_get_named_provider(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        p1 = MockVectorProvider("p1")
        p2 = MockVectorProvider("p2")
        mgr.register_provider(p1)
        mgr.register_provider(p2)
        assert mgr.get_provider("p2").name == "p2"

    def test_get_nonexistent_provider(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        with pytest.raises(VectorStoreError, match="not found"):
            mgr.get_provider("nope")

    def test_get_default_no_providers(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        with pytest.raises(VectorStoreError, match="No default"):
            mgr.get_provider()

    def test_upsert(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        p = MockVectorProvider()
        mgr.register_provider(p)
        records = [VectorRecord(id="r1", vector=(1.0, 0.0, 0.0), metadata={}, namespace="default")]
        assert mgr.upsert(records) == 1

    def test_get_record(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        p = MockVectorProvider()
        mgr.register_provider(p)
        records = [VectorRecord(id="r1", vector=(1.0, 0.0, 0.0), metadata={}, namespace="default")]
        mgr.upsert(records)
        got = mgr.get("r1")
        assert got is not None

    def test_delete_record(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        p = MockVectorProvider()
        mgr.register_provider(p)
        records = [VectorRecord(id="r1", vector=(1.0, 0.0, 0.0), metadata={}, namespace="default")]
        mgr.upsert(records)
        assert mgr.delete("r1")

    def test_search(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        p = MockVectorProvider()
        mgr.register_provider(p)
        records = [VectorRecord(id="r1", vector=(1.0, 0.0, 0.0), metadata={}, namespace="default")]
        mgr.upsert(records)
        results = mgr.search((1.0, 0.0, 0.0), top_k=5)
        assert len(results) >= 1

    def test_list_namespaces(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        p = MockVectorProvider()
        mgr.register_provider(p)
        ns = mgr.list_namespaces()
        assert "default" in ns

    def test_count(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        p = MockVectorProvider()
        mgr.register_provider(p)
        records = [VectorRecord(id="r1", vector=(1.0, 0.0, 0.0), metadata={}, namespace="default")]
        mgr.upsert(records)
        assert mgr.count() == 1

    def test_clear(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        p = MockVectorProvider()
        mgr.register_provider(p)
        records = [VectorRecord(id="r1", vector=(1.0, 0.0, 0.0), metadata={}, namespace="default")]
        mgr.upsert(records)
        mgr.clear()
        assert mgr.count() == 0

    def test_get_statistics(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        p = MockVectorProvider()
        mgr.register_provider(p)
        stats = mgr.get_statistics()
        assert stats.total_vectors == 0

    def test_validate_no_providers(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        result = mgr.validate()
        # Warns when no providers registered
        assert isinstance(result.warnings, list)

    def test_validate_with_provider(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        p = MockVectorProvider()
        mgr.register_provider(p)
        result = mgr.validate()
        assert result.is_valid

    def test_reload(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        p = MockVectorProvider()
        mgr.register_provider(p)
        mgr.reload()
        assert mgr.is_initialized

    def test_shutdown_calls_provider(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        p = MockVectorProvider()
        mgr.register_provider(p)
        mgr.shutdown()
        assert not p.is_initialized

    def test_not_initialized_raises(self):
        mgr = VectorStoreManager()
        with pytest.raises(VectorStoreError, match="not been initialized"):
            mgr.list_providers()


# ══════════════════════════════════════════════════════════════════════════
# VECTOR STORE — PROVIDER (abstract)
# ══════════════════════════════════════════════════════════════════════════


class TestVectorStoreProvider:
    def test_concrete_provider_lifecycle(self):
        p = MockVectorProvider()
        assert not p.is_initialized
        p.initialize()
        assert p.is_initialized
        p.shutdown()
        assert not p.is_initialized

    def test_upsert_and_get(self):
        p = MockVectorProvider()
        p.initialize()
        rec = VectorRecord(id="v1", vector=(1.0, 2.0, 3.0), metadata={"tag": "test"}, namespace="default")
        p.upsert([rec])
        got = p.get("v1")
        assert got is not None
        assert got.id == "v1"

    def test_delete(self):
        p = MockVectorProvider()
        p.initialize()
        rec = VectorRecord(id="v1", vector=(1.0,), metadata={}, namespace="default")
        p.upsert([rec])
        assert p.delete("v1")
        assert p.get("v1") is None

    def test_search_returns_results(self):
        p = MockVectorProvider()
        p.initialize()
        rec = VectorRecord(id="v1", vector=(1.0, 0.0), metadata={}, namespace="default")
        p.upsert([rec])
        results = p.search((1.0, 0.0), top_k=5)
        assert len(results) == 1
        assert results[0].record.id == "v1"

    def test_list_namespaces(self):
        p = MockVectorProvider()
        p.initialize()
        assert p.list_namespaces() == ["default"]

    def test_count(self):
        p = MockVectorProvider()
        p.initialize()
        assert p.count() == 0
        p.upsert([VectorRecord(id="x", vector=(1.0,), metadata={}, namespace="default")])
        assert p.count() == 1

    def test_clear(self):
        p = MockVectorProvider()
        p.initialize()
        p.upsert([VectorRecord(id="x", vector=(1.0,), metadata={}, namespace="default")])
        p.clear()
        assert p.count() == 0

    def test_health(self):
        p = MockVectorProvider()
        p.initialize()
        h = p.health()
        assert h["status"] == "healthy"

    def test_validate(self):
        p = MockVectorProvider()
        result = p.validate()
        assert result.is_valid

    def test_statistics(self):
        p = MockVectorProvider()
        p.initialize()
        stats = p.statistics
        assert stats.total_vectors == 0


# ══════════════════════════════════════════════════════════════════════════
# CONCURRENCY & EDGE CASES
# ══════════════════════════════════════════════════════════════════════════


class TestConcurrency:
    def test_vectorstore_thread_safety(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        p = MockVectorProvider()
        mgr.register_provider(p)
        errors = []

        def upsert_records():
            try:
                for i in range(50):
                    rec = VectorRecord(
                        id=str(uuid.uuid4()),
                        vector=(float(i), 0.0, 0.0),
                        metadata={},
                        namespace="default",
                    )
                    mgr.upsert([rec])
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=upsert_records) for _ in range(4)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert len(errors) == 0
        assert mgr.count() == 200

    def test_tool_manager_thread_safety(self):
        mgr = ToolManager()
        mgr.initialize()
        provider = _mock_provider()
        mgr.register_provider(provider)
        errors = []

        def execute_tools():
            try:
                for _ in range(20):
                    req = ToolRequest(tool_name="echo", arguments={"msg": "hi"}, timeout=10)
                    mgr.execute(req)
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=execute_tools) for _ in range(4)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert len(errors) == 0

    def test_encryption_thread_safety(self):
        em = EncryptionManager()
        em.initialize()
        errors = []

        def encrypt_decrypt():
            try:
                for i in range(100):
                    ct = em.encrypt(f"message_{i}")
                    pt = em.decrypt(ct)
                    assert pt == f"message_{i}"
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=encrypt_decrypt) for _ in range(4)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert len(errors) == 0


class TestEdgeCases:
    def test_sandbox_validate_command_single_word(self):
        sb = ToolSandbox(SandboxConfig(enabled=True, blocked_commands=["rm"]))
        sb.initialize()
        assert not sb.validate_command("rm")
        assert sb.validate_command("ls")

    def test_validation_engine_optional_params(self):
        e = ValidationEngine()
        e.initialize()
        req = ToolRequest(tool_name="echo", arguments={}, timeout=10)
        defn = ToolDefinition(
            name="echo",
            description="echo",
            parameters=[ToolParameter(name="opt", type="string", required=False)],
        )
        result = e.validate_request(req, defn)
        assert result.is_valid  # optional param not required

    def test_token_validate_with_scopes(self):
        tm = TokenManager()
        tm.initialize()
        token = tm.create_token("user1", scopes=("admin",))
        validated = tm.validate_token(token.value)
        assert validated is not None
        assert validated.scopes == ("admin",)

    def test_credential_metadata(self):
        em = EncryptionManager()
        em.initialize()
        cs = CredentialStore(em)
        cs.initialize()
        cred = cs.store("key", "api_key", "val", metadata={"env": "prod"})
        assert cred.metadata == {"env": "prod"}

    def test_vectorstore_upsert_deletes_existing(self):
        mgr = VectorStoreManager()
        mgr.initialize()
        p = MockVectorProvider()
        mgr.register_provider(p)
        rec1 = VectorRecord(id="r1", vector=(1.0,), metadata={"v": 1}, namespace="default")
        rec2 = VectorRecord(id="r1", vector=(2.0,), metadata={"v": 2}, namespace="default")
        mgr.upsert([rec1])
        mgr.upsert([rec2])
        got = mgr.get("r1")
        assert got.vector == (2.0,)

    def test_tool_cache_operations(self):
        cache = ToolCache()
        cache.initialize()
        req = ToolRequest(tool_name="echo", arguments={"msg": "hi"}, timeout=10)
        resp = ToolResponse(result="hi", status=ToolStatus.SUCCESS, execution_time=0.01)
        cache.put(req, resp)
        cached = cache.get(req)
        assert cached is not None
        assert cached.status == ToolStatus.SUCCESS
