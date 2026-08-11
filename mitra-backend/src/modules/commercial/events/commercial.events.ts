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
  SALES_ORDER_CREATED = 'sales_order.created',
  SALES_ORDER_CONFIRMED = 'sales_order.confirmed',
  SALES_ORDER_CANCELLED = 'sales_order.cancelled',
  INVOICE_CREATED = 'invoice.created',
  INVOICE_ISSUED = 'invoice.issued',
  INVOICE_CANCELLED = 'invoice.cancelled',
  PAYMENT_RECORDED = 'payment.recorded',
  CREDIT_NOTE_CREATED = 'credit_note.created',
  CREDIT_NOTE_APPLIED = 'credit_note.applied',
  CREDIT_NOTE_CANCELLED = 'credit_note.cancelled',
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

export interface SalesOrderCreatedEvent {
  eventType: CommercialEventType.SALES_ORDER_CREATED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    salesOrderId: string;
    salesOrderNumber: string;
    quotationId: string | null;
    projectId: string | null;
    customerId: string | null;
    totalAmount: number;
  };
}

export interface SalesOrderConfirmedEvent {
  eventType: CommercialEventType.SALES_ORDER_CONFIRMED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    salesOrderId: string;
    salesOrderNumber: string;
  };
}

export interface SalesOrderCancelledEvent {
  eventType: CommercialEventType.SALES_ORDER_CANCELLED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    salesOrderId: string;
    salesOrderNumber: string;
    reason: string;
  };
}

export interface InvoiceCreatedEvent {
  eventType: CommercialEventType.INVOICE_CREATED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    invoiceId: string;
    invoiceNumber: string;
    salesOrderId: string | null;
    quotationId: string | null;
    projectId: string | null;
    customerId: string | null;
    totalAmount: number;
  };
}

export interface InvoiceIssuedEvent {
  eventType: CommercialEventType.INVOICE_ISSUED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    invoiceId: string;
    invoiceNumber: string;
    totalAmount: number;
  };
}

export interface InvoiceCancelledEvent {
  eventType: CommercialEventType.INVOICE_CANCELLED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    invoiceId: string;
    invoiceNumber: string;
    reason: string;
  };
}

export interface PaymentRecordedEvent {
  eventType: CommercialEventType.PAYMENT_RECORDED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    paymentId: string;
    paymentNumber: string;
    invoiceId: string;
    amount: number;
    currency: string;
    method: string;
  };
}

export interface CreditNoteCreatedEvent {
  eventType: CommercialEventType.CREDIT_NOTE_CREATED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    creditNoteId: string;
    creditNoteNumber: string;
    invoiceId: string | null;
    customerId: string | null;
    amount: number;
  };
}

export interface CreditNoteAppliedEvent {
  eventType: CommercialEventType.CREDIT_NOTE_APPLIED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    creditNoteId: string;
    creditNoteNumber: string;
    invoiceId: string;
    amount: number;
  };
}

export interface CreditNoteCancelledEvent {
  eventType: CommercialEventType.CREDIT_NOTE_CANCELLED;
  timestamp: Date;
  tenantId: string | null;
  actorId: string | null;
  payload: {
    creditNoteId: string;
    creditNoteNumber: string;
    reason: string;
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
  | ProjectCreatedEvent
  | SalesOrderCreatedEvent
  | SalesOrderConfirmedEvent
  | SalesOrderCancelledEvent
  | InvoiceCreatedEvent
  | InvoiceIssuedEvent
  | InvoiceCancelledEvent
  | PaymentRecordedEvent
  | CreditNoteCreatedEvent
  | CreditNoteAppliedEvent
  | CreditNoteCancelledEvent;

export interface EventPublisher {
  publish(event: CommercialDomainEvent): Promise<void>;
  publishMany(events: CommercialDomainEvent[]): Promise<void>;
}
