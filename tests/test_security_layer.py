"""Tests for AIOS Security."""

from __future__ import annotations

import time

import pytest

from aios.core.exceptions import SecurityError
from aios.security.credential import CredentialStore
from aios.security.encryption import EncryptionManager
from aios.security.manager import SecurityManager
from aios.security.models import (
    Credential,
    Permission,
    PermissionLevel,
    Policy,
    Secret,
    SecurityStatistics,
    SecurityValidationResult,
    Token,
    TokenType,
)
from aios.security.permission import PermissionEngine
from aios.security.policy import PolicyEngine
from aios.security.secret import SecretManager
from aios.security.token import TokenManager

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class TestModels:
    def test_permission_creation(self):
        perm = Permission(
            resource="data",
            level=PermissionLevel.READ,
            principal="user1",
        )
        assert perm.resource == "data"
        assert perm.level == PermissionLevel.READ
        assert perm.principal == "user1"

    def test_policy_creation(self):
        policy = Policy(
            name="admin-policy",
            description="Admin access policy",
            permissions=(),
        )
        assert policy.name == "admin-policy"
        assert policy.description == "Admin access policy"

    def test_credential_creation(self):
        cred = Credential(
            id="cred1",
            name="api-key",
            credential_type="api_key",
            encrypted_value="encrypted",
        )
        assert cred.id == "cred1"
        assert cred.name == "api-key"
        assert cred.credential_type == "api_key"

    def test_token_creation(self):
        token = Token(
            token_id="token1",
            token_type=TokenType.API_KEY,
            value="aios_abc123",
            principal="user1",
            expires_at=time.time() + 3600,
            scopes=("read", "write"),
        )
        assert token.token_id == "token1"
        assert token.token_type == TokenType.API_KEY
        assert token.principal == "user1"

    def test_secret_creation(self):
        secret = Secret(
            name="db-password",
            encrypted_value="encrypted",
            version=1,
        )
        assert secret.name == "db-password"
        assert secret.version == 1

    def test_permission_level_enum(self):
        assert PermissionLevel.NONE.value == "none"
        assert PermissionLevel.READ.value == "read"
        assert PermissionLevel.WRITE.value == "write"
        assert PermissionLevel.EXECUTE.value == "execute"
        assert PermissionLevel.ADMIN.value == "admin"

    def test_token_type_enum(self):
        assert TokenType.API_KEY.value == "api_key"
        assert TokenType.BEARER.value == "bearer"
        assert TokenType.OAUTH.value == "oauth"
        assert TokenType.JWT.value == "jwt"


# ---------------------------------------------------------------------------
# EncryptionManager
# ---------------------------------------------------------------------------


class TestEncryptionManager:
    def test_initialize(self):
        manager = EncryptionManager()
        assert manager.is_initialized is False
        manager.initialize()
        assert manager.is_initialized is True

    def test_encrypt_decrypt(self):
        manager = EncryptionManager().initialize()
        plaintext = "Hello, World!"
        encrypted = manager.encrypt(plaintext)
        assert encrypted != plaintext
        decrypted = manager.decrypt(encrypted)
        assert decrypted == plaintext

    def test_encrypt_empty(self):
        manager = EncryptionManager().initialize()
        assert manager.encrypt("") == ""
        assert manager.decrypt("") == ""

    def test_hash(self):
        manager = EncryptionManager().initialize()
        hash1 = manager.hash("test")
        hash2 = manager.hash("test")
        assert hash1 == hash2
        assert len(hash1) == 64  # SHA-256 hex length

    def test_hmac(self):
        manager = EncryptionManager().initialize()
        hmac1 = manager.hmac("test")
        hmac2 = manager.hmac("test")
        assert hmac1 == hmac2

    def test_generate_key(self):
        manager = EncryptionManager().initialize()
        key1 = manager.generate_key()
        key2 = manager.generate_key()
        assert key1 != key2
        assert len(key1) == 64  # 32 bytes hex

    def test_validate(self):
        manager = EncryptionManager().initialize()
        result = manager.validate()
        assert isinstance(result, SecurityValidationResult)

    def test_reload(self):
        manager = EncryptionManager().initialize()
        manager.reload()
        assert manager.is_initialized is True

    def test_uninitialized_raises(self):
        manager = EncryptionManager()
        with pytest.raises(SecurityError):
            manager.encrypt("test")


