import { Injectable, Logger } from '@nestjs/common';
import { OutboxService } from '@modules/platform/services/outbox.service';
import {
  CommercialDomainEvent,
  CommercialEventType,
  EventPublisher,
} from '../events/commercial.events';

interface AggregateRef {
  aggregateType: string;
  aggregateId: string | null;
}

/**
 * Concrete implementation of the Commercial Domain `EventPublisher`
 * (P1-1). Emitting services call `publish()` / `publishMany()` after their
 * business writes; events are persisted durably in the shared transactional
 * outbox (G-13) and relayed asynchronously by CommercialOutboxRelayService —
 * no dual-write hazard, no at-least-once delivery loss, no coupling between
 * emitters and consumers (knowledge indexing, AI layer, integrations).
 */
@Injectable()
export class CommercialEventPublisherService implements EventPublisher {
  private readonly logger = new Logger(CommercialEventPublisherService.name);

  constructor(private readonly outboxService: OutboxService) {}

  async publish(event: CommercialDomainEvent): Promise<void> {
    const { aggregateType, aggregateId } = this.aggregateRefFrom(event);
    const message = await this.outboxService.append(
      event.eventType,
      aggregateType,
      aggregateId,
      this.payloadFrom(event),
      { tenantId: event.tenantId ?? null, actorId: event.actorId ?? null },
    );
    this.logger.log(
      `Commercial event queued: ${event.eventType} (${aggregateType}/${aggregateId ?? 'n/a'}, outbox ${message.id})`,
    );
  }

  async publishMany(events: CommercialDomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /** Flat payload for the outbox — always carries entityId for consumers. */
  private payloadFrom(event: CommercialDomainEvent): Record<string, any> {
    const payload: Record<string, any> = { ...(event.payload ?? {}) };
    if (!('entityId' in payload)) {
      const { aggregateId } = this.aggregateRefFrom(event);
      if (aggregateId) payload.entityId = aggregateId;
    }
    return payload;
  }

  private aggregateRefFrom(event: CommercialDomainEvent): AggregateRef {
    switch (event.eventType) {
      case CommercialEventType.CUSTOMER_CREATED:
      case CommercialEventType.CUSTOMER_UPDATED:
      case CommercialEventType.CUSTOMER_DELETED:
        return { aggregateType: 'customer', aggregateId: event.payload.customerId };
      case CommercialEventType.CONTACT_ADDED:
      case CommercialEventType.CONTACT_REMOVED:
        return { aggregateType: 'contact', aggregateId: event.payload.contactId };
      case CommercialEventType.RFQ_SUBMITTED:
      case CommercialEventType.RFQ_UNDER_REVIEW:
      case CommercialEventType.RFQ_CANCELLED:
      case CommercialEventType.RFQ_LOST:
        return { aggregateType: 'rfq', aggregateId: event.payload.enquiryId };
      case CommercialEventType.QUOTATION_CREATED:
      case CommercialEventType.QUOTATION_SENT:
      case CommercialEventType.QUOTATION_ACCEPTED:
      case CommercialEventType.QUOTATION_REJECTED:
        return { aggregateType: 'quotation', aggregateId: event.payload.quotationId };
      case CommercialEventType.PROJECT_CREATED:
        return { aggregateType: 'project', aggregateId: event.payload.projectId };
      case CommercialEventType.SALES_ORDER_CREATED:
      case CommercialEventType.SALES_ORDER_CONFIRMED:
      case CommercialEventType.SALES_ORDER_CANCELLED:
        return { aggregateType: 'sales_order', aggregateId: event.payload.salesOrderId };
      case CommercialEventType.INVOICE_CREATED:
      case CommercialEventType.INVOICE_ISSUED:
      case CommercialEventType.INVOICE_CANCELLED:
        return { aggregateType: 'invoice', aggregateId: event.payload.invoiceId };
      case CommercialEventType.PAYMENT_RECORDED:
        return { aggregateType: 'payment', aggregateId: event.payload.paymentId };
      case CommercialEventType.CREDIT_NOTE_CREATED:
      case CommercialEventType.CREDIT_NOTE_APPLIED:
      case CommercialEventType.CREDIT_NOTE_CANCELLED:
        return { aggregateType: 'credit_note', aggregateId: event.payload.creditNoteId };
      default:
        return { aggregateType: 'commercial', aggregateId: null };
    }
  }
}
