# Engineering Traceability — MITRA v3.4 (Sprint 2.3.0)

> **Status:** Approved baseline.
> **Related:** `docs/engineering/Engineering_Gap_Analysis.md` (§6 integration gaps), `docs/engineering/ENGINEERING_DOMAIN_MODEL.md` (§5 events, §8 invariants), root `TRACEABILITY_MODEL.md` (existing framework).

---

## 1. Objective

Every engineering artifact must be traceable along the complete mold lifecycle:

```
Customer ──► RFQ ──► Quotation ──► Project ──► Drawing ──► DrawingRevision ──► BOM
                                                                               │
                                 Service ◄── Dispatch ◄── Trial ◄── Inspection ◄──┴──► ProcessPlan
                                   ▲                                                      │
                                   └───────────────── Manufacturing Order ◄───────────────┘
```

Navigation must work **both directions** at every node (upstream origin, downstream effect), per the Constitution ("Every entity traces back to its originating project and engineering decisions").

---

## 2. Current State vs Target State

### 2.1 Already working

- **Project anchor:** every engineering aggregate carries `projectId` (NOT NULL, indexed).
- **Commercial → Project:** `quotations.project_id` set by `QuotationService.linkProject` / `ProjectFactoryService.createFromQuotation`; `invoices.project_id`.
- **Engineering internal links:** drawing→bom (`boms.drawingId`), bomItem→drawing/material/component, routing→drawing/bom, ECR→drawing/bom/routing/workOrder, review→entity (polymorphic), document→drawing/bom.
- **Query services:** `EngineeringTraceabilityService.byProject(projectId)` (aggregates drawings, BOMs, routings, reviews, documents, changes + raw-SQL reads of work_orders and trial_observations), `byEntity(entityType, entityId)` (upstream/downstream map).
- **Project-level chain:** RFQ → Quotation → Project (existing), Project → mold_project workflow stages → Dispatch → Service (project stage machine).

### 2.2 Gaps (must close in Sprint 2.3.1 — Gap G-1)

| Node | Current link to engineering | Target link |
|---|---|---|
| Manufacturing Order (`work_orders`) | `part_id` + `drawing_revision` **string** | `drawing_id`, `bom_id`, `bom_item_id`, `routing_id`, `process_plan_id` (FK-style UUID + index) |
| Job card (`job_cards`) | `work_order_id`, `operation_id` (legacy ops table) | `routing_operation_id` → `engineering_operations.id` |
| Inspection (`inspection_reports`) | `project_id`, `work_order_id` | `part_id`, `drawing_id`, `bom_item_id` |
| Trial (`trial_observations`) | `project_id` | `part_id`, `drawing_id`, `routing_id`, `work_order_id` |
| Retrial (`retrials`) | `project_id`, `original_trial_id` | `drawing_id`, `routing_id` (change context) |
| CAPA (`capa_verifications`) | `project_id`, `trial_id` | `change_id` (optional ECR link) |
| Dispatch (`dispatch_plans`) | `project_id` | typed `packing_list` entries referencing BOM items / serialized molds |
| Service (`service_reports.parts_replaced`) | jsonb `[{partId, partName, qty}]` | optional typed `drawing_id` / `component_id` per entry |
| ECR | `drawing_id`, `bom_id`, `routing_id`, `work_order_id` | + `part_id`, `material_id`, `component_id`; **link validation on create/update** |

---

## 3. Traceability Link Model

### 3.1 Link types

| Kind | Direction | Example |
|---|---|---|
| `ORIGIN` | upstream | Drawing ← Project |
| `REVISION` | upstream | DrawingRevision ← Drawing |
| `COMPOSES` | upstream | BOMItem ← BOM |
| `REFERENCE` | lateral | BOMItem → Drawing / Material / Component |
| `RELEASES` | downstream | ProcessPlan ← Drawing, BOM |
| `EXECUTES` | downstream | WorkOrder ← Routing/ProcessPlan |
| `VERIFIES` | downstream | Inspection ← WorkOrder; Trial ← Drawing/ProcessPlan |
| `CHANGES` | lateral | ECR → affected Drawing/BOM/Routing/WO |
| `SHIPS` | downstream | Dispatch ← Project (mold) |
| `SERVES` | downstream | Service ← Dispatch/Project |

