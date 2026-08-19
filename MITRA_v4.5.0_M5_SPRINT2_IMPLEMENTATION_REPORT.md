# MITRA v4.5.0 — M5 Sprint 2 Implementation Report

**Scope:** Expose the certified M5 backend (Dispatch, Installation, Warranty, Service Request/Visit, Warranty Claim, Project Service Digital Thread) through a production-grade frontend — real data only, no mocks. All backend governance (TenantAwareService, @Permissions RBAC, outbox, audit) preserved untouched.
**Date:** 2026-08-19 · **Branch:** v3.3 (uncommitted M5 Sprint 1 backend diffs preserved as-is)

---

## 1. Workstream Delivery

| WS | Deliverable | Evidence |
|----|-------------|----------|
| W1 | **Dispatch Management UI** — `DispatchPage.tsx` (rewritten): KPI tiles (PLANNING/PACKED/SHIPPED/DELIVERED/CANCELLED counts), searchable table, status stepper, detail modal with packing checklist, create modal (customerName, projectId, plannedDate, carrier, dynamic packing list), transition modal (SHIP enforces carrier + trackingNumber, CANCEL confirmation), permission-aware actions via `hasRole` + `hasPermission('project','transition')` | FE build + unit tests |
| W2 | **Installation UI** — `InstallationsTab.tsx`: list/create/complete, completion gated on explicit customer sign-off + installation report + setup/test checklist (validated client-side via `canCompleteInstallation`, mirroring backend DTO), auto-activate warranty with coverageMonths on completion | FE build + unit tests |
| W3 | **Warranty UI** — `WarrantyTab.tsx`: coverage display from backend rules (ACTIVE / EXPIRED / CYCLE_LIMIT_EXHAUSTED / INACTIVE), cycles used vs max, remaining cycles, claim limit, detail modal performing authoritative `GET /warranty/:id/coverage?incidentDate=` check | FE build + unit tests |
| W4 | **Service Requests & Visits UI** — `RequestsTab.tsx` (contract-correct `srNumber`/`serviceType`/`customerName`/`reportedDate`, PATCH status, close action), `VisitsTab.tsx` (correct DTO: `workPerformed`, `travelHours`, `serviceHours`, `partsUsed[{partCode,partName,qty}]`, effort display, mark-completed) | FE build + unit tests |
| W5 | **Warranty Claim Adjudication UI** — `ClaimsTab.tsx`: list/create, adjudicate modal (APPROVE with approvedAmount/approvalNotes; REJECT requires rejectionReason; resolutionNotes), validation mirrors backend rules, refetches claims/requests/warranties/lineage after decision | FE build + unit tests |
| W6 | **Project Service Digital Thread** — `ServiceLineagePage.tsx` + route `/service/lineage` & `/service/lineage/:projectId`: project selector, metrics panel, vertical timeline of dispatches → installations → warranties → service requests → visits → claims with statuses/dates/IDs, deep links to `/dispatch` and `/service`; entry card added to `ProjectDetailsPage` | FE build |
| W7 | **Service Dashboard** — `ServicePage.tsx` rebuilt as tabbed shell (Dashboard, Requests, Visits, Installations, Warranty, Claims, AMC, Spare Parts); dashboard KPIs computed live from list endpoints (no mocks); legacy contract mismatches (requestNumber/serviceType, workDone) eliminated | FE build |
| W8 | **UX polish** — shared `service/ui.tsx` (StatusBadge, KpiTile, SectionCard, ErrorBanner, ModalFooter, fmtDate/fmtMoney), dark-glass visual language, empty/loading/error states everywhere, `staleTime` + query invalidation wiring | FE build |
| W9 | **Security / role alignment** — Sidebar nav gates matched to backend: Dispatch visible to ADMIN/MANAGEMENT/SALES/DESIGN/PLANNING/PRODUCTION/QUALITY; Service visible to ADMIN/MANAGEMENT/SALES/SERVICE/QUALITY/DESIGN/PLANNING/PRODUCTION; page-level action gating via AuthContext | FE build |
| W10 | **Tests** — Vitest 4.1.11 added (devDependency), `npm test` script, `serviceStatus.test.ts`: 22 unit tests covering dispatch state machine, installation gates, warranty coverage semantics, claim adjudication rules, visit effort hours | `22 passed` |

