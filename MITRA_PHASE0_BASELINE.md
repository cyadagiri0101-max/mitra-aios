# MITRA Phase 0 — Vision-100 Baseline & Gap Audit (Executive Report)

**Date:** 2026-08-18 · **Baseline:** `71780dc0ab4e158a4bb971732e0cf6f052ac9f06` (branch `v3.3`, tag `v4.2.0`)
**Scope:** Assess the verified v4.2.0 repository against the MITRA Constitution and Vision-100
capability structure (12 phases) to produce the planning foundation for **Vision-100 by July 2027**.
**Nature:** Audit and planning only — no code changes were made; no commits were created.
**Companions:** GAP_MATRIX, DEPENDENCY_GRAPH, DEFINITION_OF_DONE, GOLDEN_SCENARIOS (same directory).

---

## 1. Repository State (verified)

- Git repo `D:\Mitra3.0`; branch `v3.3`; HEAD `71780dc0` (`feat(mitra): complete v4.2 goal 3 knowledge intelligence`).
- Tags: `v4.1.0`, `v4.1.0-before-tag-repair`, `v4.1.1`, `v4.1.2` (`9ea69ad9…`, untouched), `v4.2.0` (local + pushed to `git@github.com:cyadagiri0101-max/mitra-aios.git`).
- Working tree: exactly 8 untracked files (7 legacy v4.1.x reports + `MITRA_v4.2_FINAL_RELEASE_GATE_AUDIT.md`) — intentionally uncommitted; `git diff --check` clean.
- Structure: `mitra-backend` (37 module dirs, 34 migrations `1700000000000-InitialSchema`…`1700000000034-CommercialLifecycle`, 96 spec files), `mitra-frontend` (43 pages, react-query v5, `ProtectedRoute`), `tooling/`, docker compose.
- Environment (local): backend `PORT=3001`, DB `mitra_v2` @ localhost:5432, `AI_ENABLED=false`, `MINIO_ENABLED=false` (example=true), single tenant `43acde8c-c9b2-4f39-a13c-1ff2e188ede9`, 5 users, 11 projects.

## 2. Baseline Verification (release gate, carried forward)

- Verdict **B — READY WITH DOCUMENTED NON-BLOCKING LIMITATIONS** (v4.2 audit report, untracked).
- Backend: 104/104 suites, 1105/1105 tests; builds EXIT 0; Goal 3 API 23/23; browser 21/21; smoke 27/28 (1 by-design 404: BOM compare with empty revision tables); DB read-only integrity PASS.
- Known fixture (documented, non-blocking, do not fix in code alone): `tooling/verify_goal3_api.js:17` hardcodes admin fallback password (env-overridable). Scheduled for removal under priority P4/P15.

## 3. Method & Evidence Rules

- Statuses: COMPLETE / PARTIAL / MISSING / INTEGRATION_GAP / VERIFICATION_GAP / ARCHITECTURE_GAP / DATA_GAP / SECURITY_GAP / GOVERNANCE_GAP (definitions in DoD §1).
- No fabrication: every status cites code/schema evidence; unverified items stay VERIFICATION_GAP. Mock/static UI counts as INTEGRATION_GAP, never COMPLETE.
- **Implementation %** = L0/L1 code+data exists; **Certified Vision %** = L2 golden-scenario-verified. Separated deliberately: 0/15 golden scenarios certified at baseline.

## 4. Constitution Alignment Audit (12 mandates)

| Constitution mandate | Alignment | Evidence / gaps |
|---|---|---|
| Project-centric (not ERP) | ✅ | Project domain is the hub; commercial→project factory; WO from project artifacts |
| End-to-end lifecycle | ⚠️ | Engineering→manufacturing strong; capacity segment missing; service UI partial |
| Traceability by design | ⚠️ | Revision/impact/audit strong; **decision log missing**; `audit_log.project_id` nullable |
| Local-first | ✅ | Docker-compose local stack, MinIO adapter; (MinIO currently disabled in env) |
| Modular bounded contexts | ✅ | 37 modules, explicit boundaries, no cross-domain FKs by design |
| Security/auditability by default | ⚠️ | Global audit + tenant fail-closed + global PermissionsGuard; metadata coverage needs audit; ai-usage uses wrong permission |
| AI augments engineers; human approval for engineering data | ✅ | All AI tools read-only; AI audit + injection detection; no AI-write path exists (approval workflow must be built before any L2 write) |
| Open/extensible | ⚠️ | Workflow engine + outbox + model router extensible; doc contradictions (SYSTEM_ARCHITECTURE microservices vs ARCHITECTURE.md modular monolith) |

