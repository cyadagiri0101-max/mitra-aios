# CRITICAL ISSUE RESOLUTION

This document contains explicit, step-by-step debugging and verification procedures for issues that have historically consumed significant time. Do not skip steps or make assumptions.

---

==================================================
LOGIN ROOT CAUSE ANALYSIS
==================================================

DO NOT ASSUME FRONTEND ISSUE.

Facts already verified:

- Backend auth works
- JWT generation works
- User exists
- Password is correct
- /api/auth/login returns token

Trace complete login flow:

LoginPage
AuthContext
api.ts
axios interceptors
ProtectedRoute
Router
Dashboard redirect
localStorage/sessionStorage

Verify:

1. Network request
2. Network response
3. Token storage
4. Auth state
5. Route guards
6. Redirect logic
7. Browser console errors

Find actual root cause.

Fix root cause.

Success:

```
admin@mitra.local
Itk98NC0oE0zQjBc40AIxyJq
```

must reach dashboard after login.

---

## Phase 3

### Ollama / Knowledge Layer

==================================================
OLLAMA VERIFICATION
==================================================

Known history:

- Host Ollama existed
- Container Ollama existed
- Instance mismatch was discovered

Verify runtime configuration.

Confirm:

```
OLLAMA_URL
```

used by backend at runtime.

Verify backend reaches:

```
http://ollama:11434
```

inside container network.

Verify:

```
/api/tags
/api/embeddings
```

return successfully.

Do NOT assume fixed.

Prove with runtime test.

==================================================
KNOWLEDGE EMBEDDINGS
==================================================

Verify:

EmbeddingService

actually generates vectors.

Verify:

knowledge_embeddings

contains real embeddings.

Verify:

VectorSearchService

returns results from stored vectors.

If embeddings fail:

identify exact failing layer:

- Ollama
- EmbeddingService
- Database
- VectorSearchService

and fix it.
