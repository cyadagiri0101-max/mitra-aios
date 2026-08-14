import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { InspectionPlan, InspectionPlanStatus } from '../entities/inspection-plan.entity';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';

@Injectable()
export class InspectionPlanService {
  constructor(
    @InjectRepository(InspectionPlan)
    private readonly repo: Repository<InspectionPlan>,
    private readonly outboxService: OutboxService,
  ) {}

  private requireTenant(tenantId?: string | null): string {
    if (!tenantId || tenantId.trim() === '') {
      throw new ForbiddenException('Tenant context is required');
    }
    return tenantId;
  }

  async findAll(q: { page?: number; limit?: number; status?: InspectionPlanStatus; projectId?: string } = {}, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(q.limit ?? 20)));
    const qb = this.repo.createQueryBuilder('p')
      .where('p.deleted_at IS NULL')
      .andWhere('p.tenant_id = :tenantId', { tenantId: scopeTenant });

    if (q.status) qb.andWhere('p.status = :status', { status: q.status });
    if (q.projectId) qb.andWhere('p.project_id = :projectId', { projectId: q.projectId });
    qb.orderBy('p.created_at', 'DESC');
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const entity = await this.repo.findOne({ where: { id, deletedAt: IsNull(), tenantId: scopeTenant } });
    if (!entity) throw new NotFoundException('Inspection plan not found');
    return entity;
  }

  async create(dto: Record<string, unknown>, userId?: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const entity = this.repo.create({
      ...dto,
      planNumber: dto.planNumber ?? this.nextNumber('IP'),
      status: dto.status ?? InspectionPlanStatus.DRAFT,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
      tenantId: scopeTenant,
    } as Partial<InspectionPlan>);
    const saved = await this.repo.save(entity);
    await this.outboxService.append(EngineeringDomainEventType.INSPECTION_PLAN_CREATED, 'inspection_plan', saved.id, {
      entityId: saved.id,
      planNumber: saved.planNumber,
      projectId: saved.projectId,
      drawingId: saved.drawingId,
      bomId: saved.bomId,
      routingId: saved.routingId,
    }, { tenantId: scopeTenant, actorId: userId });
    return saved;
  }

  async update(id: string, dto: Record<string, unknown>, userId?: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    await this.findOne(id, scopeTenant);
    await this.repo.update({ id, tenantId: scopeTenant }, { ...dto, updatedBy: userId ?? undefined } as Partial<InspectionPlan>);
    return this.findOne(id, scopeTenant);
  }

  private nextNumber(prefix: string): string {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;
  }
}
