import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { NotificationQueue } from '../entities/notification-queue.entity';

export interface NotificationInput {
  channel: 'email' | 'inapp' | 'system';
  recipient: string;
  subject: string;
  body?: string;
  tenantId?: string | null;
}

/**
 * NotificationService — enqueues outbound notifications.
 *
 * `enqueue` accepts an optional EntityManager so callers can enqueue
 * inside their own transaction (e.g. a workflow transition): the
 * notification is committed only if the business change commits.
 */
@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationQueue)
    private readonly queueRepository: Repository<NotificationQueue>,
  ) {}

  async enqueue(input: NotificationInput, em?: EntityManager): Promise<NotificationQueue> {
    const repo = em ? em.getRepository(NotificationQueue) : this.queueRepository;
    const item = repo.create({
      channel: input.channel,
      recipient: input.recipient,
      subject: input.subject,
      body: input.body ?? null,
      tenantId: input.tenantId ?? null,
      status: 'pending',
      retryCount: 0,
      scheduledAt: new Date(),
    });
    return repo.save(item);
  }
}
