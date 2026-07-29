# Event Catalog

## Purpose

This document defines the domain events that drive cross-domain communication in MITRA. Events are the heart of the platform — they enable decoupled, traceable, asynchronous workflows across all bounded contexts.

---

## Event Architecture

```
Producer Domain ──► Event Bus ──► Consumer Domain(s)
      │                                │
      │                          ┌─────┴─────┐
      │                          │           │
      ▼                          ▼           ▼
  Audit Log              Projection      Reaction
```

- **Producers** publish events after successfully completing an operation.
- **Consumers** subscribe to events they care about and react accordingly.
- **Events are immutable** — once published, they are never modified.
- **Audit log** records every event for traceability.
- **Projections** update read models from event streams.

---

## Event Taxonomy

| Category | Prefix | Description |
|----------|--------|-------------|
| Lifecycle | `*.created`, `*.updated`, `*.deleted` | Entity CRUD lifecycle |
| Transition | `*.submitted`, `*.approved`, `*.rejected` | State machine transitions |
| Decision | `*.change_requested`, `*.change_approved` | Engineering decisions |
| Notification | `*.alert`, `*.escalated` | Operational notifications |
| Integration | `*.synced`, `*.imported`, `*.exported` | External system interactions |

---

## Commercial Domain Events

### CustomerCreated
| Field | Description |
|-------|-------------|
| **Producer** | Commercial |
| **Consumers** | Project |
| **Payload** | `{ customerId, name, industry, contacts[] }` |

### RFQSubmitted
| Field | Description |
|-------|-------------|
| **Producer** | Commercial |
| **Consumers** | Project, Commercial |
| **Payload** | `{ rfqId, customerId, specifications[], attachments[], submittedAt }` |

### QuotationCreated
| Field | Description |
|-------|-------------|
| **Producer** | Commercial |
| **Consumers** | Commercial |
| **Payload** | `{ quotationId, rfqId, customerId, amount, terms, validUntil }` |

### QuotationAccepted
| Field | Description |
|-------|-------------|
| **Producer** | Commercial |
| **Consumers** | Project |
| **Payload** | `{ quotationId, rfqId, customerId, projectName, deliveryDate, acceptedAt }` |

### QuotationRejected
| Field | Description |
|-------|-------------|
| **Producer** | Commercial |
| **Consumers** | Commercial |
| **Payload** | `{ quotationId, rfqId, customerId, reason, rejectedAt }` |

---

## Project Domain Events

### ProjectCreated
| Field | Description |
|-------|-------------|
| **Producer** | Project |
| **Consumers** | Engineering, Manufacturing, Quality, Service, Knowledge |
| **Payload** | `{ projectId, quotationId, customerId, name, startDate, deliveryDate, createdBy }` |

### MilestoneReached
| Field | Description |
|-------|-------------|
| **Producer** | Project |
| **Consumers** | All domains |
| **Payload** | `{ projectId, milestoneId, milestoneName, sequence, reachedAt }` |

### TaskCreated
| Field | Description |
|-------|-------------|
| **Producer** | Project |
| **Consumers** | Knowledge |
| **Payload** | `{ taskId, projectId, milestoneId, title, assignedTo, dueDate }` |

### TaskCompleted
| Field | Description |
|-------|-------------|
| **Producer** | Project |
| **Consumers** | Project, Knowledge |
| **Payload** | `{ taskId, projectId, milestoneId, completedBy, completedAt, notes }` |

### TimelineUpdated
| Field | Description |
|-------|-------------|
| **Producer** | Project |
| **Consumers** | All domains |
| **Payload** | `{ projectId, baselineDate, updatedDate, reason, updatedBy }` |

---

## Engineering Domain Events

### DesignCreated
| Field | Description |
|-------|-------------|
| **Producer** | Engineering |
| **Consumers** | Knowledge |
| **Payload** | `{ designId, projectId, revision, cadFile, designer, createdAt }` |

### DesignApproved
| Field | Description |
|-------|-------------|
| **Producer** | Engineering |
| **Consumers** | Manufacturing, Quality, Knowledge |
| **Payload** | `{ designId, projectId, revision, approvedBy, approvedAt, comments }` |

### BOMCreated
| Field | Description |
|-------|-------------|
| **Producer** | Engineering |
| **Consumers** | Manufacturing, Knowledge |
| **Payload** | `{ bomId, projectId, designId, items[] }` |

### ProcessPlanCreated
| Field | Description |
|-------|-------------|
| **Producer** | Engineering |
| **Consumers** | Manufacturing |
| **Payload** | `{ processPlanId, projectId, bomId, operations[], createdBy }` |

### EngineeringChangeRequested
| Field | Description |
|-------|-------------|
| **Producer** | Engineering |
| **Consumers** | Engineering, Manufacturing, Quality |
| **Payload** | `{ changeId, projectId, affectedEntities[], reason, requestedBy }` |

### EngineeringChangeApproved
| Field | Description |
|-------|-------------|
| **Producer** | Engineering |
| **Consumers** | Engineering, Manufacturing, Quality |
| **Payload** | `{ changeId, projectId, approvedBy, approvedAt, implementationPlan }` |

---

## Manufacturing Domain Events

### ProductionPlanCreated
| Field | Description |
|-------|-------------|
| **Producer** | Manufacturing |
| **Consumers** | Quality, Knowledge |
| **Payload** | `{ planId, projectId, scheduledStart, scheduledEnd, workOrders[] }` |

### WorkOrderReleased
| Field | Description |
|-------|-------------|
| **Producer** | Manufacturing |
| **Consumers** | Quality, Knowledge |
| **Payload** | `{ workOrderId, projectId, machineId, operatorId, materialRef, releasedAt }` |