# ---------------------------------------------------------------------------
# PermissionEngine
# ---------------------------------------------------------------------------


class TestPermissionEngine:
    def test_initialize(self):
        engine = PermissionEngine()
        assert engine.is_initialized is False
        engine.initialize()
        assert engine.is_initialized is True

    def test_grant_permission(self):
        engine = PermissionEngine().initialize()
        perm = engine.grant("user1", "data", PermissionLevel.READ)
        assert perm.principal == "user1"
        assert perm.resource == "data"
        assert perm.level == PermissionLevel.READ

    def test_revoke_permission(self):
        engine = PermissionEngine().initialize()
        engine.grant("user1", "data", PermissionLevel.READ)
        assert engine.revoke("user1", "data") is True
        assert engine.check("user1", "data", PermissionLevel.READ) is False

    def test_revoke_nonexistent(self):
        engine = PermissionEngine().initialize()
        assert engine.revoke("user1", "data") is False

    def test_check_permission_granted(self):
        engine = PermissionEngine().initialize()
        engine.grant("user1", "data", PermissionLevel.WRITE)
        assert engine.check("user1", "data", PermissionLevel.READ) is True
        assert engine.check("user1", "data", PermissionLevel.WRITE) is True

    def test_check_permission_denied(self):
        engine = PermissionEngine().initialize()
        engine.grant("user1", "data", PermissionLevel.READ)
        assert engine.check("user1", "data", PermissionLevel.WRITE) is False

    def test_check_permission_not_granted(self):
        engine = PermissionEngine().initialize()
        assert engine.check("user1", "data", PermissionLevel.READ) is False

    def test_require_permission_granted(self):
        engine = PermissionEngine().initialize()
        engine.grant("user1", "data", PermissionLevel.WRITE)
        engine.require("user1", "data", PermissionLevel.READ)  # Should not raise

    def test_require_permission_denied(self):
        engine = PermissionEngine().initialize()
        engine.grant("user1", "data", PermissionLevel.READ)
        with pytest.raises(SecurityError):
            engine.require("user1", "data", PermissionLevel.WRITE)

    def test_list_permissions(self):
        engine = PermissionEngine().initialize()
        engine.grant("user1", "data1", PermissionLevel.READ)
        engine.grant("user1", "data2", PermissionLevel.WRITE)
        engine.grant("user2", "data1", PermissionLevel.READ)

        all_perms = engine.list_permissions()
        assert len(all_perms) == 3

        user1_perms = engine.list_permissions("user1")
        assert len(user1_perms) == 2

    def test_count(self):
        engine = PermissionEngine().initialize()
        engine.grant("user1", "data1", PermissionLevel.READ)
        engine.grant("user2", "data2", PermissionLevel.WRITE)
        assert engine.count() == 2

    def test_validate(self):
        engine = PermissionEngine().initialize()
        result = engine.validate()
        assert isinstance(result, SecurityValidationResult)

    def test_reload(self):
        engine = PermissionEngine().initialize()
        engine.grant("user1", "data", PermissionLevel.READ)
        engine.reload()
        assert engine.count() == 0

    def test_uninitialized_raises(self):
        engine = PermissionEngine()
        with pytest.raises(SecurityError):
            engine.grant("user1", "data", PermissionLevel.READ)


# ---------------------------------------------------------------------------
# SecretManager
# ---------------------------------------------------------------------------


