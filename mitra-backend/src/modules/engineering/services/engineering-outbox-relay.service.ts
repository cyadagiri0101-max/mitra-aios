import { Injectable } from '@nestjs/common';
import { OutboxService } from '../../platform/services/outbox.service';
import { EngineeringEventBus } from './engineering-event-bus.service';
import { EngineeringAiHooksService } from './engineering-ai-hooks.service';
import { EngineeringDomainEvent, EngineeringDomainEventType } from '../events/engineering.events';
import { DomainOutboxMessage } from '../../platform/entities/domain-outbox.entity';
import { isCommercialEventType } from '../../commercial/events/commercial.events';

/**
 * Outbox relay for the Engineering Domain (G-13). Dispatches durable
 * outbox rows to the in-process event bus + AI-hook registry. Invoked
 * on demand (POST engineering/outbox/relay); a future scheduler can call
 * it on an interval without changing anything else.
 */
@Injectable()
export class EngineeringOutboxRelayService {
  constructor(
    private readonly outboxService: OutboxService,
    private readonly eventBus: EngineeringEventBus,
    private readonly aiHooks: EngineeringAiHooksService,
  ) {}

  /** Dispatch a durable outbox row through the event bus + AI hooks. */
  private dispatch = async (message: DomainOutboxMessage): Promise<void> => {
    // Commercial rows are owned by the Commercial relay — never cast them
    // into engineering events.
    if (isCommercialEventType(message.eventType)) return;
    const event: EngineeringDomainEvent = {
      eventType: message.eventType as EngineeringDomainEventType,
      occurredAt: new Date(),
      tenantId: message.tenantId,
      actorId: message.createdBy ?? null,
      payload: message.payload ?? {},
    };
    this.eventBus.publish(event);
    await this.aiHooks.dispatchEvent(event);
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
