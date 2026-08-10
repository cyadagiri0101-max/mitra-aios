# Enterprise AI Copilot Architecture — Sprint 2.8.3

**Program:** MITRA v3.9 — Sprint 2.8 (Enterprise AI Operating System)
**Milestone:** 2.8.3 — Enterprise AI Copilot Platform
**Status:** Complete

---

## 1. Purpose

Sprint 2.8.3 adds seven domain copilots — Engineering, Manufacturing,
Quality, Commercial, Project, Service, Executive — on top of the Sprint 2.8.2
platform pipeline. Each copilot exposes a catalogue of capabilities; every
capability maps to a Prompt Registry task (61 templates) and a set of
auto-attached, permission-checked domain tools (14 registered).

The UX contract is: **context-aware, evidence-backed answers with citations,
confidence, suggested actions, and follow-up questions**, and nothing is
autonomous — all copilots are advisory by construction (SAFETY_PREAMBLE).

## 2. Layered Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ UX (AiAssistantPage)                                         │
│  capabilities sidebar · suggestion chips · follow-up chips    │
└──────────────────────────────┬───────────────────────────────┘
                               │ POST /ai/copilots/:domain/chat
┌──────────────────────────────▼───────────────────────────────┐
│ AiCopilotsController  (JWT + RolesGuard, internal roles)     │
│  GET /ai/copilots · GET /ai/copilots/:domain                 │
│  GET /ai/copilots/:domain/suggestions                        │
│  POST /ai/copilots/:domain/chat (throttled)                  │
└──────────────────────────────┬───────────────────────────────┘
┌──────────────────────────────▼───────────────────────────────┐
│ EnterpriseCopilotService                                     │
│  1. resolve capability (explicit key → intent → domain default)│
│  2. task := capability.promptKey                              │
│  3. tools := capability.tools ∪ request.tools (dedup, ≤8)     │
│  4. enrich response: capability metadata, suggestedActions,   │
│     followUpQuestions                                         │
└──────────────────────────────┬───────────────────────────────┘
┌──────────────────────────────▼───────────────────────────────┐
│ AiOrchestratorService (2.8.2 platform pipeline, 13 stages)   │
│  RBAC → sanitize → injection → task map → entity context      │
│  → semantic search → graph → tools → prompt → model router    │
│  → citations → confidence → audit → memory                    │
└──────────────────────────────────────────────────────────────┘
```

## 3. Capability Catalogue

Source of truth: `modules/ai/copilots/copilot-capability.data.ts`.

| Domain | Capabilities | Auto-attached tools (unique) |
|--------|--------------|------------------------------|
| Engineering | 15 | engineering.drawings, engineering.boms, engineering.routings, manufacturing.work_orders, quality.ncrs, knowledge.search |
| Manufacturing | 8 | manufacturing.work_orders, quality.ncrs, engineering.routings |
| Quality | 7 | quality.ncrs, quality.capas, engineering.drawings, knowledge.search |
| Commercial | 7 | commercial.rfqs, commercial.quotations, service.service_requests, manufacturing.work_orders |
| Project | 6 | project.projects, quality.ncrs, engineering.routings |
| Service | 6 | service.service_requests, knowledge.search |
| Executive | 7 | analytics.bi_query, project.projects |
| **Total** | **56** | **12 of 14 registered tools** |

Every capability declares:

- `key` — unique, namespaced by domain (`engineering.drawings.explain`)
- `promptKey` — the Prompt Registry task resolved for the pipeline
- `tools` — tools auto-attached when the capability fires
- `intentPatterns` — lightweight regex detection for capability routing
- `suggestedActions` / `followUpQuestions` — UX chips surfaced after answers

## 4. Capability Resolution

1. **Explicit key** — a `capability` field on the chat DTO wins; unknown keys
   log a warning and fall through to detection.
2. **Intent detection** — first capability whose patterns match the message.
3. **Domain default** — the first capability of the copilot (e.g. Engineering
   defaults to `engineering.drawings.explain`).

## 5. Prompt Registry Expansion

`PROMPT_SEED_DEFINITIONS` grew from 30 to **61 templates**. The registry seeds
idempotently at boot (`.orIgnore()`), so no migration is required — new
capability prompts appear on next startup. Each template uses the shared
`buildSeedTemplateText` (SAFETY_PREAMBLE + domain/task/instruction + the five
seed variables `message, memory, context, searchResults, graphContext`).

## 6. Security

- Controller: `JwtAuthGuard` + `RolesGuard` (ADMIN, MANAGEMENT, SALES, DESIGN,
  PLANNING, PRODUCTION, QUALITY) + chat throttling (AI_CHAT_THROTTLE).
- Pipeline (unchanged from 2.8.2): per-domain RBAC in `AiSecurityService`,
  prompt-injection detection, redaction, per-tool permission checks, advisory
  fallbacks when no references are found, and append-only audit logging.
- Executive tools (`analytics.bi_query`) remain ADMIN/MANAGEMENT-gated; a
  QUALITY user asking an executive question gets a graceful, non-fatal tool
  failure — the pipeline still answers from knowledge context.

## 7. API Surface

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/ai/copilots` | Seven copilots + capability counts |
| GET | `/ai/copilots/:domain` | Capabilities (key, title, promptKey, tools, actions, follow-ups) |
| GET | `/ai/copilots/:domain/suggestions` | Starter suggestion titles |
| POST | `/ai/copilots/:domain/chat` | Capability-aware chat through the platform pipeline |

## 8. Files

| Component | Path |
|-----------|------|
| Capability catalogue | `modules/ai/copilots/copilot-capability.data.ts` |
| Copilot service | `modules/ai/services/enterprise-copilot.service.ts` |
| Controller | `modules/ai/controllers/ai-copilots.controller.ts` |
| DTOs | `modules/ai/dto/ai-copilots.dto.ts` |
| Prompt seeds (61) | `modules/ai/services/prompt-seed.data.ts` |
| Frontend service | `mitra-frontend/src/services/ai.service.ts` |
| Frontend page | `mitra-frontend/src/pages/AiAssistantPage.tsx` |
| Frontend types | `mitra-frontend/src/types/ai.types.ts` |
