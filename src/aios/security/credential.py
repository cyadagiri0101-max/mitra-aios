"""Credential store for security."""

from __future__ import annotations

import threading
import uuid

from aios.core.exceptions import SecurityError
from aios.core.logger import get_logger
from aios.security.encryption import EncryptionManager
from aios.security.models import (
    Credential,
    SecurityValidationResult,
)


class CredentialStore:
    """Store for credentials."""

    def __init__(self, encryption_manager: EncryptionManager) -> None:
        self.logger = get_logger("aios.security.credential")
        self._encryption = encryption_manager
        self._credentials: dict[str, Credential] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> CredentialStore:
        """Initialize the credential store."""
        self._initialized = True
        self.logger.info("CredentialStore initialized")
        return self

    def store(self, name: str, credential_type: str, value: str, metadata: dict | None = None) -> Credential:
        """Store a credential."""
        self._require_initialized()

        credential_id = str(uuid.uuid4())
        encrypted_value = self._encryption.encrypt(value)

        credential = Credential(
            id=credential_id,
            name=name,
            credential_type=credential_type,
            encrypted_value=encrypted_value,
            metadata=metadata or {},
        )

        with self._lock:
            self._credentials[credential_id] = credential

        self.logger.info("Stored credential: %s (ID: %s)", name, credential_id)
        return credential

    def retrieve(self, credential_id: str) -> str | None:
        """Retrieve a credential value."""
        self._require_initialized()

        with self._lock:
            credential = self._credentials.get(credential_id)
            if not credential:
                return None

        return self._encryption.decrypt(credential.encrypted_value)

    def get_credential(self, credential_id: str) -> Credential | None:
        """Get a credential by ID."""
        self._require_initialized()

        with self._lock:
            return self._credentials.get(credential_id)

    def delete(self, credential_id: str) -> bool:
        """Delete a credential."""
        self._require_initialized()

        with self._lock:
            if credential_id in self._credentials:
                del self._credentials[credential_id]
                self.logger.info("Deleted credential: %s", credential_id)
                return True
            return False

    def list_credentials(self, credential_type: str | None = None) -> list[Credential]:
        """List all credentials, optionally filtered by type."""
        self._require_initialized()

        with self._lock:
            credentials = list(self._credentials.values())
            if credential_type:
                credentials = [c for c in credentials if c.credential_type == credential_type]
            return credentials

    def count(self) -> int:
        """Count credentials."""
        self._require_initialized()

        with self._lock:
            return len(self._credentials)

    def validate(self) -> SecurityValidationResult:
        """Validate the credential store."""
        result = SecurityValidationResult()

        with self._lock:
            if not self._credentials:
                result.warnings.append("No credentials stored")

        return result

    def reload(self) -> CredentialStore:
        """Reload the credential store."""
        self.logger.info("Reloading CredentialStore")

        with self._lock:
            self._credentials.clear()

        return self

    def _require_initialized(self) -> None:
        """Check if store is initialized."""
        if not self._initialized:
            raise SecurityError("CredentialStore has not been initialized", component="CredentialStore")
