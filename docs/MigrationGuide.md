# Migration Guide: v1.1.0 → v1.2.0-rc2 (EOS Convergence)

## Overview

v1.2.0-rc2 introduces three breaking changes that may require manual migration:

1. **AES-256-GCM encryption** replaces the previous XOR cipher
2. **API authentication enabled by default**
3. **MemoryManager relocated** to `aios.eos.memory_manager`

---

## 1. AES-256-GCM Encryption Migration

The `EncryptionManager` now uses AES-256-GCM (authenticated encryption) instead of the
previous XOR-based cipher. Data encrypted with the old XOR cipher **cannot** be
decrypted by the new implementation.

**If you have persisted XOR-encrypted data:**

```bash
# Decrypt with old code (v1.1.0), then re-encrypt with v1.2.0-rc2
python -m aios.tools.reencrypt --old-key <hex-key> --new-key <hex-key>
```

**If you have no persisted encrypted data (fresh install or test environment):**

No action needed. The new AES-256-GCM key is auto-generated on first use.

---

## 2. API Authentication

Authentication is now **enabled by default** (`_AUTH_ENABLED = True`).

**To disable authentication** (development only):

```python
from aios.api.auth import configure_auth
configure_auth(enabled=False)
```

Or set the environment variable:
```bash
export AIOS_AUTH_ENABLED=false
```

**To configure a custom token validator:**

```python
from aios.api.auth import configure_auth

def my_validator(token: str) -> dict | None:
    if token == "my-secret":
        return {"principal": "admin", "authenticated": True}
    return None

configure_auth(enabled=True, token_validator=my_validator)
```

---

## 3. MemoryManager Relocation

`MemoryManager` has moved from `aios.memory.memory_manager` to `aios.eos.memory_manager`.

**Old import (still works via stub):**
```python
from aios.memory.memory_manager import MemoryManager  # backward compat
```

**New import (canonical):**
```python
from aios.eos.memory_manager import MemoryManager
```

The old location is a re-export stub. Update your imports at your convenience;
the stub will be removed in v1.3.0.

---

## 4. EOS Lifecycle Methods

All EOS modules now implement the full lifecycle triad: `initialize()`, `health()`,
and `shutdown()`. If you were calling `reload()` directly, the behavior is unchanged.
New `health()` and `shutdown()` methods are available on all modules.

---

## 5. Version Consistency

All version strings are now unified under `aios.__version__ = "1.2.0-rc2"`.
Use this single source of truth instead of hardcoded strings:

```python
from aios import __version__
print(f"AIOS version: {__version__}")
```
