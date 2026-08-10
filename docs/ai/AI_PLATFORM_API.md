# AI Platform API — Sprint 2.8.2 Phase 7

All endpoints are under `AiPlatformController` (`/ai`), additive to the legacy
`AiController`. Authentication: JWT bearer. Guards: `JwtAuthGuard` +
`RolesGuard` + `PermissionsGuard` (permission keys seeded by migration 0033).

## Chat & Context

### `POST /ai/platform/chat`
Roles: any internal role (ADMIN, MANAGEMENT, SALES, DESIGN, PLANNING,
PRODUCTION, QUALITY). Throttled (`AI_CHAT_THROTTLE`).

Full pipeline: RBAC → injection check → task mapping → context/search/graph →
tools → prompt registry → model router → citations/confidence → audit →
conversation save.

Body (abridged): `message` (required), `domain` (required, enum), optional
`task`, `entityType`, `entityId`, `selectedProjectId`, `conversationId`,
`locale`, `model`, `tools[]`, `toolArgs`.

Response: `answer, domain, task, promptTemplate, promptVersion, provider,
modelUsed, confidence, references[], toolsExecuted[], injectionFlagged,
injectionReasons[], fallbackUsed, contextSummary, conversationId, processingMs`.

### `POST /ai/context`
Roles: internal. Throttled (`AI_ANALYZE_THROTTLE`).
Body: `domain`, `entityType`, `entityId`, optional `query`.
Returns entity context + semantic search + graph + validated references.

## Prompts

| Method | Route | Permission | Notes |
|--------|-------|------------|-------|
| GET | `/ai/prompts` | `ai:prompt:read` | filters: category, status, locale, search, page, limit |
| POST | `/ai/prompts` | `ai:prompt:write` | creates DRAFT; ADMIN/MANAGEMENT |
| PATCH | `/ai/prompts/:id` | `ai:prompt:write` | DRAFT only |
| POST | `/ai/prompts/:id/publish` | `ai:prompt:approve` | approves + archives prior PUBLISHED |

## Tools

| Method | Route | Permission |
|--------|-------|------------|
| GET | `/ai/tools?domain=` | `ai:tool:read` |
| POST | `/ai/tools/execute` | `ai:tool:execute` |

`POST /ai/tools/execute` body: `name` (e.g. `quality.ncrs`), `args`
(`{ id?, page?, limit?, status?, search?, period?, ... }`). Every execution is
audited as `tool.execute`.

## Models & Health

- `GET /ai/models` (`ai:model:read`) → `{ models[], chain[] }`
- `GET /ai/platform/health` (public) → provider ids, chain, models, tool count

## Conversations

| Method | Route | Permission |
|--------|-------|------------|
| GET | `/ai/conversations?pinnedOnly=&limit=` | `ai:conversation:read` |
| POST | `/ai/conversations/pin` | `ai:conversation:pin` |

`POST /ai/conversations/pin` body: `conversationId`, `pinned` (default true),
`reason`. Unpin with `pinned: false`.

## Audit

`GET /ai/audit` — ADMIN/MANAGEMENT only (`ai:audit:read`). Query params:
`userId`, `action`, `domain`, `injectionOnly`, `page`, `limit`. Tenant-scoped,
newest first.

## Legacy Surface (unchanged)

`GET /ai/health`, `POST /ai/chat`, `POST /ai/analyze`, and all
`/ai/copilot/*` routes keep their exact contracts from Sprint 2.8.1.