## 5. Capability Coverage (Implementation % per phase — see GAP_MATRIX for detail)

| Phase | Impl % | Certified % | Dominant issue |
|---|---|---|---|
| 1 Master Data & Commercial | 55 | 25 | Employee/skill master MISSING |
| 2 Project, Planning & Capacity | 45 | 15 | **Capacity pillar ~0%** |
| 3 Engineering & Change | 70 | 30 | Decision log, freeze gate |
| 4 Manufacturing | 55 | 20 | Baselines, UI wiring |
| 5 Quality | 55 | 20 | Gate enforcement, RCA depth |
| 6 Service | 40 | 10 | UI gaps, feedback loop |
| 7 BI & Analytics | 15 | 5 | **Mock dashboards** |
| 8 Engineering Knowledge | 60 | 20 | Article lifecycle, provenance |
| 9 Engineering Copilot | 40 | 5 | No real-model run; L2 mock |
| 10 Predictive Intelligence | 15 | 5 | Unvalidated heuristics |
| 11 Digital Thread | 40 | 10 | Broken chain segments |
| 12 Security & Governance | 70 | 35 | Permission audit, decision log |
| **Overall** | **≈48** | **≈17** | |

## 6. Missing / Partial Capabilities (headline)

**MISSING (build):** employee/skill master; schedule baselines + variance; design-load estimation;
capacity engine (demand vs availability, what-if, outsourcing); engineering decision log; win/loss
analysis; cost-overrun & warranty-risk prediction; AI-write approval workflow; article
revision/approval lifecycle; field-failure→KB automation; e2e automation suite.

**PARTIAL (complete):** real BI dashboards (mock-free); BOM/drawing-analysis real endpoints;
knowledge provenance (hardcoded source links → config/DB); permission-metadata coverage; audit
project_id capture; MinIO enablement; AI runtime provisioning (AI_ENABLED); service UI wiring;
digital-thread navigation UI; doc contradiction cleanup.

## 7. Gap Categories (counts by type)

INTEGRATION_GAP (mock UI, toast placeholders, unwired pages) ~12 · DATA_GAP (employee master,
baselines, revision seeds, decision log) ~8 · VERIFICATION_GAP (copilot, predictors, e2e) ~9 ·
SECURITY_GAP (permission coverage, ai-usage permission, hardcoded fixture, provenance) ~4 ·
GOVERNANCE_GAP (AI approval workflow, article lifecycle) ~2 · ARCHITECTURE_GAP (docs vs code) ~2.
Matrix §14 lists the ten cross-cutting gaps A1–A10.

## 8. Dependency Model (summary — full graph in DEPENDENCY_GRAPH.md)

Platform (tenant/auth/audit/workflow/outbox) → master data (employee/skill is the missing root)
→ phases → intelligence (read-only until approval workflow). **Critical path:** employee master →
capacity engine → baselines/BI → decision log → knowledge → Copilot L1 → L2 → digital thread →
certification. Capacity pillar blocks 4 downstream capabilities — start now.

## 9. Top 20 Priorities (numbered; bold = security/critical path)

