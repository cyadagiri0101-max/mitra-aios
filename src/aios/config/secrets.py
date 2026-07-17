"""Secrets management — secure handling of sensitive configuration values."""

from __future__ import annotations

import os
import threading

from aios.config.models import SecretValue
from aios.core.exceptions import SecretsError
from aios.core.logger import get_logger

logger = get_logger("aios.config.secrets")

_SECRET_ENV_PREFIX = "MITRA_SECRET_"


class SecretsManager:
    """Manage sensitive configuration values.

    Never exposes secret values in logs or repr.
    Thread-safe via threading.Lock().
    """

    def __init__(self) -> None:
        self._secrets: dict[str, str] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> SecretsManager:
        """Initialize and load secrets from environment."""
        with self._lock:
            if self._initialized:
                return self
            self._load_env_secrets()
            self._initialized = True
            logger.info("SecretsManager initialized (secrets=%d)", len(self._secrets))
        return self

    def set_secret(self, name: str, value: str) -> None:
        """Store a secret value."""
        self._require_initialized()
        if not name:
            raise SecretsError("Secret name cannot be empty")
        with self._lock:
            self._secrets[name] = value
            logger.debug("Secret set: %s", name)

    def get_secret(self, name: str, default: str | None = None) -> str | None:
        """Retrieve a secret value. Returns None if not found."""
        self._require_initialized()
        with self._lock:
            return self._secrets.get(name, default)

    def delete_secret(self, name: str) -> bool:
        """Delete a secret. Returns True if it existed."""
        self._require_initialized()
        with self._lock:
            existed = name in self._secrets
            self._secrets.pop(name, None)
            if existed:
                logger.debug("Secret deleted: %s", name)
            return existed

    def list_secrets(self) -> list[str]:
        """List all secret names (never returns values)."""
        self._require_initialized()
        with self._lock:
            return sorted(self._secrets.keys())

    def has_secret(self, name: str) -> bool:
        """Check if a secret exists."""
        self._require_initialized()
        with self._lock:
            return name in self._secrets

    def count(self) -> int:
        """Return the number of loaded secrets."""
        self._require_initialized()
        with self._lock:
            return len(self._secrets)

    def validate(self) -> list[str]:
        """Validate all secrets. Returns list of error messages."""
        self._require_initialized()
        errors: list[str] = []
        with self._lock:
            for name, value in self._secrets.items():
                if not value:
                    errors.append(f"Empty secret: {name}")
        return errors

    def get_as_config_value(self, name: str) -> SecretValue | None:
        """Get a secret wrapped as a SecretValue (safe for display)."""
        self._require_initialized()
        with self._lock:
            if name not in self._secrets:
                return None
            return SecretValue(name=name)

    def reload(self) -> SecretsManager:
        """Reload secrets from environment."""
        with self._lock:
            self._secrets.clear()
            self._initialized = False
        self.initialize()
        return self

    def shutdown(self) -> None:
        """Shutdown and clear all secrets from memory."""
        with self._lock:
            self._secrets.clear()
            self._initialized = False
        logger.info("SecretsManager shut down")

    def _load_env_secrets(self) -> None:
        """Load secrets from MITRA_SECRET_ environment variables."""
        count = 0
        for key, val in os.environ.items():
            if key.startswith(_SECRET_ENV_PREFIX) and val:
                secret_name = key[len(_SECRET_ENV_PREFIX):].lower()
                self._secrets[secret_name] = val
                count += 1
        if count:
            logger.debug("Loaded %d secrets from environment", count)

    def _require_initialized(self) -> None:
        if not self._initialized:
            raise SecretsError("SecretsManager not initialized")
