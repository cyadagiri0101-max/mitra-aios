# Workflow Architecture (v3.2.1)

## Scope
This document captures the workflow runtime architecture currently implemented in MITRA v3.2.1. It complements the workflow state-machine documentation with the execution semantics used by the backend services.

## Components
| Component | Responsibility |
|---|---|
| WorkflowService | Instance CRUD, transition execution, state validation, workflow history |
| WorkflowInstance entity | Stores the version column used for optimistic locking |
| AuditService | Creates audit rows as part of the transition transaction |
| NotificationService | Writes notification rows in the same transaction as the workflow update |
| RfqService | Executes guarded RFQ transitions |
| QuotationApprovalService | Handles quotation approval and related workflow steps |
| QuotationAcceptanceService | Accepts quotations, creates projects, and links the accepted quotation to the resulting project |

## Transaction model
```text
Client -> Controller -> Service.executeTransition
  -> transaction begin
  -> save workflow state
  -> save workflow instance (version incremented)
  -> write audit event
  -> write notification row
  -> commit
  -> best-effort AI sync (post-commit only)
```

## Rules now enforced
1. One transaction owns one workflow transition.
2. The workflow state change, workflow instance version update, audit row, and notification row commit or roll back together.
3. Guards evaluate inside the transaction so the state cannot change between validation and write.
4. Version conflicts surface as HTTP 409 through the optimistic-lock error handling path.
5. Notifications are written transactionally so rolled-back transitions never emit notifications.

## Failure semantics
| Failure | Result |
|---|---|
| Audit write fails | Whole transition rolls back and the caller receives an error |
| Notification write fails | Whole transition rolls back |
| Version mismatch | HTTP 409 and client retry is required |
| Post-commit AI sync fails | Domain state remains durable; AI sync is best-effort only |

## Commercial workflow coupling
- Quotation creation updates the linked enquiry into the converted state as part of the same service flow.
- RFQ workflow creation may register an initial workflow instance.
- Quotation acceptance transitions the quotation into the accepted state, creates a project, and links the project to the accepted quotation.

## Verification status
- The workflow transition semantics are exercised by the backend unit and regression suites.
- The optimistic-lock behavior is covered by the workflow and customer-service regression tests.
- A live database-backed run remains pending until PostgreSQL is available for migration and end-to-end validation.
