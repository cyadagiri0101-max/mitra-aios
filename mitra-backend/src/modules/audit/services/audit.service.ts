import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { AuditLog, AuditEventType } from '../entities/audit-log.entity';

export interface AuditLogInput {
  entityType: string;
  entityId: string;
  action: string;
  eventType?: AuditEventType;
  userId?: string;
  userEmail?: string;
  tenantId?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Coerce UUID-typed columns: placeholders like 'system'/'default' become NULL. */
function toUuidOrNull(value?: string | null): string | null {
  return value && UUID_RE.test(value) ? value : null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Write an audit record.
   * @param em optional EntityManager — when provided the record is written
   *           inside the caller's transaction (commit/rollback with the
   *           business change), guaranteeing audit trail integrity.
   */
  async log(input: AuditLogInput, em?: EntityManager): Promise<AuditLog> {
    const repo = em ? em.getRepository(AuditLog) : this.auditLogRepository;
    const log = repo.create({
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      eventType: input.eventType ?? AuditEventType.CRUD,
      userId: toUuidOrNull(input.userId),
      userEmail: input.userEmail ?? null,
      tenantId: toUuidOrNull(input.tenantId),
      beforeState: input.beforeState ?? null,
      afterState: input.afterState ?? null,
      reason: input.reason ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ?? null,
    });
    return repo.save(log);
  }

  async logBusinessEvent(
    action: string,
    entity: string,
    entityId: string,
    userId: string,
    metadata?: Record<string, any>,
    em?: EntityManager,
  ): Promise<AuditLog> {
    return this.log({
      entityType: entity,
      entityId,
      action,
      eventType: AuditEventType.BUSINESS,
      userId,
      metadata,
    }, em);
  }

  async findByEntity(entityType: string, entityId: string, tenantId?: string) {
    const where: any = { entityType, entityId };
    if (tenantId) where.tenantId = tenantId;
    return this.auditLogRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async findByUser(userId: string, tenantId?: string, limit = 50) {
    const where: any = { userId };
    if (tenantId) where.tenantId = tenantId;
    return this.auditLogRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 200),
    });
  }

  async findAll(tenantId?: string, page = 1, limit = 50) {
    const qb = this.auditLogRepository.createQueryBuilder('al')
      .orderBy('al.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (tenantId) qb.where('al.tenant_id = :tenantId', { tenantId });
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