1. **Employee/skill master (M2)** — unlocks all capacity intelligence
2. **Design-load estimation (drawing/component/type rules)**
3. **Schedule baselines + planned-vs-actual variance**
4. **Capacity engine: demand vs availability, weekly/monthly, what-if, outsourcing recs**
5. **Engineering decision log (+ capture in release/review flows)**
6. **Permission-coverage audit: `@Permissions` metadata on every controller + deny tests**
7. **Replace mock UI: Dashboard, BOM analysis, Drawing analysis, Analytics (real endpoints)**
8. **Knowledge provenance: remove hardcoded demo source links (config/DB-driven)**
9. **Knowledge article lifecycle: revision + approval + publish + expiry**
10. **MinIO enablement + document storage wiring**
11. **AI runtime provisioning (Ollama/OpenAI), AI_ENABLED ops guide**
12. **Copilot L1 certification with citations + confidence + audit (G13)**
13. **Real-time BI aggregates: schedule/cost/machine utilization/engineering load**
14. **Machine utilization trends + capacity forecast dashboards**
15. **Secrets fixture removal from tooling code path + `ai-usage` permission fix + audit project_id**
16. **Predictive validation: delay/trial accuracy metrics on historical data**
17. **Cost-overrun & warranty-risk predictors**
18. **Service UI wiring (dispatch/installation/ECR/planning/trials/WO create forms)**
19. **Digital-thread navigation UI (quote→service) + trace service expansion**
20. **e2e golden-scenario suite (Playwright) + doc contradiction cleanup (SYSTEM_ARCHITECTURE)**

## 10. Recommended Sequence & Parallel Tracks

**Sequencing rule:** data → engine → dashboard → AI; read-only AI default; RBAC and traceability
ship with every feature. **Tracks (independent where possible):** T1 Capacity & Planning
(critical path), T2 BI & Baselines, T3 Knowledge & Copilot, T4 Security/Hardening (starts now,
never blocks), T5 Digital Thread & Service (finishes last), T6 Verification & e2e (starts now).
Full track scopes and edge rules: DEPENDENCY_GRAPH §4–§6.

## 11. Milestones to Vision-100 (July 2027)

| Milestone | Window | Scope | Exit evidence |
|---|---|---|---|
| M1 | Sep–Oct 2026 | Employee master, decision log, mock-UI replacement, security hardening (P1,5,6,7,15,20) | 6/15 golden scenarios runnable |
| M2 (v5.0) | Nov 2026–Jan 2027 | Capacity engine, baselines, real BI dashboards (P2,3,4,13,14) | G2, G3, G11 certified |
| M3 (v5.5) | Feb–Mar 2027 | Knowledge lifecycle, Copilot L1 certified, predictive validation + capacity/cost forecasts (P8,9,11,12,16,17) | G5, G12, G13, G14 certified |
| M4 (v6.0) | Apr–May 2027 | Copilot L2 (read-only + approval workflow), service wiring, digital thread (P10,18,19) | G9, G10, G15 certified |
| M5 | Jun–Jul 2027 | Golden-scenario certification 15/15, phase certification, Vision-100 certificate | **Certified Vision % = 100** |

## 12. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Capacity pillar slips (largest scope, missing data foundation) | High | Start M2+estimator immediately; T1 owns critical path; contract estimates before build |
| Copilot uncertifiable without real model runtime | Medium | Provision Ollama locally + OpenAI option in M1; document AI_ENABLED ops guide |
| Mock UI undermines certification credibility | High | P7 at M1; hard gate: no mock arrays in certified dashboards |
| Permission gaps surface in certification | Medium | P6 coverage audit as release gate (T4) |
| Doc/code drift misleads planning | Low | T6 contradiction cleanup; doc updates in every DoD |
| Team capacity vs 11-month timeline | Medium | Parallel tracks; scope discipline via DoD; re-baseline each release |
| Single-tenant data thin for predictions | Medium | Seed synthetic history + capture production data; validation metrics required |

## 13. Phase 0 Deliverables (this audit)

1. `MITRA_VISION_100_GAP_MATRIX.md` — capability-level matrix (12 phases, ~140 capabilities)
2. `MITRA_VISION_100_DEPENDENCY_GRAPH.md` — dependency model, critical path, tracks, milestones
3. `MITRA_VISION_100_DEFINITION_OF_DONE.md` — certification levels, universal + phase DoD, gates
4. `MITRA_GOLDEN_SCENARIOS.md` — 15 certification scenarios with baseline status (0/15 certified)
5. `MITRA_PHASE0_BASELINE.md` — this report
All uncommitted by design; no source files were modified.

## 14. Next Step

Approve scope and sequencing (§9–§11), then M1 begins: employee/skill master + decision log +
security hardening + mock-UI replacement, with T4/T6 starting immediately. Re-baseline at each
release to update Implementation % / Certified Vision %.