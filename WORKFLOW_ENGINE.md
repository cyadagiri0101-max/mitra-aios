# Workflow Engine

## Purpose

MITRA's workflow engine governs every stateful business object in the
platform. It provides the state machine, transition guards, history,
and cross-domain orchestration used by the commercial, project,
engineering, manufacturing, quality, and service domains.

## Architecture

The workflow engine is split into three cooperating parts:

1. **Workflow states** — the states a domain object can occupy
   (`workflow_states`).
2. **Workflow transitions** — the allowed moves between states
   (`workflow_transitions`), each with guards and effects.
3. **Workflow instances** — the live state of one entity
   (`workflow_instances`), with transition history.

```
Entity (RFQ, Quotation, Project, ...)
   │  status / workflow_instances.row
   ▼
WorkflowService.executeTransition(entityType, entityId, action, context)
   │
   ├─ validate against workflow_transitions (guards)
   ├─ write workflow_instances (version-checked)
   ├─ write audit log + notification queue (same transaction)
   └─ publish lifecycle events (post-commit, best-effort)
```

## State Machine Pattern

Every workflow defines:

- **States**: e.g. `DRAFT → SUBMITTED → APPROVED → SENT → ACCEPTED`.
- **Transitions**: pairs of `(from, action) → to` with guard predicates.
- **Guards**: conditions that must hold for a transition (permission,
  actor role, business rule). See guard examples below.
- **Effects**: side effects that run when the transition commits.

### Guard Examples

| Domain | Transition | Guard |
|---|---|---|
| RFQ | `SUBMIT` | actor has `commercial:rfq:submit` permission |
| RFQ | `APPROVE` | actor has approval role; RFQ is `SUBMITTED`; no prior approve |
| Quotation | `ACCEPT` | quotation is `SENT`; customer active; not already accepted |
| Project | `START` | quotation accepted; project number unique |

### Effect Examples

| Transition | Effect |
|---|---|
| RFQ `APPROVE` | notification to owner; RFQ revision snapshot |
| Quotation `ACCEPT` | project created (via QuotationAcceptanceService); enquiry → CONVERTED |
| Quotation `SEND` | notification to customer channel |

## Domain State Machines

### 1. RFQ

```
DRAFT → SUBMITTED → APPROVED → (quotation created)
   ↘ REJECTED        ↗ (revise → DRAFT)
```

### 2. Quotation

```
DRAFT → (items priced) → SENT → ACCEPTED → (project created)
                            ↘ REJECTED
                            ↘ REVISED → DRAFT (new revision)
```

### 3. Project

v3.3 (Sprint 2.2) — DB-driven `project_management` workflow (ADR-009):

```
DRAFT → KICKOFF → DESIGN → PLANNING → EXECUTION → MONITORING → CLOSING → COMPLETED
                                                                    ↘ ARCHIVED
```

- The workflow row is the single source of truth; the project `stage` and
  `status` columns are synced from it by `ProjectWorkflowService`.
- Transitions are executed through
  `POST /project/:id/workflow/transition` (permission
  `project:transition`) and recorded in workflow history + `project_activity_log`.
- Pre-v3.3 the project stage was a coarse enum mutated by generic updates;
  that path is gone — generic PATCH never touches `stage`/`status`.

### 4. Design

```
UPLOADED → UNDER_REVIEW → APPROVED
              ↘ REJECTED → UPLOADED (revision)
```

### 5. BOM

```
DRAFT → VALIDATED → RELEASED → (work orders)
```

### 6. Work Order

```
CREATED → SCHEDULED → IN_PROGRESS → COMPLETED
              ↘ CANCELLED
```

### 7. NCR

```
OPENED → INVESTIGATING → DISPOSITIONED → CLOSED
```

### 8. CAPA

```
RAISED → ANALYZING → ACTION_PLANNED → IMPLEMENTED → VERIFIED → CLOSED
```

### 9. Service Request

```
LOGGED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
```

## Cross-Domain Workflows

### Quote-to-Project

