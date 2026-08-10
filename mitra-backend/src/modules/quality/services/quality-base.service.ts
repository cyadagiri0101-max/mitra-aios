import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository, IsNull } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Injectable()
export class QualityBaseService<T extends IndustrialBaseEntity> {
  constructor(protected readonly repo: Repository<T>) {}

  async findAll(query: Record<string, any> = {}, tenantId?: string) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const qb = this.repo.createQueryBuilder('e').where('e.deleted_at IS NULL');
    if (tenantId) qb.andWhere('e.tenant_id = :tenantId', { tenantId });
    if (query.status) qb.andWhere('e.status = :status', { status: query.status });
    if (query.projectId) qb.andWhere('e.project_id = :projectId', { projectId: query.projectId });
    qb.orderBy('e.created_at', 'DESC');
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId?: string) {
    const entity = await this.repo.findOne({ where: { id, deletedAt: IsNull(), tenantId: tenantId ?? undefined } as any });
    if (!entity) throw new NotFoundException('Record not found');
    return entity;
  }

  async create(dto: Record<string, unknown>, userId?: string, tenantId?: string) {
    const entity = this.repo.create({ ...dto, createdBy: userId ?? null, updatedBy: userId ?? null, tenantId: tenantId ?? undefined } as any) as unknown as T;
    return this.repo.save(entity);
  }

  async update(id: string, dto: Record<string, unknown>, userId?: string, tenantId?: string) {
    await this.findOne(id, tenantId);
    await this.repo.update(id, { ...dto, updatedBy: userId ?? undefined } as any);
    return this.findOne(id, tenantId);
  }
}

