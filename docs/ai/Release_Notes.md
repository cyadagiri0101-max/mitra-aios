# MITRA v4.0 — Release Notes · Sprint 2.8.3

**Enterprise AI Copilot Platform release**
**Date:** August 2026
**Depends on:** Sprint 2.8.2 (AI Platform & Orchestration)

---

## Summary

Seven enterprise domain copilots (Engineering, Manufacturing, Quality,
Commercial, Project, Service, Executive) shipped on top of the Sprint 2.8.2
platform pipeline. Each copilot resolves user intent to a registered
capability — explicit key, intent detection, or domain default — then runs
the full platform pipeline (RBAC, injection scan, context, knowledge, tools,
prompt, model router, confidence, audit, memory, citations). Advisory only:
no autonomous actions; every tool is read-only and permission-checked.

## New Features (Backend)

- **Enterprise Copilot API** (`/api/ai/copilots`):
  - `GET /api/ai/copilots` — the seven copilots + capability counts.
  - `GET /api/ai/copilots/:domain` — capabilities (prompt key, auto-tools,
    suggested actions, follow-ups).
  - `GET /api/ai/copilots/:domain/suggestions` — starter suggestions.
  - `POST /api/ai/copilots/:domain/chat` — capability-aware chat through
    the platform pipeline.
- **Copilot Architecture**: `copilot-capability.data.ts` is the single source
  of truth for **56 capabilities** (15/8/7/7/6/6/7 per domain); resolution
  order explicit → intent detection → domain default.
- **Prompt registry**: 61 published templates, seeded idempotently at boot
  (no migration), locale-preferred resolution, in-memory degrade.
- **Tool registry**: 14 permission-checked, read-only tools with serialized
  truncated output (default 8 KB).
- **Model router**: Ollama provider with Mock terminal fallback.

## Enterprise API Consumption (Frontend)

- AI Workspace upgraded to copilot platform: capability sidebar, capability
  badge, prompt/model/tool meta line, recommended actions + follow-up chips,
  injection/fallback notices, conversation memory UI.

## Verification (evidence)

| Gate | Suites | Tests | Result |
|---|---|---|---|
| AI Platform E2E | 1 | 34 | 34/34 |
| AI unit suite | 17 | 175 | 175/175 |
| Full backend unit | 76 | 851 | 851/851 |
| Full E2E | 13 | 173 | 173/173 |
| Backend build (`nest build` / `npm run build`) | — | — | PASS |
| Frontend build (vite) | — | — | PASS |

## Known Issues

None blocking. No production code was modified in Sprint 2.8.3; only the E2E
fixture `test/ai-platform.e2e-spec.ts` was corrected to match the
repository's seeded-role tenancy semantics (roles are tenant-scoped; the
seeded SALES role is global with `tenantId = null`, so the fixture attaches it
to the test ADMIN tenant at DB level before exercising the real HTTP
assignment API).

## Rollout

1. Deploy backend; prompt registry seeds itself idempotently at boot.
2. Deploy frontend AI workspace upgrade.
3. Verify `/api/ai/health` and `/api/ai/copilots` respond after rollout.

## Roadmap

- Autonomous secondary analytics execution
- Cross-tenant knowledge graph expansion
- Streaming model response support
- Fine-tuned domain models (Ollama/PTU)