import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, Like } from 'typeorm';
import { EngineeringRouting } from '../entities/engineering-routing.entity';
import { EngineeringOperation } from '../entities/engineering-operation.entity';
import { EngineeringWorkCenter } from '../entities/engineering-work-center.entity';
import { EngineeringRoutingRevision } from '../entities/engineering-routing-revision.entity';
import { OutboxService } from '../../platform/services/outbox.service';
import { EngineeringEventBus } from './engineering-event-bus.service';
import { EngineeringDomainEventType } from '../events/engineering.events';
import { EngineeringAiHooksService } from './engineering-ai-hooks.service';
import { AuditService } from '../../audit/services/audit.service';
import { WorkflowService } from '../../workflow/services/workflow.service';

export const ROUTING_WORKFLOW_TYPE = 'engineering_routing';

/**
 * Process Planning: routings, operations (sequence, cycle/setup/standard
 * time, tool + material requirements) and work centers. Machines are
 * referenced from the existing machine_masters table.
 */
@Injectable()
export class EngineeringProcessPlanningService {
  constructor(
    @InjectRepository(EngineeringRouting)
    private readonly routingRepo: Repository<EngineeringRouting>,
    @InjectRepository(EngineeringOperation)
    private readonly operationRepo: Repository<EngineeringOperation>,
    @InjectRepository(EngineeringWorkCenter)
    private readonly workCenterRepo: Repository<EngineeringWorkCenter>,
    @InjectRepository(EngineeringRoutingRevision)
    private readonly revisionRepo: Repository<EngineeringRoutingRevision>,
    private readonly dataSource: DataSource,
    private readonly workflowService: WorkflowService,
    private readonly auditService: AuditService,
    private readonly eventBus: EngineeringEventBus,
    private readonly aiHooks: EngineeringAiHooksService,
    private readonly outboxService: OutboxService,
  ) {}

  // ── Work Centers ─────────────────────────────────────────────────────────

