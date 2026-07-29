# Traceability Model

## Purpose

This document defines the end-to-end traceability framework for MITRA. Every entity across all domains must be traceable back to its originating project and the engineering decisions that produced it.

---

## Traceability Chain

The complete traceability chain flows through the project lifecycle:

```
Customer Inquiry ──> RFQ ──> Quotation ──> Project ──> Design ──> BOM ──> Process Plan
                      │                      │            │         │          │
                      │                      │            │         │          ▼
                      │                      │            │         │    Manufacturing
                      │                      │            │         │         │
                      │                      │            │         │         ▼
                      │                      │            │         │    Work Order
                      │                      │            │         │         │
                      │                      │            │         │         ▼
                      │                      │            │         │    Production
                      │                      │            │         │         │
                      │                      │            │         ▼         │
                      │                      │            │    Inspection ◄──┘
                      │                      │            │         │
                      │                      │            │         ▼
                      │                      │            │    NCR / CAPA
                      │                      │            │
                      ▼                      ▼            ▼
                  Dispatch ◄─────────── Service ◄─── Delivery
                      │
                      ▼
              Installation / Maintenance
```

Every arrow represents a **traceable link** — you can navigate from any entity backward to its origin project and forward to its downstream effects.

---

## Traceability Mechanisms

### 1. Project Identifier Propagation

Every entity across every domain carries a `projectId` field. This is the universal traceability key.

```
Table: engineering_designs
  id                UUID PRIMARY KEY
  project_id        UUID NOT NULL       -- traces to project
  revision_number   INT
  cad_file_ref      TEXT
  created_by        UUID
  created_at        TIMESTAMP
```

### 2. Entity Lineage

Each domain entity additionally stores references to its immediate parents:

| Entity | Parent Reference | Traces Back To |
|--------|-----------------|----------------|
| Design | projectId | Project |
| DrawingRevision | designId | Design → Project |
| BOMItem | bomId, designId | BOM → Design → Project |
| WorkOrder | bomItemId, projectId | BOMItem → BOM → Design → Project |
| InspectionResult | workOrderId, projectId | WorkOrder → BOM → Design → Project |
| NCR | inspectionResultId, projectId | InspectionResult → WorkOrder → ... |

### 3. Engineering Decision Log

Every operation that changes engineering data records a decision entry:

```
Table: engineering_decisions
  id                UUID PRIMARY KEY
  project_id        UUID NOT NULL
  entity_type       TEXT              -- e.g., 'design', 'bom_item', 'process_plan'
  entity_id         UUID NOT NULL
  decision          TEXT              -- description of what was decided
  rationale         TEXT              -- why the decision was made
  previous_value    JSONB             -- snapshot before change
  new_value         JSONB             -- snapshot after change
  changed_by        UUID NOT NULL
  changed_at        TIMESTAMP NOT NULL
  approved_by       UUID              -- if human approval was required
```

### 4. Audit Log

All domain operations are recorded in the central audit log:

```
Table: audit_log
  id                UUID PRIMARY KEY
  project_id        UUID
  domain            TEXT              -- which bounded context
  entity_type       TEXT
  entity_id         UUID
  action            TEXT              -- CREATE, UPDATE, DELETE, APPROVE, REJECT
  actor_id          UUID NOT NULL
  timestamp         TIMESTAMP NOT NULL
  metadata          JSONB             -- request context, IP, user-agent
  previous_state    JSONB
  new_state         JSONB
```

---

## Traceability Queries

### Find all entities related to a project

```sql
-- Across all domains, find everything linked to Project X
SELECT 'engineering.designs' AS source, id, 'design' AS entity_type
FROM engineering.designs WHERE project_id = :projectId
UNION ALL
SELECT 'manufacturing.work_orders', id, 'work_order'
FROM manufacturing.work_orders WHERE project_id = :projectId
UNION ALL
SELECT 'quality.ncrs', id, 'ncr'
FROM quality.ncrs WHERE project_id = :projectId
-- ... repeat for all domain tables
```

### Trace an NCR back to its root cause

```sql
-- Given an NCR ID, trace back through the chain
SELECT ncr.*, ir.*, wo.*, bi.*, d.*, p.*
FROM quality.ncrs ncr
JOIN quality.inspection_results ir ON ir.id = ncr.inspection_result_id
JOIN manufacturing.work_orders wo ON wo.id = ir.work_order_id
JOIN engineering.bom_items bi ON bi.id = wo.bom_item_id
JOIN engineering.designs d ON d.id = bi.design_id
JOIN project.projects p ON p.id = d.project_id
WHERE ncr.id = :ncrId;
```

---

## Design Principles for Traceability

1. **Immutability.** Once recorded, traceability data is append-only. Corrections add new entries; they never mutate existing ones.
2. **Completeness.** Every domain entity must include `projectId` and `created_at`. No entity exists without a project association.
3. **Chain integrity.** Parent references must always point to valid existing entities. Orphaned references are not permitted.
4. **Temporal accuracy.** All timestamps use UTC. The `created_at` field on every entity serves as the authoritative time of record.
5. **Cross-domain navigation.** The Knowledge Domain's graph model enables graph-based traceability queries (e.g., "find all entities influenced by Engineering Change X").
