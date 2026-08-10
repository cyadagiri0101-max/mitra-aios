# MITRA v3.9 — Release Notes · Sprint 2.8.3

**Release:** Enterprise AI Copilot Platform
**Date:** August 2026
**Depends on:** Sprint 2.8.2 (AI Platform & Orchestration)

---

## Summary

Seven domain copilots delivered on top of the 2.8.2 platform pipeline.
Capability-aware prompts, auto-attached domain tools, citations, confidence
scoring, suggested actions, and follow-up questions — advisory only, no
autonomous actions.

## New Features

### Enterprise Copilot Platform (Backend)
- `EnterpriseCopilotService` — capability resolution (explicit key → intent
  detection → domain default), prompt/tool mapping, response enrichment.
- `AiCopilotsController` — new API surface under `/ai/copilots`:
  - `GET /ai/copilots` — list the seven copilots.
  - `GET /ai/copilots/:domain` — capabilities with prompt key, auto tools,
    suggested actions, follow-up questions.
  - `GET /ai/copilots/:domain/suggestions` — starter suggestion chips.
  - `POST /ai/copilots/:domain/chat` — capability-aware chat through the full
    platform pipeline (RBAC, injection detection, context, search, graph,
    tools, registry prompts, model router, confidence, audit, memory).
- Prompt registry expanded **30 → 61 published templates** (31 new
  capability-aligned prompts); seeded idempotently at boot — no migration.
- 56 capabilities across 7 domains, each mapped to a Prompt Registry task and
  1–3 permission-checked tools (12 of 14 registered tools used).

### Copilot Workspace (Frontend)
- Upgraded AI Workspace page to the copilot platform:
  - Capability sidebar (10 per domain, clickable).
  - Capability badge, prompt/model/tool meta line on each answer.
  - **Recommended actions** and **follow-up questions** as clickable chips.
  - Injection-flag and fallback notices surfaced inline.
- `ai.service.ts` copilot client + typed `CopilotChatResponse` /
  `CopilotCapability` models.

## Capability Highlights per Domain
- **Engineering (15):** drawing explain/compare/similar, manufacturing impact,
  BOM explain/gap/cost/alternates, routing/cycle-time/optimization/machine
  selection, design review, DFM, risk.
- **Manufacturing (8):** work order status, utilization, delay, scrap,
  downtime, OEE, scheduling, capacity.
- **Quality (7):** NCR, CAPA, inspection, PPAP/APQP, FMEA, root cause, control
  plan.
- **Commercial (7):** RFQ, quotation, customer history, margin, risk,
  delivery feasibility, pipeline.
- **Project (6):** health, milestone prediction, delay, resource planning,
  risk, similar projects.
- **Service (6):** history, warranty, failure diagnosis, spare parts,
  maintenance, breakdown.
- **Executive (7):** dashboard briefing, KPI, cost trends, revenue, portfolio
  health, risk summary, management briefing.

## Verification
- Backend: **75 suites / 805 tests PASS** (16 AI suites / 131 AI tests).
- Backend type-check PASS; frontend type-check PASS.
- Frontend production build PASS (`tsc && vite build`).
- Catalogue integrity verified by tests: prompt keys ↔ seeds, tools ↔
  registry, key uniqueness, UX metadata presence.

## Breaking Changes
None. The 2.8.1 `/ai/copilot/*` and 2.8.2 `/ai/platform/*` surfaces remain
operational.

## Migration
None. New prompt templates seed automatically at application startup.
