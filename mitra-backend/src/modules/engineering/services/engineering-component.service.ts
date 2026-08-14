import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, Like } from 'typeorm';
import { EngineeringComponent, ComponentType } from '../entities/engineering-component.entity';
import { EngineeringComponentAlternate } from '../entities/engineering-component-alternate.entity';
import { AuditService } from '../../audit/services/audit.service';

/**
 * Component Library: standard, purchased and manufactured components with
 * vendor mapping and alternate/substitute relationships.
 */
@Injectable()
export class EngineeringComponentService {
  constructor(
    @InjectRepository(EngineeringComponent)
    private readonly componentRepo: Repository<EngineeringComponent>,
    @InjectRepository(EngineeringComponentAlternate)
    private readonly alternateRepo: Repository<EngineeringComponentAlternate>,
    private readonly dataSource: DataSource,
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
      where.componentName = Like(`%${query.search}%`);
    }
    if (query.code) where.componentCode = Like(`%${query.code}%`);
    if (query.componentType) where.componentType = query.componentType;
    if (query.category) where.category = Like(`%${query.category}%`);

    const SORTABLE = new Set(['componentCode', 'componentName', 'componentType', 'category', 'createdAt']);
    const sortBy = query.sortBy ?? 'componentCode';
    const field = SORTABLE.has(sortBy) ? sortBy : 'componentCode';
    const direction = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const [data, total] = await this.componentRepo.findAndCount({
      where, skip: (page - 1) * limit, take: limit,
      order: { [field]: direction } as any,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const component = await this.componentRepo.findOne({ where: { id, deletedAt: IsNull(), tenantId: scopeTenant } });
    if (!component) throw new NotFoundException('Component not found');
    return component;
  }

  async create(data: Record<string, any>, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const component = this.componentRepo.create({
      ...data,
      componentType: data.componentType ?? ComponentType.STANDARD,
      createdBy: userId,
      updatedBy: userId,
      tenantId: scopeTenant,
    });
    const saved = await this.componentRepo.save(component);
    await this.auditService.logBusinessEvent('engineering.component.created', 'EngineeringComponent', saved.id, userId ?? 'system', {
      componentCode: saved.componentCode,
      componentType: saved.componentType,
      tenantId: saved.tenantId,
    });
    return saved;
  }

  async update(id: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const component = await this.findOne(id, scopeTenant);
    Object.assign(component, data, { updatedBy: userId });
    const saved = await this.componentRepo.save(component);
    await this.auditService.logBusinessEvent('engineering.component.updated', 'EngineeringComponent', saved.id, userId ?? 'system', {
      changedFields: Object.keys(data),
      tenantId: saved.tenantId,
    });
    return saved;
  }

  async remove(id: string, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const component = await this.findOne(id, scopeTenant);
    await this.dataSource.transaction(async (em) => {
      const now = new Date();
      component.deletedAt = now;
      component.updatedBy = userId;
      await em.getRepository(EngineeringComponent).save(component);
      await em.getRepository(EngineeringComponentAlternate).update(
        [{ componentId: id, deletedAt: IsNull(), tenantId: scopeTenant }, { alternateComponentId: id, deletedAt: IsNull(), tenantId: scopeTenant }],
        { deletedAt: now, updatedBy: userId },
      );
    });
    await this.auditService.logBusinessEvent('engineering.component.deleted', 'EngineeringComponent', id, userId ?? 'system', {
      componentCode: component.componentCode,
      tenantId: component.tenantId,
    });
    return { deleted: true, id };
  }

  // ── Alternates / substitutes ─────────────────────────────────────────────

  async listAlternates(componentId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    await this.findOne(componentId, scopeTenant);
    const links = await this.alternateRepo.find({ where: { componentId, deletedAt: IsNull(), tenantId: scopeTenant } });
    const ids = links.map((l) => l.alternateComponentId);
    const alternates = ids.length
      ? await this.componentRepo.find({ where: { id: ids.length === 1 ? ids[0] : { In: ids } as any, deletedAt: IsNull(), tenantId: scopeTenant } })
      : [];
    return links.map((l) => ({
      ...l,
      alternate: alternates.find((a) => a.id === l.alternateComponentId) ?? null,
    }));
  }

  async addAlternate(componentId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    await this.findOne(componentId, scopeTenant);
    const alternate = await this.findOne(data.alternateComponentId, scopeTenant);
    if (alternate.id === componentId) {
      throw new Error('A component cannot be an alternate of itself');
    }
    const existing = await this.alternateRepo.findOne({
      where: { componentId, alternateComponentId: alternate.id, deletedAt: IsNull(), tenantId: scopeTenant },
    });
    if (existing) throw new Error('Alternate relationship already exists');

    const link = this.alternateRepo.create({
      componentId,
      alternateComponentId: alternate.id,
      relationType: data.relationType ?? 'SUBSTITUTE',
      notes: data.notes ?? null,
      createdBy: userId,
      updatedBy: userId,
      tenantId: scopeTenant,
    });
    const saved = await this.alternateRepo.save(link);
    await this.auditService.logBusinessEvent('engineering.component.alternate_added', 'EngineeringComponentAlternate', saved.id, userId ?? 'system', {
      componentId,
      alternateComponentId: alternate.id,
      relationType: saved.relationType,
    });
    return saved;
  }

  async removeAlternate(id: string, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const link = await this.alternateRepo.findOne({ where: { id, deletedAt: IsNull(), tenantId: scopeTenant } });
    if (!link) throw new NotFoundException('Alternate relationship not found');
    link.deletedAt = new Date();
    link.updatedBy = userId;
    await this.alternateRepo.save(link);
    return { deleted: true, id };
  }
}
