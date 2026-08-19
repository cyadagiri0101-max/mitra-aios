# MITRA v4.5.0 — Release Notes
## Milestone M5: Service & Customer Lifecycle Governance
**Release Tag**: `v4.5.0`
**Baseline Commit**: `283077f` (v4.4.0)
**Release Date**: August 19, 2026
**Status**: FORMALLY CERTIFIED (independent certification — see MITRA_v4.5.0_INDEPENDENT_CERTIFICATION.md)

---

### Highlights & Major Capabilities

MITRA v4.5.0 delivers the complete **Service & Customer Lifecycle Governance** loop — from physical dispatch of tooling to field service and warranty claim adjudication — governed by backend state machines, outbox events, and fail-closed multi-tenant isolation.

1. **Dispatch & Shipment Governance (Golden Scenario G10 — Stage 1)**:
   - Backend state machine (`PLANNING → PACKED → SHIPPED → DELIVERED`, plus governed `CANCEL`), enforced transition rules, carrier/tracking mandatory for SHIP.
   - Outbox domain events on every transition (`DISPATCH_CREATED/PACKED/SHIPPED/DELIVERED/CANCELLED`).
   - Frontend `DispatchPage` rewrite: KPI board, dispatch stepper, create + transition modals wired to the real API, permission-gated actions.

2. **Installation & Commissioning Sign-Off (G10 — Stage 2)**:
   - `POST /api/service/installations/:id/complete` with hard completion gates: customer sign-off (`signoffBy`), commissioning report, setup/test checklist — enforced server-side in a transaction.
   - Auto-activation of warranty on completion (coverage months, cycle limits) with `SERVICE_WARRANTY_ACTIVATED` outbox event.

3. **Field Service Request & Visit (G10 — Stage 3)**:
   - Service request lifecycle (`OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED/CLOSED/CANCELLED`) with warranty linkage flag, cost estimates, technician assignment.
   - Service visits with travel/service hours, parts-consumed tracking, and status transition to `COMPLETED`.

4. **Warranty Claim Adjudication (G10 — Stage 4)**:
   - `POST /api/service/warranty-claims/:id/adjudicate` — APPROVE validates linked warranty coverage (status, date window, cycle limits, financial data) and synchronizes the linked service request to `RESOLVED`; REJECT requires a mandatory reason.
   - Re-adjudication of decided claims blocked.

5. **Project Service Digital Thread (G10 — Stage 5)**:
   - `GET /api/service/projects/:projectId/lineage` returns the contiguous project → dispatch → installation → warranty → service request → visit → claim thread with metrics.
   - New `ServiceLineagePage` (routes `/service/lineage`, `/service/lineage/:projectId`) with timeline UI and project selector.

6. **Multi-Tenant Security (G10 — Stage 6)**:
   - Unauthenticated → 401; cross-tenant lineage access → 404 fail-closed (no existence leak).
   - All service/dispatch endpoints tenant-scoped via `TenantAwareService` / explicit `tenantId` filters.

7. **Frontend User Experience (Sprint 2)**:
   - `ServicePage` rebuilt as a tabbed dashboard (Requests, Visits, Installations, Warranty, Claims, AMC, Spare Parts) with real KPIs — all legacy optimistic/temp-write UI patterns removed.
   - `DispatchPage` full lifecycle management UI.
   - `serviceApi.ts` (governed API layer) and `serviceStatus.ts` (client-side state-machine mirror + validators) with 22 Vitest tests.

---

### Verification & Quality Summary (independent certification run)

- **Backend Unit Tests**: 121/121 suites PASS (1,203/1,203 tests PASS)
- **Backend Build**: PASS · **Schema Validation**: PASS (0 missing columns)
- **Golden Scenario G10 (M5)**: 18/18 PASS — full dispatch → installation → warranty → request → visit → claim → digital thread → isolation chain
- **Milestone E2E Batches**: M1 13/13 · M2 22/22 · M3 18/18 · M4 3/3 (G7/G8/G9) · M5 18/18 — all PASS
- **Full E2E Glob**: 270 passed / 9 failed
- **Frontend TypeScript**: 0 errors (`tsc --noEmit` clean)
- **Frontend Vitest**: 22/22 PASS
- **Frontend Production Bundle**: clean build
- **Security**: 401 unauthenticated / 404 cross-tenant verified; roles + fine-grained permissions on every M5 mutation; frontend in-memory JWT + CSRF + protected routes

---

### Known Baseline Failures (pre-existing at v4.4.0, NOT regressions)

| Suite | Failures | Cause |
|---|---|---|
| `tenant-isolation.e2e-spec.ts` | 6 | Test fixture issue: `POST /api/engineering/boms` fails for a user relocated to a fresh tenant (permission resolution), cascading into all isolation assertions. Reproduced identically on certified commit `283077f`. |
| `p0-production-proof.e2e-spec.ts` | 3 | Environmental: requires live Ollama/AI runtime; e2e harness runs `AI_ENABLED=false`. Reproduced identically at `283077f`. |

### Infrastructure-Only Observations

- `cross-domain.e2e-spec.ts` passed standalone (6/6) and in the full in-band run; transient `Connection terminated` errors logged by background event subscribers during heavy suites are resource contention, not code regressions.

### Sprint 2 Certification Fix

- `UpdateVisitDto` extended with `status` (enum `ServiceVisitStatus`) — closes the one genuine contract mismatch found during certification (frontend "Complete visit" action previously 400'd). Regression test added; no business logic changed.

---

### Scope Exclusions & Residual Gaps

- Spare-parts/AMC UI remains read-only listing (write flows unchanged from v4.4.0).
- Customer feedback capture, field-failure → KB/NCR automation (Phase 6 / Phase 8 loop) not in M5 scope — see MITRA_VISION_100_GAP_MATRIX.md.
- BI service KPIs and predictive service analytics remain future work.