### 3.2 Storage strategy

**Decision:** explicit FK-style columns on domain tables (existing convention), **not** a general-purpose link table. Rationale:

- Every downstream module already queries by these keys (work order lists by project; inspection by work order).
- Avoids a second navigation hop and preserves existing raw-SQL aggregation.
- Integrity checks (below) enforce link validity without global triggers.

A derived read model (`engineering_trace_edges`, see §5) is maintained by the event relay for graph-style queries and future Knowledge Graph sync — it is a **projection**, never the source of truth.

### 3.3 Link invariants

| # | Rule |
|---|---|
| T-1 | `work_orders.drawing_id` must reference a drawing whose latest revision state is RELEASED (enforced at WO creation; existing WOs keep `drawing_revision` string as display). |
| T-2 | `work_orders.bom_item_id` must reference an item of a BOM whose state is RELEASED (or superseded revision, with `effectiveTo` respected from 2.3.1). |
| T-3 | `trial_observations.drawing_id`/`routing_id` refer to the design intent **at trial time** — a snapshot reference (store the revision letter alongside: `drawing_revision` varchar + `drawing_id`). |
| T-4 | `inspection_reports` may carry `bom_item_id` only if the BOM revision was released at inspection date (point-in-time check from 2.3.1). |
| T-5 | ECR link columns must be validated on create/update: if `drawingId` is set it must exist and belong to `projectId`; same for bom/routing/workOrder. |
| T-6 | No link column may reference a soft-deleted (`deletedAt`) record; traceability integrity report flags violations. |
| T-7 | Changes must be recorded against the artifact's **current effective revision** at the time of the change (`effectiveDate` of ECN governs). |

---

## 4. Traceability API (target)

Extends the existing `EngineeringTraceabilityService` (read-only; permissions `engineering:traceability:read`):

### 4.1 `GET /api/engineering/traceability/project/:projectId`

Returns the full lineage graph for a project:

```jsonc
{
  "project": { "id": "…", "projectNumber": "PRJ-2026-0001", "stage": "MANUFACTURING" },
  "upstream": { "customerId": "…", "rfqNumber": "RFQ-…", "quotationNumber": "QT-…" },
  "artifacts": {
    "drawings":  [ { "id", "drawingNumber", "status", "currentRevision" } ],
    "boms":      [ { "id", "bomNumber", "status", "revision" } ],
    "routings":  [ { "id", "routingNumber", "status" } ],
    "documents": [ … ], "reviews": [ … ], "changes": [ … ]
  },
  "downstream": {
    "workOrders":   [ { "id", "woNumber", "drawingId", "bomId", "bomItemId", "routingId" } ],
    "trials":       [ { "id", "trialNumber", "drawingId", "result" } ],
    "inspections":  [ { "id", "reportNumber", "workOrderId", "drawingId" } ],
    "dispatches":   [ { "id", "dispatchNumber", "status" } ],
    "service":      [ { "id", "srNumber", "status" } ]
  }
}
```

### 4.2 `GET /api/engineering/traceability/entity?entityType=drawing&entityId=…&direction=both&depth=3`

Generic lineage walk (existing `byEntity` upgraded with depth limit + direction filter + optional `asOf` date for effective-dated artifacts).

### 4.3 `GET /api/engineering/traceability/impact/:ecrId`

Change impact view: ECR → affected artifacts → downstream WOs/trials/inspections (feeds Sprint 2.3.3 `ImpactAnalysisService`; baseline version lists linked artifacts).

### 4.4 `GET /api/engineering/traceability/integrity`

ADMIN/MANAGEMENT report: orphaned links, non-released references, cross-tenant anomalies. Runs the §3.3 checks.

---

## 5. Derived Traceability Read Model (`engineering_trace_edges`)

