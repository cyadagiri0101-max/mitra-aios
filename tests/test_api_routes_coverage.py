"""Comprehensive route handler coverage tests for all API route modules."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from aios.api.app import create_app
from aios.api.dependencies import reset_stack, set_stack
from aios.api.stack import EOSStack


def _make_stack(**overrides) -> EOSStack:
    """Create a mock EOSStack with all managers set to MagicMock."""
    stack = EOSStack()
    for attr in (
        "memory_manager", "llm_manager", "embedding_manager",
        "vectorstore_manager", "rag_manager", "tool_manager",
        "agent_manager", "plugin_manager", "config_manager",
        "security_manager", "workflow_engine", "runtime_engine",
        "event_bus",
    ):
        m = MagicMock()
        m.is_initialized = True
        setattr(stack, attr, m)
    for k, v in overrides.items():
        setattr(stack, k, v)
    set_stack(stack)
    return stack


@pytest.fixture()
def stack():
    s = _make_stack()
    yield s
    reset_stack()


@pytest.fixture()
def client(stack):
    app = create_app()
    return TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Security routes
# ---------------------------------------------------------------------------
class TestSecurityRoutes:

    # -- grant_permission --
    def test_grant_permission(self, client, stack):
        stack.security_manager.grant_permission.return_value = MagicMock()
        r = client.post("/api/v1/security/permissions/grant", json={
            "principal": "u1", "resource": "r1", "level": "read",
        })
        assert r.status_code == 200
        assert r.json()["granted"] is True

    def test_grant_permission_none_manager(self, client, stack):
        stack.security_manager = None
        r = client.post("/api/v1/security/permissions/grant", json={
            "principal": "u1", "resource": "r1", "level": "read",
        })
        assert r.status_code == 503

    def test_grant_permission_error(self, client, stack):
        stack.security_manager.grant_permission.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/security/permissions/grant", json={
            "principal": "u1", "resource": "r1", "level": "read",
        })
        assert r.status_code == 500

    # -- check_permission --
    def test_check_permission(self, client, stack):
        stack.security_manager.check_permission.return_value = True
        r = client.post("/api/v1/security/permissions/check", json={
            "principal": "u1", "resource": "r1", "level": "read",
        })
        assert r.status_code == 200
        assert r.json()["granted"] is True

    def test_check_permission_denied(self, client, stack):
        stack.security_manager.check_permission.return_value = False
        r = client.post("/api/v1/security/permissions/check", json={
            "principal": "u1", "resource": "r1", "level": "write",
        })
        assert r.status_code == 200
        assert r.json()["granted"] is False

    def test_check_permission_none_manager(self, client, stack):
        stack.security_manager = None
        r = client.post("/api/v1/security/permissions/check", json={
            "principal": "u1", "resource": "r1", "level": "read",
        })
        assert r.status_code == 503

    def test_check_permission_error(self, client, stack):
        stack.security_manager.check_permission.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/security/permissions/check", json={
            "principal": "u1", "resource": "r1", "level": "read",
        })
        assert r.status_code == 500

    # -- store_secret --
    def test_store_secret(self, client, stack):
        r = client.post("/api/v1/security/secrets/store", json={
            "name": "key1", "value": "secret1",
        })
        assert r.status_code == 200
        assert r.json()["stored"] is True
        stack.security_manager.store_secret.assert_called_once_with(
            name="key1", value="secret1",
        )

    def test_store_secret_none_manager(self, client, stack):
        stack.security_manager = None
        r = client.post("/api/v1/security/secrets/store", json={
            "name": "key1", "value": "secret1",
        })
        assert r.status_code == 503

    def test_store_secret_error(self, client, stack):
        stack.security_manager.store_secret.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/security/secrets/store", json={
            "name": "key1", "value": "secret1",
        })
        assert r.status_code == 500

    # -- retrieve_secret --
    def test_retrieve_secret(self, client, stack):
        stack.security_manager.retrieve_secret.return_value = "val1"
        r = client.get("/api/v1/security/secrets/key1")
        assert r.status_code == 200
        assert r.json()["retrieved_value"] == "val1"

    def test_retrieve_secret_not_found(self, client, stack):
        stack.security_manager.retrieve_secret.return_value = None
        r = client.get("/api/v1/security/secrets/missing")
        assert r.status_code == 404

    def test_retrieve_secret_none_manager(self, client, stack):
        stack.security_manager = None
        r = client.get("/api/v1/security/secrets/key1")
        assert r.status_code == 503

    def test_retrieve_secret_error(self, client, stack):
        stack.security_manager.retrieve_secret.side_effect = RuntimeError("boom")
        r = client.get("/api/v1/security/secrets/key1")
        assert r.status_code == 500

    # -- create_token --
    def test_create_token(self, client, stack):
        mock_token = MagicMock()
        mock_token.value = "tok123"
        mock_token.expires_at = 12345.0
        stack.security_manager.create_token.return_value = mock_token
        r = client.post("/api/v1/security/tokens/create", json={
            "principal": "u1", "token_type": "access", "expires_in": 3600,
        })
        assert r.status_code == 200
        data = r.json()
        assert data["token"] == "tok123"
        assert data["principal"] == "u1"
        assert data["token_type"] == "access"
        assert data["expires_at"] == 12345.0

    def test_create_token_no_attrs(self, client, stack):
        stack.security_manager.create_token.return_value = "plain-token"
        r = client.post("/api/v1/security/tokens/create", json={
            "principal": "u1", "token_type": "access", "expires_in": 3600,
        })
        assert r.status_code == 200
        assert r.json()["token"] == "plain-token"
        assert r.json()["expires_at"] == 0.0

    def test_create_token_none_manager(self, client, stack):
        stack.security_manager = None
        r = client.post("/api/v1/security/tokens/create", json={
            "principal": "u1", "token_type": "access", "expires_in": 3600,
        })
        assert r.status_code == 503

    def test_create_token_error(self, client, stack):
        stack.security_manager.create_token.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/security/tokens/create", json={
            "principal": "u1", "token_type": "access", "expires_in": 3600,
        })
        assert r.status_code == 500

    # -- validate_token --
    def test_validate_token(self, client, stack):
        mock_result = MagicMock()
        mock_result.principal = "u1"
        mock_result.token_type = "access"
        stack.security_manager.validate_token.return_value = mock_result
        r = client.post("/api/v1/security/tokens/validate?token=tok123")
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is True
        assert data["principal"] == "u1"
        assert data["token_type"] == "access"

    def test_validate_token_invalid(self, client, stack):
        stack.security_manager.validate_token.return_value = None
        r = client.post("/api/v1/security/tokens/validate?token=bad")
        assert r.status_code == 401

    def test_validate_token_none_manager(self, client, stack):
        stack.security_manager = None
        r = client.post("/api/v1/security/tokens/validate?token=tok")
        assert r.status_code == 503

    def test_validate_token_error(self, client, stack):
        stack.security_manager.validate_token.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/security/tokens/validate?token=tok")
        assert r.status_code == 500

    def test_validate_token_no_attrs(self, client, stack):
        stack.security_manager.validate_token.return_value = "something"
        r = client.post("/api/v1/security/tokens/validate?token=tok")
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is True
        assert data["principal"] == ""
        assert data["token_type"] == ""

    # -- encrypt --
    def test_encrypt(self, client, stack):
        stack.security_manager.encrypt.return_value = "encrypted"
        r = client.post("/api/v1/security/encrypt", json={"data": "plain"})
        assert r.status_code == 200
        data = r.json()
        assert data["result"] == "encrypted"
        assert data["operation"] == "encrypt"

    def test_encrypt_none_manager(self, client, stack):
        stack.security_manager = None
        r = client.post("/api/v1/security/encrypt", json={"data": "plain"})
        assert r.status_code == 503

    def test_encrypt_error(self, client, stack):
        stack.security_manager.encrypt.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/security/encrypt", json={"data": "plain"})
        assert r.status_code == 500

    # -- decrypt --
    def test_decrypt(self, client, stack):
        stack.security_manager.decrypt.return_value = "decrypted"
        r = client.post("/api/v1/security/decrypt", json={"data": "enc"})
        assert r.status_code == 200
        data = r.json()
        assert data["result"] == "decrypted"
        assert data["operation"] == "decrypt"

    def test_decrypt_none_manager(self, client, stack):
        stack.security_manager = None
        r = client.post("/api/v1/security/decrypt", json={"data": "enc"})
        assert r.status_code == 503

    def test_decrypt_error(self, client, stack):
        stack.security_manager.decrypt.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/security/decrypt", json={"data": "enc"})
        assert r.status_code == 500

    # -- statistics --
    def test_statistics(self, client, stack):
        mock_stats = MagicMock()
        mock_stats.total_permissions = 10
        mock_stats.total_secrets = 5
        mock_stats.total_credentials = 3
        mock_stats.total_tokens = 7
        stack.security_manager.get_statistics.return_value = mock_stats
        r = client.get("/api/v1/security/statistics")
        assert r.status_code == 200
        data = r.json()
        assert data["total_permissions"] == 10
        assert data["total_secrets"] == 5
        assert data["total_credentials"] == 3
        assert data["total_tokens"] == 7

    def test_statistics_none_manager(self, client, stack):
        stack.security_manager = None
        r = client.get("/api/v1/security/statistics")
        assert r.status_code == 503

    def test_statistics_error(self, client, stack):
        stack.security_manager.get_statistics.side_effect = RuntimeError("boom")
        r = client.get("/api/v1/security/statistics")
        assert r.status_code == 500

    def test_statistics_missing_attrs(self, client, stack):
        stack.security_manager.get_statistics.return_value = MagicMock(spec=[])
        r = client.get("/api/v1/security/statistics")
        assert r.status_code == 200
        data = r.json()
        assert data["total_permissions"] == 0
        assert data["total_secrets"] == 0

    # -- Pydantic validation (422) --
    def test_grant_permission_empty_principal(self, client, stack):
        r = client.post("/api/v1/security/permissions/grant", json={
            "principal": "", "resource": "r1", "level": "read",
        })
        assert r.status_code == 422

    def test_grant_permission_empty_resource(self, client, stack):
        r = client.post("/api/v1/security/permissions/grant", json={
            "principal": "u1", "resource": "", "level": "read",
        })
        assert r.status_code == 422

    def test_grant_permission_missing_principal(self, client, stack):
        r = client.post("/api/v1/security/permissions/grant", json={
            "resource": "r1", "level": "read",
        })
        assert r.status_code == 422

    def test_store_secret_missing_value(self, client, stack):
        r = client.post("/api/v1/security/secrets/store", json={
            "name": "k1",
        })
        assert r.status_code == 422

    def test_store_secret_empty_name(self, client, stack):
        r = client.post("/api/v1/security/secrets/store", json={
            "name": "", "value": "v1",
        })
        assert r.status_code == 422

    def test_create_token_missing_principal(self, client, stack):
        r = client.post("/api/v1/security/tokens/create", json={
            "token_type": "access", "expires_in": 3600,
        })
        assert r.status_code == 422

    def test_encrypt_empty_data(self, client, stack):
        r = client.post("/api/v1/security/encrypt", json={"data": ""})
        assert r.status_code == 422

    def test_decrypt_empty_data(self, client, stack):
        r = client.post("/api/v1/security/decrypt", json={"data": ""})
        assert r.status_code == 422

    # -- Edge cases --
    def test_grant_permission_duplicate(self, client, stack):
        stack.security_manager.grant_permission.return_value = MagicMock()
        r1 = client.post("/api/v1/security/permissions/grant", json={
            "principal": "u1", "resource": "r1", "level": "read",
        })
        assert r1.status_code == 200
        r2 = client.post("/api/v1/security/permissions/grant", json={
            "principal": "u1", "resource": "r1", "level": "read",
        })
        assert r2.status_code == 200
        assert stack.security_manager.grant_permission.call_count == 2

    def test_store_secret_then_retrieve_roundtrip(self, client, stack):
        mock_stored = MagicMock()
        stack.security_manager.store_secret.return_value = mock_stored
        r_store = client.post("/api/v1/security/secrets/store", json={
            "name": "mykey", "value": "myval",
        })
        assert r_store.status_code == 200
        assert r_store.json()["stored"] is True

        stack.security_manager.retrieve_secret.return_value = "myval"
        r_retrieve = client.get("/api/v1/security/secrets/mykey")
        assert r_retrieve.status_code == 200
        assert r_retrieve.json()["retrieved_value"] == "myval"

    def test_check_permission_admin_level(self, client, stack):
        stack.security_manager.check_permission.return_value = True
        r = client.post("/api/v1/security/permissions/check", json={
            "principal": "admin", "resource": "system", "level": "admin",
        })
        assert r.status_code == 200
        assert r.json()["granted"] is True

    def test_create_token_minimal(self, client, stack):
        mock_token = MagicMock()
        mock_token.value = "tok-min"
        mock_token.expires_at = 9999.0
        stack.security_manager.create_token.return_value = mock_token
        r = client.post("/api/v1/security/tokens/create", json={
            "principal": "u1",
        })
        assert r.status_code == 200
        assert r.json()["token"] == "tok-min"


# ---------------------------------------------------------------------------
# Plugin routes
# ---------------------------------------------------------------------------
class TestPluginRoutes:

    # -- install --
    def test_install_plugin(self, client, stack):
        stack.plugin_manager.install_plugin.return_value = True
        r = client.post("/api/v1/plugins/install", json={
            "name": "p1", "version": "1.0.0", "description": "desc",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "p1"
        assert data["status"] == "installed"

    def test_install_plugin_failure(self, client, stack):
        stack.plugin_manager.install_plugin.return_value = False
        r = client.post("/api/v1/plugins/install", json={
            "name": "p1", "version": "1.0.0", "description": "desc",
        })
        assert r.status_code == 400

    def test_install_plugin_none_manager(self, client, stack):
        stack.plugin_manager = None
        r = client.post("/api/v1/plugins/install", json={
            "name": "p1", "version": "1.0.0", "description": "desc",
        })
        assert r.status_code == 503

    def test_install_plugin_error(self, client, stack):
        stack.plugin_manager.install_plugin.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/plugins/install", json={
            "name": "p1", "version": "1.0.0", "description": "desc",
        })
        assert r.status_code == 500

    # -- uninstall --
    def test_uninstall_plugin(self, client, stack):
        stack.plugin_manager.uninstall_plugin.return_value = True
        r = client.post("/api/v1/plugins/uninstall/p1")
        assert r.status_code == 200
        assert r.json()["status"] == "uninstalled"

    def test_uninstall_plugin_not_found(self, client, stack):
        stack.plugin_manager.uninstall_plugin.return_value = False
        r = client.post("/api/v1/plugins/uninstall/missing")
        assert r.status_code == 404

    def test_uninstall_plugin_none_manager(self, client, stack):
        stack.plugin_manager = None
        r = client.post("/api/v1/plugins/uninstall/p1")
        assert r.status_code == 503

    def test_uninstall_plugin_error(self, client, stack):
        stack.plugin_manager.uninstall_plugin.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/plugins/uninstall/p1")
        assert r.status_code == 500

    # -- enable --
    def test_enable_plugin(self, client, stack):
        stack.plugin_manager.enable_plugin.return_value = True
        r = client.post("/api/v1/plugins/enable/p1")
        assert r.status_code == 200
        assert r.json()["status"] == "enabled"

    def test_enable_plugin_not_found(self, client, stack):
        stack.plugin_manager.enable_plugin.return_value = False
        r = client.post("/api/v1/plugins/enable/missing")
        assert r.status_code == 404

    def test_enable_plugin_none_manager(self, client, stack):
        stack.plugin_manager = None
        r = client.post("/api/v1/plugins/enable/p1")
        assert r.status_code == 503

    def test_enable_plugin_error(self, client, stack):
        stack.plugin_manager.enable_plugin.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/plugins/enable/p1")
        assert r.status_code == 500

    # -- disable --
    def test_disable_plugin(self, client, stack):
        stack.plugin_manager.disable_plugin.return_value = True
        r = client.post("/api/v1/plugins/disable/p1")
        assert r.status_code == 200
        assert r.json()["status"] == "disabled"

    def test_disable_plugin_not_found(self, client, stack):
        stack.plugin_manager.disable_plugin.return_value = False
        r = client.post("/api/v1/plugins/disable/missing")
        assert r.status_code == 404

    def test_disable_plugin_none_manager(self, client, stack):
        stack.plugin_manager = None
        r = client.post("/api/v1/plugins/disable/p1")
        assert r.status_code == 503

    def test_disable_plugin_error(self, client, stack):
        stack.plugin_manager.disable_plugin.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/plugins/disable/p1")
        assert r.status_code == 500

    # -- statistics --
    def test_statistics(self, client, stack):
        mock_stats = MagicMock()
        mock_stats.total_plugins = 10
        mock_stats.enabled_plugins = 8
        mock_stats.disabled_plugins = 2
        stack.plugin_manager.get_statistics.return_value = mock_stats
        r = client.get("/api/v1/plugins/statistics")
        assert r.status_code == 200
        data = r.json()
        assert data["total_plugins"] == 10
        assert data["enabled_plugins"] == 8
        assert data["disabled_plugins"] == 2

    def test_statistics_none_manager(self, client, stack):
        stack.plugin_manager = None
        r = client.get("/api/v1/plugins/statistics")
        assert r.status_code == 503

    def test_statistics_error(self, client, stack):
        stack.plugin_manager.get_statistics.side_effect = RuntimeError("boom")
        r = client.get("/api/v1/plugins/statistics")
        assert r.status_code == 500

    def test_statistics_missing_attrs(self, client, stack):
        stack.plugin_manager.get_statistics.return_value = MagicMock(spec=[])
        r = client.get("/api/v1/plugins/statistics")
        assert r.status_code == 200
        data = r.json()
        assert data["total_plugins"] == 0

    # -- list_plugins --
    def test_list_plugins(self, client, stack):
        mock_info = MagicMock()
        mock_info.name = "p1"
        mock_info.version = "1.0.0"
        mock_info.description = "d"
        mock_info.status = "enabled"
        mock_info.enabled = True
        stack.plugin_manager.list_plugins.return_value = ["p1"]
        stack.plugin_manager.get_plugin.return_value = mock_info
        r = client.get("/api/v1/plugins")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["name"] == "p1"

    def test_list_plugins_empty(self, client, stack):
        stack.plugin_manager.list_plugins.return_value = []
        r = client.get("/api/v1/plugins")
        assert r.status_code == 200
        assert r.json() == []

    def test_list_plugins_with_status(self, client, stack):
        stack.plugin_manager.list_plugins.return_value = []
        r = client.get("/api/v1/plugins?status=enabled")
        assert r.status_code == 200
        stack.plugin_manager.list_plugins.assert_called_with(status="enabled")

    def test_list_plugins_none_info(self, client, stack):
        stack.plugin_manager.list_plugins.return_value = ["p1"]
        stack.plugin_manager.get_plugin.return_value = None
        r = client.get("/api/v1/plugins")
        assert r.status_code == 200
        assert r.json() == []

    def test_list_plugins_missing_attrs(self, client, stack):
        mock_info = MagicMock(spec=["name"])
        mock_info.name = "p1"
        stack.plugin_manager.list_plugins.return_value = ["p1"]
        stack.plugin_manager.get_plugin.return_value = mock_info
        r = client.get("/api/v1/plugins")
        assert r.status_code == 200
        data = r.json()
        assert data[0]["version"] == ""
        assert data[0]["enabled"] is False

    def test_list_plugins_none_manager(self, client, stack):
        stack.plugin_manager = None
        r = client.get("/api/v1/plugins")
        assert r.status_code == 503

    def test_list_plugins_error(self, client, stack):
        stack.plugin_manager.list_plugins.side_effect = RuntimeError("boom")
        r = client.get("/api/v1/plugins")
        assert r.status_code == 500

    # -- get_plugin --
    def test_get_plugin(self, client, stack):
        mock_info = MagicMock()
        mock_info.name = "p1"
        mock_info.version = "1.0.0"
        mock_info.description = "d"
        mock_info.status = "enabled"
        mock_info.enabled = True
        stack.plugin_manager.get_plugin.return_value = mock_info
        r = client.get("/api/v1/plugins/p1")
        assert r.status_code == 200
        assert r.json()["name"] == "p1"

    def test_get_plugin_not_found(self, client, stack):
        stack.plugin_manager.get_plugin.return_value = None
        r = client.get("/api/v1/plugins/missing")
        assert r.status_code == 404

    def test_get_plugin_none_manager(self, client, stack):
        stack.plugin_manager = None
        r = client.get("/api/v1/plugins/p1")
        assert r.status_code == 503

    def test_get_plugin_missing_attrs(self, client, stack):
        mock_info = MagicMock(spec=["name"])
        mock_info.name = "p1"
        stack.plugin_manager.get_plugin.return_value = mock_info
        r = client.get("/api/v1/plugins/p1")
        assert r.status_code == 200
        assert r.json()["version"] == ""
        assert r.json()["enabled"] is False


# ---------------------------------------------------------------------------
# Config routes
# ---------------------------------------------------------------------------
class TestConfigRoutes:

    # -- set --
    def test_set_config(self, client, stack):
        r = client.post("/api/v1/config/set", json={"key": "k1", "value": "v1"})
        assert r.status_code == 200
        assert r.json()["status"] == "set"
        stack.config_manager.set.assert_called_once_with("k1", "v1")

    def test_set_config_none_manager(self, client, stack):
        stack.config_manager = None
        r = client.post("/api/v1/config/set", json={"key": "k1", "value": "v1"})
        assert r.status_code == 503

    def test_set_config_error(self, client, stack):
        stack.config_manager.set.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/config/set", json={"key": "k1", "value": "v1"})
        assert r.status_code == 500

    # -- delete --
    def test_delete_config(self, client, stack):
        stack.config_manager.delete.return_value = True
        r = client.post("/api/v1/config/delete", json={"key": "k1"})
        assert r.status_code == 200
        assert r.json()["status"] == "deleted"

    def test_delete_config_not_found(self, client, stack):
        stack.config_manager.delete.return_value = False
        r = client.post("/api/v1/config/delete", json={"key": "missing"})
        assert r.status_code == 404

    def test_delete_config_none_manager(self, client, stack):
        stack.config_manager = None
        r = client.post("/api/v1/config/delete", json={"key": "k1"})
        assert r.status_code == 503

    def test_delete_config_error(self, client, stack):
        stack.config_manager.delete.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/config/delete", json={"key": "k1"})
        assert r.status_code == 500

    # -- validate --
    def test_validate(self, client, stack):
        mock_result = MagicMock()
        mock_result.is_valid = True
        mock_result.warnings = []
        mock_result.errors = []
        stack.config_manager.validate.return_value = mock_result
        r = client.post("/api/v1/config/validate")
        assert r.status_code == 200
        assert r.json()["is_valid"] is True

    def test_validate_none_manager(self, client, stack):
        stack.config_manager = None
        r = client.post("/api/v1/config/validate")
        assert r.status_code == 503

    def test_validate_error(self, client, stack):
        stack.config_manager.validate.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/config/validate")
        assert r.status_code == 500

    # -- reload --
    def test_reload(self, client, stack):
        r = client.post("/api/v1/config/reload")
        assert r.status_code == 200
        assert r.json()["status"] == "reloaded"

    def test_reload_none_manager(self, client, stack):
        stack.config_manager = None
        r = client.post("/api/v1/config/reload")
        assert r.status_code == 503

    def test_reload_error(self, client, stack):
        stack.config_manager.reload.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/config/reload")
        assert r.status_code == 500

    # -- export --
    def test_export_json(self, client, stack):
        stack.config_manager.export_json.return_value = '{"k":"v"}'
        r = client.get("/api/v1/config/export/json")
        assert r.status_code == 200
        data = r.json()
        assert data["format"] == "json"
        assert data["content"] == '{"k":"v"}'

    def test_export_yaml(self, client, stack):
        stack.config_manager.export_yaml.return_value = "k: v"
        r = client.get("/api/v1/config/export/yaml")
        assert r.status_code == 200
        assert r.json()["format"] == "yaml"

    def test_export_toml(self, client, stack):
        stack.config_manager.export_toml.return_value = "k='v'"
        r = client.get("/api/v1/config/export/toml")
        assert r.status_code == 200
        assert r.json()["format"] == "toml"

    def test_export_unsupported_format(self, client, stack):
        r = client.get("/api/v1/config/export/xml")
        assert r.status_code == 400

    def test_export_none_manager(self, client, stack):
        stack.config_manager = None
        r = client.get("/api/v1/config/export/json")
        assert r.status_code == 503

    def test_export_error(self, client, stack):
        stack.config_manager.export_json.side_effect = RuntimeError("boom")
        r = client.get("/api/v1/config/export/json")
        assert r.status_code == 500

    # -- statistics --
    def test_statistics(self, client, stack):
        mock_stats = MagicMock()
        mock_stats.total_keys = 50
        mock_stats.sources_loaded = 3
        mock_stats.validation_errors = 0
        stack.config_manager.statistics.return_value = mock_stats
        r = client.get("/api/v1/config/statistics")
        assert r.status_code == 200
        assert r.json()["total_keys"] == 50

    def test_statistics_none_manager(self, client, stack):
        stack.config_manager = None
        r = client.get("/api/v1/config/statistics")
        assert r.status_code == 503

    def test_statistics_error(self, client, stack):
        stack.config_manager.statistics.side_effect = RuntimeError("boom")
        r = client.get("/api/v1/config/statistics")
        assert r.status_code == 500

    def test_statistics_missing_attrs(self, client, stack):
        stack.config_manager.statistics.return_value = MagicMock(spec=[])
        r = client.get("/api/v1/config/statistics")
        assert r.status_code == 200
        assert r.json()["total_keys"] == 0

    # -- get --
    def test_get_config(self, client, stack):
        stack.config_manager.get.return_value = "val"
        stack.config_manager.exists.return_value = True
        r = client.get("/api/v1/config/my.key")
        assert r.status_code == 200
        data = r.json()
        assert data["key"] == "my.key"
        assert data["value"] == "val"
        assert data["exists"] is True

    def test_get_config_none_manager(self, client, stack):
        stack.config_manager = None
        r = client.get("/api/v1/config/my.key")
        assert r.status_code == 503

    def test_get_config_error(self, client, stack):
        stack.config_manager.get.side_effect = RuntimeError("boom")
        r = client.get("/api/v1/config/my.key")
        assert r.status_code == 500


# ---------------------------------------------------------------------------
# Chat routes
# ---------------------------------------------------------------------------
class TestChatRoutes:

    # -- chat via LLM --
    def test_chat_via_llm(self, client, stack):
        stack.agent_manager = None
        mock_resp = MagicMock()
        mock_resp.content = "Hello!"
        mock_resp.model = "m1"
        mock_resp.usage.total_tokens = 10
        stack.llm_manager.generate.return_value = mock_resp
        r = client.post("/api/v1/chat", json={"message": "Hi"})
        assert r.status_code == 200
        data = r.json()
        assert data["response"] == "Hello!"
        assert data["tokens_used"] == 10
        assert data["model"] == "m1"

    # -- chat via agent --
    def test_chat_via_agent(self, client, stack):
        stack.agent_manager.chat.return_value = "Agent says hi"
        r = client.post("/api/v1/chat", json={
            "message": "Hi", "agent_name": "a1",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["response"] == "Agent says hi"
        assert data["conversation_id"] == "a1"

    def test_chat_via_agent_error(self, client, stack):
        stack.agent_manager.chat.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/chat", json={
            "message": "Hi", "agent_name": "a1",
        })
        assert r.status_code == 500

    # -- chat no LLM/agent --
    def test_chat_no_llm_or_agent(self, client, stack):
        stack.agent_manager = None
        stack.llm_manager = None
        r = client.post("/api/v1/chat", json={"message": "Hi"})
        assert r.status_code == 503

    # -- LLM error --
    def test_chat_llm_error(self, client, stack):
        stack.agent_manager = None
        stack.llm_manager.generate.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/chat", json={"message": "Hi"})
        assert r.status_code == 500

    # -- LLM result missing usage --
    def test_chat_llm_no_usage(self, client, stack):
        stack.agent_manager = None
        mock_resp = MagicMock(spec=["content", "model"])
        mock_resp.content = "Hi"
        mock_resp.model = "m1"
        stack.llm_manager.generate.return_value = mock_resp
        r = client.post("/api/v1/chat", json={"message": "Hi"})
        assert r.status_code == 200
        assert r.json()["tokens_used"] == 0

    # -- LLM result model fallback --
    def test_chat_llm_model_fallback(self, client, stack):
        stack.agent_manager = None
        mock_resp = MagicMock(spec=["content", "model", "usage"])
        mock_resp.content = "Hi"
        mock_resp.model = None
        mock_resp.usage.total_tokens = 5
        stack.llm_manager.generate.return_value = mock_resp
        r = client.post("/api/v1/chat", json={"message": "Hi"})
        assert r.status_code == 200
        assert r.json()["model"] == "default"

    # -- invalid request --
    def test_chat_invalid_request(self, client, stack):
        r = client.post("/api/v1/chat", json={})
        assert r.status_code == 422

    # -- chat_history --
    def test_chat_history(self, client, stack):
        mock_agent = MagicMock()
        msg1 = MagicMock(role="user", content="hi", timestamp=1.0)
        msg2 = MagicMock(role="assistant", content="hello", timestamp=2.0)
        mock_agent.conversation.get_history.return_value = [msg1, msg2]
        stack.agent_manager.get_agent.return_value = mock_agent
        r = client.get("/api/v1/chat/history/a1")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 2
        assert data["messages"][0]["role"] == "user"

    def test_chat_history_none_manager(self, client, stack):
        stack.agent_manager = None
        r = client.get("/api/v1/chat/history/a1")
        assert r.status_code == 503

    def test_chat_history_not_found(self, client, stack):
        stack.agent_manager.get_agent.return_value = None
        r = client.get("/api/v1/chat/history/missing")
        assert r.status_code == 404

    def test_chat_history_error(self, client, stack):
        mock_agent = MagicMock()
        mock_agent.conversation.get_history.side_effect = RuntimeError("boom")
        stack.agent_manager.get_agent.return_value = mock_agent
        r = client.get("/api/v1/chat/history/a1")
        assert r.status_code == 500

    # -- clear_chat_history --
    def test_clear_chat_history(self, client, stack):
        mock_agent = MagicMock()
        stack.agent_manager.get_agent.return_value = mock_agent
        r = client.delete("/api/v1/chat/history/a1")
        assert r.status_code == 200
        assert r.json()["status"] == "cleared"
        mock_agent.conversation.clear.assert_called_once()

    def test_clear_chat_history_none_manager(self, client, stack):
        stack.agent_manager = None
        r = client.delete("/api/v1/chat/history/a1")
        assert r.status_code == 503

    def test_clear_chat_history_not_found(self, client, stack):
        stack.agent_manager.get_agent.return_value = None
        r = client.delete("/api/v1/chat/history/missing")
        assert r.status_code == 404

    def test_clear_chat_history_error(self, client, stack):
        mock_agent = MagicMock()
        mock_agent.conversation.clear.side_effect = RuntimeError("boom")
        stack.agent_manager.get_agent.return_value = mock_agent
        r = client.delete("/api/v1/chat/history/a1")
        assert r.status_code == 500


# ---------------------------------------------------------------------------
# Agent routes
# ---------------------------------------------------------------------------
class TestAgentRoutes:

    # -- create --
    def test_create_agent(self, client, stack):
        mock_agent = MagicMock()
        mock_agent.name = "a1"
        mock_agent.agent_id = "id-1"
        stack.agent_manager.create_agent.return_value = mock_agent
        r = client.post("/api/v1/agents", json={
            "name": "a1", "role": "assistant", "description": "test",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "a1"
        assert data["agent_id"] == "id-1"
        assert data["status"] == "created"

    def test_create_agent_none_manager(self, client, stack):
        stack.agent_manager = None
        r = client.post("/api/v1/agents", json={"name": "a1"})
        assert r.status_code == 503

    def test_create_agent_error(self, client, stack):
        stack.agent_manager.create_agent.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/agents", json={"name": "a1"})
        assert r.status_code == 500

    # -- statistics --
    def test_statistics(self, client, stack):
        stack.agent_manager.statistics.return_value = {"a1": MagicMock(), "a2": MagicMock()}
        r = client.get("/api/v1/agents/statistics")
        assert r.status_code == 200
        assert r.json()["total_agents"] == 2

    def test_statistics_none_manager(self, client, stack):
        stack.agent_manager = None
        r = client.get("/api/v1/agents/statistics")
        assert r.status_code == 503

    def test_statistics_error(self, client, stack):
        stack.agent_manager.statistics.side_effect = RuntimeError("boom")
        r = client.get("/api/v1/agents/statistics")
        assert r.status_code == 500

    # -- list --
    def test_list_agents(self, client, stack):
        mock_agent = MagicMock()
        mock_agent.name = "a1"
        mock_agent.role = "assistant"
        mock_agent.description = "d"
        mock_agent.is_initialized = True
        stack.agent_manager.list_agents.return_value = ["a1"]
        stack.agent_manager.get_agent.return_value = mock_agent
        r = client.get("/api/v1/agents")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["name"] == "a1"

    def test_list_agents_empty(self, client, stack):
        stack.agent_manager.list_agents.return_value = []
        r = client.get("/api/v1/agents")
        assert r.status_code == 200
        assert r.json() == []

    def test_list_agents_none_agent(self, client, stack):
        stack.agent_manager.list_agents.return_value = ["a1"]
        stack.agent_manager.get_agent.return_value = None
        r = client.get("/api/v1/agents")
        assert r.status_code == 200
        assert r.json() == []

    def test_list_agents_not_initialized(self, client, stack):
        mock_agent = MagicMock()
        mock_agent.name = "a1"
        mock_agent.role = ""
        mock_agent.description = ""
        mock_agent.is_initialized = False
        stack.agent_manager.list_agents.return_value = ["a1"]
        stack.agent_manager.get_agent.return_value = mock_agent
        r = client.get("/api/v1/agents")
        assert r.status_code == 200
        assert r.json()[0]["status"] == "unknown"

    def test_list_agents_none_manager(self, client, stack):
        stack.agent_manager = None
        r = client.get("/api/v1/agents")
        assert r.status_code == 503

    def test_list_agents_error(self, client, stack):
        stack.agent_manager.list_agents.side_effect = RuntimeError("boom")
        r = client.get("/api/v1/agents")
        assert r.status_code == 500

    # -- get --
    def test_get_agent(self, client, stack):
        mock_agent = MagicMock()
        mock_agent.name = "a1"
        mock_agent.role = "assistant"
        mock_agent.description = "d"
        mock_agent.is_initialized = True
        stack.agent_manager.get_agent.return_value = mock_agent
        r = client.get("/api/v1/agents/a1")
        assert r.status_code == 200
        assert r.json()["name"] == "a1"

    def test_get_agent_not_found(self, client, stack):
        stack.agent_manager.get_agent.return_value = None
        r = client.get("/api/v1/agents/missing")
        assert r.status_code == 404

    def test_get_agent_none_manager(self, client, stack):
        stack.agent_manager = None
        r = client.get("/api/v1/agents/a1")
        assert r.status_code == 503

    # -- delete --
    def test_delete_agent(self, client, stack):
        stack.agent_manager.remove_agent.return_value = True
        r = client.delete("/api/v1/agents/a1")
        assert r.status_code == 200
        assert r.json()["status"] == "removed"

    def test_delete_agent_not_found(self, client, stack):
        stack.agent_manager.remove_agent.return_value = False
        r = client.delete("/api/v1/agents/missing")
        assert r.status_code == 404

    def test_delete_agent_none_manager(self, client, stack):
        stack.agent_manager = None
        r = client.delete("/api/v1/agents/a1")
        assert r.status_code == 503

    def test_delete_agent_error(self, client, stack):
        stack.agent_manager.remove_agent.side_effect = RuntimeError("boom")
        r = client.delete("/api/v1/agents/a1")
        assert r.status_code == 500

    # -- run --
    def test_run_agent(self, client, stack):
        mock_result = MagicMock()
        mock_result.output = "done"
        mock_result.success = True
        mock_result.turns = 3
        stack.agent_manager.run_agent.return_value = mock_result
        r = client.post("/api/v1/agents/run", json={
            "goal": "do something", "agent_name": "a1",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["result"] == "done"
        assert data["success"] is True
        assert data["turns_used"] == 3

    def test_run_agent_no_attrs(self, client, stack):
        stack.agent_manager.run_agent.return_value = "raw result"
        r = client.post("/api/v1/agents/run", json={
            "goal": "do something", "agent_name": "a1",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["result"] == "raw result"
        assert data["success"] is True
        assert data["turns_used"] == 0

    def test_run_agent_none_manager(self, client, stack):
        stack.agent_manager = None
        r = client.post("/api/v1/agents/run", json={
            "goal": "do something", "agent_name": "a1",
        })
        assert r.status_code == 503

    def test_run_agent_error(self, client, stack):
        stack.agent_manager.run_agent.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/agents/run", json={
            "goal": "do something", "agent_name": "a1",
        })
        assert r.status_code == 500

    # -- chat_with_agent --
    def test_chat_with_agent(self, client, stack):
        mock_agent = MagicMock()
        mock_agent.conversation.count.return_value = 5
        stack.agent_manager.chat.return_value = "hi back"
        stack.agent_manager.get_agent.return_value = mock_agent
        r = client.post("/api/v1/agents/chat", json={
            "message": "hi", "agent_name": "a1",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["response"] == "hi back"
        assert data["conversation_length"] == 5

    def test_chat_with_agent_none_agent(self, client, stack):
        stack.agent_manager.chat.return_value = "ok"
        stack.agent_manager.get_agent.return_value = None
        r = client.post("/api/v1/agents/chat", json={
            "message": "hi", "agent_name": "a1",
        })
        assert r.status_code == 200
        assert r.json()["conversation_length"] == 0

    def test_chat_with_agent_none_manager(self, client, stack):
        stack.agent_manager = None
        r = client.post("/api/v1/agents/chat", json={
            "message": "hi", "agent_name": "a1",
        })
        assert r.status_code == 503

    def test_chat_with_agent_error(self, client, stack):
        stack.agent_manager.chat.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/agents/chat", json={
            "message": "hi", "agent_name": "a1",
        })
        assert r.status_code == 500


# ---------------------------------------------------------------------------
# Workflow routes
# ---------------------------------------------------------------------------
class TestWorkflowRoutes:

    # -- execute --
    def test_execute_workflow(self, client, stack):
        mock_wf = MagicMock()
        mock_wf.workflow_id = "wf-1"
        stack.workflow_engine.build.return_value = mock_wf
        stack.runtime_engine.execute.return_value = "exec-1"
        r = client.post("/api/v1/workflows/execute", json={
            "task_description": "do task", "strategy": "sequential",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["execution_id"] == "exec-1"
        assert data["status"] == "queued"

    def test_execute_workflow_none_engine(self, client, stack):
        stack.workflow_engine = None
        r = client.post("/api/v1/workflows/execute", json={
            "task_description": "do task", "strategy": "sequential",
        })
        assert r.status_code == 503

    def test_execute_workflow_none_runtime(self, client, stack):
        stack.runtime_engine = None
        r = client.post("/api/v1/workflows/execute", json={
            "task_description": "do task", "strategy": "sequential",
        })
        assert r.status_code == 503

    def test_execute_workflow_error(self, client, stack):
        stack.workflow_engine.build.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/workflows/execute", json={
            "task_description": "do task", "strategy": "sequential",
        })
        assert r.status_code == 500

    def test_execute_workflow_no_workflow_id(self, client, stack):
        mock_wf = MagicMock(spec=[])
        stack.workflow_engine.build.return_value = mock_wf
        stack.runtime_engine.execute.return_value = "exec-1"
        r = client.post("/api/v1/workflows/execute", json={
            "task_description": "do task",
        })
        assert r.status_code == 200
        assert r.json()["workflow_id"] == ""

    # -- status --
    def test_workflow_status(self, client, stack):
        mock_state = MagicMock()
        mock_state.value = "running"
        stack.runtime_engine.status.return_value = mock_state
        mock_snap = MagicMock()
        mock_snap.completed_count = 2
        mock_snap.step_count = 5
        stack.runtime_engine.snapshot.return_value = mock_snap
        r = client.get("/api/v1/workflows/status/exec-1")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "running"
        assert data["completed_steps"] == 2
        assert data["total_steps"] == 5
        assert data["progress"] == 0.4

    def test_workflow_status_zero_steps(self, client, stack):
        mock_state = MagicMock()
        mock_state.value = "done"
        stack.runtime_engine.status.return_value = mock_state
        mock_snap = MagicMock()
        mock_snap.completed_count = 0
        mock_snap.step_count = 0
        stack.runtime_engine.snapshot.return_value = mock_snap
        r = client.get("/api/v1/workflows/status/exec-1")
        assert r.status_code == 200
        assert r.json()["progress"] == 0.0

    def test_workflow_status_none_runtime(self, client, stack):
        stack.runtime_engine = None
        r = client.get("/api/v1/workflows/status/exec-1")
        assert r.status_code == 503

    def test_workflow_status_error(self, client, stack):
        stack.runtime_engine.status.side_effect = RuntimeError("not found")
        r = client.get("/api/v1/workflows/status/exec-1")
        assert r.status_code == 404

    # -- cancel --
    def test_cancel_workflow(self, client, stack):
        r = client.post("/api/v1/workflows/cancel/exec-1")
        assert r.status_code == 200
        assert r.json()["status"] == "cancelled"

    def test_cancel_workflow_none_runtime(self, client, stack):
        stack.runtime_engine = None
        r = client.post("/api/v1/workflows/cancel/exec-1")
        assert r.status_code == 503

    def test_cancel_workflow_error(self, client, stack):
        stack.runtime_engine.cancel.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/workflows/cancel/exec-1")
        assert r.status_code == 400

    # -- pause --
    def test_pause_workflow(self, client, stack):
        r = client.post("/api/v1/workflows/pause/exec-1")
        assert r.status_code == 200
        assert r.json()["status"] == "paused"

    def test_pause_workflow_none_runtime(self, client, stack):
        stack.runtime_engine = None
        r = client.post("/api/v1/workflows/pause/exec-1")
        assert r.status_code == 503

    def test_pause_workflow_error(self, client, stack):
        stack.runtime_engine.pause.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/workflows/pause/exec-1")
        assert r.status_code == 400

    # -- resume --
    def test_resume_workflow(self, client, stack):
        r = client.post("/api/v1/workflows/resume/exec-1")
        assert r.status_code == 200
        assert r.json()["status"] == "resumed"

    def test_resume_workflow_none_runtime(self, client, stack):
        stack.runtime_engine = None
        r = client.post("/api/v1/workflows/resume/exec-1")
        assert r.status_code == 503

    def test_resume_workflow_error(self, client, stack):
        stack.runtime_engine.resume.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/workflows/resume/exec-1")
        assert r.status_code == 400

    # -- list --
    def test_list_workflows(self, client, stack):
        mock_stats = MagicMock()
        mock_stats.total_executions = 10
        stack.runtime_engine.statistics.return_value = mock_stats
        r = client.get("/api/v1/workflows")
        assert r.status_code == 200
        assert r.json()["total"] == 10

    def test_list_workflows_none_runtime(self, client, stack):
        stack.runtime_engine = None
        r = client.get("/api/v1/workflows")
        assert r.status_code == 503

    def test_list_workflows_error(self, client, stack):
        stack.runtime_engine.statistics.side_effect = RuntimeError("boom")
        r = client.get("/api/v1/workflows")
        assert r.status_code == 500

    def test_list_workflows_missing_attr(self, client, stack):
        stack.runtime_engine.statistics.return_value = MagicMock(spec=[])
        r = client.get("/api/v1/workflows")
        assert r.status_code == 200
        assert r.json()["total"] == 0

    # -- statistics --
    def test_workflow_statistics(self, client, stack):
        mock_stats = MagicMock()
        mock_stats.total_executions = 100
        mock_stats.successful_executions = 90
        mock_stats.failed_executions = 5
        mock_stats.cancelled_executions = 5
        mock_stats.average_duration = 10.5
        mock_stats.average_retries = 0.5
        stack.runtime_engine.statistics.return_value = mock_stats
        r = client.get("/api/v1/workflows/statistics")
        assert r.status_code == 200
        data = r.json()
        assert data["total_executions"] == 100
        assert data["average_duration"] == 10.5

    def test_workflow_statistics_none_runtime(self, client, stack):
        stack.runtime_engine = None
        r = client.get("/api/v1/workflows/statistics")
        assert r.status_code == 503

    def test_workflow_statistics_error(self, client, stack):
        stack.runtime_engine.statistics.side_effect = RuntimeError("boom")
        r = client.get("/api/v1/workflows/statistics")
        assert r.status_code == 500


# ---------------------------------------------------------------------------
# Vectorstore routes
# ---------------------------------------------------------------------------
class TestVectorstoreRoutes:

    # -- upsert --
    def test_upsert_vectors(self, client, stack):
        stack.vectorstore_manager.upsert.return_value = 2
        r = client.post("/api/v1/vectorstores/upsert", json={
            "records": [
                {"id": "v1", "vector": [0.1, 0.2], "metadata": {}},
                {"id": "v2", "vector": [0.3, 0.4], "metadata": {}},
            ],
            "namespace": "ns1",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["upserted_count"] == 2
        assert data["namespace"] == "ns1"

    def test_upsert_vectors_with_record_id_key(self, client, stack):
        stack.vectorstore_manager.upsert.return_value = 1
        r = client.post("/api/v1/vectorstores/upsert", json={
            "records": [{"record_id": "v1", "vector": [0.1]}],
        })
        assert r.status_code == 200
        assert r.json()["upserted_count"] == 1

    def test_upsert_vectors_none_manager(self, client, stack):
        stack.vectorstore_manager = None
        r = client.post("/api/v1/vectorstores/upsert", json={
            "records": [{"id": "v1", "vector": [0.1]}],
        })
        assert r.status_code == 503

    def test_upsert_vectors_error(self, client, stack):
        stack.vectorstore_manager.upsert.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/vectorstores/upsert", json={
            "records": [{"id": "v1", "vector": [0.1]}],
        })
        assert r.status_code == 500

    # -- search --
    def test_search_vectors(self, client, stack):
        mock_result = MagicMock()
        mock_result.record.id = "v1"
        mock_result.record.metadata = {"k": "v"}
        mock_result.score = 0.95
        stack.vectorstore_manager.search.return_value = [mock_result]
        r = client.post("/api/v1/vectorstores/search", json={
            "query_vector": [0.1, 0.2], "top_k": 10,
        })
        assert r.status_code == 200
        data = r.json()
        assert data["total_found"] == 1
        assert data["results"][0]["record_id"] == "v1"
        assert data["results"][0]["score"] == 0.95

    def test_search_vectors_empty(self, client, stack):
        stack.vectorstore_manager.search.return_value = []
        r = client.post("/api/v1/vectorstores/search", json={
            "query_vector": [0.1],
        })
        assert r.status_code == 200
        assert r.json()["total_found"] == 0

    def test_search_vectors_none_manager(self, client, stack):
        stack.vectorstore_manager = None
        r = client.post("/api/v1/vectorstores/search", json={
            "query_vector": [0.1],
        })
        assert r.status_code == 503

    def test_search_vectors_error(self, client, stack):
        stack.vectorstore_manager.search.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/vectorstores/search", json={
            "query_vector": [0.1],
        })
        assert r.status_code == 500

    # -- delete --
    def test_delete_vector(self, client, stack):
        stack.vectorstore_manager.delete.return_value = True
        r = client.delete("/api/v1/vectorstores/v1?namespace=ns1")
        assert r.status_code == 200
        assert r.json()["status"] == "deleted"

    def test_delete_vector_not_found(self, client, stack):
        stack.vectorstore_manager.delete.return_value = False
        r = client.delete("/api/v1/vectorstores/missing")
        assert r.status_code == 404

    def test_delete_vector_none_manager(self, client, stack):
        stack.vectorstore_manager = None
        r = client.delete("/api/v1/vectorstores/v1")
        assert r.status_code == 503

    def test_delete_vector_error(self, client, stack):
        stack.vectorstore_manager.delete.side_effect = RuntimeError("boom")
        r = client.delete("/api/v1/vectorstores/v1")
        assert r.status_code == 500

    # -- list_namespaces --
    def test_list_namespaces(self, client, stack):
        stack.vectorstore_manager.list_namespaces.return_value = ["default", "ns1"]
        r = client.get("/api/v1/vectorstores/namespaces")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 2
        assert "default" in data["namespaces"]

    def test_list_namespaces_none_manager(self, client, stack):
        stack.vectorstore_manager = None
        r = client.get("/api/v1/vectorstores/namespaces")
        assert r.status_code == 503

    def test_list_namespaces_error(self, client, stack):
        stack.vectorstore_manager.list_namespaces.side_effect = RuntimeError("boom")
        r = client.get("/api/v1/vectorstores/namespaces")
        assert r.status_code == 500

    # -- list_providers --
    def test_list_providers(self, client, stack):
        stack.vectorstore_manager.list_providers.return_value = ["inmemory", "pinecone"]
        r = client.get("/api/v1/vectorstores/providers")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 2

    def test_list_providers_none_manager(self, client, stack):
        stack.vectorstore_manager = None
        r = client.get("/api/v1/vectorstores/providers")
        assert r.status_code == 503

    def test_list_providers_error(self, client, stack):
        stack.vectorstore_manager.list_providers.side_effect = RuntimeError("boom")
        r = client.get("/api/v1/vectorstores/providers")
        assert r.status_code == 500

    # -- statistics --
    def test_statistics(self, client, stack):
        mock_stats = MagicMock()
        mock_stats.total_vectors = 100
        stack.vectorstore_manager.get_statistics.return_value = mock_stats
        stack.vectorstore_manager.list_namespaces.return_value = ["default"]
        stack.vectorstore_manager.list_providers.return_value = ["inmemory"]
        r = client.get("/api/v1/vectorstores/statistics")
        assert r.status_code == 200
        data = r.json()
        assert data["total_vectors"] == 100
        assert data["namespaces"] == ["default"]

    def test_statistics_none_manager(self, client, stack):
        stack.vectorstore_manager = None
        r = client.get("/api/v1/vectorstores/statistics")
        assert r.status_code == 503

    def test_statistics_error(self, client, stack):
        stack.vectorstore_manager.get_statistics.side_effect = RuntimeError("boom")
        r = client.get("/api/v1/vectorstores/statistics")
        assert r.status_code == 500

    def test_statistics_missing_attrs(self, client, stack):
        stack.vectorstore_manager.get_statistics.return_value = MagicMock(spec=[])
        stack.vectorstore_manager.list_namespaces.return_value = []
        stack.vectorstore_manager.list_providers.return_value = []
        r = client.get("/api/v1/vectorstores/statistics")
        assert r.status_code == 200
        assert r.json()["total_vectors"] == 0


# ---------------------------------------------------------------------------
# Memory routes
# ---------------------------------------------------------------------------
class TestMemoryRoutes:

    # -- store --
    def test_store_memory(self, client, stack):
        mock_entry = MagicMock()
        mock_entry.entry_id = "m1"
        mock_entry.timestamp = 12345.0
        stack.memory_manager.store.return_value = mock_entry
        r = client.post("/api/v1/memory/store", json={
            "content": "remember this", "memory_type": "working", "importance": 0.8,
        })
        assert r.status_code == 200
        data = r.json()
        assert data["entry_id"] == "m1"
        assert data["memory_type"] == "working"
        assert data["timestamp"] == 12345.0
        assert data["content_preview"] == "remember this"

    def test_store_memory_none_manager(self, client, stack):
        stack.memory_manager = None
        r = client.post("/api/v1/memory/store", json={"content": "x"})
        assert r.status_code == 503

    def test_store_memory_error(self, client, stack):
        stack.memory_manager.store.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/memory/store", json={"content": "x"})
        assert r.status_code == 500

    # -- retrieve (hybrid default) --
    def test_retrieve_memory_hybrid(self, client, stack):
        mock_result = MagicMock()
        mock_result.entry.entry_id = "m1"
        mock_result.entry.content = "content"
        mock_result.entry.memory_type = "working"
        mock_result.entry.timestamp = 1.0
        mock_result.score = 0.9
        stack.memory_manager.hybrid_retrieve.return_value = [mock_result]
        r = client.post("/api/v1/memory/retrieve", json={
            "query": "test", "method": "hybrid",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["total_found"] == 1
        assert data["results"][0]["entry_id"] == "m1"

    def test_retrieve_memory_similarity(self, client, stack):
        mock_result = MagicMock()
        mock_result.entry.entry_id = "m2"
        mock_result.entry.content = "c"
        mock_result.entry.memory_type = "episodic"
        mock_result.entry.timestamp = 2.0
        mock_result.score = 0.8
        stack.memory_manager.similarity_retrieve.return_value = [mock_result]
        r = client.post("/api/v1/memory/retrieve", json={
            "query": "test", "method": "similarity",
        })
        assert r.status_code == 200
        stack.memory_manager.similarity_retrieve.assert_called_once()

    def test_retrieve_memory_keyword(self, client, stack):
        mock_result = MagicMock()
        mock_result.entry.entry_id = "m3"
        mock_result.entry.content = "c"
        mock_result.entry.memory_type = "semantic"
        mock_result.entry.timestamp = 3.0
        mock_result.score = 0.7
        stack.memory_manager.retrieve.return_value = [mock_result]
        r = client.post("/api/v1/memory/retrieve", json={
            "query": "test", "method": "keyword",
        })
        assert r.status_code == 200
        stack.memory_manager.retrieve.assert_called_once()

    def test_retrieve_memory_none_manager(self, client, stack):
        stack.memory_manager = None
        r = client.post("/api/v1/memory/retrieve", json={"query": "x"})
        assert r.status_code == 503

    def test_retrieve_memory_error(self, client, stack):
        stack.memory_manager.hybrid_retrieve.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/memory/retrieve", json={"query": "x"})
        assert r.status_code == 500

    def test_retrieve_memory_empty(self, client, stack):
        stack.memory_manager.hybrid_retrieve.return_value = []
        r = client.post("/api/v1/memory/retrieve", json={"query": "x"})
        assert r.status_code == 200
        assert r.json()["total_found"] == 0

    # -- forget --
    def test_forget_memory(self, client, stack):
        stack.memory_manager.forget.return_value = True
        r = client.post("/api/v1/memory/forget", json={
            "entry_id": "m1", "memory_type": "working",
        })
        assert r.status_code == 200
        assert r.json()["status"] == "forgotten"

    def test_forget_memory_not_found(self, client, stack):
        stack.memory_manager.forget.return_value = False
        r = client.post("/api/v1/memory/forget", json={
            "entry_id": "missing", "memory_type": "working",
        })
        assert r.status_code == 404

    def test_forget_memory_none_manager(self, client, stack):
        stack.memory_manager = None
        r = client.post("/api/v1/memory/forget", json={
            "entry_id": "m1", "memory_type": "working",
        })
        assert r.status_code == 503

    def test_forget_memory_error(self, client, stack):
        stack.memory_manager.forget.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/memory/forget", json={
            "entry_id": "m1", "memory_type": "working",
        })
        assert r.status_code == 500

    # -- consolidate --
    def test_consolidate(self, client, stack):
        mock_result = MagicMock()
        mock_result.consolidated_count = 5
        stack.memory_manager.consolidate_all.return_value = mock_result
        r = client.post("/api/v1/memory/consolidate")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "completed"
        assert data["consolidated_count"] == 5

    def test_consolidate_no_attr(self, client, stack):
        stack.memory_manager.consolidate_all.return_value = MagicMock(spec=[])
        r = client.post("/api/v1/memory/consolidate")
        assert r.status_code == 200
        assert r.json()["consolidated_count"] == 0

    def test_consolidate_none_manager(self, client, stack):
        stack.memory_manager = None
        r = client.post("/api/v1/memory/consolidate")
        assert r.status_code == 503

    def test_consolidate_error(self, client, stack):
        stack.memory_manager.consolidate_all.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/memory/consolidate")
        assert r.status_code == 500

    # -- statistics --
    def test_statistics(self, client, stack):
        mock_stats = MagicMock()
        mock_stats.working_count = 10
        mock_stats.episodic_count = 5
        mock_stats.semantic_count = 3
        mock_stats.total_count = 18
        mock_stats.consolidation_count = 2
        stack.memory_manager.statistics.return_value = mock_stats
        r = client.get("/api/v1/memory/statistics")
        assert r.status_code == 200
        data = r.json()
        assert data["working_memory_count"] == 10
        assert data["total_memories"] == 18

    def test_statistics_none_manager(self, client, stack):
        stack.memory_manager = None
        r = client.get("/api/v1/memory/statistics")
        assert r.status_code == 503

    def test_statistics_error(self, client, stack):
        stack.memory_manager.statistics.side_effect = RuntimeError("boom")
        r = client.get("/api/v1/memory/statistics")
        assert r.status_code == 500

    def test_statistics_missing_attrs(self, client, stack):
        stack.memory_manager.statistics.return_value = MagicMock(spec=[])
        r = client.get("/api/v1/memory/statistics")
        assert r.status_code == 200
        assert r.json()["total_memories"] == 0


# ---------------------------------------------------------------------------
# RAG routes
# ---------------------------------------------------------------------------
class TestRAGRoutes:

    # -- index --
    def test_index_document(self, client, stack):
        stack.rag_manager.index_document.return_value = "doc-1"
        r = client.post("/api/v1/rag/index", json={
            "content": "doc content", "title": "T", "source": "S",
        })
        assert r.status_code == 200
        assert r.json()["document_id"] == "doc-1"

    def test_index_document_none_manager(self, client, stack):
        stack.rag_manager = None
        r = client.post("/api/v1/rag/index", json={"content": "x"})
        assert r.status_code == 503

    def test_index_document_error(self, client, stack):
        stack.rag_manager.index_document.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/rag/index", json={"content": "x"})
        assert r.status_code == 500

    # -- search (no citations) --
    def test_search(self, client, stack):
        mock_result = MagicMock()
        mock_result.content = "found"
        mock_result.score = 0.9
        mock_result.source = "src"
        mock_result.metadata = {"k": "v"}
        stack.rag_manager.search.return_value = [mock_result]
        r = client.post("/api/v1/rag/search", json={
            "query": "q", "top_k": 5, "method": "hybrid",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["total_found"] == 1
        assert data["results"][0]["content"] == "found"
        assert data["citations"] == []

    def test_search_empty(self, client, stack):
        stack.rag_manager.search.return_value = []
        r = client.post("/api/v1/rag/search", json={"query": "q"})
        assert r.status_code == 200
        assert r.json()["total_found"] == 0

    def test_search_none_metadata(self, client, stack):
        mock_result = MagicMock(spec=["content", "score", "source"])
        mock_result.content = "c"
        mock_result.score = 0.5
        mock_result.source = "s"
        stack.rag_manager.search.return_value = [mock_result]
        r = client.post("/api/v1/rag/search", json={"query": "q"})
        assert r.status_code == 200

    # -- search with citations --
    def test_search_with_citations(self, client, stack):
        mock_result = MagicMock()
        mock_result.content = "found"
        mock_result.score = 0.9
        mock_result.source = "src"
        mock_result.metadata = {}
        mock_citation = MagicMock()
        mock_citation.citation_id = "c1"
        mock_citation.source = "src"
        mock_citation.content = "cite"
        stack.rag_manager.search_with_citations.return_value = (
            [mock_result], [mock_citation],
        )
        r = client.post("/api/v1/rag/search", json={
            "query": "q", "include_citations": True,
        })
        assert r.status_code == 200
        data = r.json()
        assert len(data["citations"]) == 1
        assert data["citations"][0]["citation_id"] == "c1"

    def test_search_none_manager(self, client, stack):
        stack.rag_manager = None
        r = client.post("/api/v1/rag/search", json={"query": "q"})
        assert r.status_code == 503

    def test_search_error(self, client, stack):
        stack.rag_manager.search.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/rag/search", json={"query": "q"})
        assert r.status_code == 500

    # -- statistics --
    def test_statistics(self, client, stack):
        mock_stats = MagicMock()
        mock_stats.total_documents = 100
        mock_stats.total_chunks = 500
        mock_stats.total_embeddings = 500
        mock_stats.search_count = 50
        stack.rag_manager.get_statistics.return_value = mock_stats
        r = client.get("/api/v1/rag/statistics")
        assert r.status_code == 200
        data = r.json()
        assert data["total_documents"] == 100
        assert data["search_count"] == 50

    def test_statistics_none_manager(self, client, stack):
        stack.rag_manager = None
        r = client.get("/api/v1/rag/statistics")
        assert r.status_code == 503

    def test_statistics_error(self, client, stack):
        stack.rag_manager.get_statistics.side_effect = RuntimeError("boom")
        r = client.get("/api/v1/rag/statistics")
        assert r.status_code == 500

    def test_statistics_missing_attrs(self, client, stack):
        stack.rag_manager.get_statistics.return_value = MagicMock(spec=[])
        r = client.get("/api/v1/rag/statistics")
        assert r.status_code == 200
        assert r.json()["total_documents"] == 0


# ---------------------------------------------------------------------------
# Embedding routes
# ---------------------------------------------------------------------------
class TestEmbeddingRoutes:

    # -- embed --
    def test_embed(self, client, stack):
        mock_result = MagicMock()
        mock_result.embedding = [0.1, 0.2, 0.3]
        mock_result.dimensions = 3
        mock_result.provider = "p1"
        mock_result.cached = False
        stack.embedding_manager.embed.return_value = mock_result
        r = client.post("/api/v1/embeddings/embed", json={"text": "hello"})
        assert r.status_code == 200
        data = r.json()
        assert data["embedding"] == [0.1, 0.2, 0.3]
        assert data["dimensions"] == 3
        assert data["provider"] == "p1"
        assert data["cached"] is False

    def test_embed_missing_attrs(self, client, stack):
        mock_result = MagicMock(spec=["embedding"])
        mock_result.embedding = [0.5]
        stack.embedding_manager.embed.return_value = mock_result
        r = client.post("/api/v1/embeddings/embed", json={"text": "x"})
        assert r.status_code == 200
        data = r.json()
        assert data["dimensions"] == 1
        assert data["provider"] == ""
        assert data["cached"] is False

    def test_embed_none_manager(self, client, stack):
        stack.embedding_manager = None
        r = client.post("/api/v1/embeddings/embed", json={"text": "x"})
        assert r.status_code == 503

    def test_embed_error(self, client, stack):
        stack.embedding_manager.embed.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/embeddings/embed", json={"text": "x"})
        assert r.status_code == 500

    # -- embed_batch --
    def test_embed_batch(self, client, stack):
        mock_result = MagicMock()
        mock_result.embeddings = [[0.1, 0.2], [0.3, 0.4]]
        mock_result.dimensions = 2
        mock_result.provider = "p1"
        mock_result.cached_count = 0
        stack.embedding_manager.embed_batch.return_value = mock_result
        r = client.post("/api/v1/embeddings/embed-batch", json={
            "texts": ["a", "b"],
        })
        assert r.status_code == 200
        data = r.json()
        assert len(data["embeddings"]) == 2
        assert data["total_embedded"] == 2
        assert data["cached_count"] == 0

    def test_embed_batch_empty_result(self, client, stack):
        mock_result = MagicMock()
        mock_result.embeddings = []
        mock_result.dimensions = 0
        mock_result.provider = "p1"
        mock_result.cached_count = 0
        stack.embedding_manager.embed_batch.return_value = mock_result
        r = client.post("/api/v1/embeddings/embed-batch", json={"texts": ["a"]})
        assert r.status_code == 200
        assert r.json()["total_embedded"] == 0

    def test_embed_batch_none_manager(self, client, stack):
        stack.embedding_manager = None
        r = client.post("/api/v1/embeddings/embed-batch", json={"texts": ["x"]})
        assert r.status_code == 503

    def test_embed_batch_error(self, client, stack):
        stack.embedding_manager.embed_batch.side_effect = RuntimeError("boom")
        r = client.post("/api/v1/embeddings/embed-batch", json={"texts": ["x"]})
        assert r.status_code == 500

    # -- statistics --
    def test_statistics(self, client, stack):
        mock_stats = MagicMock()
        mock_stats.total_embeddings = 1000
        mock_stats.cache_hits = 500
        mock_stats.cache_misses = 500
        stack.embedding_manager.get_statistics.return_value = mock_stats
        r = client.get("/api/v1/embeddings/statistics")
        assert r.status_code == 200
        data = r.json()
        assert data["total_embeddings"] == 1000
        assert data["cache_hits"] == 500

    def test_statistics_none_manager(self, client, stack):
        stack.embedding_manager = None
        r = client.get("/api/v1/embeddings/statistics")
        assert r.status_code == 503

    def test_statistics_error(self, client, stack):
        stack.embedding_manager.get_statistics.side_effect = RuntimeError("boom")
        r = client.get("/api/v1/embeddings/statistics")
        assert r.status_code == 500

    def test_statistics_missing_attrs(self, client, stack):
        stack.embedding_manager.get_statistics.return_value = MagicMock(spec=[])
        r = client.get("/api/v1/embeddings/statistics")
        assert r.status_code == 200
        assert r.json()["total_embeddings"] == 0