  async findWorkCenters(tenantId?: string | null, query: Record<string, any> = {}) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const where: any = { deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    if (query.search) where.name = Like(`%${query.search}%`);
    if (query.workCenterType) where.workCenterType = query.workCenterType;
    const [data, total] = await this.workCenterRepo.findAndCount({
      where, skip: (page - 1) * limit, take: limit, order: { code: 'ASC' },
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findWorkCenter(id: string, tenantId?: string | null) {
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const wc = await this.workCenterRepo.findOne({ where });
    if (!wc) throw new NotFoundException('Work center not found');
    return wc;
  }

  async createWorkCenter(data: Record<string, any>, userId: string, tenantId?: string | null) {
    const wc = this.workCenterRepo.create({ ...data, createdBy: userId, updatedBy: userId, tenantId: tenantId ?? undefined });
    const saved = await this.workCenterRepo.save(wc);
    await this.auditService.logBusinessEvent('engineering.workcenter.created', 'EngineeringWorkCenter', saved.id, userId ?? 'system', {
      code: saved.code, tenantId: saved.tenantId,
    });
    return saved;
  }

  async updateWorkCenter(id: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const wc = await this.findWorkCenter(id, tenantId);
    Object.assign(wc, data, { updatedBy: userId });
    return this.workCenterRepo.save(wc);
  }

  async removeWorkCenter(id: string, userId: string, tenantId?: string | null) {
    const wc = await this.findWorkCenter(id, tenantId);
    wc.deletedAt = new Date();
    wc.updatedBy = userId;
    await this.workCenterRepo.save(wc);
    await this.auditService.logBusinessEvent('engineering.workcenter.deleted', 'EngineeringWorkCenter', id, userId ?? 'system', {
      code: wc.code, tenantId: wc.tenantId,
    });
    return { deleted: true, id };
  }

  // ── Routings ─────────────────────────────────────────────────────────────

  async findAllAdvanced(tenantId?: string | null, query: Record<string, any> = {}) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const qb = this.routingRepo.createQueryBuilder('r').where('r.deleted_at IS NULL');
    if (tenantId) qb.andWhere('r.tenant_id = :tenantId', { tenantId });
    if (query.search) {
      qb.andWhere('(r.routing_number ILIKE :search OR r.name ILIKE :search)', { search: `%${query.search}%` });
    }
    if (query.projectId) qb.andWhere('r.project_id = :projectId', { projectId: query.projectId });
    if (query.drawingId) qb.andWhere('r.drawing_id = :drawingId', { drawingId: query.drawingId });
    if (query.status) qb.andWhere('r.status = :status', { status: query.status });

    const SORTABLE = new Set(['routingNumber', 'name', 'createdAt', 'status', 'totalStandardHours', 'totalCost', 'updatedAt']);
    const sortBy = query.sortBy ?? 'createdAt';
    const field = SORTABLE.has(sortBy) ? `r.${sortBy}` : 'r.created_at';
    const direction = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(field, direction).addOrderBy('r.created_at', 'DESC');

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId?: string | null) {
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const routing = await this.routingRepo.findOne({ where });
    if (!routing) throw new NotFoundException('Engineering routing not found');
    return routing;
  }

  async create(data: Record<string, any>, userId: string, tenantId?: string | null) {
    if (!data.projectId) throw new BadRequestException('projectId is required — no orphan engineering records');
    let saved: EngineeringRouting | undefined;
    let lastErr: any;
    for (let attempt = 0; attempt < 5; attempt++) {
      const routingNumber = await this.generateRoutingNumber(tenantId, attempt);
      const routing = this.routingRepo.create({
        ...data,
        routingNumber,
        name: data.routingName ?? data.name,
        status: 'DRAFT',
        createdBy: userId,
        updatedBy: userId,
        tenantId: tenantId ?? undefined,
      });
      try {
        saved = await this.routingRepo.save(routing);
        break;
      } catch (err: any) {
        if (err?.code !== '23505') throw err;
        lastErr = err;
      }
    }
    if (!saved) throw lastErr;
    try {
      const instance = await this.workflowService.createInstance(ROUTING_WORKFLOW_TYPE, 'routing', saved.id, {
        userId, userRole: [], userPermissions: [], tenantId: tenantId ?? saved.tenantId ?? undefined,
      });
      saved.workflowInstanceId = instance.id;
      await this.routingRepo.save(saved);
    } catch { /* workflow states not seeded yet */ }

    await this.auditService.logBusinessEvent('engineering.routing.created', 'EngineeringRouting', saved.id, userId ?? 'system', {
      routingNumber: saved.routingNumber,
      projectId: saved.projectId,
      tenantId: saved.tenantId,
    });
    this.publish(saved, EngineeringDomainEventType.ROUTING_CREATED, {}, userId);
    return saved;
  }

  async update(id: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const routing = await this.findOne(id, tenantId);
    Object.assign(routing, data, { updatedBy: userId });
    const saved = await this.routingRepo.save(routing);
    await this.auditService.logBusinessEvent('engineering.routing.updated', 'EngineeringRouting', saved.id, userId ?? 'system', {
      changedFields: Object.keys(data),
      tenantId: saved.tenantId,
    });
    return saved;
  }

  async remove(id: string, userId: string, tenantId?: string | null) {
    const routing = await this.findOne(id, tenantId);
    await this.dataSource.transaction(async (em) => {
      const now = new Date();
      routing.deletedAt = now;
      routing.updatedBy = userId;
      await em.getRepository(EngineeringRouting).save(routing);
      await em.getRepository(EngineeringOperation).update(
        { routingId: id, deletedAt: IsNull() },
        { deletedAt: now, updatedBy: userId },
      );
    });
    await this.auditService.logBusinessEvent('engineering.routing.deleted', 'EngineeringRouting', id, userId ?? 'system', {
      routingNumber: routing.routingNumber,
      tenantId: routing.tenantId,
    });
    return { deleted: true, id };
  }

  // ── Operations ───────────────────────────────────────────────────────────

  async listOperations(routingId: string, tenantId?: string | null) {
    await this.findOne(routingId, tenantId);
    const where: any = { routingId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    return this.operationRepo.find({ where, order: { operationNumber: 'ASC' } });
  }

  async addOperation(routingId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const routing = await this.findOne(routingId, tenantId);
    if (routing.status === 'RELEASED') {
      throw new BadRequestException('Cannot modify a released routing');
    }
    if (data.predecessorOperationId) {
      await this.validatePredecessor(routingId, null, data.predecessorOperationId, tenantId);
    }
    const operation = this.operationRepo.create({
      ...data,
      routingId,
      description: data.description ?? data.operationName,
      operationNumber: data.operationNumber ?? (await this.operationRepo.count({ where: { routingId, deletedAt: IsNull() } })) * 10 + 10,
      setupTimeMinutes: Number(data.setupTimeMinutes ?? 0),
      cycleTimeMinutes: Number(data.cycleTimeMinutes ?? 0),
      standardTimeMinutes: Number(data.standardTimeMinutes ?? 0),
      operationCost: data.costPerHour
        ? Number((Number(data.costPerHour) * (Number(data.setupTimeMinutes ?? 0) + Number(data.cycleTimeMinutes ?? 0)) / 60).toFixed(2))
        : null,
      createdBy: userId,
      updatedBy: userId,
      tenantId: routing.tenantId ?? tenantId ?? undefined,
    });
    const saved = await this.operationRepo.save(operation);
    await this.recomputeTotals(routingId);
    await this.auditService.logBusinessEvent('engineering.routing.operation_created', 'EngineeringOperation', saved.id, userId ?? 'system', {
      routingId,
      operationNumber: saved.operationNumber,
      tenantId: saved.tenantId,
    });
    return saved;
  }

  async updateOperation(routingId: string, operationId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const routing = await this.findOne(routingId, tenantId);
    if (routing.status === 'RELEASED') {
      throw new BadRequestException('Cannot modify a released routing');
    }
    const where: any = { id: operationId, routingId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const operation = await this.operationRepo.findOne({ where });
    if (!operation) throw new NotFoundException('Operation not found');

    if (data.predecessorOperationId !== undefined) {
      await this.validatePredecessor(routingId, operationId, data.predecessorOperationId, tenantId);
    }

    Object.assign(operation, data, { updatedBy: userId });
    if (data.costPerHour !== undefined || data.setupTimeMinutes !== undefined || data.cycleTimeMinutes !== undefined) {
      operation.operationCost = Number(
        (Number(operation.costPerHour ?? 0) * (Number(operation.setupTimeMinutes ?? 0) + Number(operation.cycleTimeMinutes ?? 0)) / 60).toFixed(2),
      );
    }
    const saved = await this.operationRepo.save(operation);
    await this.recomputeTotals(routingId);
    return saved;
  }

  async removeOperation(routingId: string, operationId: string, userId: string, tenantId?: string | null) {
    const routing = await this.findOne(routingId, tenantId);
    if (routing.status === 'RELEASED') {
      throw new BadRequestException('Cannot modify a released routing');
    }
    const where: any = { id: operationId, routingId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const operation = await this.operationRepo.findOne({ where });
    if (!operation) throw new NotFoundException('Operation not found');
    operation.deletedAt = new Date();
    operation.updatedBy = userId;
    await this.operationRepo.save(operation);
    await this.recomputeTotals(routingId);
    return { deleted: true, id: operationId };
  }

  /** Recompute routing totals from operations (setup, cycle, standard hours + cost). */
  async recomputeTotals(routingId: string) {
    const routing = await this.findOne(routingId);
    const ops = await this.listOperations(routingId);
    const totalSetupMinutes = ops.reduce((s, o) => s + Number(o.setupTimeMinutes ?? 0), 0);
    const totalCycleMinutes = ops.reduce((s, o) => s + Number(o.cycleTimeMinutes ?? 0), 0);
    const totalStandardMinutes = ops.reduce((s, o) => s + Number(o.standardTimeMinutes ?? 0), 0);
    routing.totalSetupHours = Number((totalSetupMinutes / 60).toFixed(2));
    routing.totalCycleHours = Number((totalCycleMinutes / 60).toFixed(2));
    routing.totalStandardHours = Number((totalStandardMinutes / 60).toFixed(2));
    routing.totalCost = Number(ops.reduce((s, o) => s + Number(o.operationCost ?? 0), 0).toFixed(2));
    return this.routingRepo.save(routing);
  }

  async getRoutingWithOperations(id: string, tenantId?: string | null) {
    const routing = await this.findOne(id, tenantId);
    const operations = await this.listOperations(id, tenantId);
    return { ...routing, operations };
  }

  // ── Routing revisions (Sprint 2.3.1 G-4) ─────────────────────────────────

  /**
   * Snapshot the routing + operations into an immutable revision. Bumps
   * `engineering_routings.version`; rows are unique per (routing, version).
   */
  async createRevision(routingId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const routing = await this.findOne(routingId, tenantId);
    const operations = await this.listOperations(routingId, tenantId);
    const last = await this.revisionRepo.findOne({
      where: { routingId, deletedAt: IsNull() },
      order: { version: 'DESC' },
    });
    const version = (last?.version ?? routing.version ?? 0) + 1;

    const snapshot = {
      routing: {
        id: routing.id, routingNumber: routing.routingNumber, name: routing.name,
        projectId: routing.projectId, partId: routing.partId, drawingId: routing.drawingId,
        bomId: routing.bomId, totalSetupHours: routing.totalSetupHours,
        totalCycleHours: routing.totalCycleHours, totalStandardHours: routing.totalStandardHours,
        totalCost: routing.totalCost,
      },
      operations: operations.map((o) => ({
        id: o.id, operationNumber: o.operationNumber, operationCode: o.operationCode,
        description: o.description, workCenterId: o.workCenterId, machineId: o.machineId,
        setupTimeMinutes: o.setupTimeMinutes, cycleTimeMinutes: o.cycleTimeMinutes,
        standardTimeMinutes: o.standardTimeMinutes, quantityPerCycle: o.quantityPerCycle,
        costPerHour: o.costPerHour, operationCost: o.operationCost,
        predecessorOperationId: o.predecessorOperationId, inspectionRequired: o.inspectionRequired,
        toolRequirements: o.toolRequirements, materialRequirements: o.materialRequirements,
        qualityCheckpoints: o.qualityCheckpoints,
      })),
    };

    // Transactional outbox (G-13): revision + outbox row commit together.
    const saved = await this.dataSource.transaction(async (em) => {
      const rev = em.getRepository(EngineeringRoutingRevision).create({
        routingId,
        version,
        snapshot,
        changeSummary: data.changeSummary ?? null,
        releasedBy: userId,
        releasedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
        tenantId: routing.tenantId ?? tenantId ?? undefined,
      });
      const savedRev = await em.getRepository(EngineeringRoutingRevision).save(rev);
      await this.outboxService.append(
        EngineeringDomainEventType.ROUTING_VERSIONED,
        'EngineeringRoutingRevision',
        savedRev.id,
        { projectId: routing.projectId, entityId: routing.id, entityNumber: routing.routingNumber, version },
        { tenantId: routing.tenantId, actorId: userId, em },
      );
      return savedRev;
    });

    routing.version = version;
    routing.updatedBy = userId;
    await this.routingRepo.save(routing);

    await this.auditService.logBusinessEvent('engineering.routing.revisioned', 'EngineeringRouting', routingId, userId ?? 'system', {
      version,
      tenantId: routing.tenantId,
    });
    return saved;
  }

  async listRevisions(routingId: string, tenantId?: string | null) {
    await this.findOne(routingId, tenantId);
    const where: any = { routingId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    return this.revisionRepo.find({ where, order: { version: 'DESC' } });
  }

  /** Compare two routing revision snapshots operation-by-operation. */
  async compareRevisions(routingId: string, versionA: number, versionB: number, tenantId?: string | null) {
    await this.findOne(routingId, tenantId);
    const find = async (version: number) => {
      const rev = await this.revisionRepo.findOne({
        where: { routingId, version, deletedAt: IsNull() },
      });
      if (!rev) throw new NotFoundException(`Routing revision v${version} not found`);
      return rev;
    };
    const a = await find(versionA);
    const b = await find(versionB);
    const opsA = a.snapshot?.operations ?? [];
    const opsB = b.snapshot?.operations ?? [];
    const byId = new Map<string, any>(opsB.map((o: any) => [o.id, o] as [string, any]));

    const added: any[] = [];
    const removed: any[] = [];
    const changed: { operation: any; fields: string[] }[] = [];
    for (const opA of opsA) {
      const opB = byId.get(opA.id);
      if (!opB) { removed.push(opA); continue; }
      const fields = Object.keys(opB).filter((k) => opB[k] !== opA[k]);
      if (fields.length) changed.push({ operation: opA, fields });
      byId.delete(opA.id);
    }
    for (const rest of byId.values()) added.push(rest);

    return {
      routingId,
      versionA,
      versionB,
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      operations: { added, removed, changed },
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Predecessor sequencing validation: the predecessor must exist in the
   * same routing and must not create a cycle (walking predecessor chains
   * must never return to the operation itself).
   */
  private async validatePredecessor(routingId: string, operationId: string | null, predecessorId: string | null, tenantId?: string | null) {
    if (!predecessorId) return;
    if (operationId && predecessorId === operationId) {
      throw new BadRequestException('An operation cannot be its own predecessor');
    }
    const where: any = { id: predecessorId, routingId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const predecessor = await this.operationRepo.findOne({ where });
    if (!predecessor) {
      throw new BadRequestException('Predecessor operation not found in this routing');
    }
    if (operationId) {
      const visited = new Set<string>([operationId]);
      let cursor: EngineeringOperation | null = predecessor;
      while (cursor && cursor.predecessorOperationId) {
        if (visited.has(cursor.predecessorOperationId)) {
          throw new BadRequestException('Predecessor chain would create a cycle');
        }
        visited.add(cursor.predecessorOperationId);
        const next: any = { id: cursor.predecessorOperationId, routingId, deletedAt: IsNull() };
        if (tenantId) next.tenantId = tenantId;
        cursor = await this.operationRepo.findOne({ where: next });
      }
    }
  }

  private async generateRoutingNumber(tenantId: string | null | undefined, attempt = 0): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RTG-${year}-`;
    const where: any = { routingNumber: Like(`${prefix}%`) };
    if (tenantId) where.tenantId = tenantId;
    const count = await this.routingRepo.count({ where });
    const seq = count + 1 + attempt;
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  private publish(routing: EngineeringRouting, eventType: EngineeringDomainEventType, payload: Record<string, any> = {}, actorId?: string | null) {
    const event = {
      eventType,
      occurredAt: new Date(),
      tenantId: routing.tenantId,
      actorId: actorId ?? null,
      payload: {
        projectId: routing.projectId,
        entityId: routing.id,
        entityNumber: routing.routingNumber,
        ...payload,
      },
    };
    this.eventBus.publish(event);
    this.aiHooks.dispatchEvent(event).catch(() => undefined);
  }
}