class TestSecretManager:
    def test_initialize(self):
        encryption = EncryptionManager().initialize()
        manager = SecretManager(encryption)
        assert manager.is_initialized is False
        manager.initialize()
        assert manager.is_initialized is True

    def test_store_and_retrieve(self):
        encryption = EncryptionManager().initialize()
        manager = SecretManager(encryption).initialize()

        manager.store("password", "secret123")
        retrieved = manager.retrieve("password")
        assert retrieved == "secret123"

    def test_retrieve_nonexistent(self):
        encryption = EncryptionManager().initialize()
        manager = SecretManager(encryption).initialize()
        assert manager.retrieve("nonexistent") is None

    def test_delete(self):
        encryption = EncryptionManager().initialize()
        manager = SecretManager(encryption).initialize()

        manager.store("password", "secret123")
        assert manager.delete("password") is True
        assert manager.retrieve("password") is None

    def test_delete_nonexistent(self):
        encryption = EncryptionManager().initialize()
        manager = SecretManager(encryption).initialize()
        assert manager.delete("nonexistent") is False

    def test_list_secrets(self):
        encryption = EncryptionManager().initialize()
        manager = SecretManager(encryption).initialize()

        manager.store("secret1", "value1")
        manager.store("secret2", "value2")
        secrets = manager.list_secrets()
        assert len(secrets) == 2
        assert "secret1" in secrets
        assert "secret2" in secrets

    def test_count(self):
        encryption = EncryptionManager().initialize()
        manager = SecretManager(encryption).initialize()

        manager.store("secret1", "value1")
        manager.store("secret2", "value2")
        assert manager.count() == 2

    def test_validate(self):
        encryption = EncryptionManager().initialize()
        manager = SecretManager(encryption).initialize()
        result = manager.validate()
        assert isinstance(result, SecurityValidationResult)

    def test_reload(self):
        encryption = EncryptionManager().initialize()
        manager = SecretManager(encryption).initialize()

        manager.store("secret1", "value1")
        manager.reload()
        assert manager.count() == 0

    def test_uninitialized_raises(self):
        encryption = EncryptionManager().initialize()
        manager = SecretManager(encryption)
        with pytest.raises(SecurityError):
            manager.store("secret", "value")


# ---------------------------------------------------------------------------
# CredentialStore
# ---------------------------------------------------------------------------


class TestCredentialStore:
    def test_initialize(self):
        encryption = EncryptionManager().initialize()
        store = CredentialStore(encryption)
        assert store.is_initialized is False
        store.initialize()
        assert store.is_initialized is True

    def test_store_and_retrieve(self):
        encryption = EncryptionManager().initialize()
        store = CredentialStore(encryption).initialize()

        cred = store.store("api-key", "api_key", "key123")
        retrieved = store.retrieve(cred.id)
        assert retrieved == "key123"

    def test_retrieve_nonexistent(self):
        encryption = EncryptionManager().initialize()
        store = CredentialStore(encryption).initialize()
        assert store.retrieve("nonexistent") is None

    def test_delete(self):
        encryption = EncryptionManager().initialize()
        store = CredentialStore(encryption).initialize()

        cred = store.store("api-key", "api_key", "key123")
        assert store.delete(cred.id) is True
        assert store.retrieve(cred.id) is None

    def test_list_credentials(self):
        encryption = EncryptionManager().initialize()
        store = CredentialStore(encryption).initialize()

        store.store("cred1", "api_key", "key1")
        store.store("cred2", "oauth", "token2")
        creds = store.list_credentials()
        assert len(creds) == 2

    def test_list_credentials_by_type(self):
        encryption = EncryptionManager().initialize()
        store = CredentialStore(encryption).initialize()

        store.store("cred1", "api_key", "key1")
        store.store("cred2", "oauth", "token2")
        api_keys = store.list_credentials("api_key")
        assert len(api_keys) == 1

    def test_count(self):
        encryption = EncryptionManager().initialize()
        store = CredentialStore(encryption).initialize()

        store.store("cred1", "api_key", "key1")
        store.store("cred2", "oauth", "token2")
        assert store.count() == 2

    def test_validate(self):
        encryption = EncryptionManager().initialize()
        store = CredentialStore(encryption).initialize()
        result = store.validate()
        assert isinstance(result, SecurityValidationResult)

    def test_reload(self):
        encryption = EncryptionManager().initialize()
        store = CredentialStore(encryption).initialize()

        store.store("cred1", "api_key", "key1")
        store.reload()
        assert store.count() == 0

    def test_uninitialized_raises(self):
        encryption = EncryptionManager().initialize()
        store = CredentialStore(encryption)
        with pytest.raises(SecurityError):
            store.store("cred", "type", "value")


# ---------------------------------------------------------------------------
# TokenManager
# ---------------------------------------------------------------------------


