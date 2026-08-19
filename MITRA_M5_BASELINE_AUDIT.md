# MITRA M5 Baseline Audit & Gap Matrix
## Milestone M5: Service & Customer Lifecycle Governance (Golden Scenario G10)
**Baseline Release**: MITRA v4.4.0  
**Baseline Commit**: `283077f` (Branch `v3.3`, Tag `v4.4.0`)  
**Target Release**: MITRA v4.5.0  
**Audit Date**: August 19, 2026  

---

### 1. Executive Summary & Strategic Positioning

With the formal certification and release closure of **MITRA v4.4.0** (Milestone M4), the complete operational loop spanning **Commercial $\to$ Engineering Design $\to$ Release Governance $\to$ Shop Floor Execution $\to$ In-Process Quality $\to$ Tooling Trials $\to$ ECR Feedback** is 100% verified and certified (Golden Scenarios G2, G3, G4, G5, G6, G7, G8, G9).

The next logical and highest-value strategic milestone in Vision-100 is:
**Milestone M5 — Service & Customer Lifecycle Governance (Golden Scenario G10)**.

M5 bridges completed manufacturing and tooling delivery to the post-shipment field lifecycle:
```
Finished Tool / Mold / Product
            ↓
Dispatch Planning & Shipment Tracking (DispatchPlan)
            ↓
On-Site Tool Installation & Commissioning (ServiceInstallation)
            ↓
Active Warranty Registration (ServiceWarranty)
            ↓
Field Service Requests & On-Site Visits (ServiceRequest, ServiceVisit, ServiceReport)
            ↓
Warranty Claim Adjudication & Spare Parts Management (ServiceWarrantyClaim, SparePart)
            ↓
Unified Project & Customer Traceability
```

---

### 2. Existing Baseline Capabilities Audit (What Already Exists)

#### A. Backend Architecture & Entities
The backend already possesses rich TypeORM entities and controllers in `mitra-backend/src/modules/dispatch` and `mitra-backend/src/modules/service`:
1. **`DispatchPlan`** (`dispatch_plans`): `dispatchNumber`, `projectId`, `customerName`, `status` (`PLANNING`, `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`), `carrier`, `trackingNumber`, `shippingAddress`, `plannedDate`, `shippedDate`, `deliveredDate`.
2. **`ServiceInstallation`** (`service_installations`): `installationNumber`, `projectId`, `customerName`, `installationDate`, `commissioningDate`, `technicianName`, `status` (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `FAILED`), `signoffBy`, `signoffDate`, `notes`.
3. **`ServiceWarranty`** (`service_warranties`): `warrantyNumber`, `projectId`, `toolMasterId`, `customerName`, `startDate`, `endDate`, `coverageType` (`STANDARD`, `EXTENDED`, `COMPREHENSIVE`), `maxCycles`, `currentCycles`, `status` (`ACTIVE`, `EXPIRED`, `VOID`).
4. **`ServiceRequest`** (`service_requests`): `srNumber`, `projectId`, `toolMasterId`, `customerName`, `serviceType` (`REPAIR`, `MAINTENANCE`, `CALIBRATION`, `BREAKDOWN`), `priority` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), `status` (`OPEN`, `ACKNOWLEDGED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), `warrantyClaim`.
5. **`ServiceVisit`** (`service_visits`): `visitNumber`, `serviceRequestId`, `technicianName`, `visitDate`, `status`, `workDone`, `partsUsed`, `travelHours`, `serviceHours`.
6. **`ServiceWarrantyClaim`** (`service_warranty_claims`): `claimNumber`, `warrantyId`, `serviceRequestId`, `claimDate`, `claimAmount`, `approvedAmount`, `status` (`SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `SETTLED`), `adjudicatedBy`, `rejectionReason`.
7. **`SparePart`** (`spare_parts`): Part catalog, stock tracking, cost, and reorder levels.

#### B. Existing Test Coverage
- `mitra-backend/test/service.e2e-spec.ts` already tests basic CRUD and request lifecycles.

---

### 3. Gap Matrix for Milestone M5

