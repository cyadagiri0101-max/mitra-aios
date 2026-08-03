# AI Platform Gap Analysis — Sprint 2.8.2

**Program:** MITRA v3.9 — Sprint 2.8 (Enterprise AI Operating System)
**Milestone:** 2.8.2 — AI Platform & Orchestration
**Date:** 2026-08-03
**Baseline:** Sprint 2.8.1 verified (`AI_2.8.1_Verification.md`) — all AI Knowledge Infrastructure is immutable and reused.

---

## 1. Method

Repository inspection of `mitra-backend/src/modules/ai`, `knowledge`, `platform`,
`engineering`, `analytics`, `audit`, `app.module.ts`, migrations, and the frontend AI
surfaces, compared line-by-line against the Sprint 2.8.2 objectives (Phases 1–10).

## 2. Capability Gap Matrix

| Sprint 2.8.2 Objective | Current State | Gap | Action |
|------------------------|---------------|-----|--------|
| **Phase 1 — Model Router** | `OllamaProvider` is called directly by `AiService` and `AiCopilotOrchestratorService`. No provider interface, no mock provider, no model listing. | **Major** | New `AiModelProvider` interface, `OllamaModelProvider` adapter (wraps existing `OllamaProvider`, no changes to it), `MockModelProvider`, `ModelRouterService`. Legacy services re-wired to router. |
| **Phase 2 — Prompt Registry** | `PromptTemplateService` holds 27 versioned templates **in code** (`v1`), with variables + safety preamble. No persistence, no approval status, no localization, no category filtering API, no create/update endpoints. Legacy `SYSTEM_PROMPT` hardcoded in `ai.service.ts`. | **Major** | DB-backed `PromptRegistryService` + `ai_prompt_templates` table (migration 0033): key/version/locale/category/status/approval, variable validation, seeding from existing definitions (they move to a seed-data module), publish/approve lifecycle. Legacy `PromptTemplateService` keeps its API (backward compat) but reads text from seed data; new platform paths use the registry. |
| **Phase 3 — Tool Registry** | None. Domain context is assembled ad hoc inside `AiDomainCopilotService`; no reusable, permission-checked tools. | **Major** | `AiTool` interface + `ToolRegistryService` + 14 tools reusing exported domain services: drawings, BOM, routings, process plans, documents (Engineering); NCR, CAPA (Quality); work orders (Manufacturing); service history (Service); RFQs, quotations (Commercial); projects (Project); BI query (Analytics); knowledge search (Knowledge). No new repositories. |
| **Phase 4 — AI Orchestrator** | `AiCopilotOrchestratorService` (verified 2.8.1) orchestrates domain chat but: binds directly to Ollama, no tool execution stage, no audit stage, fixed confidence values. | **Partial** | New `AiOrchestratorService` platform pipeline: RBAC → security (sanitize + injection detection) → context builder → semantic search → knowledge graph → prompt registry → tool registry → model router → response formatter → citation generator → confidence calculator → audit logger → conversation save. Legacy copilot orchestrator kept untouched for existing `/ai/copilot/*` endpoints. |
| **Phase 5 — Conversation Manager** | `AiCopilotMemoryService`: sessions, referenced entities, selected project, retention-bounded memory, conversations list/messages. `isPinned` column exists but **no pin API**, no metadata column, no explicit expiry reporting. | **Partial** | `ConversationManagerService` wrapping existing memory service: pin/unpin, metadata (`metadata` jsonb column added in migration 0033), expiry computation from retention policy, selected-project API. No long-term memory introduced. |
| **Phase 6 — AI Security** | RBAC guards on endpoints; domain-role map in orchestrator; secret redaction + safety preamble exist inline; throttling configured. Missing: centralized injection detection, citation validation, confidence service, **AI audit trail** (only usage tracking exists). | **Partial** | `AiSecurityService` (domain access, injection detection, redaction, citation validation, confidence scoring) + `AiAuditService` with dedicated `ai_audit_logs` table (migration 0033). Rate limiting/tenant isolation reused from existing infrastructure. |
| **Phase 7 — AI APIs** | Existing: `/ai/health`, `/ai/chat`, `/ai/analyze`, `/ai/copilot/*`. Missing: `/ai/context`, prompt management, tool listing/execution, model listing, conversation pinning. | **Partial** | New `AiPlatformController` under `/ai` with: `POST /ai/context`, `GET/POST /ai/prompts`, `POST /ai/prompts/:id/publish`, `GET /ai/tools`, `POST /ai/tools/execute`, `GET /ai/models`, `GET /ai/conversations`, `POST /ai/conversations/pin`, `GET /ai/audit`. Swagger + validation + RBAC + permissions + pagination. Existing routes untouched. |
| **Phase 8 — Backend integration** | AI module only imports Knowledge + AiUsage. Domain services are all exported from their modules (verified). | **Partial** | `AiModule` imports Engineering, Quality, Manufacturing, Service, Commercial, Project, Analytics modules; tools inject their exported services. No circular imports (none of those modules import AiModule). |
| **Phase 9 — Testing** | 8 AI/knowledge suites (48 tests) exist for 2.8.1 surface. | **Major** | New unit/integration specs for model router, prompt registry, tool registry + every tool, orchestrator, conversation manager, security, audit, platform controller. |
| **Phase 10 — Documentation** | No platform docs. | **Major** | 7 architecture docs + updates + completion report + release notes. |

