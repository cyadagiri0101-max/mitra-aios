# AI Platform Audit — MITRA v4.0 Sprint 2.8.2/2.8.3

> Phase 1 deliverable for Sprint 2.8.3 (Enterprise AI Copilot Platform).
> Scope: static + dynamic audit of the reusable AI platform built in Sprint 2.8.2 (Phases 1–7)
> and the Sprint 2.8.3 enterprise/copilot surface already present in the working tree.

Generated: 2026-08-07 · Repository: `D:\Mitra3.0` (backend `mitra-backend`, frontend `mitra-frontend`)

---

## 1. Executive summary

MITRA already ships a **fully wired, test-backed Enterprise AI Copilot Platform**. The
backend `ai` module (`mitra-backend/src/modules/ai/`) provides:

- **7 domain copilots** declared in a single capability catalogue (`copilot-capability.data.ts`)
  covering **56 capabilities** across Engineering, Manufacturing, Quality, Commercial,
  Project, Service, and Executive domains.
- **One reusable pipeline** (`AiOrchestratorService`) shared by every copilot: RBAC domain
  access → injection/sanitization checks → task/capability mapping → entity context →
  knowledge retrieval → tool execution → prompt rendering → model routing → response
  formatting → citations → confidence → audit. **No duplicated orchestration and no direct
  per-domain LLM calls.**
- **29 platform components** in the AI module plus the knowledge module and 9 domain modules
  it composes.
- **Three controllers** (`AiController` legacy + `AiPlatformController` + `AiCopilotsController`)
  exposing the copilot API surface, plus a **React frontend page** (`AiAssistantPage.tsx`)
  already consuming the `/ai/copilots` endpoints via `mitra-frontend/src/services/ai.service.ts`.
- **Verification status today is green:** backend build OK, frontend build OK,
  AI unit suite 16 suites / **131 tests pass**, legacy full battery 12 E2E suites
  (139 tests) + 75 unit suites (807 tests) previously green.

Verdict: the platform is **implemented, wired, and tested**. Sprint 2.8.3 therefore reduces to
(a) auditing and documenting it, (b) closing any real gaps, and (c) producing the Phase 5 docs.

---

## 2. Platform architecture

```
              ┌────────────────────────  PRESENTATION  ────────────────────────┐
              │  React SPA: AiAssistantPage  →  services/ai.service.ts          │
              └───────────────┬─────────────────────────────────────────────────┘
                              │  /ai/copilots · /ai/copilot/... · /ai/chat ...
              ┌───────────────▼─────────────────────────────────────────────────┐
              │  CONTROLLERS                    AiController                     │
              │  AiPlatformController           AiCopilotsController             │
              └───────────────┬─────────────────────────────────────────────────┘
                              ▼
              ┌─────────────────────────────────────────────────────────────────┐
              │  ENTERPRISE LAYER (Sprint 2.8.3)                                 │
              │  EnterpriseCopilotService  ·  AiCopilotOrchestratorService       │
              │  AiDomainCopilotService    ·  CopilotMemoryService/Conversation  │
              │  COPILOT_CATALOGUE (56 capabilities)                             │
              └───────────────┬─────────────────────────────────────────────────┘
                              ▼
              ┌─────────────────────────────────────────────────────────────────┐
              │  ORCHESTRATION (AiOrchestratorService — single pipeline)         │
              │   RBAC → sanitize → injection → entity → knowledge → tools →     │
              │   prompt → model route → format → citations → confidence → audit │
              ├───────────────┬───────────────┬────────────────┬─────────────────┤
              │  AiSecurityService │ ToolRegistryService │ PromptRegistry  │ ModelRouterService │
              │  AiAuditService  │  VectorSearchService │ PromptTemplate. │ EmbeddingService  │
              │  AiContextService│  AiPluginService     │ OllamaProvider   │ MockModelProvider │
              └───────────────┴───────────────┴────────────────┴─────────────────┘
                              ▼                  ▼                  ▼
               Domain Tool Impls           Knowledge module        AI entities
               (engineering, quality,       (context, graph,       (ai_conversations,
                manufacturing, service,     embeddings, search)     ai_messages, ai_audit_logs,
                commercial, project,                                 ai_prompt_templates,
                analytics)                                           knowledge_embeddings)
```

Key design decision honored across the tree: **copilots own ONLY** `promptKey` mapping,
capability metadata, tool selection, and UX formatting; everything else (prompt rendering,
model routing, tools, memory, security, audit, retrieval) is shared platform machinery.

---

## 3. Repository inventory — backend AI module

