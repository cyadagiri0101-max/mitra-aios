---
id: MITRA3-AUTH-VERIFICATION
title: Authentication Verification Report
type: REPORT
layer: 3
version: 1.0
status: PUBLISHED
author: [Independent Engineering Review Board]
created: 2026-07-18
engagement: MITRA3
assurance_level: L2
---

# Authentication Verification Report

## Auth Architecture

**Auth module:** `src/aios/api/auth.py`

| Component | Description | File:Line |
|-----------|-------------|-----------|
| `security_scheme` | HTTPBearer (auto_error=False) | `auth.py:15` |
| `TokenManager` | In-memory token store with UUID-based tokens | `security/token.py` |
| `_TOKEN_VALIDATOR` | `_token_manager.validate_token` | `auth.py:21` |
| `get_current_user()` | FastAPI dependency for HTTP endpoints | `auth.py:32-56` |
| `require_ws_auth()` | WebSocket auth function | `auth.py:68-85` |
| `configure_auth()` | Enables/disables auth, sets validator | `auth.py:24-29` |

## API Route Authentication

### Direct Routes in `routes.py` — 30 handlers

All 30 `@router.*` decorators correspond to functions with `_user: dict = Depends(get_current_user)`.

**Evidence:** Confirmed line-by-line. Each of the 30 route handler functions includes the auth dependency as the first parameter.

### Sub-Router Endpoints — 61 handlers across 11 files

| Sub-router file | Endpoints | All authenticated? | Auth mechanism |
|----------------|-----------|-------------------|----------------|
| `agent_routes.py` | 7 | ✅ | `Depends(get_current_user)` |
| `chat_routes.py` | 3 | ✅ | `Depends(get_current_user)` |
| `config_routes.py` | 7 | ✅ | `Depends(get_current_user)` |
| `embedding_routes.py` | 3 | ✅ | `Depends(get_current_user)` |
| `memory_routes.py` | 5 | ✅ | `Depends(get_current_user)` |
| `plugin_routes.py` | 7 | ✅ | `Depends(get_current_user)` |
| `rag_routes.py` | 3 | ✅ | `Depends(get_current_user)` |
| `security_routes.py` | 9 | ✅ | `Depends(get_current_user)` |
| `tool_routes.py` | 4 | ✅ | `Depends(get_current_user)` |
| `vectorstore_routes.py` | 6 | ✅ | `Depends(get_current_user)` |
| `workflow_routes.py` | 7 | ✅ | `Depends(get_current_user)` |
| **Total** | **61** | **100%** | |

### Total: 91/91 API endpoints authenticated ✅

## WebSocket Authentication

### WebSocket Endpoints — 6 handlers

| Endpoint | File:Line | Auth check |
|----------|-----------|------------|
| `/ws` | `websocket_routes.py:23` | `await require_ws_auth(websocket)` |
| `/ws/runtime` | `websocket_routes.py:84` | `await require_ws_auth(websocket)` |
| `/ws/workflow/{execution_id}` | `websocket_routes.py:125` | `await require_ws_auth(websocket)` |
| `/ws/agent/{agent_name}` | `websocket_routes.py:189` | `await require_ws_auth(websocket)` |
| `/ws/tools` | `websocket_routes.py:253` | `await require_ws_auth(websocket)` |
| `/ws/chat` | `websocket_routes.py:329` | `await require_ws_auth(websocket)` |

### Total: 6/6 WebSocket endpoints authenticated ✅

## Token Validation

**File:** `src/aios/security/token.py`

- `TokenManager.create_token()` — Creates tokens with UUID, configurable TTL, scopes
- `TokenManager.validate_token()` — Iterates in-memory store, checks expiry via `time.time() < token.expires_at`
- Token types: `API_KEY` (`aios_*` prefix), `BEARER` (random), `JWT` (simplified dot-notation)
- Validation handled in `auth.py`: both `dict` and `Token` object return types supported via `hasattr(result, "principal")` pattern

### Issues

1. **In-memory only** — Tokens are stored in `self._tokens: dict[str, Token]`. Restarting the process invalidates all tokens. No persistent token store.
2. **No JWT standard** — The "JWT" token type is a simplified random-string format, not actual JSON Web Tokens (no JWT signing, no `jwt` library, no `iat`/`iss`/`aud` claims).

**Severity:** MEDIUM (accepted for current architecture)

## `configure_auth()` Bug Fix Verification

**File:** `src/aios/api/auth.py:24-29`

```python
def configure_auth(enabled: bool = True, token_validator: Any = None) -> None:
    global _AUTH_ENABLED, _TOKEN_VALIDATOR
    _AUTH_ENABLED = enabled
    if token_validator is not None:
        _TOKEN_VALIDATOR = token_validator
```

The fix preserves `_TOKEN_VALIDATOR` when called without a custom validator. Verified: previously, calling `configure_auth(enabled=True)` would set `_TOKEN_VALIDATOR = None`.

## Auth Tests

- 89 security auth tests: ✅ ALL PASS
- 14 WebSocket auth tests: ✅ ALL PASS
- 14 API route auth tests: ✅ ALL PASS

## Conclusion

**Authentication coverage is 100%.** No unprotected endpoints exist. Token validation is operational. All auth-specific tests pass.
