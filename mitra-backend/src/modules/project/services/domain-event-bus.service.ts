import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';
import {
  ProjectDomainEvent,
  ProjectDomainEventSubscriber,
} from '../events/project.events';

/**
 * In-process domain event bus for the Project Management Domain.
 *
 * Publishers call `publish()`; subscribers registered via `subscribe()`
 * receive events asynchronously. Subscriber failures are isolated and
 * logged — they never break the publishing business transaction.
 *
 * This is deliberately dependency-free (Node EventEmitter) and unit
 * testable. A future transport (Redis, NATS) can replace the internals
 * without changing the publisher contract.
 */
@Injectable()
export class DomainEventBus implements OnModuleDestroy {
  private readonly logger = new Logger(DomainEventBus.name);
  private readonly emitter = new EventEmitter();
  private readonly subscribers = new Map<string, ProjectDomainEventSubscriber>();
  private readonly seenEvents = new Set<string>();

  constructor() {
    // A subscriber error must never crash the publisher.
    this.emitter.setMaxListeners(100);
  }

  /** Register a subscriber. Returns an unsubscribe function. */
  subscribe(subscriber: ProjectDomainEventSubscriber): () => void {
    this.subscribers.set(subscriber.name, subscriber);
    this.logger.log(`Subscriber registered: ${subscriber.name}`);
    return () => this.subscribers.delete(subscriber.name);
  }

  /** Publish an event to all subscribers (fire-and-forget, isolated errors). */
  publish(event: ProjectDomainEvent): void {
    const dedupeKey = `${event.eventType}:${event.projectId}:${event.occurredAt.getTime()}`;
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
    this.emitter.removeAllListeners();
    this.subscribers.clear();
  }
}
