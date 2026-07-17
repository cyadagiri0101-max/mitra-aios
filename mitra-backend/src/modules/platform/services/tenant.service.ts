import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private readonly repository: Repository<Tenant>,
  ) {}

  async findAll(tenantId?: string, page = 1, limit = 20) {
    const where: Record<string, any> = { deletedAt: IsNull() };
    if (tenantId) where['tenantId'] = tenantId;
    const [data, total] = await this.repository.findAndCount({
      where: where as any,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' } as any,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const entity = await this.repository.findOne({ where: { id, deletedAt: IsNull() } as any });
    if (!entity) throw new NotFoundException('Tenant not found');
    return entity;
  }

  async findByProject(projectId: string, tenantId?: string) {
    const where: Record<string, any> = { projectId, deletedAt: IsNull() };
    if (tenantId) where['tenantId'] = tenantId;
    return this.repository.find({ where: where as any, order: { createdAt: 'DESC' } as any, take: 100 });
  }

  async create(data: Record<string, any>, userId?: string) {
    const entity = this.repository.create({
      ...data,
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as any);
    return this.repository.save(entity);
  }

  async update(id: string, data: Record<string, any>, userId?: string) {
    const entity = await this.findOne(id);
    Object.assign(entity, data, userId ? { updatedBy: userId } : {});
    return this.repository.save(entity);
  }

  async remove(id: string, userId?: string) {
    const entity = await this.findOne(id);
    (entity as any).deletedAt = new Date();
    if (userId) (entity as any).updatedBy = userId;
    await this.repository.save(entity);
    return { deleted: true, id };
  }
}
