# Engineering Change Architecture — MITRA v3.4 (Sprint 2.3.0)

> **Status:** Approved baseline.
> **Related:** `docs/engineering/ENGINEERING_DOMAIN_MODEL.md` (§3.5 Change aggregate), `docs/engineering/ENGINEERING_TRACEABILITY.md` (impact view), `WORKFLOW_ENGINE.md` (seeded `engineering_change` graph).

---

## 1. Scope

Engineering Change is the controlled mechanism by which **released** engineering data (drawings, BOMs, routings, materials, components) is modified. It defines the ECR → ECO → ECN lifecycle with:

- Impact analysis
- Approval matrix
- Linked drawings / BOMs / process plans / projects
- Transactional, workflow-driven execution

---

## 2. Document Types

| Document | Purpose | Existing |
|---|---|---|
| **ECR** — Engineering Change Request | Captures the need for change: what, why, type, priority, cost/schedule impact | ✅ `engineering_change_requests` |
| **ECO** — Engineering Change Order | Authorized plan of implementation: tasks, dates, owner, verification | ✅ `engineering_change_orders` |
| **ECN** — Engineering Change Notice | Formal notification of an approved change: effective date, affected parties/MOs | ✅ `engineering_change_notices` |

Supporting records: `engineering_change_impacts`, `ecr_affected_parts`, `eco_implementations` (schema exists; implementation-tasks wiring is Sprint 2.3.1).

---

## 3. Lifecycle (DB-driven workflow)

Seeded graph `engineering_change` (migration 0017 / seed.ts):

```
 REQUEST ──► REVIEW ──► APPROVAL ──► IMPLEMENTATION ──► VERIFICATION ──► RELEASE (final)
   ▲           │ ▲          │ ▲                           │ ▲
   │           └─┼──────────┴─┼───────────────────────────┘ └── Rework Implementation
   │            └─ Reject     └─ Reject at Approval
   │         (REJECTED final) (REJECTED final)
```

| Transition | Guard | Approval gate |
|---|---|---|
| REQUEST → REVIEW (`Submit for Review`) | `engineering:change:update` | — |
| REVIEW → APPROVAL (`Proceed to Approval`) | `engineering:change:approve` | — |
| REVIEW → REJECTED (`Reject Change`) | `engineering:change:approve` | — |
| APPROVAL → IMPLEMENTATION (`Approve & Implement`) | `engineering:change:approve` | **requiresApproval=true, approvalRoles=[MANAGEMENT, DESIGN]** |
| APPROVAL → REJECTED (`Reject at Approval`) | `engineering:change:approve` | — |
| IMPLEMENTATION → VERIFICATION (`Request Verification`) | `engineering:change:implement` | — |
| VERIFICATION → RELEASE (`Release Change`) | `engineering:change:release` | — |
| VERIFICATION → IMPLEMENTATION (`Rework Implementation`) | `engineering:change:implement` | — |

Rules:
- The workflow instance is the single source of truth; `ECR.status` mirrors it via `STATUS_BY_STATE` (existing `EngineeringChangeService.transition`).
- `CHANGE_REQUESTED` on create, `CHANGE_APPROVED` post-commit on APPROVAL→IMPLEMENTATION, `CHANGE_NOTICE_ISSUED` on ECN issue, `CHANGE_RELEASED` on VERIFICATION→RELEASE (wire in 2.3.1).
- All transitions run in one `DataSource.transaction` with audit `logBusinessEvent` inside the tx (ADR-001/006).

---

## 4. Impact Analysis

### 4.1 Current state (exists)

- Manual impact records: `addImpact(ecrId, {impactType, entityId, entityNumber, severity, disposition, description})`.
- `ImpactType`: DRAWING / BOM / PROJECT / WORK_ORDER / ROUTING / MATERIAL / COMPONENT / DOCUMENT / OTHER.
- `ImpactSeverity`: LOW / MEDIUM / HIGH / CRITICAL.
- `ImpactDisposition`: RETAIN / REVISE / REPLACE / OBSOLETE.

### 4.2 Automated discovery (new — Gap G-11, Sprint 2.3.3)

`ImpactAnalysisService.analyze(ecrId)` performs a graph walk over traceability links (§ ENGINEERING_TRACEABILITY.md):

1. Seed set = ECR-linked artifacts (`drawingId`, `bomId`, `routingId`, `workOrderId`, `partId`, `materialId`, `componentId`).
2. Walk: drawing → BOM items referencing it → routings referencing drawing/BOM → released work orders executing those routings (via `engineering_trace_edges`).
3. Produce suggested impacts (`suggested: true`) with severity derived from disposition rules (e.g., drawing change with RELEASED BOM basis → HIGH).
4. User confirms/edits suggestions → they become impact records (`suggested: false`).

API: `POST /api/engineering-changes/ecr/:id/impact-analysis` (2.3.3).

---

## 5. Approval Matrix (new — Gap G-12, Sprint 2.3.3)

Until then: `requiresApproval` + `approvalRoles` on workflow transitions (already active).

Target: `engineering_approval_policies` (data-driven):