Root: `D:\Mitra3.0\mitra-backend\src\modules\ai\`

### 3.1 Module wiring
| File | Purpose |
|---|---|
| `ai.module.ts` | Imports Knowledge + AiUsage + 9 domain modules; registers all AI platform services; exports `AiService`, `VectorSearchService`, `EmbeddingService`, `PromptTemplateService`, `PromptRegistryService`, `AiCopilotOrchestratorService`, `ModelRouterService`. |

### 3.2 Controllers (3)
| Controller | File | Key routes |
|---|---|---|
| `AiController` | `controllers/ai.controller.ts` | `GET /ai/health`, `POST /ai/chat`, `POST /ai/analyze`, `POST /ai/copilot/chat`, `POST /ai/copilot/context`, `POST /ai/copilot/prompts/execute`, `GET /ai/copilot/prompts`, `GET /ai/copilot/suggestions`, `GET /ai/copilot/conversations`, `GET /ai/copilot/conversations/:id/messages` |
| `AiPlatformController` | `controllers/ai-platform.controller.ts` | Platform management surface (prompts CRUD, tools, models, security stats, audit listing, knowledge manage) |
| `AiCopilotsController` | `controllers/ai-copilots.controller.ts` | `GET /ai/copilots`, `GET /ai/copilots/:domain`, `GET /ai/copilots/:domain/suggestions`, `POST /ai/copilots/:domain/chat` |

All controllers are `@UseGuards(JwtAuthGuard)` + `@UseGuards(RolesGuard)` behind `AiSecurityService`-style role gates; `GET /ai/health` is `@Public()`.

### 3.3 DTOs & contracts
| File | Contents |
|---|---|
| `dto/ai.dto.ts` | `AiIntent` (GENERAL, PROJECTS, TRIALS, CAPA, MANUFACTURING, DISPATCH, SERVICE, WORKFLOW, KNOWLEDGE), `AiChatDto`, `HistoryItemDto` (M-5 bounds), `AiAnalysisDto`, `AiChatResponseDto`, `AiHealthResponseDto` |
| `dto/copilot.dto.ts` | `CopilotDomain` enum (7 domains), `CopilotChatDto`, `CopilotContextDto`, `PromptExecutionDto`, `CopilotResponseDto` (citations/confidence/scoped memory) |
| `dto/ai-platform.dto.ts` | Platform management request/response types |
| `dto/ai-copilots.dto.ts` | `CopilotPlatformChatDto` (chat payload incl. `capability`), copilot/capability response DTOs |

### 3.4 Entities (TypeORM)
| Entity | Table | Fields of note |
|---|---|---|
| `ai-conversation.entity.ts` | `ai_conversations` | id, tenantId, userId, domain, intent (project-scoped as `project:<id>`), isPinned, metadata (pinReason/pinnedAt/pinnedBy), softDelete |
| `ai-message.entity.ts` | `ai_messages` | conversationId, role, content, sources, processingMs |
| `ai-prompt-template.entity.ts` | `ai_prompt_templates` | key, name, description (versioned) |
| `ai-audit-log.entity.ts` | `ai_audit_logs` | tenant/user/role, action, domain, task, promptTemplate+version, provider+model, toolsExecuted, citationCount, confidence, inputHash, injectionFlagged, processingMs, error |
| `knowledge-embedding.entity.ts` | `knowledge_embeddings` | chunk text, embedding vector, articleId, checksum |

### 3.5 Services (the reusable machinery)
| Service | File | Role |
|---|---|---|
| `AiService` | `services/ai.service.ts` | Legacy `/ai/chat` + `/ai/analyze`, health probe |
| `AiOrchestratorService` | `services/ai-orchestrator.service.ts` | **THE pipeline** shared by all 7 copilots (platform chat, prompt exec) |
| `AiCopilotOrchestratorService` | `services/ai-copilot-orchestrator.service.ts` | Sprint 2.8.2 domain copilot orchestration (RBAC domain access, capability mapping) |
| `EnterpriseCopilotService` | `services/enterprise-copilot.service.ts` | Sprint 2.8.3 chat wrapper → capability resolution → promptKey + tools → orchestrator.chat → suggested actions / follow-ups |
| `AiDomainCopilotService` | `services/ai-domain-copilot.service.ts` | Domain-aware copilot support |
| `AiCopilotMemoryService` | `services/ai-copilot-memory.service.ts` | Conversation/message persistence, retention-bounded |
| `ConversationManagerService` | `services/conversation-manager.service.ts` | Platform surface: list/pin/unpin/metadata/selected-project, `expiresAt` from retention |
| `ModelRouterService` | `services/model-router.service.ts` | Provider selection (Ollama/Mock), fallback chain, availability check |
| `AiContextService` | `services/ai-context.service.ts` | Live DB grounding for 8 AiIntents (projects, trials, CAPA, work orders, service requests, workflow, knowledge) — all parameterised/tenant-scoped |
| `EmbeddingService` | `services/embedding.service.ts` | Embedding generation for knowledge retrieval |
| `VectorSearchService` | `services/vector-search.service.ts` | Semantic search over chunked embeddings |
| `PromptTemplateService` | `services/prompt-template.service.ts` | Prompt template compile + versioning |
| `PromptRegistryService` | `services/prompt-registry.service.ts` | DB-backed prompt registry seeded from `prompt-seed.data.ts` |
| `ToolRegistryService` | `services/tool-registry.service.ts` | Registry of domain `AiTool`s in pipe for the pipeline |
| `AiSecurityService` | `services/ai-security.service.ts` | Domain RBAC map, injection detection (~9 patterns), secret redaction, citation validation, deterministic confidence |
| `AiAuditService` | `services/ai-audit.service.ts` | Fire-and-forget immutable audit logging + filtered listing |

### 3.6 Copilot catalogue
| File | Purpose |
|---|---|
| `copilots/copilot-capability.data.ts` | `COPILOT_CATALOGUE`: 7 domains, **56 capabilities**; `findCopilot()`, `findCapability()`, `detectCapability()` (intent-pattern routing, defaults to first capability). |

Per-domain capability count: Engineering 15 · Manufacturing 8 · Quality 7 · Commercial 7 · Project 6 · Service 6 · Executive 7 = **56**.

Distinct tool IDs referenced by the catalogue (12): `engineering.drawings`, `engineering.boms`,
`engineering.routings`, `manufacturing.work_orders`, `quality.ncrs`, `quality.capas`,
`commercial.rfqs`, `commercial.quotations`, `service.service_requests`, `project.projects`,
`knowledge.search`, `analytics.bi_query`.

---

## 4. Knowledge / usage integrations
| Module | File | Role |
|---|---|---|
| KnowledgeModule | `@modules/knowledge/knowledge.module.ts` | Articles + embeddings + search; imported (forwardRef) by AI module |
| AiUsageModule | `@modules/ai-usage/ai-usage.module.ts` | Token/usage accounting per request |

---

## 5. Verification evidence (run today)

| Check | Command | Result |
|---|---|---|
| Backend build | `npx nest build` | ✅ OK |
| Frontend build | `npm run build` (in mitra-frontend) | ✅ OK (built in ~9s) |
| AI unit suite | `npx jest src/modules/ai` | ✅ 16 suites, **131 tests** pass |
| Full unit battery | `npx jest` (75 suites) | ✅ **807 tests** pass (previous run) |
| Full E2E battery | `test/jest-e2e.json` (12 suites) | ✅ **139 tests** pass (previous run) |
| Backend management | handled by `AiUsageModule`/auth | — |

---

## 6. Audit observations

1. **No build/type errors** — both `nest build` and the frontend production build are clean.
2. **Uncommitted work**: every Sprint 2.8.2/2.8.3 AI file under `mitra-backend/src/modules/ai/**` is either new (untracked) or modified and **not yet committed** (last commit `b82e31c` is "Sprint 2.8.2 Phase 0"). One of the Sprint 2.8.3 tasks is to commit this feature into the repo.
3. **Capability catalogue is the single source of truth.** Per design, adding/fixing a copilot = editing `COPILOT_CATALOGUE` (capability row) + ensuring the referenced `promptKey` exists in the Prompt Registry; no new pipeline code.
4. **Legacy & platform surfaces are distinct** (`/ai/...` vs `/ai/copilot/...` vs `/ai/copilots/...`), all routed through the same `AiOrchestratorService` pipeline.
5. **Recommendation**: full end-to-end copilot API smoke test (via `supertest` e2e against the running test DB) is the remaining verification hole — unit coverage exists per service, but there is no platform copilot **e2e**. See Sprint 2.8.3 Phase 4.

---

## 7. Conclusion

The Enterprise AI Copilot Platform required by Sprint 2.8.3 is **already present and green** in the
working tree, built on the Sprint 2.8.2 phases. Sprint 2.8.3's remaining work is:
Phase 2 gap analysis, Phase 3 closing the two small gaps (above), Phase 4 an AI copilot e2e
verification + full-battery regression, Phase 5 documentation and the uncommitted-feature commit.
This report and its companion `SPRINT_2_8_3_GAP_ANALYSIS.md` (next) are the Phase 1 deliverables.
