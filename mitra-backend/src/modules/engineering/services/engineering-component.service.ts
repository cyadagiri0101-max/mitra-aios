import { Injectable, NotFoundException } from '@nestjs/common';
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

  async findAll(tenantId?: string | null, query: Record<string, any> = {}) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const where: any = { deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
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
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const component = await this.componentRepo.findOne({ where });
    if (!component) throw new NotFoundException('Component not found');
    return component;
  }

  async create(data: Record<string, any>, userId: string, tenantId?: string | null) {
    const component = this.componentRepo.create({
      ...data,
      componentType: data.componentType ?? ComponentType.STANDARD,
      createdBy: userId,
      updatedBy: userId,
      tenantId: tenantId ?? undefined,
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
    const component = await this.findOne(id, tenantId);
    Object.assign(component, data, { updatedBy: userId });
    const saved = await this.componentRepo.save(component);
    await this.auditService.logBusinessEvent('engineering.component.updated', 'EngineeringComponent', saved.id, userId ?? 'system', {
      changedFields: Object.keys(data),
      tenantId: saved.tenantId,
    });
    return saved;
  }

  async remove(id: string, userId: string, tenantId?: string | null) {
    const component = await this.findOne(id, tenantId);
    await this.dataSource.transaction(async (em) => {
      const now = new Date();
      component.deletedAt = now;
      component.updatedBy = userId;
      await em.getRepository(EngineeringComponent).save(component);
      await em.getRepository(EngineeringComponentAlternate).update(
        [{ componentId: id, deletedAt: IsNull() }, { alternateComponentId: id, deletedAt: IsNull() }],
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
    await this.findOne(componentId, tenantId);
    const where: any = { componentId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const links = await this.alternateRepo.find({ where });
    const ids = links.map((l) => l.alternateComponentId);
    const alternates = ids.length
      ? await this.componentRepo.find({ where: { id: ids.length === 1 ? ids[0] : { In: ids } as any, deletedAt: IsNull() } })
      : [];
    return links.map((l) => ({
      ...l,
      alternate: alternates.find((a) => a.id === l.alternateComponentId) ?? null,
    }));
  }

  async addAlternate(componentId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    await this.findOne(componentId, tenantId);
    const alternate = await this.findOne(data.alternateComponentId, tenantId);
    if (alternate.id === componentId) {
      throw new Error('A component cannot be an alternate of itself');
    }
    const existing = await this.alternateRepo.findOne({
      where: { componentId, alternateComponentId: alternate.id, deletedAt: IsNull() },
    });
    if (existing) throw new Error('Alternate relationship already exists');

    const link = this.alternateRepo.create({
      componentId,
      alternateComponentId: alternate.id,
      relationType: data.relationType ?? 'SUBSTITUTE',
      notes: data.notes ?? null,
      createdBy: userId,
      updatedBy: userId,
      tenantId: (await this.findOne(componentId, tenantId)).tenantId ?? tenantId ?? undefined,
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
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const link = await this.alternateRepo.findOne({ where });
    if (!link) throw new NotFoundException('Alternate relationship not found');
    link.deletedAt = new Date();
    link.updatedBy = userId;
    await this.alternateRepo.save(link);
    return { deleted: true, id };
  }
}