```
Enquiry → RFQ → Quotation → Acceptance → Project
   CONVERTED   SUBMITTED   SENT/ACCEPTED   ACTIVE
```

### Design-to-Manufacturing

```
Design Approved → BOM Released → Work Orders → Production
```

### Issue-to-Closure

```
NCR/CAPA → Investigation → Disposition → Verification → Closure
```

## State Transition History

Every state transition is recorded:

```sql
state_transitions (
  id              UUID PRIMARY KEY,
  domain          VARCHAR(50),
  entity_type     VARCHAR(50),
  entity_id       UUID,
  from_state      VARCHAR(50),
  to_state        VARCHAR(50),
  action          VARCHAR(50),
  actor_id        UUID,
  reason          TEXT,
  metadata        JSONB,
  timestamp       TIMESTAMP DEFAULT NOW()
);
```

This table enables:
- Full state history for any entity.
- Time-in-state analysis for bottlenecks.
- Audit of who changed what and why.
- Replay of entity lifecycle for traceability.

---

## v3.2.1 Addendum — Transactional Workflow Execution

Sprint 2.1.1 hardened the execution model described above:

### 1. Atomic transitions (ADR-001 / ADR-006)

Every mutating workflow operation now runs inside a single database
transaction:

```
executeTransition
└─ dataSource.transaction(async (em) => {
     state save (guarded by the state machine)
     workflow instance update (version-checked, ADR-002)
     audit log write (mandatory, same transaction)
     notification enqueue (same transaction)
   })
   └─ post-commit (best-effort): AI sync / integrations
```

- Repository methods accept an optional EntityManager and join the caller's
  transaction when provided.
- A transition can never commit without its audit record; a failed audit or
  queue write rolls the whole transition back.

### 2. Guarded transitions (C-1/C-2 remediation)

- `status` is no longer accepted by generic update DTOs.
- RFQ/Quotation state changes only via state-machine methods; duplicate
  accept/approve returns 400.

### 3. Optimistic locking (ADR-002)

- `workflow_instances.version` (`@VersionColumn`) — stale writers get
  `OptimisticLockVersionMismatchError` → HTTP 409.

### 4. Orchestrated acceptance (ADR-004)

- `QuotationAcceptanceService` runs accept → project create → link as a
  coordinated flow; the project exists only when acceptance commits.

### Verification (v3.2.1)

- Rollback tests: `rfq.service.spec.ts` (audit/queue failure aborts
  transition, no notification emitted).
- Structural migration test: `src/test/migration-0014.spec.ts`.
- e2e: `test/commercial.e2e-spec.ts` (17-test lifecycle incl. duplicate
  accept → 400, 401, pagination).

## v3.3 Addendum — DB-driven Project Management lifecycle (Sprint 2.2)

- The `project_management` workflow (states `DRAFT → KICKOFF → DESIGN →
  PLANNING → EXECUTION → MONITORING → CLOSING → COMPLETED → ARCHIVED`, 8
  transitions) is seeded by migration 0015 (fixed UUIDs) and `seed.ts`
  (lookup by `stateCode` + `workflowType`).
- `ProjectWorkflowService` uses the same transactional execution contract:
  workflow instance version bump, state change, audit, and activity log
  commit in one transaction; AI sync best-effort post-commit.
- `ProjectFactoryService` creates the workflow instance at project creation
  (entity type `project`); `findTransitionsForState` drives the
  `availableTransitions` list exposed on the project detail route.
- Guarded transitions: executing an unknown/illegal transition is rejected;
  only seeded transitions are executable.
- Verification: `project-workflow.service.spec.ts` (8 tests) covers
  permission-filtered transitions, lazy instance init, stage/status sync, and
  COMPLETED setting `actualEndDate`.

### References

- `docs/architecture/ADR-001-transactional-workflow-consistency.md`
- `docs/architecture/ADR-002-optimistic-locking.md`
- `docs/architecture/ADR-006-workflow-transaction-architecture.md`
- `docs/architecture/ADR-009-project-management-domain.md`
- `docs/architecture/WORKFLOW_ARCHITECTURE.md`
