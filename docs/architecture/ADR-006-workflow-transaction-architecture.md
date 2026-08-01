# ADR-006: Workflow Transaction Architecture

## Status
Accepted

## Context
Before Sprint 2.1.1, an RFQ state transition wrote the RFQ row, updated the
workflow instance, wrote an audit log, and dispatched a notification as
separate, non-atomic operations. Interleaved failures left divergent state —
an approved RFQ without an audit trail, or audit records for transitions that
never happened (findings C-1/C-3).

## Decision
All mutating workflow operations execute inside a single database transaction
with a well-defined side-effect policy:

```
executeTransition (RFQ, or equivalent workflow operation)
└─ dataSource.transaction(async (em) => {
     rfqRepo.save(state)                      // state-machine-guarded
     workflowRepo.save(instance)              // versioned (ADR-002)
     auditRepo.log(event)                     // mandatory, same tx
     notificationRepo.enqueue(dispatch)       // same tx
   })
   └─ after commit (best-effort): AI sync, integrations (failures logged only)
```

1. **Repository layer** — repo methods accept an optional `EntityManager` and
   run on the caller's connection when provided; otherwise they use their own
   repository.
2. **Audit is mandatory** — the audit write happens inside the transaction, so
   a successful transition can never lack an audit record.
3. **Notifications are transactional** — a queued notification is committed
   with the state change; it cannot be sent for a transition that rolled back.
4. **Best-effort post-commit work** — AI sync (re-derivable, non-critical) runs
   after commit inside `.then()`/`catch` so it can never roll back the domain
   change.
5. **Orchestrated flows** — `QuotationAcceptanceService` runs accept → project
   create → link as a coordinated sequence; the project is only created when
   acceptance commits.

## Consequences
- Audit/notification divergence eliminated; rollback tests in
  `rfq.service.spec.ts` prove audit or queue failure aborts the whole
  transition with no notification emitted.
- Transactional coverage applies to: RFQ transitions, quotation
  approve/accept/reject/revise, project linkage, customer updates with
  activity logging.
- Throughput impact is bounded: transitions are single-row ops inside one
  short-lived transaction; the commit is the only durability point.
