import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, Like, In } from 'typeorm';
import { EngineeringBom } from '../entities/engineering-bom.entity';
import { EngineeringBomItem } from '../entities/engineering-bom-item.entity';
import { EngineeringBomRevision } from '../entities/engineering-bom-revision.entity';
import { EngineeringBomSubstitution } from '../entities/engineering-bom-substitution.entity';
import { OutboxService } from '../../platform/services/outbox.service';
import { EngineeringEventBus } from './engineering-event-bus.service';
import { EngineeringDomainEventType } from '../events/engineering.events';
import { EngineeringAiHooksService } from './engineering-ai-hooks.service';
import { AuditService } from '../../audit/services/audit.service';
import { WorkflowService } from '../../workflow/services/workflow.service';

export const BOM_WORKFLOW_TYPE = 'engineering_bom';

export interface BomTreeNode extends EngineeringBomItem {
  children: BomTreeNode[];
}

/**
 * BOM Management: multi-level BOMs, versions + revisions, effective dates,
 * alternate/substitute parts, cost roll-up, quantity calculation, unit
 * conversion, import/export, clone and compare revisions.
 */
@Injectable()
export class EngineeringBomService {
  constructor(
    @InjectRepository(EngineeringBom)
    private readonly bomRepo: Repository<EngineeringBom>,
    @InjectRepository(EngineeringBomItem)
    private readonly itemRepo: Repository<EngineeringBomItem>,
    @InjectRepository(EngineeringBomRevision)
    private readonly revisionRepo: Repository<EngineeringBomRevision>,
    @InjectRepository(EngineeringBomSubstitution)
    private readonly substitutionRepo: Repository<EngineeringBomSubstitution>,
    private readonly dataSource: DataSource,
    private readonly workflowService: WorkflowService,
    private readonly auditService: AuditService,
    private readonly eventBus: EngineeringEventBus,
    private readonly aiHooks: EngineeringAiHooksService,
    private readonly outboxService: OutboxService,
  ) {}

