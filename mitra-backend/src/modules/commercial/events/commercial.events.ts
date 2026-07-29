export enum CommercialEventType {
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',
  CONTACT_ADDED = 'contact.added',
  CONTACT_REMOVED = 'contact.removed',
  RFQ_SUBMITTED = 'rfq.submitted',
  RFQ_UNDER_REVIEW = 'rfq.under_review',
  RFQ_CANCELLED = 'rfq.cancelled',
  RFQ_LOST = 'rfq.lost',
  QUOTATION_CREATED = 'quotation.created',
  QUOTATION_SENT = 'quotation.sent',
  QUOTATION_ACCEPTED = 'quotation.accepted',
  QUOTATION_REJECTED = 'quotation.rejected',
  PROJECT_CREATED = 'project.created',
}

export interface CustomerCreatedEvent {
  eventType: CommercialEventType.CUSTOMER_CREATED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    customerId: string;
    name: string;
    industry: string | null;
  };
}

export interface CustomerUpdatedEvent {
  eventType: CommercialEventType.CUSTOMER_UPDATED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    customerId: string;
    changes: Record<string, unknown>;
  };
}

export interface CustomerDeletedEvent {
  eventType: CommercialEventType.CUSTOMER_DELETED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    customerId: string;
  };
}

export interface ContactAddedEvent {
  eventType: CommercialEventType.CONTACT_ADDED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    customerId: string;
    contactId: string;
    firstName: string;
    lastName: string;
    email: string | null;
    isPrimary: boolean;
  };
}

export interface ContactRemovedEvent {
  eventType: CommercialEventType.CONTACT_REMOVED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    customerId: string;
    contactId: string;
  };
}

export interface RfqSubmittedEvent {
  eventType: CommercialEventType.RFQ_SUBMITTED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    enquiryId: string;
    enquiryNumber: string;
    customerName: string;
    productName: string;
  };
}

export interface RfqUnderReviewEvent {
  eventType: CommercialEventType.RFQ_UNDER_REVIEW;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    enquiryId: string;
    enquiryNumber: string;
  };
}

export interface RfqCancelledEvent {
  eventType: CommercialEventType.RFQ_CANCELLED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    enquiryId: string;
    enquiryNumber: string;
    previousStatus: string;
  };
}

export interface RfqLostEvent {
  eventType: CommercialEventType.RFQ_LOST;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    enquiryId: string;
    enquiryNumber: string;
    reason: string | null;
  };
}

export interface QuotationCreatedEvent {
  eventType: CommercialEventType.QUOTATION_CREATED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    quotationId: string;
    quotationNumber: string;
    enquiryId: string;
    customerId: string;
    totalAmount: number;
  };
}

export interface QuotationSentEvent {
  eventType: CommercialEventType.QUOTATION_SENT;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    quotationId: string;
    quotationNumber: string;
    customerId: string;
  };
}

export interface QuotationAcceptedEvent {
  eventType: CommercialEventType.QUOTATION_ACCEPTED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    quotationId: string;
    quotationNumber: string;
    customerId: string;
    projectId: string;
    projectName: string;
  };
}

export interface QuotationRejectedEvent {
  eventType: CommercialEventType.QUOTATION_REJECTED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    quotationId: string;
    quotationNumber: string;
    customerId: string;
    reason: string;
  };
}

export interface ProjectCreatedEvent {
  eventType: CommercialEventType.PROJECT_CREATED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    projectId: string;
    projectNumber: string;
    name: string;
    quotationId: string;
    customerId: string;
  };
}

export type CommercialDomainEvent =
  | CustomerCreatedEvent
  | CustomerUpdatedEvent
  | CustomerDeletedEvent
  | ContactAddedEvent
  | ContactRemovedEvent
  | RfqSubmittedEvent
  | RfqUnderReviewEvent
  | RfqCancelledEvent
  | RfqLostEvent
  | QuotationCreatedEvent
  | QuotationSentEvent
  | QuotationAcceptedEvent
  | QuotationRejectedEvent
  | ProjectCreatedEvent;

export interface EventPublisher {
  publish(event: CommercialDomainEvent): Promise<void>;
  publishMany(events: CommercialDomainEvent[]): Promise<void>;
}