## 3. What Will NOT Change (Immutable 2.8.1 Surface)

- `OllamaProvider` (low-level Ollama client) — wrapped, not modified.
- `EmbeddingService`, `VectorSearchService`, `KnowledgeSearchService`,
  `KnowledgeCatalogService`, `KnowledgeContextBuilderService`, `KnowledgeGraphService`,
  `KnowledgeIndexingService` — reused as-is.
- `EngineeringEventBus`, `OutboxService`, AI hooks registry — reused as-is.
- `AiCopilotOrchestratorService`, `AiDomainCopilotService`, `AiCopilotMemoryService`,
  `AiContextService`, `AiService` — kept for backward compatibility of existing
  `/ai/chat`, `/ai/analyze`, `/ai/copilot/*` endpoints (legacy prompt text relocated
  to seed data; constructors and public APIs unchanged).
- Analytics/BI services — consumed by the BI tool, never recalculated.

## 4. Reuse Inventory (No Duplication Contract)

| Need | Reused Component |
|------|------------------|
| Model invocation | `OllamaProvider` via new adapter |
| Semantic retrieval | `KnowledgeSearchService` / `VectorSearchService` |
| Entity context | `KnowledgeContextBuilderService` |
| Graph context | `KnowledgeGraphService` |
| Domain context + task mapping | `AiDomainCopilotService` |
| Scoped memory | `AiCopilotMemoryService` |
| Usage tracking | `AiUsageService` |
| Drawings/BOM/routing/documents | `EngineeringDrawingService`, `EngineeringBomService`, `EngineeringProcessPlanningService`, `EngineeringDocumentService` |
| NCR/CAPA | `NcrService`, `CapaService` |
| Work orders | `WorkOrderService` |
| Service history | `ServiceRequestService` |
| RFQ/Quotations | `RfqService`, `QuotationService` |
| Projects | `ProjectService` |
| BI | `AnalyticsDashboardService`, `AnalyticsKpiService` |
| Knowledge search | `KnowledgeSearchService` |
| Audit primitives | `AuditService` pattern; global `AuditInterceptor` |
| RBAC | Global `JwtAuthGuard`/`RolesGuard`/`PermissionsGuard`, `@Roles`, `@Permissions` |
| Rate limiting | Global `ThrottlerGuard` + `AI_CHAT_THROTTLE`/`AI_ANALYZE_THROTTLE` |

## 5. Database Changes (Migration `1700000000033-AiPlatform`)

1. `ai_prompt_templates` — key, version, locale, category, task, description,
   template text, variables jsonb, status (DRAFT/PUBLISHED/ARCHIVED), approved_by,
   approved_at, metadata; unique (key, version, locale).
2. `ai_audit_logs` — tenant/user, action, domain, task, prompt template+version,
   provider/model, tools executed, citation count, confidence, input hash,
   injection-flagged bool, processing ms, status, error.
3. `ai_conversations` — add `metadata` jsonb (nullable).
4. Permissions seed: `ai:prompt:read/write/approve`, `ai:tool:read/execute`,
   `ai:model:read`, `ai:conversation:read/pin`, `ai:audit:read` + role grants
   (ADMIN/MANAGEMENT full; internal roles read/execute; audit/prompt-write restricted).

## 6. Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Circular module imports when AiModule imports domain modules | Verified: no domain module imports AiModule; KnowledgeModule keeps `forwardRef`. |
| Breaking existing 48 AI tests | Legacy services keep constructors/public APIs; specs reviewed before refactor. |
| Prompt seeding on startup against unavailable DB | Seeding is idempotent and wrapped in try/catch; registry falls back to seed definitions in memory. |
| Permission seeding misses lowercase roles | Migration follows the proven dual-matrix pattern of migration 0018. |
| Tool result size blowing prompt budget | ToolRegistry truncates serialized results (configurable cap, default 8 KB) and reports `truncated`. |

## 7. Verdict

Sprint 2.8.2 requires **additive platform construction** on top of verified 2.8.1
infrastructure. No rework of working components is needed. Proceed to implementation
in phase order: Model Router → Prompt Registry → Tool Registry → Orchestrator →
Conversation Manager → Security → APIs → Integration → Tests → Docs.