class TestTokenManager:
    def test_initialize(self):
        manager = TokenManager()
        assert manager.is_initialized is False
        manager.initialize()
        assert manager.is_initialized is True

    def test_create_token(self):
        manager = TokenManager().initialize()
        token = manager.create_token("user1", TokenType.API_KEY, expires_in=3600)
        assert token.principal == "user1"
        assert token.token_type == TokenType.API_KEY
        assert token.value.startswith("aios_")

    def test_validate_token_valid(self):
        manager = TokenManager().initialize()
        token = manager.create_token("user1", expires_in=3600)
        validated = manager.validate_token(token.value)
        assert validated is not None
        assert validated.token_id == token.token_id

    def test_validate_token_invalid(self):
        manager = TokenManager().initialize()
        assert manager.validate_token("invalid_token") is None

    def test_validate_token_expired(self):
        manager = TokenManager().initialize()
        token = manager.create_token("user1", expires_in=-1)  # Already expired
        assert manager.validate_token(token.value) is None

    def test_revoke_token(self):
        manager = TokenManager().initialize()
        token = manager.create_token("user1")
        assert manager.revoke_token(token.token_id) is True
        assert manager.validate_token(token.value) is None

    def test_revoke_nonexistent_token(self):
        manager = TokenManager().initialize()
        assert manager.revoke_token("nonexistent") is False

    def test_revoke_all_tokens(self):
        manager = TokenManager().initialize()
        manager.create_token("user1")
        manager.create_token("user1")
        manager.create_token("user2")

        count = manager.revoke_all_tokens("user1")
        assert count == 2
        assert manager.count() == 1

    def test_list_tokens(self):
        manager = TokenManager().initialize()
        manager.create_token("user1")
        manager.create_token("user2")
        tokens = manager.list_tokens()
        assert len(tokens) == 2

    def test_list_tokens_by_principal(self):
        manager = TokenManager().initialize()
        manager.create_token("user1")
        manager.create_token("user1")
        manager.create_token("user2")

        user1_tokens = manager.list_tokens("user1")
        assert len(user1_tokens) == 2

    def test_count(self):
        manager = TokenManager().initialize()
        manager.create_token("user1")
        manager.create_token("user2")
        assert manager.count() == 2

    def test_validate(self):
        manager = TokenManager().initialize()
        result = manager.validate()
        assert isinstance(result, SecurityValidationResult)

    def test_reload(self):
        manager = TokenManager().initialize()
        manager.create_token("user1")
        manager.reload()
        assert manager.count() == 0

    def test_uninitialized_raises(self):
        manager = TokenManager()
        with pytest.raises(SecurityError):
            manager.create_token("user1")

    def test_create_token_bearer_type(self):
        manager = TokenManager().initialize()
        token = manager.create_token("user1", TokenType.BEARER, expires_in=3600)
        assert token.token_type == TokenType.BEARER
        assert not token.value.startswith("aios_")

    def test_create_token_jwt_type(self):
        manager = TokenManager().initialize()
        token = manager.create_token("user1", TokenType.JWT, expires_in=3600)
        assert token.token_type == TokenType.JWT

    def test_create_token_oauth_type(self):
        manager = TokenManager().initialize()
        token = manager.create_token("user1", TokenType.OAUTH, expires_in=3600)
        assert token.token_type == TokenType.OAUTH

    def test_create_token_default_expiry(self):
        manager = TokenManager().initialize()
        token = manager.create_token("user1")
        assert token.token_type == TokenType.API_KEY
        assert token.expires_at > time.time()

    def test_token_expiry_exact(self):
        manager = TokenManager().initialize()
        now = time.time()
        token = manager.create_token("user1", expires_in=100)
        assert token.expires_at == pytest.approx(now + 100, rel=1)

    def test_list_tokens_empty(self):
        manager = TokenManager().initialize()
        assert manager.list_tokens() == []


# ---------------------------------------------------------------------------
# PolicyEngine
# ---------------------------------------------------------------------------


class TestPolicyEngine:
    def test_initialize(self):
        engine = PolicyEngine()
        assert engine.is_initialized is False
        engine.initialize()
        assert engine.is_initialized is True

    def test_create_policy(self):
        engine = PolicyEngine().initialize()
        policy = engine.create_policy("admin-policy", "Admin access")
        assert policy.name == "admin-policy"
        assert policy.description == "Admin access"

    def test_get_policy(self):
        engine = PolicyEngine().initialize()
        engine.create_policy("admin-policy")
        policy = engine.get_policy("admin-policy")
        assert policy is not None
        assert policy.name == "admin-policy"

    def test_get_nonexistent_policy(self):
        engine = PolicyEngine().initialize()
        assert engine.get_policy("nonexistent") is None

    def test_delete_policy(self):
        engine = PolicyEngine().initialize()
        engine.create_policy("admin-policy")
        assert engine.delete_policy("admin-policy") is True
        assert engine.get_policy("admin-policy") is None

    def test_delete_nonexistent_policy(self):
        engine = PolicyEngine().initialize()
        assert engine.delete_policy("nonexistent") is False

    def test_list_policies(self):
        engine = PolicyEngine().initialize()
        engine.create_policy("policy1")
        engine.create_policy("policy2")
        policies = engine.list_policies()
        assert len(policies) == 2

    def test_count(self):
        engine = PolicyEngine().initialize()
        engine.create_policy("policy1")
        engine.create_policy("policy2")
        assert engine.count() == 2

    def test_validate(self):
        engine = PolicyEngine().initialize()
        result = engine.validate()
        assert isinstance(result, SecurityValidationResult)

    def test_reload(self):
        engine = PolicyEngine().initialize()
        engine.create_policy("policy1")
        engine.reload()
        assert engine.count() == 0

    def test_uninitialized_raises(self):
        engine = PolicyEngine()
        with pytest.raises(SecurityError):
            engine.create_policy("policy1")


