"""Data models for security."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class PermissionLevel(StrEnum):
    """Permission levels."""
    NONE = "none"
    READ = "read"
    WRITE = "write"
    EXECUTE = "execute"
    ADMIN = "admin"


class TokenType(StrEnum):
    """Token types."""
    API_KEY = "api_key"
    BEARER = "bearer"
    OAUTH = "oauth"
    JWT = "jwt"


@dataclass(frozen=True, slots=True)
class Permission:
    """Permission model."""
    resource: str = ""
    level: PermissionLevel = PermissionLevel.NONE
    principal: str = ""
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class Policy:
    """Policy model."""
    name: str = ""
    description: str = ""
    permissions: tuple[Permission, ...] = ()
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class Credential:
    """Credential model."""
    id: str = ""
    name: str = ""
    credential_type: str = ""
    encrypted_value: str = ""
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class Token:
    """Token model."""
    token_id: str = ""
    token_type: TokenType = TokenType.API_KEY
    value: str = ""
    principal: str = ""
    expires_at: float = 0.0
    scopes: tuple[str, ...] = ()
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class Secret:
    """Secret model."""
    name: str = ""
    encrypted_value: str = ""
    version: int = 1
    metadata: dict = field(default_factory=dict)


@dataclass(slots=True)
class SecurityStatistics:
    """Security statistics."""
    total_permissions: int = 0
    total_policies: int = 0
    total_credentials: int = 0
    total_tokens: int = 0
    total_secrets: int = 0


@dataclass(slots=True)
class SecurityValidationResult:
    """Security validation result."""
    is_valid: bool = True
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