Introduced in Sprint 2.3.1 (migration 0018) and maintained by `EngineeringEventRelay` from outbox events:

```
engineering_trace_edges
  id uuid PK
  tenant_id uuid
  project_id uuid NOT NULL (indexed)
  source_type varchar(50)   -- drawing|bom_item|routing|work_order|trial|inspection|...
  source_id  uuid NOT NULL
  target_type varchar(50)
  target_id  uuid NOT NULL
  link_kind   varchar(20)   -- ORIGIN|REVISION|COMPOSES|REFERENCE|RELEASES|EXECUTES|VERIFIES|CHANGES|SHIPS|SERVES
  as_of_date  date          -- effective-dated edges (null = always)
  metadata    jsonb
  created_at  timestamptz
UNIQUE (source_type, source_id, target_type, target_id, link_kind, as_of_date)
```

- Populated post-commit by event subscribers (drawing released → edge to WOs; ECR approved → CHANGES edges).
- Enables graph-style queries and is the **seeding contract** for the future Knowledge Graph synchronization hook (`KNOWLEDGE_GRAPH_UPDATE`).
- Backfilled for existing data by a one-time job in migration 0018.

---

## 6. Traceability Event Contract

The following events (published post-commit, persisted via outbox from 2.3.1) keep downstream and the read model synchronized:

| Event | Edge effect |
|---|---|
| `DRAWING_RELEASED` (wire in 2.3.1) | RELEASES edge → BOM; enables WO creation |
| `BOM_RELEASED` | RELEASES edge → routings; downstream WOs eligible |
| `BOM_ITEM_CHANGED` | invalidates point-in-time selections; re-emit `BOM_SUBSTITUTION_APPLIED` |
| `CHANGE_NOTICE_ISSUED` / `CHANGE_RELEASED` | CHANGES edges to affected artifacts + effective-date metadata |
| `ROUTING_RELEASED` | RELEASES edge → manufacturing planning |
| `work_order.created` (manufacturing, Sprint 2.4) | EXECUTES edges drawn from artifact links |

**Consumers must be optional and isolated** (existing bus contract). No consumer failure can roll back engineering operations.

---

## 7. Traceability Integrity & Governance

1. **Write-time validation** (T-1..T-7) in the producing domain services.
2. **Nightly integrity job** (`engineering.traceability.integrity`) — SQL report of violations; ADMIN dashboard widget; audit-logged.
3. **Append-only decision log** — `audit_logs` (BUSINESS events) captures every change with before/after state (existing mechanism; no new table required — per root `TRACEABILITY_MODEL.md` the decision log concept is satisfied by audit + revision snapshots).
4. **Temporal accuracy** — all effective-date fields UTC; `as_of_date` uses project business date.
5. **No orphan creation** — the `ProjectScopeDto` guard (required `projectId`) plus link validation ensure chain integrity from creation.

---

## 8. Mapping to the Required Chain

| Chain segment | Mechanism |
|---|---|
| Customer → RFQ | `customers` → `rfqs.customer_id` (existing) |
| RFQ → Quotation | `quotations.rfq_id` (existing) |
| Quotation → Project | `quotations.project_id` + `ProjectFactoryService` (existing) |
| Project → Drawing | `engineering_drawings.projectId` (existing) |
| Drawing → Revision | `engineering_drawing_revisions.drawingId` (existing) |
| Revision → BOM | `engineering_boms.drawingId` (+ revision letter on BOM header) |
| BOM → ProcessPlan | `engineering_routings.bomId` (existing) |
| ProcessPlan → MO | `work_orders.routingId` (+ `processPlanId`) — **Gap G-1, Sprint 2.3.1** |
| MO → Inspection | `inspection_reports.workOrderId` (existing) + `drawingId`/`bomItemId` (new) |
| MO → Trial | `trial_observations.workOrderId`/`drawingId`/`routingId` — **new** |
| Trial → Dispatch | project stage machine + `dispatch_plans.projectId` + `customer_id` (new) |
| Dispatch → Service | `service_requests.projectId` + `moldId` (existing) |
