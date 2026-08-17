# MITRA v4.2 — DISCOVERY & QUALITY EXECUTION DESIGN REPORT

**Document Version:** 1.0.0  
**Baseline Release:** MITRA v4.1.2 (`9ea69ad9284e345a84d08408596cf673d7624dc3`) — **FROZEN**  
**Target Milestone:** MITRA v4.2  
**Auditor / Architect:** Antigravity AI  
**Status:** **DISCOVERY COMPLETE — READY FOR REVIEW & AUTHORIZATION**

---

## 1. BASELINE & REPOSITORY INTEGRITY

```text
Active Branch:        v3.3
HEAD Commit:          9ea69ad9284e345a84d08408596cf673d7624dc3
v4.1.2 Tag / Commit:  9ea69ad9284e345a84d08408596cf673d7624dc3 (tag: v4.1.2)
v4.1.1 Parent Commit: 8b4346a252f427c37928fa247557395d14ad52db (tag: v4.1.1 — UNCHANGED)
v4.1.0 Baseline:      e190362a939ff5b44f27b5c4efe9c19223f23bdd (tag: v4.1.0 — UNCHANGED)
Working Tree:         CLEAN (0 uncommitted changes, 0 untracked files)
Ancestry:             v4.1.2 is verified direct ancestor of development work (True)
```

---

## 2. AUDIT OF EXISTING QUALITY & MANUFACTURING CAPABILITIES

### 2.1 Database Schema State
The existing PostgreSQL schema (`mitra_v2`) contains deep, relational support for the entire quality lifecycle:

| Table | Structure / Key Columns | Existing Capabilities | Discovered Gaps in v4.1.2 |
|---|---|---|---|
| **`inspection_plans`** | `id`, `tenant_id`, `plan_number`, `project_id`, `drawing_id`, `bom_id`, `routing_id`, `work_order_id`, `job_card_id`, `inspection_type` (`INCOMING`, `IN_PROCESS`, `FINAL`, etc.), `characteristics` (`jsonb`), `dimensions` (`jsonb`), `tolerances` (`jsonb`), `acceptance_criteria` (`jsonb`). | Complete schema supporting nominal dimensions, upper/lower tolerances, and sample plans. | 0 seeded rows in demo database; lacks automated dimension generation from CAD/drawing metadata. |
| **`inspection_reports`** | `id`, `tenant_id`, `report_number`, `project_id`, `work_order_id`, `inspection_type` (`IN_PROCESS`, `DIMENSIONAL`, etc.), `sample_size`, `accepted_qty`, `rejected_qty`, `overall_result` (`PASS`, `FAIL`, `PENDING`), `defects_found` (`jsonb`), `disposition`, `drawing_id`, `bom_item_id`, `routing_id`. | Complete report table tracking measured values, defects, and pass/fail disposition. | 0 seeded rows; needs automatic NCR generation trigger when `overall_result = 'FAIL'`. |
| **`quality_control_plans`** | `id`, `tenant_id`, `plan_number`, `project_id`, `drawing_id`, `bom_id`, `routing_id`, `work_order_id`, `job_card_id`, `operation_mapping` (`jsonb`), `inspection_mapping` (`jsonb`), `reaction_plan` (`text`). | Full control plan mapping operations to inspection requirements and reaction protocols. | 0 seeded rows in baseline demo database. |
| **`ncr_records`** | `id`, `tenant_id`, `ncr_number`, `project_id`, `work_order_id`, `operation_id`, `job_card_id`, `inspection_report_id`, `drawing_id`, `bom_item_id`, `severity` (`MINOR`, `MAJOR`, `CRITICAL`), `status` (`OPEN`, `INVESTIGATION`, `ACTION`, `VERIFIED`, `CLOSED`), `disposition` (`USE_AS_IS`, `REWORK`, `SCRAP`, `RETURN`, `REJECT`), `root_cause`. | 1 canonical demo record (`NCR-MSWQGII5-69`) fully linked to canonical Project `PRJ-2026-0002` and Work Order `WO-MSWQGIF0-78`. State transitions guarded in service. | Status is currently `OPEN`; needs closed-loop disposition workflow to CAPA. |
| **`capa_verifications`** | `id`, `tenant_id`, `capa_number`, `project_id`, `ncr_id`, `capa_type`, `problem_description`, `root_cause`, `corrective_action`, `preventive_action`, `status` (`OPEN`, `IN_PROGRESS`, `IMPLEMENTED`, `VERIFIED`, `CLOSED`), `effectiveness_confirmed`. | Full 8D-style CAPA tracking linked to NCRs, work orders, and engineering drawings. | 0 seeded rows in baseline demo database. |
| **`job_cards` & `operation_logs`** | `id`, `job_card_number`, `work_order_id`, `operation_id`, `status` (`PENDING`, `IN_PROGRESS`, `ON_HOLD`, `COMPLETED`), `qty_produced`, `qty_rejected`, `started_at`, `completed_at`. | Full execution tracking with `startJob`, `logProduction`, and `transitionJob` state machine in `ShopFloorService`. | 3 canonical job cards in `OPEN` status; can be executed in real-time. |

---

## 3. GAP ANALYSIS MATRIX

