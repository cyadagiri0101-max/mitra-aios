# ADR-001: Transactional Workflow Consistency (RFQ State Machine)

## Status
Accepted

## Context
The RFQ module allowed arbitrary status transitions through generic update
endpoints, and workflow state, audit logging, and notification dispatch were
written in separate, non-atomic operations. A failure between steps could leave
the database in a state where an RFQ was approved in one table but not another,
or where audit records were silently lost. Audit findings C-1 (workflow state
tampering) and C-3 (unreliable audit logging) required a structural fix.

## Decision
1. **State transitions are guarded, transactional operations.** `rfq.service`
   exposes explicit state-machine methods (`executeTransition`); generic update
   DTOs no longer accept `status` (see ADR-003 and ADR-004).
2. **Single transaction boundary.** `executeTransition` wraps the RFQ state
   save, the `workflow_instances` update, the audit log write, and the
   notification dispatch inside one `dataSource.transaction(...)`.
3. **Repository methods accept an optional `EntityManager`.** All participating
   repo calls run on the same connection when provided, otherwise fall back to
   the repository's own `dataSource`.
4. **Best-effort post-commit side effects.** AI sync (a non-critical,
   re-derivable side effect) runs after the transaction commits and tolerates
   failure without rolling back the domain change.
5. **Enquiry linkage.** Quotation creation flips the linked enquiry to
   `CONVERTED` within the same service flow; acceptance of a quotation creates
   the project and links it in an orchestrated sequence (`QuotationAcceptanceService`).

## Consequences
- RFQ transitions are now atomic: audit and notification cannot diverge from
  state.
- Guards prevent duplicate accept/approve (duplicate accept returns 400).
- Rollback tests added in `rfq.service.spec.ts` prove that audit or queue
  failure aborts the whole transition with no notification emitted.
- All existing public API shapes preserved; clients observe only stronger
  consistency guarantees.
