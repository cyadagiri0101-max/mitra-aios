# MITRA Vision-100 — Definition of Done (DoD) & Certification Criteria

> Phase 0 baseline audit artifact. Defines how a capability earns the statuses used in
> MITRA_VISION_100_GAP_MATRIX.md and what "Vision-100 Certified" means. Applies to every feature,
> phase, and release from baseline `71780dc0` (v4.2.0) onward.

## 1. Status-to-Evidence Mapping (how a status is *earned*)

| Status | Must be earned by |
|---|---|
| COMPLETE | Code + data + wiring exist **and** pass Level-1 verification (below) |
| PARTIAL | Code exists but fails at least one Level-1 check, or UI/engine not wired |
| MISSING | No implementation found in code or schema (audit evidence: search + module inventory) |
| INTEGRATION_GAP | Components exist but not connected (API without UI, data not consumed) |
| VERIFICATION_GAP | Implemented but no evidence (no tests / no golden run / no real-model run) |
| ARCHITECTURE_GAP | Docs vs code contradiction or missing architectural support |
| DATA_GAP | Schema exists but data absent/unseeded |
| SECURITY_GAP / GOVERNANCE_GAP | Control missing/partial or not enforced |

## 2. Certification Levels

| Level | Name | Evidence required |
|---|---|---|
| L0 | Implemented | Code merged at a tagged release; builds EXIT 0; backend tests pass |
| L1 | Verified | Unit/API tests ≥ 80% per module (backend spec suites); API contract checks green; RBAC matrix test for every endpoint |
| L2 | Certified | Golden scenario (MITRA_GOLDEN_SCENARIOS.md) passes end-to-end via Playwright + API; audit rows + trace entries captured as evidence |
| L3 | Vision-100 | All 12 phases reach L2; cross-phase golden scenarios pass; **Certified Vision % = 100** |

A capability is **Certified Vision %**-counted only at L2. Implementation % counts L0/L1 code
that exists. The two numbers must be reported separately in every baseline.

## 3. Universal DoD (every item, every track)

1. `@Permissions` metadata + seeded role mapping for every new endpoint; PermissionsGuard global
   test proves deny (403) and allow.
2. Business events write `audit_logs` with `project_id` populated when a project is in scope
   (fix A5 first).
3. Tenant isolation: all queries go through TenantAwareService; fail-closed test exists.
4. Traceability rows produced: revision records, decision-log rows (post M1), outbox events
   consumed.
5. No mock/static data in any shipped UI path (replaces A1/A2).
6. No hardcoded credentials/secrets; env-overridable; `.env.example` updated; no fixture data in
   production code paths (replaces A3).
7. Backend unit tests for the module (≥80% statement coverage per module per
   IMPLEMENTATION_GUIDELINES.md), API contract verified, frontend route smoke passes.
8. Documentation updated in lockstep (constitution mandates traceability of decisions; docs are
   part of the deliverable).
9. Migration is additive, reversible-or-versioned, and named per convention
   (`17000000000NN-<Domain>Name`).

## 4. Phase-Specific DoD Gates (additions to §3)

### Phase 1 — Master Data & Commercial
- Employee/skill master: CRUD + skills matrix + availability query (L1) — M2.
- Quotation margins match cost rollup within tolerance on golden scenario (L2).
- Win/loss analysis endpoint with at least one certified report (L2).

### Phase 2 — Project, Planning & Capacity
- Baselines: snapshot schedule on project start + revision trigger; variance API (L1).
- Design-load estimation for drawing/component/type rules; planned vs actual load report (L2).
- Capacity engine: demand vs availability for weekly/monthly horizons; what-if API (L2).
- Outsourcing/hiring recommendation API + capacity-risk alert (L2).
- Engineer utilization dashboard (real data, not mock) (L2).

### Phase 3 — Engineering & Change
- Decision log: entity + UI capture on release/review events; queries used by Copilot (L1).
- Design-freeze gate wired into release workflow (L2).
- Drawing revision compare certified with seeded revision data (L2).
- ECR/ECO/ECN traceable to decision-log entries (L2).

### Phase 4 — Manufacturing
- WO generation from released artifacts with traceable source revision (L2).
- Delay prediction vs actual: documented accuracy metric (L2) — otherwise VERIFICATION_GAP stays.
- Production board and machine utilization show real aggregates (L2).

### Phase 5 — Quality
- Inspection gates enforce pass/fail in WO transitions (L2).
- NCR → RCA → CAPA closure loop with audit evidence (L2).
- Quality KPIs (NCR trend, defect rate) real-data dashboards (L2).

### Phase 6 — Service
- Dispatch → installation → service record chain navigable (L2).
- Warranty claim approved/rejected with audit + customer history (L2).
- Field-failure feedback to knowledge base (L2).

### Phase 7 — BI
- Every dashboard KPI backed by an aggregate endpoint; zero mock arrays (L2).
- Schedule/cost variance (SPI-style) using baselines (L2).
- Capacity forecast chart fed by Phase 2 engine (L2).

### Phase 8 — Knowledge
- Article lifecycle: revision + approval + publish workflow (L1); expiry/obsolescence (L2).
- Provenance: every search result carries source_ref resolved from DB/config, never hardcoded (L1).
- Decision corpus indexed; copilot answers cite decision-log entries (L2).

### Phase 9 — Copilot
- L1: retrieval with citations validated against sources; confidence gate; AI audit rows (L2).
- L1 certified with a real model runtime (Ollama/OpenAI) — AI_ENABLED provisioning documented (L2).
- L2: analysis/recommendation tools on real endpoints (replace mock UI) (L2).
- L2 write features: blocked until approval workflow certified (governance gate, §5).

### Phase 10 — Predictive
- Each predictor ships with documented accuracy/validation on historical data (L2), else status
  remains PARTIAL/VERIFICATION_GAP.
- Capacity/cost/warranty predictors exist and feed BI (L2).

### Phase 11 — Digital Thread
- Chain navigation across commercial → project → engineering → manufacturing → quality → service
  in one UI (L2); broken segments (project→capacity, dispatch→service) closed first.

### Phase 12 — Security & Governance
- Permission coverage audit complete: every controller endpoint has metadata + deny test (L2).
- Audit rows: project_id capture fixed and verified (L1).
- Secrets cleanup: tooling fixture removed from code path (L1).
- Backup restore drill executed and recorded; RTO/RPO verified (L1).
- AI approval workflow for write features certified (L2) — gate for Copilot L2 writes.

## 5. Governance Gates (release-level DoD)

1. **Release gate** (as in v4.2 process): builds green, full backend suite green, API contract
   green, smoke suite green, DB integrity pass, release-tag audit — verdict A/B/C.
2. **Security gate**: permission-coverage report, no new hardcoded secrets, audit capture check.
3. **Certification gate (per phase)**: golden scenarios for the phase pass at L2 with captured
   evidence (trace IDs, audit rows, screenshots/videos for UI paths).
4. **Constitution gate**: feature aligns with constitution principles — no AI writes without
   approval workflow; traceability by design; local-first still respected.

## 6. Certification Process (who/how)

- **Implementer** proves L0/L1 (tests + contracts).
- **Independent verifier** (not the implementer) runs golden scenarios at L2 and records evidence.
- **Baseline owner** updates gap matrix statuses and re-computes Implementation % and Certified
  Vision % per release.
- Vision-100 certificate = all 12 phases at L2 with 15/15 golden scenarios passing on the final
  tagged release before July 2027.