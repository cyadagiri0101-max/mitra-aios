# M5 Evidence Matrix — Independent Certification (v4.5.0)

**Scope:** M5 (Service & Customer Lifecycle Governance) — Sprint 1 (backend) + Sprint 2 (frontend)
**Certified Release:** v4.5.0 · **Baseline:** v4.4.0 (commit `283077f`)
**Evidence generated:** 2026-08-19, independent certification run

---

## 1. Golden Scenario G10 — Evidence

Suite: `mitra-backend/test/m5-service-lifecycle.e2e-spec.ts`
Command: `npx jest --config ./test/jest-e2e.json test/m5-service-lifecycle.e2e-spec.ts --runInBand`

| Result | Value |
|---|---|
| Tests | **18 / 18 PASS** |
| Suites | 1 / 1 PASS |
| Duration | 10.8 s |

Chain verified end-to-end (single tenant, real DB):

| Stage | Verified |
|---|---|
| 1. Dispatch Planning & Shipment Governance (W1) | Create PLANNING → reject invalid DELIVER/SHIP → PACK → reject SHIP without carrier/tracking → SHIP with carrier → DELIVER (7/7) |
| 2. Installation & Commissioning Sign-Off (W2/W3) | Schedule installation → complete with sign-off + auto warranty activation → coverage check (3/3) |
| 3. Field Breakdown, Visit & Repair (W4) | Log warranty-linked service request → record visit with parts (2/2) |
| 4. Warranty Claim Adjudication (W5) | Submit claim → APPROVE with coverage validation → auto-resolve linked SR → prevent re-adjudication (3/3) |
| 5. Project Service Digital Thread (W6) | Contiguous project→dispatch→installation→warranty→SR→visit→claim lineage (1/1) |
| 6. Multi-Tenant Security (W7) | Unauthenticated → 401; cross-tenant lineage → 404 fail-closed (2/2) |

---

## 2. Frontend Evidence

Run from `mitra-frontend/`:

| Gate | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | PASS (0 errors) |
| Unit (Vitest) | `npm test` (`vitest run`) | **22 / 22 PASS** (1 suite: `src/utils/serviceStatus.test.ts`) |
| Production build | `npm run build` (tsc && vite build) | PASS (built in ~7.9 s) |

---

## 3. Backend Evidence

Run from `mitra-backend/`:

| Gate | Command | Result |
|---|---|---|
| Unit | `npm test` (jest) | **1203 / 1203 PASS** (121 suites) |
| Build | `npm run build` (nest build) | PASS |
| Schema | `npm run schema:validate` | PASS (0 missing columns; informational warnings only — dead columns on `project_folders`, type notes) |

---

## 4. Full E2E Regression (unrestricted glob)

Command: `npx jest --config ./test/jest-e2e.json --runInBand`

| Result | Value |
|---|---|
| Passed | **270** |
| Failed | **9** (2 suites) |
| Total | 279 |

### 4.1 Known baseline failures (confirmed pre-existing at certified commit `283077f`)

| Suite | Failures | Classification | Baseline reproduction |
|---|---|---|---|
| `tenant-isolation.e2e-spec.ts` | 6 | **BASELINE** | Same 6/6 failures running the identical suite against a worktree of commit `283077f` (v4.4.0 certified code). Root cause: fixture failure — `POST /api/engineering/boms` as a user moved to a fresh tenant does not return 201 (permission resolution for the relocated user), which cascades into all 6 isolation assertions. |
| `p0-production-proof.e2e-spec.ts` | 3 | **BASELINE / ENVIRONMENTAL** | Same 3 failures (4 pass) at `283077f`. Requires a live Ollama/AI runtime (`AI_ENABLED=true` + reachable model provider); the e2e harness runs with `AI_ENABLED=false`. |

### 4.2 Infrastructure / resource contention

| Suite | Standalone | Full in-band run |
|---|---|---|
| `cross-domain.e2e-spec.ts` | PASS (6/6) | PASS (6/6) — intermittent DB connection errors observed in adjacent suites (e.g. `Connection terminated` in EngineeringEventBus logs) are transient resource contention, not code regressions. |

### 4.3 Controlled milestone batches

| Batch | Suites | Tests | Result |
|---|---|---|---|
| M1 | m1-engineering-decisions, m1-people | 13 | 13/13 PASS |
| M2 | m2-design-load, m2-sprint2-planning-baselines | 22 | 22/22 PASS |
| M3 | m3-bom-revision-diff, m3-capacity-leveling, m3-change-decision, m3-engineering-kernel | 18 | 18/18 PASS |
| M4 | m4-quality-closed-loop (G8), m4-shop-floor-execution (G7), m4-trial-governance (G9) | 3 | 3/3 PASS |
| M5 | m5-service-lifecycle (G10) | 18 | 18/18 PASS |

---

## 5. Security Evidence