# ---------------------------------------------------------------------------
# SecurityManager
# ---------------------------------------------------------------------------


class TestSecurityManager:
    def test_initialize(self):
        manager = SecurityManager()
        assert manager.is_initialized is False
        manager.initialize()
        assert manager.is_initialized is True

    def test_double_initialize(self):
        manager = SecurityManager().initialize()
        manager.initialize()
        assert manager.is_initialized is True

    def test_grant_and_check_permission(self):
        manager = SecurityManager().initialize()
        manager.grant_permission("user1", "data", PermissionLevel.WRITE)
        assert manager.check_permission("user1", "data", PermissionLevel.READ) is True
        assert manager.check_permission("user1", "data", PermissionLevel.WRITE) is True

    def test_store_and_retrieve_secret(self):
        manager = SecurityManager().initialize()
        manager.store_secret("password", "secret123")
        retrieved = manager.retrieve_secret("password")
        assert retrieved == "secret123"

    def test_store_and_retrieve_credential(self):
        manager = SecurityManager().initialize()
        cred = manager.store_credential("api-key", "api_key", "key123")
        retrieved = manager.retrieve_credential(cred.id)
        assert retrieved == "key123"

    def test_create_and_validate_token(self):
        manager = SecurityManager().initialize()
        token = manager.create_token("user1", TokenType.API_KEY, expires_in=3600)
        validated = manager.validate_token(token.value)
        assert validated is not None
        assert validated.token_id == token.token_id

    def test_encrypt_and_decrypt(self):
        manager = SecurityManager().initialize()
        plaintext = "Hello, World!"
        encrypted = manager.encrypt(plaintext)
        decrypted = manager.decrypt(encrypted)
        assert decrypted == plaintext

    def test_get_statistics(self):
        manager = SecurityManager().initialize()
        manager.grant_permission("user1", "data", PermissionLevel.READ)
        manager.store_secret("secret1", "value1")
        manager.store_credential("cred1", "type", "value")
        manager.create_token("user1")
        manager.policy.create_policy("policy1")

        stats = manager.get_statistics()
        assert isinstance(stats, SecurityStatistics)
        assert stats.total_permissions == 1
        assert stats.total_secrets == 1
        assert stats.total_credentials == 1
        assert stats.total_tokens == 1
        assert stats.total_policies == 1

    def test_validate(self):
        manager = SecurityManager().initialize()
        result = manager.validate()
        assert isinstance(result, SecurityValidationResult)

    def test_reload(self):
        manager = SecurityManager().initialize()
        manager.grant_permission("user1", "data", PermissionLevel.READ)
        manager.reload()
        assert manager.is_initialized is False

    def test_shutdown(self):
        manager = SecurityManager().initialize()
        manager.shutdown()
        assert manager.is_initialized is False

    def test_uninitialized_raises(self):
        manager = SecurityManager()
        with pytest.raises(SecurityError):
            manager.grant_permission("user1", "data", PermissionLevel.READ)

    def test_components_accessible(self):
        manager = SecurityManager().initialize()
        assert manager.encryption is not None
        assert manager.permission is not None
        assert manager.secret is not None
        assert manager.credential is not None
        assert manager.token is not None
        assert manager.policy is not None

    def test_operations_after_reload(self):
        manager = SecurityManager().initialize()
        manager.reload()
        with pytest.raises(SecurityError):
            manager.grant_permission("user1", "data", PermissionLevel.READ)
        with pytest.raises(SecurityError):
            manager.store_secret("k", "v")
        with pytest.raises(SecurityError):
            manager.create_token("user1")
        with pytest.raises(SecurityError):
            manager.encrypt("data")

    def test_reload_then_initialize(self):
        manager = SecurityManager().initialize()
        manager.reload()
        manager.initialize()
        assert manager.is_initialized is True
        manager.grant_permission("user1", "data", PermissionLevel.READ)
        assert manager.check_permission("user1", "data", PermissionLevel.READ) is True

    def test_store_secret_overwrite(self):
        manager = SecurityManager().initialize()
        manager.store_secret("key", "value1")
        manager.store_secret("key", "value2")
        assert manager.retrieve_secret("key") == "value2"

    def test_permission_level_hierarchy(self):
        manager = SecurityManager().initialize()
        manager.grant_permission("user1", "data", PermissionLevel.WRITE)
        assert manager.check_permission("user1", "data", PermissionLevel.NONE) is True
        assert manager.check_permission("user1", "data", PermissionLevel.READ) is True
        assert manager.check_permission("user1", "data", PermissionLevel.WRITE) is True
        assert manager.check_permission("user1", "data", PermissionLevel.EXECUTE) is False
        assert manager.check_permission("user1", "data", PermissionLevel.ADMIN) is False

    def test_create_token_all_types(self):
        manager = SecurityManager().initialize()
        for ttype in (TokenType.API_KEY, TokenType.BEARER, TokenType.OAUTH, TokenType.JWT):
            token = manager.create_token("user1", ttype, expires_in=3600)
            assert token.token_type == ttype

    def test_nonexistent_credential(self):
        manager = SecurityManager().initialize()
        assert manager.retrieve_credential("nonexistent") is None

    def test_validate_before_initialize(self):
        manager = SecurityManager()
        with pytest.raises(SecurityError):
            manager.validate()

    def test_get_statistics_empty(self):
        manager = SecurityManager().initialize()
        stats = manager.get_statistics()
        assert stats.total_permissions == 0
        assert stats.total_secrets == 0
        assert stats.total_credentials == 0
        assert stats.total_tokens == 0
        assert stats.total_policies == 0