| Area | Current Baseline State | M5 Target State (Golden Scenario G10) | Gap Type |
|---|---|---|---|
| **Dispatch-to-Installation Flow** | Dispatch status can be updated; no automatic trigger or lineage linking dispatch completion to installation scheduling. | Delivering a dispatch plan allows initiating on-site installation with pre-populated project and customer metadata. | **Functional / Orchestration Gap** |
| **Installation Sign-off & Warranty Activation Gate** | Warranty records can be created independently without requiring a verified installation sign-off. | Successful commissioning and customer sign-off of an installation automatically generates or activates the `ServiceWarranty` for the project/tool. | **Governance / Closed Loop Gap** |
| **Warranty Claim Adjudication** | Basic claim submission exists; approval does not validate active warranty dates, cycle counts, or update service request status. | Warranty claim approval validates coverage period and cycle limits; approved claims link to service requests and update financial allowances. | **Validation / Policy Gap** |
| **Frontend Dispatch UI** | `DispatchPage.tsx` has table and search; "New Dispatch" button displays a placeholder toast. | Complete Dispatch Plan creation modal with project selection, packing checklist, carrier assignment, and status transition actions (`PACK`, `SHIP`, `DELIVER`). | **Frontend UI Gap** |
| **Frontend Service UI** | `ServicePage.tsx` has ticket creation modal; lacks dedicated Installation commissioning form, Warranty registration view, and Claim adjudication workflow. | Complete Installation management, Warranty lifecycle view, Claim adjudication actions (Approve/Reject with reasons), and Spare Parts allocation. | **Frontend UI Gap** |
| **Digital Thread & Traceability Navigation** | Service entities reference `projectId`; no unified service lineage view linking Project $\to$ WO $\to$ Tool $\to$ Dispatch $\to$ Installation $\to$ Warranty $\to$ SR. | Comprehensive project service chain navigation showing the full lifecycle thread from initial quote through post-sales warranty and service. | **Digital Thread Gap (G10/G15)** |
| **Multi-Tenant Security & Audit Trail** | Service modules use tenant scoping; requires strict cross-tenant 404 verification across dispatch, installation, warranty, claims, and visits. | Deterministic cross-tenant IDOR protection and project-scoped audit logging for all service lifecycle events. | **Security / Compliance Gate** |

---

### 4. Golden Scenario G10 Specification & Verification Standard

#### **Golden Scenario G10 — Dispatch $\to$ Installation $\to$ Active Warranty $\to$ Service Request $\to$ Warranty Claim Approval**

1. **Step 1: Dispatch Plan & Shipment**:
   - Create `DispatchPlan` linked to completed Project & Tool.
   - Pack items, assign carrier & tracking number, advance status `PLANNING` $\to$ `PACKED` $\to$ `SHIPPED` $\to$ `DELIVERED`.
   - Audit event `dispatch.delivered` emitted.
2. **Step 2: On-Site Tool Installation & Commissioning**:
   - Auto-initiate / schedule `ServiceInstallation` for delivered dispatch.
   - Field technician records setup, test runs, and final customer sign-off (`status: COMPLETED`).
   - Audit event `service.installation_completed` emitted.
3. **Step 3: Warranty Registration & Activation**:
   - Commissioning triggers activation of `ServiceWarranty` (`status: ACTIVE`, 12-month coverage, 500,000 max cycles).
4. **Step 4: Field Breakdown & Service Request**:
   - Customer logs breakdown (`ServiceRequest` with `warrantyClaim: true`, priority `HIGH`).
   - Dispatch technician for on-site repair (`ServiceVisit` recording labor hours and parts replaced).
5. **Step 5: Warranty Claim Adjudication & Settlement**:
   - Submit `ServiceWarrantyClaim` against active warranty.
   - Warranty manager reviews coverage and approves claim (`status: APPROVED`, approved amount recorded).
   - Service request marked `RESOLVED` and closed.
6. **Step 6: Digital Thread Traceability**:
   - Query project service chain (`GET /api/service/projects/:id/lineage` or cross-domain thread) confirming contiguous trace from Project $\to$ Dispatch $\to$ Installation $\to$ Warranty $\to$ Claim.
7. **Step 7: Multi-Tenant Isolation**:
   - Unauthorized Tenant B receives HTTP 404 across all service endpoints.

---

### 5. Recommended M5 Sprint Execution Plan

- **Sprint 1: Backend Service Engine & Quality Lifecycle (Dispatch, Installation, Warranty Gate, Claim Adjudication)**
  - Enhance `DispatchService` with milestone transitions (`pack`, `ship`, `deliver`).
  - Enhance `ServiceInstallationService` with commissioning sign-off and automated warranty creation.
  - Enhance `ServiceWarrantyService` and `WarrantyClaimService` with coverage validation and claim adjudication.
  - Create dedicated E2E test suite `test/m5-service-lifecycle.e2e-spec.ts` for Golden Scenario G10.
- **Sprint 2: Frontend Customer Service Experience & Project Digital Thread Navigation**
  - Upgrade `DispatchPage.tsx` with full interactive dispatch creation, carrier tracking, and status transition workflows.
  - Upgrade `ServicePage.tsx` with Installation management tab, Warranty health monitor, Claim adjudication modal, and spare parts logger.
  - Add Project Service Lineage component to Project Details / Service view.
  - Full regression verification across M1–M5 (12+ E2E suites).

---

### 6. Audit Verdict

Milestone M4 is completely certified and pushed. The codebase is clean, well-architected, and ready for **M5 Service & Customer Lifecycle Governance** execution upon authorization.