  /** Fail-closed guard — tenant context is mandatory for tenant-scoped data. */
  private requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for tenant-scoped operation');
    }
    return tenantId;
  }

  async findAllAdvanced(tenantId?: string | null, query: Record<string, any> = {}) {
    const scopeTenant = this.requireTenant(tenantId);
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const qb = this.bomRepo.createQueryBuilder('b').where('b.deleted_at IS NULL');
    qb.andWhere('b.tenant_id = :tenantId', { tenantId: scopeTenant });
    if (query.search) {
      qb.andWhere('(b.bom_number ILIKE :search OR b.name ILIKE :search)', { search: `%${query.search}%` });
    }
    if (query.projectId) qb.andWhere('b.project_id = :projectId', { projectId: query.projectId });
    if (query.drawingId) qb.andWhere('b.drawing_id = :drawingId', { drawingId: query.drawingId });
    if (query.status) qb.andWhere('b.status = :status', { status: query.status });
    if (query.revision) qb.andWhere('b.revision = :revision', { revision: query.revision });

    const SORTABLE = new Set(['bomNumber', 'name', 'createdAt', 'revision', 'status', 'totalCost', 'updatedAt']);
    const sortBy = query.sortBy ?? 'createdAt';
    const field = SORTABLE.has(sortBy) ? `b.${sortBy}` : 'b.created_at';
    const direction = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(field, direction).addOrderBy('b.created_at', 'DESC');

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const where: any = { id, deletedAt: IsNull(), tenantId: scopeTenant };
    const bom = await this.bomRepo.findOne({ where });
    if (!bom) throw new NotFoundException('Engineering BOM not found');
    return bom;
  }

  async create(data: Record<string, any>, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    if (!data.projectId) throw new BadRequestException('projectId is required — no orphan engineering records');

    let saved: EngineeringBom | undefined;
    let lastErr: any;
    for (let attempt = 0; attempt < 5; attempt++) {
      const bomNumber = await this.generateBomNumber(scopeTenant, attempt);
      const bom = this.bomRepo.create({
        ...data,
        bomNumber,
        revision: data.revision ?? 'A',
        versionNumber: 1,
        status: 'DRAFT',
        isCurrent: true,
        createdBy: userId,
        updatedBy: userId,
        tenantId: scopeTenant,
      });
      try {
        saved = await this.bomRepo.save(bom);
        break;
      } catch (err: any) {
        if (err?.code !== '23505') throw err;
        lastErr = err;
      }
    }
    if (!saved) throw lastErr;

    try {
      const instance = await this.workflowService.createInstance(BOM_WORKFLOW_TYPE, 'bom', saved.id, {
        userId, userRole: [], userPermissions: [], tenantId: scopeTenant,
      });
      saved.workflowInstanceId = instance.id;
      await this.bomRepo.save(saved);
    } catch { /* workflow states not seeded yet */ }

    this.auditService.logBusinessEvent('engineering.bom.created', 'EngineeringBom', saved.id, userId ?? 'system', {
      bomNumber: saved.bomNumber,
      name: saved.name,
      projectId: saved.projectId,
      tenantId: saved.tenantId,
    });
    this.publish(saved, EngineeringDomainEventType.BOM_CREATED, { name: saved.name }, userId);
    return saved;
  }

  async update(id: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const bom = await this.findOne(id, tenantId);
    Object.assign(bom, data, { updatedBy: userId });
    const saved = await this.bomRepo.save(bom);
    this.auditService.logBusinessEvent('engineering.bom.updated', 'EngineeringBom', saved.id, userId ?? 'system', {
      changedFields: Object.keys(data),
      tenantId: saved.tenantId,
    });
    return saved;
  }

  /** Soft-delete the BOM, ALL items and ALL revision snapshots in one transaction. */
  async remove(id: string, userId: string, tenantId?: string | null) {
    const bom = await this.findOne(id, tenantId);
    await this.dataSource.transaction(async (em) => {
      const now = new Date();
      bom.deletedAt = now;
      bom.updatedBy = userId;
      await em.getRepository(EngineeringBom).save(bom);
      await em.getRepository(EngineeringBomItem).update(
        { bomId: id, deletedAt: IsNull() },
        { deletedAt: now, updatedBy: userId },
      );
      await em.getRepository(EngineeringBomRevision).update(
        { bomId: id, deletedAt: IsNull() },
        { deletedAt: now, updatedBy: userId },
      );
    });
    this.auditService.logBusinessEvent('engineering.bom.deleted', 'EngineeringBom', id, userId ?? 'system', {
      bomNumber: bom.bomNumber,
      tenantId: bom.tenantId,
    });
    return { deleted: true, id };
  }

  // ── Items (multi-level) ──────────────────────────────────────────────────

  async listItems(bomId: string, tenantId?: string | null) {
    await this.findOne(bomId, tenantId);
    const where: any = { bomId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    return this.itemRepo.find({ where, order: { sortOrder: 'ASC', createdAt: 'ASC' } });
  }

  /** Build the multi-level tree from flat items. */
  async getTree(bomId: string, tenantId?: string | null, asOf?: string | null): Promise<BomTreeNode[]> {
    const items = asOf ? await this.listItemsEffective(bomId, asOf, tenantId) : await this.listItems(bomId, tenantId);
    const map = new Map<string, BomTreeNode>();
    const roots: BomTreeNode[] = [];
    for (const item of items) {
      map.set(item.id, { ...item, children: [] });
    }
    for (const node of map.values()) {
      if (node.parentItemId && map.has(node.parentItemId)) {
        map.get(node.parentItemId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  /**
   * Item-level effectivity (Sprint 2.3.1 G-2). Returns only items whose
   * effective window (effective_from / effective_to, null = unbounded)
   * covers the given date.
   */
  async listItemsEffective(bomId: string, asOf: string, tenantId?: string | null) {
    await this.findOne(bomId, tenantId);
    const where: any = { bomId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const items = await this.itemRepo.find({ where, order: { sortOrder: 'ASC', createdAt: 'ASC' } });
    const target = new Date(asOf);
    if (Number.isNaN(target.getTime())) {
      throw new BadRequestException('effectiveOn must be a valid date (YYYY-MM-DD)');
    }
    return items.filter((i) => {
      if (i.effectiveFrom && new Date(i.effectiveFrom) > target) return false;
      if (i.effectiveTo && new Date(i.effectiveTo) < target) return false;
      return true;
    });
  }

  async addItem(bomId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const bom = await this.findOne(bomId, tenantId);
    if (bom.status === 'RELEASED') {
      throw new BadRequestException('Cannot modify a released BOM — raise an ECR or create a revision');
    }
    let parentItem: EngineeringBomItem | null = null;
    if (data.parentItemId) {
      const where: any = { id: data.parentItemId, bomId, deletedAt: IsNull() };
      if (tenantId) where.tenantId = tenantId;
      parentItem = await this.itemRepo.findOne({ where });
      if (!parentItem) throw new BadRequestException('Parent item not found in this BOM');
    }

    // Auto line number: 1, 2, 3… top level; 1.1, 1.2… under a parent
    let lineNumber = data.lineNumber;
    if (!lineNumber) {
      const where: any = { bomId, deletedAt: IsNull() };
      if (tenantId) where.tenantId = tenantId;
      if (parentItem) {
        where.parentItemId = parentItem.id;
        const siblings = await this.itemRepo.count({ where });
        lineNumber = `${parentItem.lineNumber ?? parentItem.sortOrder}.${siblings + 1}`;
      } else {
        const count = await this.itemRepo.count({ where });
        lineNumber = `${count + 1}`;
      }
    }

    // Quantity calculation: effective quantity = quantity_per × parent.quantity
    const quantity = parentItem
      ? Number(data.quantityPer ?? 1) * Number(parentItem.quantity ?? 1)
      : Number(data.quantityPer ?? 1);

    const item = this.itemRepo.create({
      ...data,
      bomId,
      parentItemId: parentItem?.id ?? null,
      lineNumber,
      quantity,
      quantityPer: Number(data.quantityPer ?? 1),
      extendedCost: this.computeExtendedCost(data),
      createdBy: userId,
      updatedBy: userId,
      tenantId: bom.tenantId ?? tenantId ?? undefined,
    });
    const saved = await this.itemRepo.save(item);
    await this.auditService.logBusinessEvent('engineering.bom.item_created', 'EngineeringBomItem', saved.id, userId ?? 'system', {
      bomId,
      partNumber: saved.partNumber,
      tenantId: saved.tenantId,
    });
    this.publish(bom, EngineeringDomainEventType.BOM_ITEM_CHANGED, { itemId: saved.id, action: 'created' }, userId);
    return saved;
  }

  async updateItem(bomId: string, itemId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const bom = await this.findOne(bomId, tenantId);
    if (bom.status === 'RELEASED') {
      throw new BadRequestException('Cannot modify a released BOM — raise an ECR or create a revision');
    }
    const where: any = { id: itemId, bomId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const item = await this.itemRepo.findOne({ where });
    if (!item) throw new NotFoundException('BOM item not found');

    Object.assign(item, data, { updatedBy: userId });
    if (data.quantityPer !== undefined && !data.quantity) {
      const parent = item.parentItemId
        ? await this.itemRepo.findOne({ where: { id: item.parentItemId, deletedAt: IsNull() } })
        : null;
      item.quantity = parent ? Number(data.quantityPer) * Number(parent.quantity) : Number(data.quantityPer);
    }
    if (data.unitCost !== undefined || data.quantity !== undefined) {
      item.extendedCost = this.computeExtendedCost(item);
    }
    const saved = await this.itemRepo.save(item);
    await this.auditService.logBusinessEvent('engineering.bom.item_updated', 'EngineeringBomItem', saved.id, userId ?? 'system', {
      bomId,
      changedFields: Object.keys(data),
      tenantId: saved.tenantId,
    });
    this.publish(bom, EngineeringDomainEventType.BOM_ITEM_CHANGED, { itemId: saved.id, action: 'updated' }, userId);
    return saved;
  }

  async removeItem(bomId: string, itemId: string, userId: string, tenantId?: string | null) {
    const bom = await this.findOne(bomId, tenantId);
    if (bom.status === 'RELEASED') {
      throw new BadRequestException('Cannot modify a released BOM — raise an ECR or create a revision');
    }
    const where: any = { id: itemId, bomId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const item = await this.itemRepo.findOne({ where });
    if (!item) throw new NotFoundException('BOM item not found');

    // Soft-delete the item and its sub-tree in one transaction
    await this.dataSource.transaction(async (em) => {
      const now = new Date();
      const itemRepo = em.getRepository(EngineeringBomItem);
      const toDelete: string[] = [item.id];
      const queue = [item.id];
      while (queue.length) {
        const children = await itemRepo.find({ where: { parentItemId: In(queue), deletedAt: IsNull() }, select: ['id'] });
        for (const c of children) {
          if (!toDelete.includes(c.id)) {
            toDelete.push(c.id);
            queue.push(c.id);
          }
        }
        queue.shift();
      }
      await itemRepo.update({ id: In(toDelete), deletedAt: IsNull() }, { deletedAt: now, updatedBy: userId });
    });
    await this.auditService.logBusinessEvent('engineering.bom.item_deleted', 'EngineeringBomItem', itemId, userId ?? 'system', {
      bomId,
      partNumber: item.partNumber,
      tenantId: bom.tenantId,
    });
    this.publish(bom, EngineeringDomainEventType.BOM_ITEM_CHANGED, { itemId, action: 'deleted' }, userId);
    return { deleted: true, id: itemId };
  }

  // ── Substitutions (Sprint 2.3.1 G-3) ──────────────────────────────────────

  /**
   * List substitutions for a BOM (optionally scoped to one item/status,
   * and optionally filtered to an effective date).
   */
  async listSubstitutions(
    bomId: string,
    opts: { itemId?: string; status?: string; asOf?: string } = {},
    tenantId?: string | null,
  ) {
    await this.findOne(bomId, tenantId);
    const where: any = { bomId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    if (opts.itemId) where.bomItemId = opts.itemId;
    if (opts.status) where.status = opts.status;
    const rows = await this.substitutionRepo.find({ where, order: { bomItemId: 'ASC', priority: 'ASC' } });
    if (!opts.asOf) return rows;
    const target = new Date(opts.asOf);
    if (Number.isNaN(target.getTime())) {
      throw new BadRequestException('asOf must be a valid date (YYYY-MM-DD)');
    }
    return rows.filter((s) => {
      if (s.effectiveFrom && new Date(s.effectiveFrom) > target) return false;
      if (s.effectiveTo && new Date(s.effectiveTo) < target) return false;
      return true;
    });
  }

  /** Register a substitute/alternate for a BOM item. */
  async addSubstitution(bomId: string, itemId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const bom = await this.findOne(bomId, tenantId);
    if (bom.status === 'RELEASED') {
      throw new BadRequestException('Cannot modify a released BOM — raise an ECR or create a revision');
    }
    const substituteItemId = data.substituteItemId;
    if (!substituteItemId) throw new BadRequestException('substituteItemId is required');
    if (substituteItemId === itemId) {
      throw new BadRequestException('An item cannot substitute itself');
    }

    const itemWhere: any = { id: In([itemId, substituteItemId]), bomId, deletedAt: IsNull() };
    if (tenantId) itemWhere.tenantId = tenantId;
    const items = await this.itemRepo.find({ where: itemWhere });
    if (items.length !== 2) {
      throw new BadRequestException('Both the item and the substitute must belong to this BOM');
    }

    const substitution = this.substitutionRepo.create({
      bomId,
      bomItemId: itemId,
      substituteItemId,
      substitutionType: data.substitutionType ?? 'SUBSTITUTE',
      priority: Number(data.priority ?? 1),
      effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : null,
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
      status: data.status ?? 'ACTIVE',
      restrictionNotes: data.restrictionNotes ?? null,
      createdBy: userId,
      updatedBy: userId,
      tenantId: bom.tenantId ?? tenantId ?? undefined,
    });

    // Transactional outbox (G-13): substitution + outbox row commit together.
    const saved = await this.dataSource.transaction(async (em) => {
      const savedSub = await em.getRepository(EngineeringBomSubstitution).save(substitution);
      await this.outboxService.append(
        EngineeringDomainEventType.BOM_SUBSTITUTION_CHANGED,
        'EngineeringBomSubstitution',
        savedSub.id,
        { projectId: bom.projectId, entityId: bom.id, entityNumber: bom.bomNumber, bomId, itemId, substituteItemId, action: 'created' },
        { tenantId: bom.tenantId, actorId: userId, em },
      );
      return savedSub;
    });

    await this.auditService.logBusinessEvent('engineering.bom.substitution_created', 'EngineeringBomSubstitution', saved.id, userId ?? 'system', {
      bomId,
      itemId,
      substituteItemId,
      tenantId: bom.tenantId,
    });
    return saved;
  }

  async updateSubstitution(bomId: string, itemId: string, substitutionId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const bom = await this.findOne(bomId, tenantId);
    if (bom.status === 'RELEASED') {
      throw new BadRequestException('Cannot modify a released BOM — raise an ECR or create a revision');
    }
    const where: any = { id: substitutionId, bomId, bomItemId: itemId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const substitution = await this.substitutionRepo.findOne({ where });
    if (!substitution) throw new NotFoundException('BOM substitution not found');

    if (data.substitutionType !== undefined) substitution.substitutionType = data.substitutionType;
    if (data.priority !== undefined) substitution.priority = Number(data.priority);
    if (data.effectiveFrom !== undefined) substitution.effectiveFrom = data.effectiveFrom ? new Date(data.effectiveFrom) : null;
    if (data.effectiveTo !== undefined) substitution.effectiveTo = data.effectiveTo ? new Date(data.effectiveTo) : null;
    if (data.status !== undefined) substitution.status = data.status;
    if (data.restrictionNotes !== undefined) substitution.restrictionNotes = data.restrictionNotes ?? null;
    substitution.updatedBy = userId;

    const saved = await this.substitutionRepo.save(substitution);
    await this.auditService.logBusinessEvent('engineering.bom.substitution_updated', 'EngineeringBomSubstitution', saved.id, userId ?? 'system', {
      bomId,
      changedFields: Object.keys(data),
      tenantId: bom.tenantId,
    });
    return saved;
  }

  async removeSubstitution(bomId: string, itemId: string, substitutionId: string, userId: string, tenantId?: string | null) {
    const bom = await this.findOne(bomId, tenantId);
    if (bom.status === 'RELEASED') {
      throw new BadRequestException('Cannot modify a released BOM — raise an ECR or create a revision');
    }
    const where: any = { id: substitutionId, bomId, bomItemId: itemId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const substitution = await this.substitutionRepo.findOne({ where });
    if (!substitution) throw new NotFoundException('BOM substitution not found');
    substitution.deletedAt = new Date();
    substitution.updatedBy = userId;
    await this.substitutionRepo.save(substitution);
    await this.auditService.logBusinessEvent('engineering.bom.substitution_deleted', 'EngineeringBomSubstitution', substitutionId, userId ?? 'system', {
      bomId,
      substituteItemId: substitution.substituteItemId,
      tenantId: bom.tenantId,
    });
    return { deleted: true, id: substitutionId };
  }

  // ── Cost roll-up ─────────────────────────────────────────────────────────

  /**
   * Cost roll-up: extended cost = quantity × unit cost; parent cost =
   * sum of children (when present); BOM total = sum of top-level items.
   */
  async rollupCost(bomId: string, tenantId?: string | null) {
    const bom = await this.findOne(bomId, tenantId);
    const items = await this.listItems(bomId, tenantId);

    const byId = new Map(items.map((i) => [i.id, i]));
    const rollup = (item: EngineeringBomItem): number => {
      const children = items.filter((i) => i.parentItemId === item.id);
      let cost: number;
      if (children.length) {
        cost = children.reduce((sum, c) => sum + rollup(c), 0);
      } else {
        cost = this.computeExtendedCost(item) ?? 0;
      }
      item.extendedCost = cost;
      return cost;
    };
    for (const item of items) {
      if (!item.parentItemId || !byId.has(item.parentItemId)) {
        rollup(item);
      }
    }
    await this.itemRepo.save(items);
    const totalCost = items
      .filter((i) => !i.parentItemId || !byId.has(i.parentItemId))
      .reduce((sum, i) => sum + Number(i.extendedCost ?? 0), 0);
    bom.totalCost = totalCost;
    await this.bomRepo.save(bom);

    await this.auditService.logBusinessEvent('engineering.bom.rollup', 'EngineeringBom', bomId, 'system', {
      totalCost,
      tenantId: bom.tenantId,
    });
    return { bomId, totalCost, items: items.length };
  }

  // ── Revisions & snapshots ────────────────────────────────────────────────

  /**
   * Create an immutable revision snapshot of the BOM. Bumps the BOM
   * version number (same revision letter) or advances the letter when
   * `bumpRevision` is set.
   */
  async createRevision(bomId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const bom = await this.findOne(bomId, tenantId);
    const items = await this.listItems(bomId, tenantId);
    const last = await this.revisionRepo.findOne({
      where: { bomId, deletedAt: IsNull() },
      order: { versionNumber: 'DESC' },
    });
    const versionNumber = (last?.versionNumber ?? 0) + 1;
    const revision = data.bumpRevision ? this.nextRevisionLetter(bom.revision) : bom.revision;

    const snapshot = {
      bom: { id: bom.id, bomNumber: bom.bomNumber, name: bom.name, projectId: bom.projectId, drawingId: bom.drawingId },
      items: items.map((i) => ({
        id: i.id, parentItemId: i.parentItemId, lineNumber: i.lineNumber, partNumber: i.partNumber,
        partName: i.partName, itemType: i.itemType, quantity: i.quantity, quantityPer: i.quantityPer,
        uom: i.uom, unitCost: i.unitCost, extendedCost: i.extendedCost,
      })),
    };

    const rev = this.revisionRepo.create({
      bomId,
      revision,
      versionNumber,
      snapshot,
      totalCost: bom.totalCost,
      changeSummary: data.changeSummary ?? null,
      releasedBy: userId,
      releasedAt: new Date(),
      createdBy: userId,
      updatedBy: userId,
      tenantId: bom.tenantId ?? tenantId ?? undefined,
    });
    const saved = await this.revisionRepo.save(rev);

    bom.revision = revision;
    bom.versionNumber = versionNumber;
    bom.updatedBy = userId;
    await this.bomRepo.save(bom);

    await this.auditService.logBusinessEvent('engineering.bom.revisioned', 'EngineeringBom', bomId, userId ?? 'system', {
      revision,
      versionNumber,
      tenantId: bom.tenantId,
    });
    this.publish(bom, EngineeringDomainEventType.BOM_REVISIONED, { revision, versionNumber }, userId);
    return saved;
  }

  /** Compare two revision snapshots item-by-item. */
  async compareRevisions(bomId: string, revisionA: string, revisionB: string, tenantId?: string | null) {
    await this.findOne(bomId, tenantId);
    const find = async (revision: string) => {
      const rev = await this.revisionRepo.findOne({
        where: { bomId, revision, deletedAt: IsNull() },
        order: { versionNumber: 'DESC' },
      });
      if (!rev) throw new NotFoundException(`BOM revision ${revision} not found`);
      return rev;
    };
    const a = await find(revisionA);
    const b = await find(revisionB);
    const itemsA = a.snapshot?.items ?? [];
    const itemsB = b.snapshot?.items ?? [];
    const byId = new Map<string, any>(itemsB.map((i: any) => [i.id, i] as [string, any]));

    const added: any[] = [];
    const removed: any[] = [];
    const changed: { item: any; fields: string[] }[] = [];
    for (const itemA of itemsA) {
      const itemB = byId.get(itemA.id);
      if (!itemB) { removed.push(itemA); continue; }
      const fields = Object.keys(itemB).filter(
        (k) => itemB[k] !== itemA[k] && k !== 'extendedCost',
      );
      if (fields.length) changed.push({ item: itemA, fields });
      byId.delete(itemA.id);
    }
    for (const rest of byId.values()) added.push(rest);

    return {
      bomId,
      revisionA: { revision: a.revision, versionNumber: a.versionNumber, totalCost: a.totalCost },
      revisionB: { revision: b.revision, versionNumber: b.versionNumber, totalCost: b.totalCost },
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      items: { added, removed, changed },
    };
  }

  async listRevisions(bomId: string, tenantId?: string | null) {
    await this.findOne(bomId, tenantId);
    const where: any = { bomId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    return this.revisionRepo.find({ where, order: { revision: 'DESC', versionNumber: 'DESC' } });
  }

  // ── Clone ────────────────────────────────────────────────────────────────

  /** Clone a BOM (new bom number + copied items, fresh ids, no revisions). */
  async clone(bomId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const source = await this.findOne(bomId, tenantId);
    const items = await this.listItems(bomId, tenantId);

    const created = await this.create({
      projectId: source.projectId,
      name: data.name ?? `${source.name} (Clone)`,
      drawingId: source.drawingId,
      currency: source.currency,
      effectiveFrom: data.effectiveFrom ?? source.effectiveFrom,
      notes: `Cloned from ${source.bomNumber} (${source.revision})`,
    }, userId, tenantId);

    const idMap = new Map<string, string>();
    for (const item of items) {
      const copy: Record<string, any> = { ...item, id: undefined, bomId: created.id, parentItemId: null };
      delete copy.id;
      delete copy.createdAt;
      delete copy.updatedAt;
      delete copy.deletedAt;
      copy.createdBy = userId;
      copy.updatedBy = userId;
      copy.tenantId = created.tenantId ?? tenantId ?? null;
      const savedItem = await this.itemRepo.save(this.itemRepo.create(copy));
      if (item.parentItemId) idMap.set(item.parentItemId, savedItem.id);
    }
    // Re-link parents in a second pass (items were created top-down order-safe)
    const savedItems = await this.listItems(created.id, tenantId);
    for (const item of savedItems) {
      const original = items.find((o) => o.partNumber === item.partNumber && o.lineNumber === item.lineNumber);
      if (!original?.parentItemId) continue;
      const newParentId = idMap.get(original.parentItemId);
      if (newParentId) {
        item.parentItemId = newParentId;
        await this.itemRepo.save(item);
      }
    }
    await this.rollupCost(created.id, tenantId);
    await this.auditService.logBusinessEvent('engineering.bom.cloned', 'EngineeringBom', created.id, userId ?? 'system', {
      sourceBomId: source.id,
      tenantId: created.tenantId,
    });
    return created;
  }

  // ── Import / Export (CSV) ────────────────────────────────────────────────

  /**
   * Export a flat CSV of the BOM. Columns:
   * lineNumber,partNumber,partName,itemType,sourceType,parentLineNumber,quantityPer,uom,unitCost,reference
   */
  async exportCsv(bomId: string, tenantId?: string | null): Promise<string> {
    const bom = await this.findOne(bomId, tenantId);
    const items = await this.listItems(bomId, tenantId);
    const byId = new Map(items.map((i) => [i.id, i]));
    const header = 'lineNumber,partNumber,partName,itemType,sourceType,parentLineNumber,quantityPer,uom,unitCost,reference\n';
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = items.map((i) => {
      const parent = i.parentItemId ? byId.get(i.parentItemId) : null;
      return [i.lineNumber, i.partNumber, i.partName, i.itemType, i.sourceType, parent?.lineNumber ?? '', i.quantityPer, i.uom, i.unitCost ?? '', i.reference ?? ''].map(esc).join(',');
    });
    return header + rows.join('\n');
  }

  /**
   * Import a CSV into the BOM. Multi-level structure is rebuilt from the
   * parentLineNumber column.
   */
  async importCsv(bomId: string, csv: string, userId: string, tenantId?: string | null) {
    const bom = await this.findOne(bomId, tenantId);
    if (bom.status === 'RELEASED') {
      throw new BadRequestException('Cannot modify a released BOM — raise an ECR or create a revision');
    }
    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (!lines.length) throw new BadRequestException('CSV is empty');
    const header = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/"/g, ''));
    const idx = (name: string) => header.indexOf(name);

    const rows: Record<string, any>[] = [];
    for (const line of lines.slice(1)) {
      const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      rows.push({
        lineNumber: idx('linenumber') >= 0 ? cells[idx('linenumber')] : null,
        partNumber: idx('partnumber') >= 0 ? cells[idx('partnumber')] : null,
        partName: idx('partname') >= 0 ? cells[idx('partname')] : null,
        parentLineNumber: idx('parentlinenumber') >= 0 ? cells[idx('parentlinenumber')] : null,
        quantityPer: idx('quantityper') >= 0 ? Number(cells[idx('quantityper')] ?? 1) : 1,
        uom: idx('uom') >= 0 ? cells[idx('uom')] : 'EA',
        unitCost: idx('unitcost') >= 0 && cells[idx('unitcost')] ? Number(cells[idx('unitcost')]) : null,
        itemType: idx('itemtype') >= 0 ? cells[idx('itemtype')] : 'PART',
        sourceType: idx('sourcetype') >= 0 ? cells[idx('sourcetype')] : 'MAKE',
        reference: idx('reference') >= 0 ? cells[idx('reference')] : null,
      });
    }
    if (!rows.length) throw new BadRequestException('CSV has no data rows');

    const existing = await this.listItems(bomId, tenantId);
    const byLine = new Map(existing.map((i) => [i.lineNumber, i]));
    let imported = 0;
    for (const row of rows) {
      if (!row.partName) continue;
      let parentItemId: string | null = null;
      if (row.parentLineNumber && byLine.has(row.parentLineNumber)) {
        parentItemId = byLine.get(row.parentLineNumber)!.id;
      }
      const item = await this.addItem(bomId, {
        ...row,
        parentItemId,
      }, userId, tenantId);
      byLine.set(item.lineNumber!, item);
      imported += 1;
    }
    await this.rollupCost(bomId, tenantId);
    await this.auditService.logBusinessEvent('engineering.bom.imported', 'EngineeringBom', bomId, userId ?? 'system', {
      rows: imported,
      tenantId: bom.tenantId,
    });
    return { imported, bomId };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private computeExtendedCost(data: Partial<EngineeringBomItem>): number | null {
    if (data.unitCost === null || data.unitCost === undefined) return null;
    return Number((Number(data.unitCost) * Number(data.quantity ?? data.quantityPer ?? 1)).toFixed(4));
  }

  private async generateBomNumber(tenantId: string | null | undefined, attempt = 0): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `BOM-${year}-`;
    const where: any = { bomNumber: Like(`${prefix}%`) };
    if (tenantId) where.tenantId = tenantId;
    const count = await this.bomRepo.count({ where });
    const seq = count + 1 + attempt;
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  private nextRevisionLetter(current: string): string {
    const last = current.toUpperCase().charCodeAt(0);
    return String.fromCharCode(last + 1);
  }

  private publish(bom: EngineeringBom, eventType: EngineeringDomainEventType, payload: Record<string, any> = {}, actorId?: string | null) {
    const event = {
      eventType,
      occurredAt: new Date(),
      tenantId: bom.tenantId,
      actorId: actorId ?? null,
      payload: {
        projectId: bom.projectId,
        entityId: bom.id,
        entityNumber: bom.bomNumber,
        ...payload,
      },
    };
    this.eventBus.publish(event);
    this.aiHooks.dispatchEvent(event).catch(() => undefined);
  }
}
