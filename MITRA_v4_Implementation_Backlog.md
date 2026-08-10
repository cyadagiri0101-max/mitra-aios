# MITRA v4.0 — Implementation Backlog

**Source:** `REMAINING_WORK_ASSESSMENT_v4.0.md` (read-only assessment)
**Status:** Planning only — no implementation code modified
**Baseline:** MITRA v3.9 release certification PASSED (backend build, frontend build, migrations 0011→0033 validated with revert/rerun, schema 173 entities/173 tables, 805 backend tests, AI platform suites, domain integration, live PostgreSQL runtime)

---

## 1. Executive Summary

The v4.0 assessment was written before Sprints 2.8.2 and 2.8.3. Since then the
largest flagged gap — AI platform hardening — is **complete and verified**:
Model Router, Prompt Registry (61 templates), Tool Registry (14 tools),
AiOrchestrator pipeline, Conversation Manager, AI Security, AI Audit,
knowledge search/graph/context, and the 7 enterprise copilots (56
capabilities) are all live.

The genuine remaining work is therefore not greenfield AI, but a disciplined
**completion and validation effort**:

1. Prove the core end-to-end lifecycle (commercial → project → engineering →
   manufacturing → quality → service) with regression-grade evidence.
2. Close the remaining e2e coverage gaps (manufacturing, quality, service,
   analytics journeys have no e2e specs today).
3. Complete service lifecycle validation (installation, warranty/AMC,
   traceability) on live data.
4. Add AI usage-pipeline observability (per-capability/per-user consumption)
   — explicitly deferred from 2.8.3.
5. Strengthen production readiness evidence (performance baselines,
   monitoring, backup/recovery drill) and align docs with live evidence.

## 2. Remaining Capability Matrix

| Capability | Current Status | Missing Pieces | Repository Evidence | Dependencies | Est. Effort | Priority |
|---|---|---|---|---|---|---|
| End-to-end lifecycle verification | Partial | No single regression journey proving commercial→service handoff on live data; no manufacturing/quality/service/analytics e2e specs | `test/commercial.e2e-spec.ts`, `test/project.e2e-spec.ts`, `test/engineering.e2e-spec.ts` | All domain modules | 2–3 d | Critical |
| Manufacturing execution validation | Partial | e2e for work orders, job cards, scheduling, production handoff; no operational evidence chain | `modules/manufacturing/services/workorder.service.ts`, `scheduling`, `jobcard` | E2E harness | 1–2 d | Critical |
| Quality QMS journey | Partial | e2e for NCR/CAPA/inspection flow and traceability to manufacturing; only 3 unit suites | `modules/quality/services/` (ncrs, capas), `test/engineering.e2e-spec.ts` | Quality module | 1–2 d | High |
| Service lifecycle completion | Partial | Installation/warranty/AMC/traceability live validation; no service e2e; event integration evidence | `modules/service/services/installation.service.ts`, `warranty.service.ts`, `amc.service.ts`, `visit.service.ts` | Service module | 1–2 d | High |
| AI usage observability | Partial | Usage pipeline metrics surfaced per copilot/capability/user; no analytics on `ai-usage` | `modules/ai-usage/` (controller, service, record entity) | AI platform (done) | 1–2 d | High |
| BI / executive reporting contracts | Partial | Only 1 unit suite in analytics; report contracts not validated e2e | `modules/analytics/services/analytics-report.service.ts`, `analytics-dashboard.service.ts`, `analytics-kpi.service.ts` | Analytics module | 1 d | Medium |
| Engineering traceability with Mfg/Quality | Partial | Traceability evidence across drawing→BOM→routing→WO→NCR chain | `modules/engineering/traceability*`, `tool-registry.service.ts` | Engineering, Mfg, Quality | 1 d | Medium |
| Production readiness evidence | Partial | Performance baselines, monitoring, backup/recovery drill evidence | `BACKUP_AND_RECOVERY.md`, `DEPLOYMENT*.md`, `Dockerfile`, `.github/workflows/*.yml` | Ops infra | 1–2 d | Low |
| Documentation ↔ evidence alignment | Partial | Gap docs (e.g. `AI_Knowledge_Gap_Analysis.md`) not updated post-2.8.3; release evidence roll-up | `docs/ai/*`, `*_Completion_Report.md`, `ReleaseNotes*` | All of the above | 1 d | Low |

## 3. Prioritized Backlog

