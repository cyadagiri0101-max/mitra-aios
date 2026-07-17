"""Encryption utilities for security."""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import threading

from aios.core.exceptions import SecurityError
from aios.core.logger import get_logger
from aios.security.models import SecurityValidationResult


class EncryptionManager:
    """Manager for encryption operations."""

    def __init__(self, key: str = "") -> None:
        self.logger = get_logger("aios.security.encryption")
        self._key = key or os.urandom(32).hex()
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> EncryptionManager:
        """Initialize the encryption manager."""
        self._initialized = True
        self.logger.info("EncryptionManager initialized")
        return self

    def encrypt(self, plaintext: str) -> str:
        """Encrypt plaintext using XOR with key (simplified for demo)."""
        self._require_initialized()

        if not plaintext:
            return ""

        # Simple XOR encryption (for demonstration only)
        key_bytes = bytes.fromhex(self._key)
        plaintext_bytes = plaintext.encode("utf-8")

        encrypted = []
        for i, byte in enumerate(plaintext_bytes):
            key_byte = key_bytes[i % len(key_bytes)]
            encrypted.append(byte ^ key_byte)

        return base64.b64encode(bytes(encrypted)).decode("utf-8")

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt ciphertext using XOR with key (simplified for demo)."""
        self._require_initialized()

        if not ciphertext:
            return ""

        try:
            encrypted_bytes = base64.b64decode(ciphertext.encode("utf-8"))
            key_bytes = bytes.fromhex(self._key)

            decrypted = []
            for i, byte in enumerate(encrypted_bytes):
                key_byte = key_bytes[i % len(key_bytes)]
                decrypted.append(byte ^ key_byte)

            return bytes(decrypted).decode("utf-8")
        except Exception as e:
            raise SecurityError(f"Decryption failed: {e}", component="EncryptionManager") from e

    def hash(self, data: str) -> str:
        """Hash data using SHA-256."""
        self._require_initialized()
        return hashlib.sha256(data.encode("utf-8")).hexdigest()

    def hmac(self, data: str, key: str = "") -> str:
        """Generate HMAC using SHA-256."""
        self._require_initialized()
        key_to_use = key or self._key
        return hmac.new(
            key_to_use.encode("utf-8"),
            data.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def generate_key(self, length: int = 32) -> str:
        """Generate a random encryption key."""
        self._require_initialized()
        return os.urandom(length).hex()

    def validate(self) -> SecurityValidationResult:
        """Validate the encryption manager."""
        result = SecurityValidationResult()

        if not self._key:
            result.errors.append("Encryption key is not set")
            result.is_valid = False

        return result

    def reload(self) -> EncryptionManager:
        """Reload the encryption manager."""
        self.logger.info("Reloading EncryptionManager")
        return self

    def _require_initialized(self) -> None:
        """Check if manager is initialized."""
        if not self._initialized:
            raise SecurityError("EncryptionManager has not been initialized", component="EncryptionManager")
