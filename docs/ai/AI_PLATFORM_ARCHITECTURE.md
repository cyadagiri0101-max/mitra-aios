# AI Platform Architecture — Sprint 2.8.2

**Program:** MITRA v3.9 — Sprint 2.8 (Enterprise AI Operating System)
**Milestone:** 2.8.2 — AI Platform & Orchestration
**Status:** Complete

---

## 1. Purpose

Sprint 2.8.2 converts the verified 2.8.1 AI knowledge infrastructure into a
governed enterprise AI platform: provider-agnostic model routing, a DB-backed
prompt registry, permission-checked domain tools, a staged orchestration
pipeline, conversation management, centralized AI security, and a dedicated AI
audit trail.

Everything is **additive**. The 2.8.1 surface (`OllamaProvider`,
`EmbeddingService`, `VectorSearchService`, knowledge services, legacy copilot
services, `/ai/chat`, `/ai/analyze`, `/ai/copilot/*`) is untouched and keeps
serving existing clients.

## 2. Component Map

| Component | File | Phase |
|-----------|------|-------|
| `AiModelProvider` interface | `modules/ai/providers/model-provider.interface.ts` | 1 |
| `OllamaModelProvider` adapter | `modules/ai/providers/ollama-model.provider.ts` | 1 |
| `MockModelProvider` | `modules/ai/providers/mock-model.provider.ts` | 1 |
| `ModelRouterService` | `modules/ai/services/model-router.service.ts` | 1 |
| Prompt seed catalogue | `modules/ai/services/prompt-seed.data.ts` | 2 |
| `PromptRegistryService` | `modules/ai/services/prompt-registry.service.ts` | 2 |
| `AiPromptTemplate` entity | `modules/ai/entities/ai-prompt-template.entity.ts` | 2 |
| `AiTool` contracts | `modules/ai/tools/ai-tool.interface.ts` | 3 |
| `ToolRegistryService` (14 tools) | `modules/ai/services/tool-registry.service.ts` | 3 |
| `AiOrchestratorService` pipeline | `modules/ai/services/ai-orchestrator.service.ts` | 4 |
| `ConversationManagerService` | `modules/ai/services/conversation-manager.service.ts` | 5 |
| `AiSecurityService` | `modules/ai/services/ai-security.service.ts` | 6 |
| `AiAuditService` + `AiAuditLog` | `modules/ai/services/ai-audit.service.ts` | 6 |
| `AiPlatformController` | `modules/ai/controllers/ai-platform.controller.ts` | 7 |
| Migration `1700000000033-AiPlatform` | `database/migrations/` | 2/5/6 |

## 3. Module Integration

`AiModule` now imports the domain modules whose exported services back the tool
registry: Engineering, Planning, Quality, Manufacturing, Service, Commercial,
Project, Analytics, plus the existing `forwardRef` KnowledgeModule edge and
AiUsageModule.

Circular-import safety was verified before wiring: **no domain module imports
AiModule**, and the only existing cycle (AiModule ↔ KnowledgeModule) remains
mediated by `forwardRef` on both sides.

## 4. Data Model (Migration 0033)

1. `ai_prompt_templates` — key/version/locale/category/task/description,
   template text, variables jsonb, lifecycle status (DRAFT/PUBLISHED/ARCHIVED),
   approval fields; unique `(key, version, locale)`.
2. `ai_audit_logs` — append-only AI audit trail (tenant/user/role, action,
   domain, task, prompt template+version, provider/model, tools executed,
   citation count, confidence, input hash, injection flag, timing, status).
3. `ai_conversations.metadata` — nullable jsonb for conversation-manager
   metadata (pin reason, tags).
4. RBAC permissions: `ai:prompt:read/write/approve`, `ai:tool:read/execute`,
   `ai:model:read`, `ai:conversation:read/pin`, `ai:audit:read`, granted via
   the proven dual-matrix pattern (UPPERCASE platform roles + lowercase
   operational roles). ADMIN/MANAGEMENT receive the full set; internal roles
   receive read/execute/conversation rights; audit reading and prompt
   write/approve are restricted to ADMIN/MANAGEMENT.

## 5. Governance Rules

- **Advisory only.** No AI path writes domain state; tools are read-only
  adapters over exported domain services.
- **No recalculation.** BI figures are read from Analytics services, never
  recomputed inside the AI layer.
- **Citations required.** Responses carry validated source references;
  confidence scoring is deterministic and evidence-based.
- **Everything audited.** Every orchestrated request and tool execution is
  recorded in `ai_audit_logs` with a sha256 input hash.
- **Retention-bounded memory.** Conversation memory remains bounded by
  `AI_COPILOT_MEMORY_RETENTION_DAYS`; pinning exempts a conversation from
  pruning but introduces no long-term memory.

## 6. Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `AI_ENABLED` | `false` | Legacy Ollama switch (unchanged) |
| `AI_PROVIDER_CHAIN` | `ollama,mock` | Router fallback ordering; `mock` is always kept as terminal fallback |
| `AI_TOOL_RESULT_MAX_BYTES` | `8192` | Tool result truncation cap |
| `AI_COPILOT_MEMORY_RETENTION_DAYS` | `14` | Conversation retention window (unchanged) |

## 7. Related Documents

- `AI_MODEL_ROUTER.md`, `AI_PROMPT_REGISTRY.md`, `AI_TOOL_REGISTRY.md`,
  `AI_ORCHESTRATION_PIPELINE.md`, `AI_SECURITY_AND_AUDIT.md`,
  `AI_PLATFORM_API.md` (this folder)
- `AI_Platform_Gap_Analysis.md` (repo root) — the planning baseline
- `AI_2.8.1_Verification.md` — the immutable infrastructure baseline