### ProductionRunStarted
| Field | Description |
|-------|-------------|
| **Producer** | Manufacturing |
| **Consumers** | Quality, Project |
| **Payload** | `{ runId, workOrderId, projectId, startedAt, operatorId }` |

### ProductionRunCompleted
| Field | Description |
|-------|-------------|
| **Producer** | Manufacturing |
| **Consumers** | Quality, Project, Knowledge |
| **Payload** | `{ runId, workOrderId, projectId, quantityProduced, quantityScrapped, completedAt }` |

### TrialConducted
| Field | Description |
|-------|-------------|
| **Producer** | Manufacturing |
| **Consumers** | Quality, Engineering, Knowledge |
| **Payload** | `{ trialId, projectId, parameters[], results[], passed, conductedAt }` |

---

## Quality Domain Events

### InspectionPlanCreated
| Field | Description |
|-------|-------------|
| **Producer** | Quality |
| **Consumers** | Manufacturing |
| **Payload** | `{ planId, projectId, checkpoints[], criteria[] }` |

### InspectionCompleted
| Field | Description |
|-------|-------------|
| **Producer** | Quality |
| **Consumers** | Manufacturing, Knowledge |
| **Payload** | `{ inspectionId, projectId, workOrderId, results[], passed, inspectorId }` |

### NCRCreated
| Field | Description |
|-------|-------------|
| **Producer** | Quality |
| **Consumers** | Engineering, Manufacturing, Knowledge |
| **Payload** | `{ ncrId, projectId, inspectionId, defectType, severity, description, createdAt }` |

### NCRActioned
| Field | Description |
|-------|-------------|
| **Producer** | Quality |
| **Consumers** | Quality, Knowledge |
| **Payload** | `{ ncrId, projectId, disposition, actionTaken, actionedBy }` |

### CAPAInitiated
| Field | Description |
|-------|-------------|
| **Producer** | Quality |
| **Consumers** | Engineering, Manufacturing, Knowledge |
| **Payload** | `{ capaId, projectId, ncrId, rootCause, correctiveActions[], preventiveActions[] }` |

### CAPAClosed
| Field | Description |
|-------|-------------|
| **Producer** | Quality |
| **Consumers** | Quality, Knowledge |
| **Payload** | `{ capaId, projectId, ncrId, effectivenessVerified, closedBy, closedAt }` |

---

## Service Domain Events

### DispatchCreated
| Field | Description |
|-------|-------------|
| **Producer** | Service |
| **Consumers** | Project, Knowledge |
| **Payload** | `{ dispatchId, projectId, dispatchDate, trackingInfo, carrier }` |

### InstallationCompleted
| Field | Description |
|-------|-------------|
| **Producer** | Service |
| **Consumers** | Project, Knowledge |
| **Payload** | `{ installationId, projectId, completedBy, customerAcceptance, completedAt }` |

### ServiceRequestCreated
| Field | Description |
|-------|-------------|
| **Producer** | Service |
| **Consumers** | Project, Knowledge |
| **Payload** | `{ requestId, projectId, issue, priority, reportedBy }` |

### ServiceRequestResolved
| Field | Description |
|-------|-------------|
| **Producer** | Service |
| **Consumers** | Service, Knowledge |
| **Payload** | `{ requestId, projectId, resolution, resolvedBy, resolvedAt }` |

---

## Knowledge Domain Events

### KnowledgeEntryCreated
| Field | Description |
|-------|-------------|
| **Producer** | Knowledge |
| **Consumers** | Knowledge, AI |
| **Payload** | `{ entryId, sourceProjectId, sourceEntityType, sourceEntityId, content, category }` |

### GraphRelationCreated
| Field | Description |
|-------|-------------|
| **Producer** | Knowledge |
| **Consumers** | AI |
| **Payload** | `{ relationType, fromEntity, fromDomain, toEntity, toDomain, weight }` |

---

## Producer-Consumer Matrix

```
                     Consumers ──────────────────────────────────────────►
Producer    │ Comm  │ Proj  │ Eng   │ Mfg   │ Qual  │ Serv  │ Know  │ AI
────────────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────
Commercial  │   ●   │   ●   │       │       │       │       │       │
Project     │   ●   │   ●   │   ●   │   ●   │   ●   │   ●   │   ●   │
Engineering │       │   ●   │   ●   │   ●   │   ●   │       │   ●   │   ●
Manufacture │       │   ●   │       │   ●   │   ●   │       │   ●   │
Quality     │       │   ●   │   ●   │   ●   │   ●   │       │   ●   │
Service     │       │   ●   │       │       │       │   ●   │   ●   │
Knowledge   │       │       │       │       │       │       │   ●   │   ●
```

---

## Event Versioning

Events use semantic versioning in their `specVersion` field:

```
{
  "id": "evt_abc123",
  "type": "quotation.accepted",
  "specVersion": "1.0.0",
  "source": "commercial",
  "time": "2026-07-27T10:30:00Z",
  "data": { ... },
  "correlationId": "corr_xyz",
  "traceId": "trace_123"
}
```

- **Breaking changes** (field removal, type change) increment major version.
- **Non-breaking additions** (new optional field) increment minor version.
- **Consumers** declare which event versions they support.
- **Event bus** routes events to consumers based on version compatibility.

---

## Event Bus Implementation Notes

- Events are published to a **Redis Stream** or **PostgreSQL LISTEN/NOTIFY** channel.
- Each consumer maintains its own **offset** for replayability.
- Dead-letter queue captures events that fail processing.
- Event retention is governed by the audit log policy.
