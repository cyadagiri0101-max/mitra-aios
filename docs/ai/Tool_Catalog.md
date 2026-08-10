# MITRA v4.0 — AI Tool Catalog

**Sprint 2.8.3 · Verified repository behavior**

Source of truth: `src/modules/ai/services/tool-registry.service.ts`
(verified: **14 registered read-only tools** in `buildTools()`).

| Tool name | Domain | Description (verbatim) |
|---|---|---|
| `engineering.drawings` | engineering | Search or fetch engineering drawings (status, revisions, project links) |
| `engineering.boms` | engineering | Search or fetch engineering BOMs with release status |
| `engineering.routings` | engineering | Search routings or fetch one routing with its operations |
| `engineering.documents` | engineering | Search or fetch controlled engineering documents |
| `planning.process_plans` | engineering | Search or fetch process plans (planning domain) |
| `quality.ncrs` | quality | List or fetch nonconformance reports (NCR) with status/severity filters |
| `quality.capas` | quality | Search or fetch CAPA verification records |
| `manufacturing.work_orders` | manufacturing | Search or fetch manufacturing work orders with traceability links |
| `service.service_requests` | service | Search or fetch customer service requests (service history) |
| `commercial.rfqs` | commercial | Search RFQs or fetch one RFQ with product details |
| `commercial.quotations` | commercial | Search quotations or fetch one quotation with line items |
| `project.projects` | project | Search or fetch projects with stage and health context |
| `analytics.bi_query` | executive | Read-only executive BI snapshot (dashboard + KPIs). Never recalculated |
| `knowledge.search` | project | Semantic search across indexed tenant knowledge |

## Tool Role Permissions (verified in tool registry)

| Tool set | Allowed roles |
|---|---|
| engineering.*, planning.process_plans | ADMIN, MANAGEMENT, DESIGN, PLANNING, PRODUCTION, QUALITY |
| manufacturing.* | ADMIN, MANAGEMENT, PLANNING, PRODUCTION, QUALITY |
| quality.* | ADMIN, MANAGEMENT, QUALITY, PRODUCTION, PLANNING |
| service.* | ADMIN, MANAGEMENT, SALES |
| commercial.* | ADMIN, MANAGEMENT, SALES |
| project.projects, knowledge.search | ADMIN, MANAGEMENT, SALES, DESIGN, PLANNING, PRODUCTION, QUALITY |
| analytics.bi_query | ADMIN, MANAGEMENT |

## Contract (verified in `ai-tool.interface.ts`)

| Field | Type | Notes |
|---|---|---|
| `name` | string | Registry key |
| `description` | string | Shown by `GET /api/ai/tools` |
| `domain` | string | Copilot domain used for RBAC mapping |
| `roles` | string[] | Roles allowed to execute |
| `execute(args, ctx)` | fn | Read-only adapter over exported domain services |

Execution (`POST /api/ai/tools/:name/execute`):
- unregistered tool → `NotFoundException` (404)
- role outside `tool.roles` → `ForbiddenException` (403)
- result serialized and truncated to `AI_TOOL_RESULT_MAX_BYTES` (default
  8 KB) so tool output can never blow the prompt budget
- response envelope: `{ tool, domain, result, truncated, durationMs }`

## Evidence

- Names and permissions extracted verbatim from `tool-registry.service.ts`.
- E2E covers: listing tools, executing a registered tool, rejecting an
  unregistered tool (404), denying out-of-role tool execution (403).