# ---------------------------------------------------------------------------
# Integration
# ---------------------------------------------------------------------------


class TestIntegration:
    def test_full_security_workflow(self):
        manager = SecurityManager().initialize()

        # Grant permissions
        manager.grant_permission("admin", "system", PermissionLevel.ADMIN)
        manager.grant_permission("user1", "data", PermissionLevel.WRITE)
        manager.grant_permission("user2", "data", PermissionLevel.READ)

        # Check permissions
        assert manager.check_permission("admin", "system", PermissionLevel.ADMIN) is True
        assert manager.check_permission("user1", "data", PermissionLevel.WRITE) is True
        assert manager.check_permission("user2", "data", PermissionLevel.WRITE) is False

        # Store secrets
        manager.store_secret("db-password", "secret123")
        manager.store_secret("api-key", "key456")

        # Retrieve secrets
        assert manager.retrieve_secret("db-password") == "secret123"

        # Store credentials
        cred1 = manager.store_credential("aws-creds", "aws", "access_key")
        manager.store_credential("gcp-creds", "gcp", "service_account")

        # Retrieve credentials
        assert manager.retrieve_credential(cred1.id) == "access_key"

        # Create tokens
        token1 = manager.create_token("user1", TokenType.API_KEY, expires_in=3600)
        manager.create_token("user2", TokenType.BEARER, expires_in=7200)

        # Validate tokens
        validated = manager.validate_token(token1.value)
        assert validated is not None
        assert validated.principal == "user1"

        # Encrypt/decrypt
        plaintext = "Sensitive data"
        encrypted = manager.encrypt(plaintext)
        decrypted = manager.decrypt(encrypted)
        assert decrypted == plaintext

        # Create policies
        manager.policy.create_policy("admin-policy", "Admin access")
        manager.policy.create_policy("user-policy", "User access")

        # Get statistics
        stats = manager.get_statistics()
        assert stats.total_permissions == 3
        assert stats.total_secrets == 2
        assert stats.total_credentials == 2
        assert stats.total_tokens == 2
        assert stats.total_policies == 2

        # Validate
        validation = manager.validate()
        assert validation.is_valid is True

        manager.shutdown()
