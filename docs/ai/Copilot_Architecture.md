# MITRA v4.0 — Copilot Architecture

**Sprint 2.8.3 · Verified repository behavior**

---

## Layered Design

```
┌────────────────────────────────────────────────────────────┐
│ HTTP layer (controllers)                                   │
│   AiCopilotsController  ·  AiPlatformController  ·  AiController │
└───────────────────────────┬────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────┐
│ EnterpriseCopilotService  (Sprint 2.8.3)                    │
│  - resolveCapability: explicit key → intent detection →     │
│    domain default                                           │
│  - auto-attaches capability tools + requested tools (max 8) │
│  - enriches response: capability meta, suggested actions,   │
│    follow-up questions                                      │
└───────────────────────────┬────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────┐
│ AiOrchestratorService (Sprint 2.8.2 platform pipeline)      │
│  RBAC → injection scan → optional memory → context →        │
│  knowledge search → tool execution → prompt resolution →    │
│  model router → confidence → audit → citations              │
└───────────────────────────┬────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────┐
│ Shared registries & services                                │
│  CopilotCapabilityCatalogue (static, source of truth)       │
│  PromptRegistry (61 seeded templates)                       │
│  ToolRegistry (14 read-only tools)                          │
│  ModelRouter (Ollama + Mock)                                │
│  ConversationManager · AiAuditService · AiSecurityService   │
│  KnowledgeContextBuilder · KnowledgeSearch · Graph          │
└─────────────────────────────────────────────────────────────┘
```

## Chat Request Flow (verified via `POST /api/ai/copilots/:domain/chat`)

1. **AuthN** — `JwtAuthGuard` requires a valid bearer token.
2. **AuthZ** — `RolesGuard` allows only internal roles (ADMIN, MANAGEMENT,
   SALES, DESIGN, PLANNING, PRODUCTION, QUALITY).
3. **Throttle** — `AI_CHAT_THROTTLE` limits request rate.
4. **DTO validation** — message (2–4000 chars), domain enum, optional
   capability/task/tools/toolArgs/entity refs/conversationId.
5. **Capability resolution** (`EnterpriseCopilotService.resolveCapability`):
   - explicit `capability` key lookup first;
   - otherwise intent detection over the domain's `intentPatterns`;
   - otherwise the domain's first capability.
6. **Tool composition** — capability auto-tools + request tools, deduped,
   max 8.
7. **Platform pipeline** (`AiOrchestratorService`) — domain access assertion,
   injection detection (flagged answers never reach a model), context build,
   knowledge search, tool execution, prompt resolution, model routing,
   confidence scoring, audit logging, conversation memory.
8. **Response envelope** — `answer`, `domain`, `task`, `promptTemplate`,
   `promptVersion`, `provider`, `modelUsed`, `confidence`, `references`,
   `toolsExecuted`, `injectionFlagged`, `fallbackUsed`, `contextSummary`,
   `conversationId`, `processingMs`, `capability`, `suggestedActions`,
   `followUpQuestions`.

## Key Design Guarantees

- **Single source of truth**: `copilot-capability.data.ts` owns both prompt and
  tools; the service holds no capability of its own.
- **Advisory only**: tools thin adapters over exported domain services; no
  mutation; results serialized and truncated (default 8 KB).
- **Resilience**: prompt registry degrades to seeded definitions in memory when
  the database is unreachable; mock provider is the terminal fallback in the
  model chain.
- **Deterministic verification**: `AI_ENABLED=false` forces the mock provider
  so E2E asserts resolve against fixed behavior.

## Module Ownership

| Component | File (verified) |
|---|---|
| Capability catalogue | `src/modules/ai/copilots/copilot-capability.data.ts` |
| Copilot service | `src/modules/ai/services/enterprise-copilot.service.ts` |
| Orchestrator | `src/modules/ai/services/ai-orchestrator.service.ts` |
| Copilot controller | `src/modules/ai/controllers/ai-copilots.controller.ts` |
| Platform controller | `src/modules/ai/controllers/ai-platform.controller.ts` |
| Tool registry | `src/modules/ai/services/tool-registry.service.ts` |
| Model router | `src/modules/ai/services/model-router.service.ts` |
| Prompt registry | `src/modules/ai/services/prompt-registry.service.ts` |
| Domain copilot (context/task mapping) | `src/modules/ai/services/ai-domain-copilot.service.ts` |