# AI Tool Registry — Sprint 2.8.2 Phase 3

## Overview

`ToolRegistryService` registers 14 read-only, permission-checked tools that
reuse **exported domain services** — no new repositories, no recalculation.
Tools only retrieve source records to ground AI responses.

## Tool Contract

```ts
interface AiTool {
  name: string;          // e.g. 'engineering.drawings'
  description: string;
  domain: string;        // copilot domain for RBAC
  roles: string[];       // roles allowed to execute
  execute(args, ctx): Promise<unknown>;
}
```

`ctx` carries `tenantId`, `userId`, `userRole`. Every tool scopes reads by
`ctx.tenantId`.

## Registered Tools

| Tool | Backing service | Domain |
|------|-----------------|--------|
| `engineering.drawings` | EngineeringDrawingService | engineering |
| `engineering.boms` | EngineeringBomService | engineering |
| `engineering.routings` | EngineeringProcessPlanningService | engineering |
| `engineering.documents` | EngineeringDocumentService | engineering |
| `planning.process_plans` | ProcessPlanService | engineering |
| `quality.ncrs` | NcrService | quality |
| `quality.capas` | CapaService | quality |
| `manufacturing.work_orders` | WorkOrderService | manufacturing |
| `service.service_requests` | ServiceRequestService | service |
| `commercial.rfqs` | RfqService | commercial |
| `commercial.quotations` | QuotationService | commercial |
| `project.projects` | ProjectService | project |
| `analytics.bi_query` | AnalyticsDashboardService + AnalyticsKpiService | executive |
| `knowledge.search` | KnowledgeSearchService | project |

## Argument Conventions

- `id` → fetch a single record via the service's `findOne`-style method.
- No `id` → list/search with `page`, `limit`, `search`/`query`, `status`,
  `projectId` mapped to the service's filter signature.
- `analytics.bi_query` accepts `period` (default `30d`) and returns the
  dashboard + KPI snapshot **without recalculating** anything.

## Result Truncation

Serialized results exceeding `AI_TOOL_RESULT_MAX_BYTES` (default 8 KB) are
reduced. List-shaped results (`{ data: [...] }`) are halved until they fit and
annotated with `truncated: true` and `originalCount`; other shapes return a
small summary envelope. This guarantees tool output cannot blow the prompt
budget.

## RBAC

`execute()` rejects roles outside the tool's `roles` list with
`ForbiddenException`. Executive BI is restricted to ADMIN/MANAGEMENT; quality
tools exclude SALES; and so on, mirroring the copilot domain-role map.

## Endpoints

- `GET /ai/tools?domain=` — list registered tools (`ai:tool:read`)
- `POST /ai/tools/execute` — execute a tool (`ai:tool:execute`), audited as
  `tool.execute`
