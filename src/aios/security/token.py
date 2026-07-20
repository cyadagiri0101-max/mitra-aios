"""Token manager for security."""

from __future__ import annotations

import secrets
import threading
import time
import uuid

from aios.core.exceptions import SecurityError
from aios.core.logger import get_logger
from aios.security.models import (
    SecurityValidationResult,
    Token,
    TokenType,
)


class TokenManager:
    """Manager for authentication tokens."""

    def __init__(self) -> None:
        self.logger = get_logger("aios.security.token")
        self._tokens: dict[str, Token] = {}
        self._value_index: dict[str, str] = {}
        self._lock = threading.Lock()
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def initialize(self) -> TokenManager:
        """Initialize the token manager."""
        self._initialized = True
        self.logger.info("TokenManager initialized")
        return self

    def create_token(
        self,
        principal: str,
        token_type: TokenType = TokenType.API_KEY,
        expires_in: float = 3600.0,
        scopes: tuple[str, ...] = (),
        metadata: dict | None = None,
    ) -> Token:
        """Create a new token."""
        self._require_initialized()

        token_id = str(uuid.uuid4())
        token_value = self._generate_token_value(token_type)
        expires_at = time.time() + expires_in

        token = Token(
            token_id=token_id,
            token_type=token_type,
            value=token_value,
            principal=principal,
            expires_at=expires_at,
            scopes=scopes,
            metadata=metadata or {},
        )

        with self._lock:
            self._tokens[token_id] = token
            self._value_index[token_value] = token_id

        self.logger.info("Created %s token for '%s' (ID: %s)", token_type.value, principal, token_id)
        return token

    def validate_token(self, token_value: str) -> Token | None:
        """Validate a token and return it if valid."""
        self._require_initialized()

        with self._lock:
            token_id = self._value_index.get(token_value)
            if token_id is None:
                return None
            token = self._tokens.get(token_id)
            if token is None:
                return None
            if time.time() < token.expires_at:
                return token
            self.logger.warning("Token expired: %s", token.token_id)
            return None

    def revoke_token(self, token_id: str) -> bool:
        """Revoke a token."""
        self._require_initialized()

        with self._lock:
            token = self._tokens.pop(token_id, None)
            if token is not None:
                self._value_index.pop(token.value, None)
                self.logger.info("Revoked token: %s", token_id)
                return True
            return False

    def revoke_all_tokens(self, principal: str) -> int:
        """Revoke all tokens for a principal."""
        self._require_initialized()

        with self._lock:
            tokens_to_revoke = [
                token_id for token_id, token in self._tokens.items()
                if token.principal == principal
            ]
            for token_id in tokens_to_revoke:
                del self._tokens[token_id]

            self.logger.info("Revoked %d tokens for '%s'", len(tokens_to_revoke), principal)
            return len(tokens_to_revoke)

    def get_token(self, token_id: str) -> Token | None:
        """Get a token by ID."""
        self._require_initialized()

        with self._lock:
            return self._tokens.get(token_id)

    def list_tokens(self, principal: str | None = None) -> list[Token]:
        """List all tokens, optionally filtered by principal."""
        self._require_initialized()

        with self._lock:
            tokens = list(self._tokens.values())
            if principal:
                tokens = [t for t in tokens if t.principal == principal]
            return tokens

    def count(self) -> int:
        """Count tokens."""
        self._require_initialized()

        with self._lock:
            return len(self._tokens)

    def _generate_token_value(self, token_type: TokenType) -> str:
        """Generate a token value."""
        if token_type == TokenType.API_KEY:
            return f"aios_{secrets.token_urlsafe(32)}"
        elif token_type == TokenType.BEARER:
            return secrets.token_urlsafe(48)
        elif token_type == TokenType.JWT:
            # Simplified JWT-like token (not actual JWT)
            header = secrets.token_urlsafe(16)
            payload = secrets.token_urlsafe(32)
            signature = secrets.token_urlsafe(24)
            return f"{header}.{payload}.{signature}"
        else:
            return secrets.token_urlsafe(32)

    def validate(self) -> SecurityValidationResult:
        """Validate the token manager."""
        result = SecurityValidationResult()

        with self._lock:
            if not self._tokens:
                result.warnings.append("No tokens created")

        return result

    def reload(self) -> TokenManager:
        """Reload the token manager."""
        self.logger.info("Reloading TokenManager")

        with self._lock:
            self._tokens.clear()
            self._value_index.clear()

        return self

    def _require_initialized(self) -> None:
        """Check if manager is initialized."""
        if not self._initialized:
            raise SecurityError("TokenManager has not been initialized", component="TokenManager")
