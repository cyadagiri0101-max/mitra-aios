# Event Definitions — TypeScript Interfaces

## Purpose

This document defines the TypeScript interfaces for all domain events in MITRA. These are the implementation contracts for event producers and consumers.

---

## Base Event Envelope

```typescript
interface DomainEvent {
  id: string;                    // unique event ID
  type: string;                  // e.g., "quotation.accepted"
  specVersion: string;           // semver of the event schema
  source: string;                // domain that produced the event
  time: string;                  // ISO 8601 UTC
  data: Record<string, unknown>; // event-specific payload
  correlationId: string;         // for tracing related events
  traceId: string;               // for distributed tracing
}
```

---

## Commercial Events

### CustomerCreated
```typescript
interface CustomerCreatedEvent {
  type: 'customer.created';
  source: 'commercial';
  data: {
    customerId: string;
    name: string;
    industry?: string;
    contacts: Array<{
      id: string;
      email: string;
      isPrimary: boolean;
    }>;
  };
}
```

### RFQSubmitted
```typescript
interface RFQSubmittedEvent {
  type: 'rfq.submitted';
  source: 'commercial';
  data: {
    rfqId: string;
    customerId: string;
    referenceNumber: string;
    specifications: Record<string, unknown>;
    attachments: string[];
    submittedAt: string;
  };
}
```

### QuotationCreated
```typescript
interface QuotationCreatedEvent {
  type: 'quotation.created';
  source: 'commercial';
  data: {
    quotationId: string;
    rfqId: string;
    customerId: string;
    amount: number;
    validUntil: string;
  };
}
```

### QuotationAccepted
```typescript
interface QuotationAcceptedEvent {
  type: 'quotation.accepted';
  source: 'commercial';
  data: {
    quotationId: string;
    rfqId: string;
    customerId: string;
    projectName: string;
    deliveryDate: string;
    acceptedAt: string;
  };
}
```

### QuotationRejected
```typescript
interface QuotationRejectedEvent {
  type: 'quotation.rejected';
  source: 'commercial';
  data: {
    quotationId: string;
    rfqId: string;
    customerId: string;
    reason: string;
    rejectedAt: string;
  };
}
```

---

## Project Events

### ProjectCreated
```typescript
interface ProjectCreatedEvent {
  type: 'project.created';
  source: 'project';
  data: {
    projectId: string;
    quotationId: string;
    customerId: string;
    name: string;
    startDate: string;
    deliveryDate: string;
    createdBy: string;
  };
}
```

### MilestoneReached
```typescript
interface MilestoneReachedEvent {
  type: 'milestone.reached';
  source: 'project';
  data: {
    projectId: string;
    milestoneId: string;
    milestoneName: string;
    sequence: number;
    reachedAt: string;
  };
}
```

### TaskCreated
```typescript
interface TaskCreatedEvent {
  type: 'task.created';
  source: 'project';
  data: {
    taskId: string;
    projectId: string;
    milestoneId?: string;
    title: string;
    assignedTo?: string;
    dueDate?: string;
  };
}
```

### TaskCompleted
```typescript
interface TaskCompletedEvent {
  type: 'task.completed';
  source: 'project';
  data: {
    taskId: string;
    projectId: string;
    milestoneId?: string;
    completedBy: string;
    completedAt: string;
    notes?: string;
  };
}
```

### TimelineUpdated
```typescript
interface TimelineUpdatedEvent {
  type: 'timeline.updated';
  source: 'project';
  data: {
    projectId: string;
    previousDeliveryDate: string;
    newDeliveryDate: string;
    reason: string;
    updatedBy: string;
  };
}
```

---

## Engineering Events

### DesignCreated
```typescript
interface DesignCreatedEvent {
  type: 'design.created';
  source: 'engineering';
  data: {
    designId: string;
    projectId: string;
    designNumber: string;
    revision: number;
    cadFileRef?: string;
  };
}
```