| Check | Result | Evidence |
|---|---|---|
| Unauthenticated → 401 | PASS | G10 stage 6.1 |
| Cross-tenant resource → 404 (fail-closed, no existence leak) | PASS | G10 stage 6.2 (`/service/projects/:id/lineage` cross-tenant); `TenantAwareService.requireTenant` / `findOne` tenant-equality guard |
| Unauthorized (role/permission) → 403 | PASS | `RolesGuard` + `PermissionsGuard` on every M5 mutation endpoint (dispatch create/transition, installation create/complete, warranty create, claim create/adjudicate, request create/update/close, visit create/update) |
| Service lineage tenant boundary | PASS | `ServiceLineageService.getProjectServiceLineage` resolves project with `{ id, tenantId }`, 404 otherwise; all 6 entity queries scoped by `tenantId` |
| Frontend query/cache keys | PASS | Keys are resource-scoped (`dispatch-plans`, `service-requests`, `project-service-lineage:<projectId>`, …); no tenant identifiers; tenant scoping enforced server-side. Note (pre-existing, app-wide): React Query cache is not explicitly cleared on logout — no Sprint 2 exposure. |
| Page-level permissions | PASS | All routes behind `ProtectedRoute`; Sidebar role gating for Dispatch/Service matches backend GET roles; mutation buttons additionally gated by `hasRole` + `hasPermission` (e.g. `project:transition`, `service:create/update`) |
| Auth transport | PASS | JWT held in memory (not localStorage), CSRF header on all mutating requests, 401 refresh/redirect |

---

## 6. API Contract Verification (frontend → backend)

| Endpoint | Method | Frontend payload | Backend DTO | Match |
|---|---|---|---|---|
| `/dispatch` | GET | — (list) | `DispatchService.findAll` (tenant-scoped array, take 200) | ✓ |
| `/dispatch` | POST | customerName, projectId?, plannedDate?, carrier?, notes?, packingList? | `CreateDispatchPlanDto` | ✓ |
| `/dispatch/:id/transition` | POST | transition (PACK/SHIP/DELIVER/CANCEL), carrier?, trackingNumber?, notes? | `TransitionDispatchPlanDto`; SHIP requires carrier+tracking; PACK requires PLANNING; DELIVER requires SHIPPED; CANCEL blocked after DELIVERED | ✓ (client `serviceStatus.ts` mirror matches) |
| `/service/installations` | GET/POST | list / create | `CreateInstallationDto` | ✓ |
| `/service/installations/:id/complete` | POST | signoffBy*, installationReport*, checklist*, autoActivateWarranty?, coverageMonths? | `CompleteInstallationDto`; backend enforces gates + warranty auto-activation | ✓ |
| `/service/warranty` | GET/POST | list / create (projectId, dispatchId, start, months, cycles, claimLimit) | `CreateWarrantyDto` | ✓ |
| `/service/warranty/:id/coverage` | GET | incidentDate | `checkCoverage` → `{ isCovered, reason, warranty }` | ✓ |
| `/service/requests` | GET/POST | list / create (customerName*, issueDescription*, reportedDate*, serviceType, priority, projectId?, moldId?, …) | `CreateServiceRequestDto` | ✓ |
| `/service/requests/:id` | PATCH | `{ status }` | `UpdateServiceRequestDto` (includes status) | ✓ |
| `/service/requests/:id/close` | PATCH | — | `{ status: 'CLOSED' }` server-side | ✓ |
| `/service/visits` | GET/POST | list / create (visitDate, serviceType, projectId?, technicianId?, workPerformed?, hours?, partsUsed?) | `CreateVisitDto` | ✓ |
| `/service/visits/:id` | PATCH | `{ status: 'COMPLETED' }` | **`UpdateVisitDto` lacked `status` → 400 with `forbidNonWhitelisted`** | **FIXED** (see §7) |
| `/service/warranty-claims` | GET/POST | list / create (warrantyId?, issueSummary*, claimAmount*) | `CreateWarrantyClaimDto` | ✓ |
| `/service/warranty-claims/:id/adjudicate` | POST | decision (APPROVE/REJECT), approvedAmount?, approvalNotes?, rejectionReason*, resolutionNotes? | `AdjudicateWarrantyClaimDto`; APPROVE validates warranty + financials; REJECT requires reason; syncs linked SR → RESOLVED | ✓ |
| `/service/amc`, `/service/spare-parts` | GET | list | paginated tenant-scoped | ✓ |
| `/service/projects/:projectId/lineage` | GET | — | `ProjectServiceLineageDto` (project, 6 entity arrays, metrics) | ✓ |

---

## 7. Genuine Sprint 2 Regressions Found & Resolved During Certification

1. **Visit status transition contract mismatch (1 regression)**
   - Frontend `VisitsTab.tsx` sends `PATCH /api/service/visits/:id` with `{ status: 'COMPLETED' }`.
   - `UpdateVisitDto` (PartialType of `CreateVisitDto`) had no `status` field; global `ValidationPipe` runs `whitelist: true, forbidNonWhitelisted: true` → every "Complete" click returned HTTP 400.
   - No backend or e2e test exercised this path (backend e2e only PATCHed `workPerformed`).
   - **Fix (minimal contract correction, no business logic change):** added `status?: ServiceVisitStatus` (IsOptional/IsEnum) to `UpdateVisitDto`; added regression assertion `transitions visit status to COMPLETED via PATCH` to `test/service.e2e-spec.ts`.
   - Verified: service.e2e-spec.ts PASS in full-suite rerun; 1203/1203 unit PASS; G10 18/18 PASS after fix.

No other frontend/backend contract mismatches, mock data, fake responses, silent writes, manual tenant-ID construction, authorization bypasses, or duplicate business logic were found in Sprint 2 scope.

---

## 8. Git Integrity

- HEAD: `283077f` (v4.4.0 certified tag)
- All M5 work (Sprint 1 backend + Sprint 2 frontend + docs) is present in the working tree, uncommitted at audit start.
- Working tree contains only M5-scope files, pre-existing untracked documentation, and one transient session artifact (`session-ses_fec3.md` — excluded from the release commit).
- Release commit + annotated tag `v4.5.0` created after certification (see MITRA_v4.5.0_INDEPENDENT_CERTIFICATION.md).