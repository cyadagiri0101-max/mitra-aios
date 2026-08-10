import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { SupplierInspection, SupplierInspectionStatus } from '../entities/supplier-inspection.entity';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';

@Injectable()
export class SupplierInspectionService {
  constructor(
    @InjectRepository(SupplierInspection)
    private readonly repo: Repository<SupplierInspection>,
    private readonly outboxService: OutboxService,
  ) {}

  async findAll(q: { page?: number; limit?: number; status?: SupplierInspectionStatus; supplierId?: string } = {}, tenantId?: string) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(q.limit ?? 20)));
    const qb = this.repo.createQueryBuilder('s').where('s.deleted_at IS NULL');
    if (tenantId) qb.andWhere('s.tenant_id = :tenantId', { tenantId });
    if (q.status) qb.andWhere('s.status = :status', { status: q.status });
    if (q.supplierId) qb.andWhere('s.supplier_id = :supplierId', { supplierId: q.supplierId });
    qb.orderBy('s.created_at', 'DESC');
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId?: string) {
    const entity = await this.repo.findOne({ where: { id, deletedAt: IsNull(), tenantId: tenantId ?? undefined } });
    if (!entity) throw new NotFoundException('Supplier inspection not found');
    return entity;
  }

  async create(dto: Record<string, unknown>, userId?: string, tenantId?: string) {
    const entity = this.repo.create({
      ...dto,
      inspectionNumber: dto.inspectionNumber ?? this.nextNumber('IQC'),
      status: dto.status ?? SupplierInspectionStatus.DRAFT,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
      tenantId: tenantId ?? undefined,
    } as Partial<SupplierInspection>);
    const saved = await this.repo.save(entity);
    await this.outboxService.append(EngineeringDomainEventType.SUPPLIER_INSPECTION_CREATED, 'supplier_inspection', saved.id, {
      entityId: saved.id,
      inspectionNumber: saved.inspectionNumber,
      supplierId: saved.supplierId,
      status: saved.status,
    }, { tenantId, actorId: userId });
    return saved;
  }

  private nextNumber(prefix: string): string {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;
  }
}
