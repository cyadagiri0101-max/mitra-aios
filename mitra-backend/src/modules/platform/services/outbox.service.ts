import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import {
  DomainOutboxMessage, OutboxStatus,
} from '../entities/domain-outbox.entity';

/**
 * Transactional outbox (G-13). Domain events are persisted in the same
 * transaction as the aggregate change (`append(..., { em })`) and relayed
 * asynchronously via `relay()` — no dual-write hazard, no at-least-once
 * delivery loss. The relay is idempotent and tracks attempt counts.
 */
@Injectable()
export class OutboxService {
  constructor(
    @InjectRepository(DomainOutboxMessage)
    private readonly outboxRepo: Repository<DomainOutboxMessage>,
  ) {}

  /**
   * Append an outbox message. Pass a transactional `em` to write the row
   * atomically with the business change; otherwise the row is written
   * standalone (callers must ensure it happens after a committed change).
   */
  async append(
    eventType: string,
    aggregateType: string,
    aggregateId: string | null,
    payload: Record<string, any>,
    opts: { tenantId?: string | null; actorId?: string | null; em?: EntityManager } = {},
  ): Promise<DomainOutboxMessage> {
    const message = this.outboxRepo.create({
      eventType,
      aggregateType,
      aggregateId,
      payload,
      status: OutboxStatus.PENDING,
      availableAt: new Date(),
      tenantId: opts.tenantId ?? undefined,
      createdBy: opts.actorId ?? undefined,
      updatedBy: opts.actorId ?? undefined,
    });
    if (opts.em) {
      return opts.em.getRepository(DomainOutboxMessage).save(message);
    }
    return this.outboxRepo.save(message);
  }

  /**
   * Relay pending outbox messages through the given dispatch handler.
   * Successful rows are marked PUBLISHED; failing rows are marked FAILED
   * with the error and an incremented attempt count.
   */
  async relay(
    maxRows = 100,
    dispatch?: (message: DomainOutboxMessage) => Promise<void>,
  ): Promise<{ relayed: number; failed: number }> {
    const rows = await this.outboxRepo.find({
      where: { status: OutboxStatus.PENDING },
      order: { createdAt: 'ASC' },
      take: maxRows,
    });
    let relayed = 0;
    let failed = 0;
    const now = new Date();
    for (const row of rows) {
      if (row.availableAt && row.availableAt > now) continue;
      try {
        if (dispatch) await dispatch(row);
        row.status = OutboxStatus.PUBLISHED;
        row.publishedAt = new Date();
      } catch (err) {
        row.status = OutboxStatus.FAILED;
        row.errorMessage = (err as Error)?.message ?? String(err);
        failed += 1;
      }
      row.attemptCount += 1;
      row.lastAttemptAt = new Date();
      row.updatedBy = 'outbox-relay';
      await this.outboxRepo.save(row);
      relayed += 1;
    }
    return { relayed, failed };
  }

  /** Re-arm FAILED messages so the next relay retries them. */
  async retryFailed(maxRows = 100): Promise<number> {
    const rows = await this.outboxRepo.find({
      where: { status: OutboxStatus.FAILED },
      order: { updatedAt: 'ASC' },
      take: maxRows,
    });
    for (const row of rows) {
      row.status = OutboxStatus.PENDING;
      row.errorMessage = null;
      row.availableAt = new Date(Date.now() + 30_000);
      row.updatedBy = 'outbox-retry';
    }
    await this.outboxRepo.save(rows);
    return rows.length;
  }

  async findAll(query: Record<string, any> = {}) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const qb = this.outboxRepo.createQueryBuilder('o').where('o.deleted_at IS NULL');
    if (query.status) qb.andWhere('o.status = :status', { status: query.status });
    if (query.eventType) qb.andWhere('o.event_type = :eventType', { eventType: query.eventType });
    if (query.tenantId) qb.andWhere('o.tenant_id = :tenantId', { tenantId: query.tenantId });
    qb.orderBy('o.created_at', 'DESC');
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<DomainOutboxMessage> {
    const message = await this.outboxRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!message) throw new NotFoundException('Outbox message not found');
    return message;
  }

  async pendingCount(): Promise<number> {
    return this.outboxRepo.count({ where: { status: OutboxStatus.PENDING } });
  }
}
