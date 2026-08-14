import { Injectable } from '@nestjs/common';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { DomainOutboxMessage } from '@modules/platform/entities/domain-outbox.entity';
import { CommercialEventBus } from './commercial-event-bus.service';
import {
  CommercialDomainEvent,
  isCommercialEventType,
} from '../events/commercial.events';

/**
 * Outbox relay for the Commercial Domain (G-13). Dispatches durable outbox
 * rows whose event type belongs to the commercial domain to the in-process
 * `CommercialEventBus` (knowledge indexing, future AI consumers).
 *
 * Rows of other domains (engineering/manufacturing/quality/service/...)
 * are deliberately skipped — they are owned by the Engineering relay.
 * Invoked on an interval by CommercialOutboxRelayScheduler (P1-2) and
 * available on demand for diagnostics.
 */
@Injectable()
export class CommercialOutboxRelayService {
  constructor(
    private readonly outboxService: OutboxService,
    private readonly eventBus: CommercialEventBus,
  ) {}

  /** Dispatch a durable outbox row through the commercial event bus. */
  private dispatch = async (message: DomainOutboxMessage): Promise<void> => {
    if (!isCommercialEventType(message.eventType)) return;
    const event: CommercialDomainEvent = {
      eventType: message.eventType as CommercialDomainEvent['eventType'],
      timestamp: new Date(),
      tenantId: message.tenantId ?? null,
      actorId: message.createdBy ?? null,
      payload: message.payload ?? {},
    } as CommercialDomainEvent;
    this.eventBus.publish(event);
  };

  async relay(maxRows = 100): Promise<{ relayed: number; failed: number }> {
    return this.outboxService.relay(maxRows, this.dispatch);
  }

  /** Re-arm FAILED messages, then relay PENDING ones. */
  async retryAndRelay(maxRows = 100): Promise<{ rearmed: number; relayed: number; failed: number }> {
    const rearmed = await this.outboxService.retryFailed(maxRows);
    const { relayed, failed } = await this.relay(maxRows);
    return { rearmed, relayed, failed };
  }
}
