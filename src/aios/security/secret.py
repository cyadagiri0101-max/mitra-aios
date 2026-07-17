"""Secret manager for security."""

from __future__ import annotations

import threading

from aios.core.exceptions import SecurityError
from aios.core.logger import get_logger
from aios.security.encryption import EncryptionManager
from aios.security.models import (
    Secret,
    SecurityValidationResult,
)


class SecretManager:
    """Manager for secrets."""

    def __init__(self, encryption_manager: EncryptionManager) -> None:
        self.logger = get_logger("aios.security.secret")
        self._encryption = encryption_manager
        self._secrets: dict[str, Secret] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> SecretManager:
        """Initialize the secret manager."""
        self._initialized = True
        self.logger.info("SecretManager initialized")
        return self

    def store(self, name: str, value: str, metadata: dict | None = None) -> Secret:
        """Store a secret."""
        self._require_initialized()

        encrypted_value = self._encryption.encrypt(value)

        with self._lock:
            existing = self._secrets.get(name)
            version = existing.version + 1 if existing else 1

            secret = Secret(
                name=name,
                encrypted_value=encrypted_value,
                version=version,
                metadata=metadata or {},
            )
            self._secrets[name] = secret

        self.logger.info("Stored secret: %s (version %d)", name, version)
        return secret

    def retrieve(self, name: str) -> str | None:
        """Retrieve a secret."""
        self._require_initialized()

        with self._lock:
            secret = self._secrets.get(name)
            if not secret:
                return None

        return self._encryption.decrypt(secret.encrypted_value)

    def delete(self, name: str) -> bool:
        """Delete a secret."""
        self._require_initialized()

        with self._lock:
            if name in self._secrets:
                del self._secrets[name]
                self.logger.info("Deleted secret: %s", name)
                return True
            return False

    def list_secrets(self) -> list[str]:
        """List all secret names."""
        self._require_initialized()

        with self._lock:
            return list(self._secrets.keys())

    def count(self) -> int:
        """Count secrets."""
        self._require_initialized()

        with self._lock:
            return len(self._secrets)

    def validate(self) -> SecurityValidationResult:
        """Validate the secret manager."""
        result = SecurityValidationResult()

        with self._lock:
            if not self._secrets:
                result.warnings.append("No secrets stored")

        return result

    def reload(self) -> SecretManager:
        """Reload the secret manager."""
        self.logger.info("Reloading SecretManager")

        with self._lock:
            self._secrets.clear()

        return self

    def _require_initialized(self) -> None:
        """Check if manager is initialized."""
        if not self._initialized:
            raise SecurityError("SecretManager has not been initialized", component="SecretManager")
