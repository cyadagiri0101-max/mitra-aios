import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Like, In } from 'typeorm';
import { EngineeringMaterial, MaterialCategory } from '../entities/engineering-material.entity';
import { AuditService } from '../../audit/services/audit.service';

/**
 * Material Library: materials, grades, standards, density, cost,
 * suppliers, mechanical/thermal properties. AI-ready JSONB property bags.
 */
@Injectable()
export class EngineeringMaterialService {
  constructor(
    @InjectRepository(EngineeringMaterial)
    private readonly materialRepo: Repository<EngineeringMaterial>,
    private readonly auditService: AuditService,
  ) {}

  private requireTenant(tenantId?: string | null): string {
    if (!tenantId || tenantId.trim() === '') {
      throw new ForbiddenException('Tenant context is required');
    }
    return tenantId;
  }

  async findAll(tenantId?: string | null, query: Record<string, any> = {}) {
    const scopeTenant = this.requireTenant(tenantId);
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const where: any = { deletedAt: IsNull(), tenantId: scopeTenant };
    if (query.search) {
      where.materialName = Like(`%${query.search}%`);
    }
    if (query.code) where.materialCode = Like(`%${query.code}%`);
    if (query.category) where.category = query.category;
    if (query.grade) where.grade = Like(`%${query.grade}%`);
    if (query.status) where.status = query.status;

    const SORTABLE = new Set(['materialCode', 'materialName', 'category', 'grade', 'createdAt']);
    const sortBy = query.sortBy ?? 'materialCode';
    const field = SORTABLE.has(sortBy) ? sortBy : 'materialCode';
    const direction = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const [data, total] = await this.materialRepo.findAndCount({
      where, skip: (page - 1) * limit, take: limit,
      order: { [field]: direction } as any,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const material = await this.materialRepo.findOne({ where: { id, deletedAt: IsNull(), tenantId: scopeTenant } });
    if (!material) throw new NotFoundException('Material not found');
    return material;
  }

  async findByCode(code: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    return this.materialRepo.findOne({ where: { materialCode: code, deletedAt: IsNull(), tenantId: scopeTenant } });
  }

  async create(data: Record<string, any>, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const material = this.materialRepo.create({
      ...data,
      category: data.category ?? MaterialCategory.STEEL,
      status: data.status ?? 'ACTIVE',
      createdBy: userId,
      updatedBy: userId,
      tenantId: scopeTenant,
    });
    const saved = await this.materialRepo.save(material);
    await this.auditService.logBusinessEvent('engineering.material.created', 'EngineeringMaterial', saved.id, userId ?? 'system', {
      materialCode: saved.materialCode,
      category: saved.category,
      tenantId: saved.tenantId,
    });
    return saved;
  }

  async update(id: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const material = await this.findOne(id, scopeTenant);
    Object.assign(material, data, { updatedBy: userId });
    const saved = await this.materialRepo.save(material);
    await this.auditService.logBusinessEvent('engineering.material.updated', 'EngineeringMaterial', saved.id, userId ?? 'system', {
      changedFields: Object.keys(data),
      tenantId: saved.tenantId,
    });
    return saved;
  }

  async remove(id: string, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const material = await this.findOne(id, scopeTenant);
    material.deletedAt = new Date();
    material.updatedBy = userId;
    await this.materialRepo.save(material);
    await this.auditService.logBusinessEvent('engineering.material.deleted', 'EngineeringMaterial', id, userId ?? 'system', {
      materialCode: material.materialCode,
      tenantId: material.tenantId,
    });
    return { deleted: true, id };
  }

  /** Bulk lookup for BOM line items. */
  async findByIds(ids: string[], tenantId?: string | null) {
    if (!ids.length) return [];
    const scopeTenant = this.requireTenant(tenantId);
    return this.materialRepo.find({ where: { id: In(ids), deletedAt: IsNull(), tenantId: scopeTenant } });
  }
}