### DesignSubmitted
```typescript
interface DesignSubmittedEvent {
  type: 'design.submitted';
  source: 'engineering';
  data: {
    designId: string;
    projectId: string;
    revision: number;
    submittedBy: string;
  };
}
```

### DesignApproved
```typescript
interface DesignApprovedEvent {
  type: 'design.approved';
  source: 'engineering';
  data: {
    designId: string;
    projectId: string;
    revision: number;
    approvedBy: string;
    approvedAt: string;
    comments?: string;
  };
}
```

### BOMCreated
```typescript
interface BOMCreatedEvent {
  type: 'bom.created';
  source: 'engineering';
  data: {
    bomId: string;
    projectId: string;
    designId?: string;
    version: number;
    items: Array<{
      itemId: string;
      partNumber: string;
      quantity: number;
      material?: string;
    }>;
  };
}
```

### BOMReleased
```typescript
interface BOMReleasedEvent {
  type: 'bom.released';
  source: 'engineering';
  data: {
    bomId: string;
    projectId: string;
    version: number;
    releasedBy: string;
    releasedAt: string;
  };
}
```

### ProcessPlanCreated
```typescript
interface ProcessPlanCreatedEvent {
  type: 'process_plan.created';
  source: 'engineering';
  data: {
    processPlanId: string;
    projectId: string;
    bomId: string;
    operations: Array<{
      sequence: number;
      operationName: string;
      machineType?: string;
      estimatedTime?: number;
    }>;
  };
}
```

### EngineeringChangeRequested
```typescript
interface EngineeringChangeRequestedEvent {
  type: 'engineering_change.requested';
  source: 'engineering';
  data: {
    changeId: string;
    projectId: string;
    changeNumber: string;
    reason: string;
    affectedEntities: Array<{
      type: string;
      id: string;
      description?: string;
    }>;
    requestedBy: string;
  };
}
```

### EngineeringChangeApproved
```typescript
interface EngineeringChangeApprovedEvent {
  type: 'engineering_change.approved';
  source: 'engineering';
  data: {
    changeId: string;
    projectId: string;
    approvedBy: string;
    approvedAt: string;
    implementationPlan?: string;
  };
}
```

---

## Manufacturing Events

### ProductionPlanCreated
```typescript
interface ProductionPlanCreatedEvent {
  type: 'production_plan.created';
  source: 'manufacturing';
  data: {
    planId: string;
    projectId: string;
    scheduledStart: string;
    scheduledEnd: string;
  };
}
```

### WorkOrderReleased
```typescript
interface WorkOrderReleasedEvent {
  type: 'work_order.released';
  source: 'manufacturing';
  data: {
    workOrderId: string;
    workOrderNumber: string;
    projectId: string;
    machineId: string;
    machineName: string;
    operatorId?: string;
    quantityPlanned: number;
    scheduledStart: string;
    scheduledEnd: string;
  };
}
```

### ProductionRunStarted
```typescript
interface ProductionRunStartedEvent {
  type: 'production_run.started';
  source: 'manufacturing';
  data: {
    runId: string;
    workOrderId: string;
    projectId: string;
    startedAt: string;
    operatorId: string;
  };
}
```

### ProductionRunCompleted
```typescript
interface ProductionRunCompletedEvent {
  type: 'production_run.completed';
  source: 'manufacturing';
  data: {
    runId: string;
    workOrderId: string;
    projectId: string;
    quantityProduced: number;
    quantityScrapped: number;
    completedAt: string;
  };
}
```

### TrialConducted
```typescript
interface TrialConductedEvent {
  type: 'trial.conducted';
  source: 'manufacturing';
  data: {
    trialId: string;
    projectId: string;
    trialNumber: number;
    parameters: Record<string, unknown>;
    result: 'pass' | 'conditional_pass' | 'fail';
    conductedBy: string;
  };
}
```

---

## Quality Events