```
id, artifactType (DRAWING|BOM|ROUTING|CHANGE|DOCUMENT), transitionKey, requiredRoles [],
approvalOrder int, minApprovals int, allowDelegate bool, isActive, tenantId, deletedAt
UNIQUE (artifactType, transitionKey, approvalOrder)
```

- Evaluated by `ApprovalPolicyService` inside the workflow adapter before executing gated transitions.
- Default seeds mirror current behavior: drawing release & BOM release & change approval require ≥1 approval from [MANAGEMENT, DESIGN].
- No code changes required to adjust the matrix — seed/API maintenance only.

---

## 6. Linked Artifacts & Effect Rules

| Artifact | Link column (ECR) | Validation | Effect on release (VERIFICATION → RELEASE / ECN) |
|---|---|---|---|
| Project | `projectId` (required) | exists | none (project state machine untouched) |
| Drawing | `drawingId` | exists, belongs to project, not OBSOLETE | if disposition REVISE/REPLACE → new drawing revision enters `REVISION_REQUIRED → IN_DESIGN` cycle; on ECN effective date, prior revision superseded |
| BOM | `bomId` | exists, belongs to project | successor BOM revision created with `effectiveFrom = ECN.effectiveDate`; predecessor `effectiveTo = effectiveDate − 1 day` (§ BOM_ARCHITECTURE.md 5.3) |
| Routing | `routingId` | exists, belongs to project | successor routing revision (2.3.1 routing snapshots) |
| Work Order | `workOrderId` | exists, belongs to project | ECN `affectedManufacturingOrders` jsonb populated; re-work MOs flagged |
| Part | `partId` (add in 2.3.1) | exists (design/engineering part master) | affected-part rows (`ecr_affected_parts`) drive revision letters |
| Material / Component | `materialId`/`componentId` (add in 2.3.1) | exists | vendor/grade change notifications via ECN `notifiedTo` |

**Implementation rule:** the ECR links are **read-only after APPROVAL** — no impact/link mutation beyond REJECTED/REVIEW states (existing `updateECR` guard extended in 2.3.1).

---

## 7. Transactional Workflow Execution

Existing `EngineeringChangeService.transition(id, transitionId, actor, remarks)` contract (unchanged in shape):

```
dataSource.transaction(async (em) => {
  instance = workflowService.executeTransition(instanceId, transitionId, context, em)  // guards + optimistic lock
  ecr.status = STATUS_BY_STATE[instance.currentState.stateCode]
  if (reached APPROVAL→IMPLEMENTATION)  { ecr.approvedBy = actor.id; ecr.approvedAt = now }
  if (reached REVIEW→REJECTED)          { ecr.rejectionReason = remarks }
  // effect rules per §6 on RELEASE/ECN
  auditService.logBusinessEvent('engineering.change.transition', ..., em)
  await em.save(ecr); await em.save(instance)
})
eventBus.publish(...)   // after commit, via outbox from 2.3.1
```

Notes:
- Optimistic locking on the workflow instance returns 409 on concurrent transitions (global filter).
- ECN issuance is a separate operation (`issueECN(ecoId, …)`) that requires ECO verification evidence; it may be executed after RELEASE and carries the effective date.
- Terminal states (RELEASED/REJECTED) reject all further transitions.

---

## 8. ECO Implementation Tracking (wire in 2.3.1)

- `eco_implementations` rows become first-class: created when ECO reaches APPROVED, one per implementation task; `verificationRequired` gates the IMPLEMENTATION → VERIFICATION transition (blocked while any required task is incomplete).
- API: `GET/POST/PATCH/DELETE /api/engineering-changes/eco/:ecoId/implementations`, `POST /:id/verify`.
- `eco_implementations.status`/`verificationStatus` mirrored to ECO `verificationStatus`/`verifiedBy`.

---

## 9. Change API Surface (summary — full contracts in ENGINEERING_API_SPECIFICATION.md)

| Method | Route | Permission |
|---|---|---|
| GET/POST | `/api/engineering-changes/ecr` | `engineering:change:read` / `:update` |
| GET/PATCH/DELETE | `/api/engineering-changes/ecr/:id` | read / `:update` / delete (ADMIN/MANAGEMENT) |
| GET | `/api/engineering-changes/ecr/:id/workflow` | `engineering:change:read` |
| POST | `/api/engineering-changes/ecr/:id/workflow/transition` | transition guards: `engineering:change:update` / `:approve` / `:implement` / `:release` |
| GET/POST | `/api/engineering-changes/ecr/:id/impacts` (+PATCH/DELETE `/:impactId`) | read / `:update` |
| POST | `/api/engineering-changes/ecr/:id/impact-analysis` (2.3.3) | `engineering:change:impact` |
| GET/POST | `/api/engineering-changes/eco` · `/:id` | read / `:update` |
| GET/POST/PATCH | `/api/engineering-changes/eco/:ecoId/implementations` (2.3.1) | read / `:update` |
| POST | `/api/engineering-changes/eco/:ecoId/ecn` | `engineering:change:update` |
| GET/PATCH | `/api/engineering-changes/ecn` · `/:id` | read / `:update` |

Deprecation: the legacy generic `ecr` controller (`EngineeringChangeRequestController`) is removed in 2.3.1 (Gap D7); lifecycle surface is authoritative.
