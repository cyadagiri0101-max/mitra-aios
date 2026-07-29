"""Security Manager - main facade for the security system."""

from __future__ import annotations

import threading
from typing import Any

from aios.core.exceptions import SecurityError
from aios.core.logger import get_logger
from aios.security.credential import CredentialStore
from aios.security.encryption import EncryptionManager
from aios.security.models import (
    Credential,
    Permission,
    PermissionLevel,
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


class SecurityManager:
    """Main facade for the security system."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.security.manager")
        self._lock = threading.Lock()
        self._initialized: bool = False

        # Initialize components
        self._encryption = EncryptionManager()
        self._permission = PermissionEngine()
        self._secret = SecretManager(encryption_manager=self._encryption)
        self._credential = CredentialStore(encryption_manager=self._encryption)
        self._token = TokenManager()
        self._policy = PolicyEngine()

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    @property
    def encryption(self) -> EncryptionManager:
        return self._encryption

    @property
    def permission(self) -> PermissionEngine:
        return self._permission

    @property
    def secret(self) -> SecretManager:
        return self._secret

    @property
    def credential(self) -> CredentialStore:
        return self._credential

    @property
    def token(self) -> TokenManager:
        return self._token

    @property
    def policy(self) -> PolicyEngine:
        return self._policy

    def initialize(self) -> SecurityManager:
        """Initialize the security manager and all components."""
        with self._lock:
            if self._initialized:
                return self

            self._encryption.initialize()
            self._permission.initialize()
            self._secret.initialize()
            self._credential.initialize()
            self._token.initialize()
            self._policy.initialize()

            self._initialized = True
            self.logger.info("SecurityManager initialized")

        return self

    def grant_permission(self, principal: str, resource: str, level: PermissionLevel) -> Permission:
        """Grant a permission."""
        self._require_initialized()
        return self._permission.grant(principal, resource, level)

    def check_permission(self, principal: str, resource: str, level: PermissionLevel) -> bool:
        """Check a permission."""
        self._require_initialized()
        return self._permission.check(principal, resource, level)

    def store_secret(self, name: str, value: str) -> Secret:
        """Store a secret."""
        self._require_initialized()
        return self._secret.store(name, value)

    def retrieve_secret(self, name: str) -> str | None:
        """Retrieve a secret."""
        self._require_initialized()
        return self._secret.retrieve(name)

    def store_credential(self, name: str, credential_type: str, value: str) -> Credential:
        """Store a credential."""
        self._require_initialized()
        return self._credential.store(name, credential_type, value)

    def retrieve_credential(self, credential_id: str) -> str | None:
        """Retrieve a credential."""
        self._require_initialized()
        return self._credential.retrieve(credential_id)

    def create_token(self, principal: str, token_type: TokenType = TokenType.API_KEY, expires_in: float = 3600.0) -> Token:
        """Create a token."""
        self._require_initialized()
        return self._token.create_token(principal, token_type, expires_in)

    def validate_token(self, token_value: str) -> Token | None:
        """Validate a token."""
        self._require_initialized()
        return self._token.validate_token(token_value)

    def encrypt(self, plaintext: str) -> str:
        """Encrypt data."""
        self._require_initialized()
        return self._encryption.encrypt(plaintext)

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt data."""
        self._require_initialized()
        return self._encryption.decrypt(ciphertext)

    def get_statistics(self) -> SecurityStatistics:
        """Get security statistics."""
        self._require_initialized()

        return SecurityStatistics(
            total_permissions=self._permission.count(),
            total_policies=self._policy.count(),
            total_credentials=self._credential.count(),
            total_tokens=self._token.count(),
            total_secrets=self._secret.count(),
        )

    def validate(self) -> SecurityValidationResult:
        """Validate the security manager."""
        self._require_initialized()

        result = SecurityValidationResult()

        # Validate all components
        components: list[Any] = [self._encryption, self._permission, self._secret, self._credential, self._token, self._policy]
        for component in components:
            component_result = component.validate()
            result.warnings.extend(component_result.warnings)
            result.errors.extend(component_result.errors)
            if not component_result.is_valid:
                result.is_valid = False

        return result

    def reload(self) -> SecurityManager:
        """Reload the security manager."""
        self.logger.info("Reloading SecurityManager")

        with self._lock:
            self._encryption.reload()
            self._permission.reload()
            self._secret.reload()
            self._credential.reload()
            self._token.reload()
            self._policy.reload()
            self._initialized = False

        return self

    def shutdown(self) -> None:
        """Shutdown the security manager."""
        self.logger.info("Shutting down SecurityManager")

        with self._lock:
            self._initialized = False

    def _require_initialized(self) -> None:
        """Check if manager is initialized."""
        if not self._initialized:
            raise SecurityError("SecurityManager has not been initialized", component="SecurityManager")
