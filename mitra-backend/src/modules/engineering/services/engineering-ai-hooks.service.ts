import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { EngineeringAiHook } from '../entities/engineering-ai-hook.entity';
import { EngineeringDomainEvent } from '../events/engineering.events';

/**
 * AI-readiness hook registry.
 *
 * Extensible integration points for future AI capabilities. This service:
 *   1. Exposes the prepared hook registry (read / configure).
 *   2. Routes engineering domain events to enabled hooks — recording
 *      invocation timestamps and errors — WITHOUT performing any inference.
 * The AI layer can subscribe to `EngineeringEventBus` directly or poll the
 * registry to decide when to invoke its models.
 */
@Injectable()
export class EngineeringAiHooksService {
  private readonly logger = new Logger(EngineeringAiHooksService.name);

  constructor(
    @InjectRepository(EngineeringAiHook)
    private readonly hookRepo: Repository<EngineeringAiHook>,
  ) {}

  async findAll(tenantId?: string | null, page = 1, limit = 50) {
    const qb = this.hookRepo.createQueryBuilder('h')
      .where('h.deleted_at IS NULL')
      .orderBy('h.hook_code', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);
    if (tenantId) qb.andWhere('(h.tenant_id = :tenantId OR h.tenant_id IS NULL)', { tenantId });
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId?: string | null) {
    const qb = this.hookRepo.createQueryBuilder('h')
      .where('h.id = :id', { id })
      .andWhere('h.deleted_at IS NULL');
    if (tenantId) qb.andWhere('(h.tenant_id = :tenantId OR h.tenant_id IS NULL)', { tenantId });
    const hook = await qb.getOne();
    if (!hook) throw new NotFoundException('AI hook not found');
    return hook;
  }

  async update(id: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const hook = await this.findOne(id, tenantId);
    const allowed = ['hookName', 'description', 'isEnabled', 'config', 'notes'];
    for (const key of allowed) {
      if (data[key] !== undefined) (hook as any)[key] = data[key];
    }
    hook.updatedBy = userId;
    return this.hookRepo.save(hook);
  }

  /** Route a domain event to all enabled hooks matching its event type. */
  async dispatchEvent(event: EngineeringDomainEvent): Promise<{ dispatched: number }> {
    const hooks = await this.hookRepo.find({
      where: { eventType: event.eventType, isEnabled: true, deletedAt: IsNull() },
    });
    if (!hooks.length) return { dispatched: 0 };

    let dispatched = 0;
    for (const hook of hooks) {
      hook.invocationCount += 1;
      hook.lastInvokedAt = new Date();
      hook.lastError = null;
      await this.hookRepo.save(hook);
      dispatched += 1;
      this.logger.log(
        `AI hook dispatched: ${hook.hookCode} (${event.eventType} -> ${hook.hookCode}) — inference delegated to AI layer`,
      );
    }
    return { dispatched };
  }

  async findByCodes(codes: string[], tenantId?: string | null) {
    const qb = this.hookRepo.createQueryBuilder('h')
      .where('h.deleted_at IS NULL')
      .andWhere('h.hook_code IN (:...codes)', { codes });
    if (tenantId) qb.andWhere('(h.tenant_id = :tenantId OR h.tenant_id IS NULL)', { tenantId });
    return qb.getMany();
  }
}
