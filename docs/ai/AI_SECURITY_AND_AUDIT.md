# AI Security & Audit — Sprint 2.8.2 Phase 6

## AiSecurityService

Centralizes guards that were previously inline. Pure functions, no I/O, so any
pipeline stage can call them synchronously.

- **Domain RBAC** — `assertDomainAccess(domain, role)` enforces the
  domain→roles map (mirrors the legacy copilot orchestrator).
- **Sanitization** — redacts `password/secret/token/api_key/private_key`
  assignments and caps input length.
- **Injection detection** — pattern-based detection across categories:
  instruction-override, prompt-extraction, role-hijack, jailbreak,
  safety-bypass, instruction-injection. Returns `{ flagged, reasons[] }`.
- **Citation validation** — keeps only references with a title, entityType, and
  a concrete (non-`unknown`) entityId.
- **Confidence scoring** — deterministic:
  | Condition | Confidence |
  |-----------|-----------|
  | injection-flagged | 0.10 |
  | no references | 0.35 |
  | references, no model | 0.68 (0.55 if fallback) |
  | references + model | 0.86 (0.75 if fallback) |
- **Input hashing** — sha256 of the sanitized message for audit correlation.

## AiAuditService + `ai_audit_logs`

Append-only trail (no update, no soft delete). Every orchestrated chat and tool
execution is recorded with tenant/user/role, action, domain, task, prompt
template+version, provider/model, tools executed, citation count, confidence,
input hash, injection flag, timing, and status.

Recording is fire-and-forget: an audit write failure is logged loudly but never
breaks the advisory pipeline.

`GET /ai/audit` (ADMIN/MANAGEMENT, `ai:audit:read`) queries the trail with
tenant scoping plus `userId`, `action`, `domain`, and `injectionOnly` filters.

## Conversation Manager (Phase 5)

`ConversationManagerService` wraps the 2.8.1 memory service and adds:

- **Pin/unpin** — pinned conversations are exempt from retention pruning and
  carry `metadata.pinReason/pinnedAt/pinnedBy`.
- **Metadata** — merged jsonb on `ai_conversations.metadata`.
- **Expiry reporting** — `expiresAt` computed from the retention window;
  `null` while pinned.
- **Selected project** — stored via the conversation `intent`
  (`project:<id>`), matching the memory service's existing convention.

Retention stays bounded by `AI_COPILOT_MEMORY_RETENTION_DAYS`; no long-term
memory is introduced.