| Domain / Feature | Database Support | API Support | Frontend UI Support | Test Coverage | Traceability Anchors | Remaining Gap |
|---|---|---|---|---|---|---|
| **Inspection Planning** | ✅ Full (`jsonb` characteristics & tolerances) | ✅ `GET/POST/PATCH /quality/inspection-plans` | ✅ `QualityPage` Plans tab | ✅ 7 unit test suites (45 tests passing) | `project_id`, `drawing_id`, `routing_id`, `job_card_id` | Need seeded canonical in-process inspection plan for `PRJ-2026-0002` and dedicated measurement entry UI. |
| **In-Process Dimensional Measurement** | ✅ `inspection_reports` with `defects_found` & `overall_result` | ⚠️ Backend service exists; needs dedicated checkpoint measurement logging endpoint | ⚠️ Raw table display on `QualityPage`; needs interactive dimension checklist | ⚠️ Covered in base tests | `work_order_id`, `bom_item_id`, `drawing_id` | Need dedicated `POST /quality/inspection-reports` endpoint with dimension tolerance validation (Pass/Fail). |
| **Closed-Loop NCR → CAPA Transition** | ✅ `ncr_records` + `capa_verifications` with `ncr_id` foreign key | ✅ `PATCH /quality/ncr/:id/transition` & `POST /capa` | ✅ Dedicated `CapaPage.tsx` and NCR tab | ✅ Verified state machine | `ncr_id`, `project_id`, `work_order_id` | Need automated workflow action: When NCR disposition is `REWORK` or `SCRAP` with severity `MAJOR`/`CRITICAL`, auto-link/promote to CAPA. |
| **Job Card Execution** | ✅ `job_cards` + `operation_logs` | ✅ `POST /manufacturing/job-cards/:id/start`, `:id/production`, `:id/transition` | ✅ `ManufacturingPage.tsx` | ✅ `shop-floor.service.spec.ts` | `work_order_id`, `operation_id`, `machine_id`, `operator_id` | Frontend UI action buttons for operator execution clocking. |

---

## 4. MINIMAL SCHEMA, API & UI DESIGN FOR INCREMENT 1

### 4.1 Schema Assessment: **ZERO BREAKING CHANGES**
- **Existing Schema Sufficiency:** The existing `inspection_plans`, `inspection_reports`, `ncr_records`, and `capa_verifications` tables already contain all required relational columns (`project_id`, `drawing_id`, `bom_id`, `routing_id`, `work_order_id`, `job_card_id`, `characteristics`, `dimensions`, `tolerances`).
- **Verdict:** **NO SCHEMA MIGRATION REQUIRED.** All Increment 1 capabilities will reuse existing tables with strict tenant isolation.

### 4.2 API Contract Design
1. **Create In-Process Inspection Plan:**
   - `POST /api/quality/inspection-plans`
   - Payload:
     ```json
     {
       "planNumber": "IP-2026-0001",
       "title": "Cavity Insert CNC Machining In-Process Inspection",
       "projectId": "1ca60868-3292-4ecd-ae6c-a893548929b2",
       "drawingId": "...",
       "bomId": "...",
       "routingId": "...",
       "inspectionType": "IN_PROCESS",
       "dimensions": [
         { "char": "Cavity Depth", "nominal": 45.00, "lowerTol": -0.02, "upperTol": 0.02, "unit": "mm", "instrument": "Digital Depth Micrometer" },
         { "char": "Neck Ring Diameter", "nominal": 28.00, "lowerTol": -0.01, "upperTol": 0.01, "unit": "mm", "instrument": "Bore Gauge" },
         { "char": "Parting Line Flatness", "nominal": 0.00, "lowerTol": 0.00, "upperTol": 0.015, "unit": "mm", "instrument": "Dial Indicator" }
       ]
     }
     ```
2. **Submit Measured Inspection Report (with Automated Pass/Fail):**
   - `POST /api/quality/inspection-reports`
   - Validates actual measurements against upper/lower tolerances.
   - If any measurement exceeds tolerance: sets `overall_result = 'FAIL'` and automatically attaches defect metadata.

---

## 5. TEST MATRIX & VERIFICATION PLAN

| Test Category | Target Component / Workflow | Verification Method |
|---|---|---|
| **Unit Tests** | `InspectionPlanService`, `NcrService`, `CapaService` | Jest unit test suites verifying tolerance checking, state transitions, and outbox event dispatch. |
| **RBAC / Tenant Isolation** | Roles: `QUALITY`, `PRODUCTION`, `ADMIN` across distinct tenants | Supertest suites asserting HTTP 403 when accessing cross-tenant inspection records. |
| **State Machine Integrity** | NCR transitions: `OPEN` → `INVESTIGATION` → `ACTION` → `VERIFIED` → `CLOSED` | Jest transition test asserting rejection of illegal state jumps. |
| **Frontend Production Build** | Vite build & TypeScript check | `npx tsc --noEmit` & `npm run build` in `mitra-frontend` (0 errors). |
| **Backend Production Build** | NestJS build & TypeScript check | `npx tsc --noEmit` & `npm run build` in `mitra-backend` (0 errors). |
| **Real Browser Verification** | Microsoft Edge CDP walkthrough | Login → Navigate to `/quality` → Inspect Inspection Plan `IP-2026-0001` → View Characteristics/Tolerances → Verify NCR link. |

---

## 6. ACCEPTANCE CRITERIA FOR INCREMENT 1

1. **Deterministic Quality Trace:** Inspection plan `IP-2026-0001` is strictly linked to canonical Project `PRJ-2026-0002`, Drawing `DRW-2026-0001`, and Work Order `WO-MSWQGIF0-78`.
2. **Tolerance Validation:** Dimensions have explicit nominal, lower, and upper bounds in engineering units (`mm`).
3. **Fail-Closed Security:** Tenant isolation enforced via authenticated JWT context; zero client-supplied `tenant_id` accepted.
4. **v4.1.2 Frozen Lineage:** `v4.1.2` (`9ea69ad9284e345a84d08408596cf673d7624dc3`) remains untouched as the immutable ancestor.
5. **No Regressions:** 100% pass across all 103 backend test suites and live browser gates.
