# MITRA M5 Implementation Plan — Service & Customer Lifecycle Governance
## Golden Scenario G10: Dispatch → Installation → Warranty → Service Request → Claim Adjudication → Digital Thread Lineage

**Target Release**: MITRA v4.5.0  
**Baseline Commit**: `283077f` (Tag `v4.4.0`, Branch `v3.3`)  

---

### 1. Architecture & Core Workstreams

```
Project (Finished M4 Tool/Product)
            ↓
W1: DispatchPlan (PLANNING → PACKED → SHIPPED → DELIVERED)
            ↓ (dispatch.delivered event)
W2: ServiceInstallation (SCHEDULED → IN_PROGRESS → COMPLETED with Commissioning & Customer Sign-off)
            ↓ (service.installation_completed event)
W3: ServiceWarranty (Automated Activation: ACTIVE, 12 months, 500k cycles)
            ↓
W4: ServiceRequest (Breakdown: OPEN → ACKNOWLEDGED → IN_PROGRESS) & ServiceVisit (Technician Labor & Parts)
            ↓
W5: ServiceWarrantyClaim (Active Coverage Validation → APPROVED/REJECTED → SR RESOLVED/CLOSED)
            ↓
W6: Project Service Lineage (Contiguous Digital Thread: Project → WO → Tool → Dispatch → Installation → Warranty → SR → Visit → Claim)
            ↓
W7: Multi-Tenant Security & Project-Scoped Audit Logging (401 unauth, 404 cross-tenant)
```

---

### 2. File-by-File Proposed Changes

#### A. Dispatch Module
- **[MODIFY] `mitra-backend/src/modules/dispatch/services/dispatch.service.ts`**:
  - Add transition method: `transition(id: string, transition: 'PACK' | 'SHIP' | 'DELIVER' | 'CANCEL', user: AuthUser, dto?: any)`.
  - Validate prerequisites: shipping requires `carrier` and `trackingNumber`.
  - On `DELIVER`, record `deliveredDate` and emit `EngineeringDomainEventType.DISPATCH_DELIVERED` via Outbox.
- **[MODIFY] `mitra-backend/src/modules/dispatch/controllers/dispatch.controller.ts`**:
  - Expose `POST /api/dispatch/:id/transition`.
  - Expose `POST /api/dispatch` with project and carrier fields.

#### B. Service Module (Installation, Warranty, Request, Visit, Claim, Lineage)
- **[MODIFY] `mitra-backend/src/modules/service/services/service.service.ts`**:
  - Enhance installation completion with commissioning sign-off and automated warranty activation.
  - Enhance warranty activation with default 12-month / 500,000-cycle parameters and duplicate prevention.
  - Enhance claim adjudication with active coverage validation and automatic service request synchronization.
  - Add `getProjectServiceLineage(projectId, tenantId)` assembling the full digital thread: Project $\to$ Work Order $\to$ Tool $\to$ Dispatch $\to$ Installation $\to$ Warranty $\to$ Service Request $\to$ Visit $\to$ Claim.
- **[MODIFY] `mitra-backend/src/modules/service/controllers/service.controller.ts`**:
  - Expose `POST /api/service/installations/:id/complete`.
  - Expose `POST /api/service/warranty-claims/:id/adjudicate`.
  - Expose `GET /api/service/projects/:projectId/lineage`.

#### C. Golden Scenario G10 E2E Test Suite
- **[NEW] `mitra-backend/test/m5-service-lifecycle.e2e-spec.ts`**:
  - Tests complete G10 chain from Project $\to$ Dispatch $\to$ Pack/Ship/Deliver $\to$ Installation Commissioning $\to$ Warranty Activation $\to$ Service Request $\to$ Service Visit $\to$ Warranty Claim Adjudication $\to$ Resolution $\to$ Digital Thread Lineage $\to$ Multi-Tenant 404 Isolation.

#### D. Frontend UI Integration
- **[MODIFY] `mitra-frontend/src/pages/DispatchPage.tsx`**:
  - Add modal for Creating Dispatch Plan (`POST /api/dispatch`).
  - Add action buttons for status transitions (`Pack`, `Ship`, `Deliver`).
- **[MODIFY] `mitra-frontend/src/pages/ServicePage.tsx`**:
  - Add dedicated Installation tab with Commissioning & Customer Sign-off modal.
  - Add Warranty tab with Active Health badge and Coverage status.
  - Add Claim Adjudication modal for Warranty Managers (`Approve` / `Reject`).
  - Add Project Service Lineage view.

---

### 3. Verification Plan

1. **Unit Tests**:
   - `npm test` in `mitra-backend` (117+ suites, 1,157+ tests PASS).
2. **Deterministic E2E (Golden Scenario G10)**:
   - `npx jest --config ./test/jest-e2e.json test/m5-service-lifecycle.e2e-spec.ts`.
3. **Full Milestone Regression (M1–M5)**:
   - Run all 12 Milestone E2E suites with `--runInBand`.
4. **Schema Validation**:
   - `npm run schema:validate` (189 entities / 0 drift).
5. **Frontend Compilation & Production Build**:
   - `npx tsc --noEmit` and `npm run build` in `mitra-frontend`.
6. **Security & Multi-Tenant Audit**:
   - Verify unauthenticated 401 and cross-tenant 404 across all new endpoints.
