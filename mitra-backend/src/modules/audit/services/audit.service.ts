import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(input: AuditLogInput): Promise<AuditLog> {
    const log = this.auditLogRepository.create({
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      eventType: input.eventType ?? AuditEventType.CRUD,
      userId: input.userId ?? null,
      userEmail: input.userEmail ?? null,
      tenantId: input.tenantId ?? null,
      beforeState: input.beforeState ?? null,
      afterState: input.afterState ?? null,
      reason: input.reason ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ?? null,
    });
    return this.auditLogRepository.save(log);
  }

  async logBusinessEvent(
    action: string,
    entity: string,
    entityId: string,
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<AuditLog> {
    return this.log({
      entityType: entity,
      entityId,
      action,
      eventType: AuditEventType.BUSINESS,
      userId,
      metadata,
    });
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