### InspectionCompleted
```typescript
interface InspectionCompletedEvent {
  type: 'inspection.completed';
  source: 'quality';
  data: {
    inspectionId: string;
    inspectionPlanId: string;
    projectId: string;
    workOrderId: string;
    results: Array<{
      checkpoint: number;
      parameter: string;
      measuredValue: string;
      pass: boolean;
    }>;
    overallResult: 'pass' | 'fail';
    inspectorId: string;
  };
}
```

### NCRCreated
```typescript
interface NCRCreatedEvent {
  type: 'ncr.created';
  source: 'quality';
  data: {
    ncrId: string;
    ncrNumber: string;
    projectId: string;
    inspectionResultId: string;
    defectType: string;
    severity: 'minor' | 'major' | 'critical';
    description: string;
    createdAt: string;
  };
}
```

### NCRActioned
```typescript
interface NCRActionedEvent {
  type: 'ncr.actioned';
  source: 'quality';
  data: {
    ncrId: string;
    projectId: string;
    disposition: string;
    actionTaken: string;
    actionedBy: string;
  };
}
```

### NCRClosed
```typescript
interface NCRClosedEvent {
  type: 'ncr.closed';
  source: 'quality';
  data: {
    ncrId: string;
    projectId: string;
    closedBy: string;
    closedAt: string;
  };
}
```

### CAPAInitiated
```typescript
interface CAPAInitiatedEvent {
  type: 'capa.initiated';
  source: 'quality';
  data: {
    capaId: string;
    capaNumber: string;
    projectId: string;
    ncrId: string;
    rootCause: string;
    actions: Array<{
      actionId: string;
      description: string;
      actionType: 'corrective' | 'preventive';
      assignedTo?: string;
      dueDate?: string;
    }>;
  };
}
```

### CAPAClosed
```typescript
interface CAPAClosedEvent {
  type: 'capa.closed';
  source: 'quality';
  data: {
    capaId: string;
    projectId: string;
    ncrId: string;
    effectivenessVerified: boolean;
    closedBy: string;
    closedAt: string;
  };
}
```

---

## Service Events

### DispatchCreated
```typescript
interface DispatchCreatedEvent {
  type: 'dispatch.created';
  source: 'service';
  data: {
    dispatchId: string;
    projectId: string;
    dispatchDate: string;
    carrier?: string;
    trackingNumber?: string;
  };
}
```

### InstallationCompleted
```typescript
interface InstallationCompletedEvent {
  type: 'installation.completed';
  source: 'service';
  data: {
    installationId: string;
    projectId: string;
    completedBy: string;
    customerAcceptance: boolean;
    completedAt: string;
  };
}
```

### ServiceRequestCreated
```typescript
interface ServiceRequestCreatedEvent {
  type: 'service_request.created';
  source: 'service';
  data: {
    requestId: string;
    requestNumber: string;
    projectId: string;
    issue: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    reportedBy: string;
  };
}
```

### ServiceRequestResolved
```typescript
interface ServiceRequestResolvedEvent {
  type: 'service_request.resolved';
  source: 'service';
  data: {
    requestId: string;
    projectId: string;
    resolution: string;
    resolvedBy: string;
    resolvedAt: string;
  };
}
```

---

## Event Dispatcher Utility

```typescript
// Framework-agnostic event dispatcher interface
interface EventDispatcher {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>
  ): void;
}

// NestJS implementation example
@Injectable()
class RedisEventDispatcher implements EventDispatcher {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const payload = JSON.stringify(event);
    await this.redis.xadd(
      `events:${event.source}`,
      '*',
      'type', event.type,
      'payload', payload
    );
    // Also publish to domain-specific streams
    await this.redis.publish(`evt:${event.type}`, payload);
  }

  async subscribe<T extends DomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>
  ): Promise<void> {
    const subscriber = this.redis.duplicate();
    await subscriber.subscribe(`evt:${eventType}`);
    subscriber.on('message', async (_channel: string, message: string) => {
      const event = JSON.parse(message) as T;
      await handler(event).catch(err => {
        console.error(`Handler failed for ${eventType}:`, err);
        // Push to dead-letter queue
      });
    });
  }
}
```
