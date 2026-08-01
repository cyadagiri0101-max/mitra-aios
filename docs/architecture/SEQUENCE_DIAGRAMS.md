# Sequence Diagrams (v3.2.1)

The diagrams below reflect the runtime flows that are implemented in the current MITRA v3.2.1 backend and frontend code paths.

## 1. Quote-to-project lifecycle
```mermaid
sequenceDiagram
    participant U as User
    participant API as NestJS controller
    participant C as Commercial services
    participant W as WorkflowService
    participant A as AuditService
    participant N as NotificationService
    participant P as ProjectService
    participant DB as PostgreSQL

    U->>API: create customer / enquiry / RFQ
    API->>C: orchestrate commercial flow
    C->>W: register workflow instance
    C->>DB: persist commercial state
    U->>API: submit quotation
    C->>DB: insert quotation
    U->>API: accept quotation
    C->>W: execute guarded transition
    C->>A: write audit record
    C->>N: write notification row
    C->>P: create project from accepted quotation
    C->>DB: link project to quotation
    API-->>U: return accepted quotation and project linkage
```

## 2. Transactional workflow transition
```mermaid
sequenceDiagram
    participant C as Controller
    participant S as RfqService
    participant T as Transaction
    participant W as WorkflowInstance
    participant A as AuditService
    participant N as NotificationService

    C->>S: transition(request)
    S->>T: begin transaction
    T->>T: validate state guard
    T->>W: save workflow state and increment version
    T->>A: write audit event
    T->>N: write notification row
    T-->>S: commit
    S-->>C: return success / 409 on optimistic-lock conflict
```

## 3. Rollback on audit failure
```mermaid
sequenceDiagram
    participant S as RfqService
    participant T as Transaction
    participant A as AuditService

    S->>T: begin transaction
    T->>T: save state and workflow version
    T->>A: write audit entry
    A-->>T: failure
    T-->>S: rollback
    S-->>C: error response
```

## 4. Frontend route lazy loading
```mermaid
sequenceDiagram
    participant B as Browser
    participant V as Vite server
    participant R as React Router

    B->>V: request app shell
    V-->>B: index shell and shared assets
    B->>R: navigate to a page
    R->>V: request page chunk on demand
    V-->>B: deliver route chunk
    R-->>B: render page
```

## 5. Frontend context memoization
```mermaid
sequenceDiagram
    participant P as Provider
    participant M as useMemo value
    participant C as Consumer components

    P->>M: recompute only when dependencies change
    M-->>C: stable context value
    C-->>C: re-render only when needed
```
