import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  CommercialDomainEvent,
  CommercialDomainEventSubscriber,
} from '../events/commercial.events';

/**
 * In-process domain event bus for the Commercial Domain.
 *
 * Mirrors the Engineering Domain bus: publishers publish through the
 * outbox-backed `EventPublisher`; subscribers (knowledge indexing, future AI
 * consumers) receive events asynchronously. Subscriber failures are isolated
 * and logged — they never break the emitting business transaction. A future
 * transport (Redis, NATS) can replace the internals without changing the
 * publisher contract.
 */
@Injectable()
export class CommercialEventBus implements OnModuleDestroy {
  private readonly logger = new Logger(CommercialEventBus.name);
  private readonly subscribers = new Map<string, CommercialDomainEventSubscriber>();
  private readonly seenEvents = new Set<string>();

  /** Register a subscriber. Returns an unsubscribe function. */
  subscribe(subscriber: CommercialDomainEventSubscriber): () => void {
    this.subscribers.set(subscriber.name, subscriber);
    this.logger.log(`Subscriber registered: ${subscriber.name}`);
    return () => this.subscribers.delete(subscriber.name);
  }

  /** Publish an event to all subscribers (fire-and-forget, isolated errors). */
  publish(event: CommercialDomainEvent): void {
    const entityId =
      event.payload &&
      typeof event.payload === 'object' &&
      'entityId' in event.payload
        ? String((event.payload as { entityId: unknown }).entityId ?? '')
        : '';
    const dedupeKey = `${event.eventType}:${entityId}:${event.timestamp.getTime()}`;
    if (this.seenEvents.has(dedupeKey)) return;
    this.seenEvents.add(dedupeKey);
    if (this.seenEvents.size > 10_000) {
      this.seenEvents.clear();
    }

    for (const subscriber of this.subscribers.values()) {
      queueMicrotask(async () => {
        try {
          await subscriber.handle(event);
        } catch (err) {
          this.logger.error(
            `Subscriber ${subscriber.name} failed for ${event.eventType}: ${(err as Error)?.message ?? err}`,
          );
        }
      });
    }
  }

  /** Subscriber count (used for diagnostics / tests). */
  subscriberCount(): number {
    return this.subscribers.size;
  }

  onModuleDestroy(): void {
    this.subscribers.clear();
    this.seenEvents.clear();
  }
}
