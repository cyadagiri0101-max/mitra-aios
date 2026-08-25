import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';
import {
  EngineeringDomainEvent,
  EngineeringDomainEventSubscriber,
} from '../events/engineering.events';

/**
 * In-process domain event bus for the Engineering Domain.
 *
 * Publishers call `publish()`; subscribers (including future AI-hook
 * consumers) receive events asynchronously. Subscriber failures are
 * isolated and logged — they never break the publishing business
 * transaction. A future transport (Redis, NATS) can replace the internals
 * without changing the publisher contract.
 */
@Injectable()
export class EngineeringEventBus implements OnModuleDestroy {
  private readonly logger = new Logger(EngineeringEventBus.name);
  private readonly emitter = new EventEmitter();
  private readonly subscribers = new Map<string, EngineeringDomainEventSubscriber>();
  private readonly seenEvents = new Set<string>();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  /** Register a subscriber. Returns an unsubscribe function. */
  subscribe(subscriber: EngineeringDomainEventSubscriber): () => void {
    this.subscribers.set(subscriber.name, subscriber);
    this.logger.log(`Subscriber registered: ${subscriber.name}`);
    return () => this.subscribers.delete(subscriber.name);
  }

  /** Publish an event to all subscribers (fire-and-forget, isolated errors). */
  publish(event: EngineeringDomainEvent): void {
    const dedupeKey = `${event.eventType}:${event.payload?.entityId ?? ''}:${event.occurredAt.getTime()}`;
    if (this.seenEvents.has(dedupeKey)) return;
    this.seenEvents.add(dedupeKey);
    if (this.seenEvents.size > 10_000) {
      this.seenEvents.clear();
    }

    this.emitter.emit('event', event);

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

  /** Convert bus events into an RxJS Observable stream for real-time consumers. */
  toObservable() {
    const { fromEvent } = require('rxjs');
    return fromEvent(this.emitter, 'event');
  }

  /** Subscriber count (used for diagnostics / tests). */
  subscriberCount(): number {
    return this.subscribers.size;
  }

  onModuleDestroy(): void {
    this.emitter.removeAllListeners();
    this.subscribers.clear();
  }
}