| # | Work Item | Evidence Needed | Verdict |
|---|---|---|---|
| 1 | Manufacturing e2e journey (WO create → release → job cards → scheduling → production) | `npm run test:e2e` green + live DB walk | Missing — must add |
| 2 | Quality e2e journey (inspection → NCR → CAPA → closure traceability) | e2e spec green + live DB walk | Missing — must add |
| 3 | Service e2e journey (request → visit → installation/warranty/AMC → traceability) | e2e spec green + live DB walk | Missing — must add |
| 4 | Cross-domain lifecycle e2e (commercial quote → project → engineering → manufacturing → quality → service) | Full-chain spec + evidence doc | Missing — must add |
| 5 | AI usage pipeline: expose usage summaries per copilot/capability/user + retention | API + tests | Partial — extend `AiUsageModule` |
| 6 | Analytics report-contract validation | e2e or integration spec + docs | Partial — extend |
| 7 | Performance baseline run (startup, chat latency, memory) + record | Evidence section in completion reports | Partial — run & record |
| 8 | Backup/recovery drill + ops runbook update | Evidence doc | Partial — execute & record |
| 9 | Update stale gap analyses & roll up v4.0 evidence | Diff-verified docs | Partial — docs task |

## 4. Implementation Waves

### Wave 1 — Critical: Core Lifecycle Proof
- **Objective:** Prove the core commercial→project→engineering→manufacturing→quality→service flow on live data with automated e2e evidence.
- **Affected modules:** manufacturing, quality, service, commercial, project (read-only reuse), `test/`.
- **Files likely affected:** new `test/manufacturing.e2e-spec.ts`, `test/quality.e2e-spec.ts`, `test/service.e2e-spec.ts`, `test/lifecycle.e2e-spec.ts`; possibly seed/data helpers in `test/utils`.
- **Dependencies:** none outside existing modules; live PostgreSQL for `test:e2e`.
- **Acceptance criteria:** all e2e suites pass; full-chain journey verified against live DB; evidence recorded in completion report.
- **Verification plan:** `npm run test:e2e`; targeted unit suites unchanged; live DB assertions.
- **Risk:** Low — additive tests; no business logic changes.

### Wave 2 — High: Service Lifecycle Closure + AI Usage Observability
- **Objective:** Validate installation/warranty/AMC/visit lifecycle end to end; surface AI usage analytics per copilot/capability/user.
- **Affected modules:** service, ai-usage, ai (copilot metadata).
- **Files likely affected:** `modules/ai-usage/` extension (aggregation service + endpoints), service e2e coverage, `docs/ai/AI_USAGE_PIPELINE.md` (new).
- **Dependencies:** Wave 1 harness; AI platform (complete).
- **Acceptance criteria:** service lifecycle proven; usage API returns per-copilot/per-capability/per-user metrics; tests green.
- **Verification plan:** e2e + unit tests + live API calls.
- **Risk:** Low–Medium (usage schema is additive).

### Wave 3 — Medium: BI Contracts + Engineering Traceability Evidence
- **Objective:** Validate analytics reporting contracts; document engineering→manufacturing→quality traceability chain with evidence.
- **Affected modules:** analytics, engineering, manufacturing, quality.
- **Files likely affected:** analytics integration spec, traceability evidence doc.
- **Dependencies:** Waves 1–2.
- **Acceptance criteria:** report contracts verified; traceability chain documented with live examples.
- **Verification plan:** integration specs + live queries.
- **Risk:** Low.

### Wave 4 — Low: Production Readiness + Evidence Roll-Up
- **Objective:** Performance baselines, backup/recovery drill, monitoring notes, doc alignment, final v4.0 evidence pack.
- **Affected modules:** ops-level (no business logic).
- **Files likely affected:** `docs/` — performance evidence, backup drill log, updated gap analyses, `ReleaseNotes_v4.0.md`.
- **Dependencies:** all waves.
- **Acceptance criteria:** documented baselines + drill evidence; docs consistent with live system.
- **Verification plan:** run-and-record; no code changes unless a real defect is found.
- **Risk:** Low.

## 5. Estimated Timeline

| Wave | Effort | Focus |
|---|---|---|
| Wave 1 | 2–3 days | Lifecycle e2e + full-chain proof |
| Wave 2 | 1–2 days | Service lifecycle + AI usage pipeline |
| Wave 3 | 1 day | BI contracts + traceability evidence |
| Wave 4 | 1–2 days | Production readiness + release roll-up |
| **Total** | **5–8 days** | One capability at a time, quality gates after each |

## 6. Risks

| Risk | Mitigation |
|---|---|
| E2E specs require seeded live data | Reuse `test/setup-test-db.sh` + existing seed helpers; keep specs idempotent |
| Service lifecycle entities may have unverified relations | Validate via migration/schema checks before spec work (schema validator exists) |
| AI usage aggregation touches AiModule | Additive only; no changes to orchestrator/pipeline |
| Scope creep into refactoring | Constitution rule: reuse, never redesign; changes limited to listed files |
| Docs drift vs live behavior | Evidence-based docs; verify each claim with command output |

## 7. Recommended Starting Capability

**Wave 1, item 1 — Manufacturing e2e journey** (extend `test/` with
`manufacturing.e2e-spec.ts`). Rationale: it is the first missing link in the
core lifecycle chain, depends on nothing outside completed modules, produces
immediately verifiable evidence, and its harness is then reused by the
quality/service/lifecycle specs.

---

**Planning complete. No implementation code was modified. Awaiting approval to start Wave 1.**