## 2. Frontend Evidence

| Gate | Command | Result |
|------|---------|--------|
| Type check (strict, noUnusedLocals) | `npx tsc --noEmit` (mitra-frontend) | **Pass** — 0 errors |
| Production build | `npm run build` (mitra-frontend) | **Pass** — built in ~8s, 25 chunks |
| Unit tests | `npm test` (mitra-frontend) | **Pass** — 1 file, 22 tests |

## 3. Backend Evidence (no backend code changed by Sprint 2)

| Gate | Command | Result |
|------|---------|--------|
| Unit tests | `npm test` (mitra-backend) | **Pass** — 121 suites / 1203 tests |
| Build | `npm run build` (mitra-backend) | **Pass** |
| Schema | `npm run schema:validate` | **Pass** — no missing-column issues (informational dead-column warnings only) |
| G10 golden scenario | `npx jest --config ./test/jest-e2e.json test/m5-service-lifecycle.e2e-spec.ts --runInBand` | **Pass** — 18/18 (Stage 1 Dispatch → Stage 2 Installation+Warranty → Stage 3 Request+Visit → Stage 4 Claim adjudication → Stage 5 Digital Thread → Stage 6 Multi-tenant isolation) |
| Full e2e regression | `npx jest --config ./test/jest-e2e.json --runInBand` | 269 passed / 9 failed — see attribution below |

### Regression failure attribution (all pre-existing baseline, reproduced in isolation, NOT Sprint 2)

| Suite | Result | Attribution |
|-------|--------|-------------|
| `tenant-isolation.e2e-spec.ts` | 6/6 fail | **Known baseline** (pre-Sprint-2); reproduced identically in isolation |
| `p0-production-proof.e2e-spec.ts` | 3 fail / 4 pass | **Known baseline** (pre-Sprint-2); reproduced identically in isolation |
| `cross-domain.e2e-spec.ts` | 6/6 pass in isolation | Full-suite run hit DB `Connection terminated` from in-band resource contention; suite passes standalone — not a Sprint 2 regression |

## 4. Contract Alignment (frontend ↔ backend)

- Create request: `{srNumber, serviceType, priority, customerName, customerContact, reportedDate, projectId?, warrantyClaim?, description}` — validated against `CreateServiceRequestDto` (whitelist + forbidNonWhitelisted).
- Visit: `{visitNumber, serviceRequestId, visitDate, workPerformed, travelHours, serviceHours, partsUsed[], technicianId?}` — correct DTO field names.
- Installation complete: `{signoffBy, installationReport, checklist, autoActivateWarranty, coverageMonths}` → `{installation, warranty}`; client gates mirror backend required fields.
- Adjudication: `{decision, rejectionReason?, approvedAmount?, approvalNotes?, resolutionNotes?}` → `{claim, request}`; REJECT without reason rejected client-side before hitting 400.
- Lineage: `GET /service/projects/:projectId/lineage` → typed sections + metrics rendered as digital thread.

## 5. Files Touched (Sprint 2, frontend only)

**New:** `src/utils/serviceApi.ts`, `src/utils/serviceStatus.ts`, `src/utils/serviceStatus.test.ts`, `src/pages/service/{ui,InstallationsTab,WarrantyTab,RequestsTab,VisitsTab,ClaimsTab}.tsx`, `src/pages/ServiceLineagePage.tsx`
**Modified:** `src/pages/DispatchPage.tsx`, `src/pages/ServicePage.tsx`, `src/App.tsx`, `src/components/Sidebar.tsx`, `src/pages/ProjectDetailsPage.tsx`, `package.json` (+`test` script), `package-lock.json` (+vitest)
**Untouched:** all `mitra-backend/**` (Sprint 1 diffs remain uncommitted as delivered)

## 6. Conclusion

All Sprint 2 workstreams W1–W10 delivered; frontend tsc/build/tests green; backend 1203 unit tests, build, schema validation, and G10 golden-scenario e2e (18/18) green. The only failing suites are the two documented pre-existing baseline failures plus a reproducible-in-isolation cross-domain run — none caused by this sprint. **Backend remains 100% untouched, so v4.5.0 governance/certification posture is preserved.**