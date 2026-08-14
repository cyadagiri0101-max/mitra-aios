import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, Like, In } from 'typeorm';
import { EngineeringChangeRequest, ECRStatus, ChangeType, ECRPriority } from '../entities/engineeringchangerequest.entity';
import { EngineeringChangeOrder, ECOStatus } from '../entities/engineeringchangeorder.entity';
import { EngineeringChangeNotice, ECNStatus } from '../entities/engineering-change-notice.entity';
import { EngineeringChangeImpact, ImpactType, ImpactSeverity, ImpactDisposition } from '../entities/engineering-change-impact.entity';
import { WorkflowService } from '../../workflow/services/workflow.service';
import { AuditService } from '../../audit/services/audit.service';
import { EngineeringEventBus } from '../../engineering/services/engineering-event-bus.service';
import { EngineeringAiHooksService } from '../../engineering/services/engineering-ai-hooks.service';
import { EngineeringDomainEventType } from '../../engineering/events/engineering.events';

export const CHANGE_WORKFLOW_TYPE = 'engineering_change';

const STATUS_BY_STATE: Record<string, ECRStatus> = {
  REQUEST: ECRStatus.DRAFT,
  REVIEW: ECRStatus.UNDER_REVIEW,
  APPROVAL: ECRStatus.APPROVED,
  IMPLEMENTATION: ECRStatus.IMPLEMENTED,
  VERIFICATION: ECRStatus.APPROVED,
  RELEASE: ECRStatus.CLOSED,
  REJECTED: ECRStatus.REJECTED,
};

export interface ChangeActor {
  userId: string;
  userRole: string[];
  userPermissions: string[];
  tenantId?: string | null;
  name?: string;
}

/**
 * Engineering Change Management — ECR → ECO → ECN lifecycle.
 *
 * The `engineering_change` DB-driven workflow drives the ECR state:
 * REQUEST → REVIEW → APPROVAL → IMPLEMENTATION → VERIFICATION → RELEASE
 * (REJECTED terminal). ECOs derive from approved ECRs; ECNs are issued from
 * ECOs to notify manufacturing. Impact analysis links changes to drawings,
 * BOMs, routings, work orders and projects.
 */
@Injectable()
export class EngineeringChangeService {
  constructor(
    @InjectRepository(EngineeringChangeRequest) private readonly ecrRepo: Repository<EngineeringChangeRequest>,
    @InjectRepository(EngineeringChangeOrder) private readonly ecoRepo: Repository<EngineeringChangeOrder>,
    @InjectRepository(EngineeringChangeNotice) private readonly ecnRepo: Repository<EngineeringChangeNotice>,
    @InjectRepository(EngineeringChangeImpact) private readonly impactRepo: Repository<EngineeringChangeImpact>,
    private readonly dataSource: DataSource,
    private readonly workflowService: WorkflowService,
    private readonly auditService: AuditService,
    private readonly eventBus: EngineeringEventBus,
    private readonly aiHooks: EngineeringAiHooksService,
  ) {}

  // ── ECR ───────────────────────────────────────────────────────────────────

  /** Fail-closed guard — tenant context is mandatory for tenant-scoped data. */
  private requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for tenant-scoped operation');
    }
    return tenantId;
  }

  async findECRs(tenantId?: string | null, query: Record<string, any> = {}) {
    const scopeTenant = this.requireTenant(tenantId);
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const qb = this.ecrRepo.createQueryBuilder('e').where('e.deleted_at IS NULL');
    qb.andWhere('e.tenant_id = :tenantId', { tenantId: scopeTenant });
    if (query.search) {
      qb.andWhere('(e.ecr_number ILIKE :search OR e.title ILIKE :search)', { search: `%${query.search}%` });
    }
    if (query.projectId) qb.andWhere('e.project_id = :projectId', { projectId: query.projectId });
    if (query.status) qb.andWhere('e.status = :status', { status: query.status });
    if (query.changeType) qb.andWhere('e.change_type = :changeType', { changeType: query.changeType });
    if (query.priority) qb.andWhere('e.priority = :priority', { priority: query.priority });

    const SORTABLE = new Set(['ecrNumber', 'title', 'createdAt', 'status', 'priority', 'requiredByDate']);
    const sortBy = query.sortBy ?? 'createdAt';
    const field = SORTABLE.has(sortBy) ? `e.${sortBy}` : 'e.created_at';
    const direction = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(field, direction).addOrderBy('e.created_at', 'DESC');

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findECR(id: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const where: any = { id, deletedAt: IsNull(), tenantId: scopeTenant };
    const ecr = await this.ecrRepo.findOne({ where });
    if (!ecr) throw new NotFoundException('Change request not found');
    return ecr;
  }

  async createECR(data: Record<string, any>, actor: ChangeActor) {
    if (!data.projectId) throw new BadRequestException('projectId is required — no orphan engineering records');
    const scopeTenant = this.requireTenant(actor.tenantId);

    let saved: EngineeringChangeRequest | undefined;
    let lastErr: any;
    for (let attempt = 0; attempt < 5; attempt++) {
      const ecrNumber = await this.generateNumber(this.ecrRepo, 'ecrNumber', 'ECR', scopeTenant, attempt);
      const ecr = this.ecrRepo.create({
        ...data,
        ecrNumber,
        changeType: data.changeType ?? ChangeType.DESIGN,
        priority: data.priority ?? ECRPriority.MEDIUM,
        status: ECRStatus.DRAFT,
        requestedBy: actor.userId,
        requestedDate: data.requestedDate ? new Date(data.requestedDate) : new Date(),
        createdBy: actor.userId,
        updatedBy: actor.userId,
        tenantId: scopeTenant,
      });
      try {
        saved = await this.ecrRepo.save(ecr);
        break;
      } catch (err: any) {
        if (err?.code !== '23505') throw err;
        lastErr = err;
      }
    }
    if (!saved) throw lastErr;

    try {
      const instance = await this.workflowService.createInstance(CHANGE_WORKFLOW_TYPE, 'change', saved.id, {
        userId: actor.userId,
        userRole: actor.userRole,
        userPermissions: actor.userPermissions,
        tenantId: scopeTenant,
      });
      saved.workflowInstanceId = instance.id;
      await this.ecrRepo.save(saved);
    } catch { /* workflow states not seeded yet */ }

    await this.auditService.logBusinessEvent('engineering.change.requested', 'EngineeringChangeRequest', saved.id, actor.userId ?? 'system', {
      ecrNumber: saved.ecrNumber,
      title: saved.title,
      projectId: saved.projectId,
      tenantId: saved.tenantId,
    });
    this.publish(EngineeringDomainEventType.CHANGE_REQUESTED, {
      projectId: saved.projectId, entityId: saved.id, entityNumber: saved.ecrNumber, title: saved.title,
    }, actor.userId);
    return saved;
  }

  async updateECR(id: string, data: Record<string, any>, actor: ChangeActor) {
    const ecr = await this.findECR(id, actor.tenantId);
    if (ecr.status === ECRStatus.CLOSED || ecr.status === ECRStatus.REJECTED) {
      throw new BadRequestException(`Cannot update a ${ecr.status} change request`);
    }
    Object.assign(ecr, data, { updatedBy: actor.userId });
    const saved = await this.ecrRepo.save(ecr);
    await this.auditService.logBusinessEvent('engineering.change.updated', 'EngineeringChangeRequest', saved.id, actor.userId ?? 'system', {
      changedFields: Object.keys(data),
      tenantId: saved.tenantId,
    });
    return saved;
  }

  async removeECR(id: string, actor: ChangeActor) {
    const ecr = await this.findECR(id, actor.tenantId);
    await this.dataSource.transaction(async (em) => {
      const now = new Date();
      ecr.deletedAt = now;
      ecr.updatedBy = actor.userId;
      await em.getRepository(EngineeringChangeRequest).save(ecr);
      await em.getRepository(EngineeringChangeImpact).update(
        { ecrId: id, deletedAt: IsNull() },
        { deletedAt: now, updatedBy: actor.userId },
      );
      const orders = await em.getRepository(EngineeringChangeOrder).find({ where: { ecrId: id, deletedAt: IsNull() }, select: ['id'] });
      if (orders.length) {
        const orderIds = orders.map((o) => o.id);
        await em.getRepository(EngineeringChangeOrder).update(
          { id: In(orderIds), deletedAt: IsNull() },
          { deletedAt: now, updatedBy: actor.userId },
        );
        await em.getRepository(EngineeringChangeNotice).update(
          { ecoId: In(orderIds), deletedAt: IsNull() },
          { deletedAt: now, updatedBy: actor.userId },
        );
      }
    });
    await this.auditService.logBusinessEvent('engineering.change.deleted', 'EngineeringChangeRequest', id, actor.userId ?? 'system', {
      ecrNumber: ecr.ecrNumber,
      tenantId: ecr.tenantId,
    });
    return { deleted: true, id };
  }

  // ── Impact analysis ───────────────────────────────────────────────────────

  async listImpacts(ecrId: string, tenantId?: string | null) {
    await this.findECR(ecrId, tenantId);
    const where: any = { ecrId, deletedAt: IsNull(), tenantId: this.requireTenant(tenantId) };
    return this.impactRepo.find({ where, order: { severity: 'ASC' } as any });
  }

  async addImpact(ecrId: string, data: Record<string, any>, actor: ChangeActor) {
    const ecr = await this.findECR(ecrId, actor.tenantId);
    const impact = this.impactRepo.create({
      ecrId,
      impactType: data.impactType ?? ImpactType.OTHER,
      entityId: data.entityId,
      entityNumber: data.entityNumber ?? null,
      impactDescription: data.impactDescription ?? null,
      severity: data.severity ?? ImpactSeverity.MEDIUM,
      disposition: data.disposition ?? ImpactDisposition.RETAIN,
      isResolved: false,
      createdBy: actor.userId,
      updatedBy: actor.userId,
      tenantId: ecr.tenantId ?? actor.tenantId ?? undefined,
    });
    const saved = await this.impactRepo.save(impact);
    await this.auditService.logBusinessEvent('engineering.change.impact_added', 'EngineeringChangeImpact', saved.id, actor.userId ?? 'system', {
      ecrId,
      impactType: saved.impactType,
      entityId: saved.entityId,
      tenantId: saved.tenantId,
    });
    return saved;
  }

  async updateImpact(ecrId: string, impactId: string, data: Record<string, any>, actor: ChangeActor) {
    await this.findECR(ecrId, actor.tenantId);
    const where: any = { id: impactId, ecrId, deletedAt: IsNull(), tenantId: this.requireTenant(actor.tenantId) };
    const impact = await this.impactRepo.findOne({ where });
    if (!impact) throw new NotFoundException('Impact entry not found');
    Object.assign(impact, data, { updatedBy: actor.userId });
    return this.impactRepo.save(impact);
  }

  async removeImpact(ecrId: string, impactId: string, actor: ChangeActor) {
    await this.findECR(ecrId, actor.tenantId);
    const where: any = { id: impactId, ecrId, deletedAt: IsNull(), tenantId: this.requireTenant(actor.tenantId) };
    const impact = await this.impactRepo.findOne({ where });
    if (!impact) throw new NotFoundException('Impact entry not found');
    impact.deletedAt = new Date();
    impact.updatedBy = actor.userId;
    await this.impactRepo.save(impact);
    return { deleted: true, id: impactId };
  }

  // ── ECO ───────────────────────────────────────────────────────────────────

  async findECOs(tenantId?: string | null, query: Record<string, any> = {}) {
    const scopeTenant = this.requireTenant(tenantId);
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const qb = this.ecoRepo.createQueryBuilder('e').where('e.deleted_at IS NULL');
    qb.andWhere('e.tenant_id = :tenantId', { tenantId: scopeTenant });
    if (query.search) {
      qb.andWhere('(e.eco_number ILIKE :search OR e.implementation_plan ILIKE :search)', { search: `%${query.search}%` });
    }
    if (query.ecrId) qb.andWhere('e.ecr_id = :ecrId', { ecrId: query.ecrId });
    if (query.projectId) qb.andWhere('e.project_id = :projectId', { projectId: query.projectId });
    if (query.status) qb.andWhere('e.status = :status', { status: query.status });

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).orderBy('e.created_at', 'DESC').getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findECO(id: string, tenantId?: string | null) {
    const where: any = { id, deletedAt: IsNull(), tenantId: this.requireTenant(tenantId) };
    const eco = await this.ecoRepo.findOne({ where });
    if (!eco) throw new NotFoundException('Change order not found');
    return eco;
  }

  /**
   * Create an ECO from an approved/implemented ECR. The ECO shares the
   * ECR's project and workflow state (implementation phase).
   */
  async createECO(data: Record<string, any>, actor: ChangeActor) {
    const ecr = await this.findECR(data.ecrId, actor.tenantId);
    const scopeTenant = this.requireTenant(actor.tenantId);
    const projectId = data.projectId ?? ecr.projectId;
    if (!projectId) throw new BadRequestException('projectId is required — no orphan engineering records');

    let saved: EngineeringChangeOrder | undefined;
    let lastErr: any;
    for (let attempt = 0; attempt < 5; attempt++) {
      const ecoNumber = await this.generateNumber(this.ecoRepo, 'ecoNumber', 'ECO', scopeTenant, attempt);
      const eco = this.ecoRepo.create({
        ...data,
        ecoNumber,
        ecrId: ecr.id,
        projectId,
        implementationPlan: data.implementationPlan ?? `Implement change ${ecr.ecrNumber}`,
        status: ECOStatus.DRAFT,
        createdBy: actor.userId,
        updatedBy: actor.userId,
        tenantId: scopeTenant,
      });
      try {
        saved = await this.ecoRepo.save(eco);
        break;
      } catch (err: any) {
        if (err?.code !== '23505') throw err;
        lastErr = err;
      }
    }
    if (!saved) throw lastErr;
    await this.auditService.logBusinessEvent('engineering.change.eco_created', 'EngineeringChangeOrder', saved.id, actor.userId ?? 'system', {
      ecoNumber: saved.ecoNumber,
      ecrId: ecr.id,
      projectId,
      tenantId: saved.tenantId,
    });
    return saved;
  }

  async updateECO(id: string, data: Record<string, any>, actor: ChangeActor) {
    const eco = await this.findECO(id, actor.tenantId);
    Object.assign(eco, data, { updatedBy: actor.userId });
    const saved = await this.ecoRepo.save(eco);
    await this.auditService.logBusinessEvent('engineering.change.eco_updated', 'EngineeringChangeOrder', saved.id, actor.userId ?? 'system', {
      changedFields: Object.keys(data),
      tenantId: saved.tenantId,
    });
    return saved;
  }

  // ── ECN ───────────────────────────────────────────────────────────────────

  async findECNs(tenantId?: string | null, query: Record<string, any> = {}) {
    const scopeTenant = this.requireTenant(tenantId);
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const qb = this.ecnRepo.createQueryBuilder('e').where('e.deleted_at IS NULL');
    qb.andWhere('e.tenant_id = :tenantId', { tenantId: scopeTenant });
    if (query.search) {
      qb.andWhere('(e.ecn_number ILIKE :search OR e.title ILIKE :search)', { search: `%${query.search}%` });
    }
    if (query.projectId) qb.andWhere('e.project_id = :projectId', { projectId: query.projectId });
    if (query.ecoId) qb.andWhere('e.eco_id = :ecoId', { ecoId: query.ecoId });
    if (query.status) qb.andWhere('e.status = :status', { status: query.status });

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).orderBy('e.created_at', 'DESC').getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findECN(id: string, tenantId?: string | null) {
    const where: any = { id, deletedAt: IsNull(), tenantId: this.requireTenant(tenantId) };
    const ecn = await this.ecnRepo.findOne({ where });
    if (!ecn) throw new NotFoundException('Change notice not found');
    return ecn;
  }

  /**
   * Issue an ECN from a released ECO — notifies downstream manufacturing
   * and quality with affected work orders.
   */
  async issueECN(ecoId: string, data: Record<string, any>, actor: ChangeActor) {
    const eco = await this.findECO(ecoId, actor.tenantId);
    const scopeTenant = this.requireTenant(actor.tenantId);
    const projectId = data.projectId ?? eco.projectId;
    if (!projectId) throw new BadRequestException('projectId is required — no orphan engineering records');

    let saved: EngineeringChangeNotice | undefined;
    let lastErr: any;
    for (let attempt = 0; attempt < 5; attempt++) {
      const ecnNumber = await this.generateNumber(this.ecnRepo, 'ecnNumber', 'ECN', scopeTenant, attempt);
      const ecn = this.ecnRepo.create({
        ...data,
        ecnNumber,
        ecoId: eco.id,
        ecrId: eco.ecrId,
        projectId,
        status: ECNStatus.ISSUED,
        issuedBy: actor.userId,
        issuedAt: new Date(),
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
        affectedManufacturingOrders: data.affectedManufacturingOrders ?? null,
        createdBy: actor.userId,
        updatedBy: actor.userId,
        tenantId: scopeTenant,
      });
      try {
        saved = await this.ecnRepo.save(ecn);
        break;
      } catch (err: any) {
        if (err?.code !== '23505') throw err;
        lastErr = err;
      }
    }
    if (!saved) throw lastErr;
    await this.auditService.logBusinessEvent('engineering.change.notice_issued', 'EngineeringChangeNotice', saved.id, actor.userId ?? 'system', {
      ecnNumber: saved.ecnNumber,
      ecoId: eco.id,
      projectId,
      tenantId: saved.tenantId,
    });
    this.publish(EngineeringDomainEventType.CHANGE_NOTICE_ISSUED, {
      projectId, entityId: saved.id, entityNumber: saved.ecnNumber, ecoId: eco.id,
    }, actor.userId);
    return saved;
  }

  async updateECN(id: string, data: Record<string, any>, actor: ChangeActor) {
    const ecn = await this.findECN(id, actor.tenantId);
    Object.assign(ecn, data, { updatedBy: actor.userId });
    const saved = await this.ecnRepo.save(ecn);
    await this.auditService.logBusinessEvent('engineering.change.notice_updated', 'EngineeringChangeNotice', saved.id, actor.userId ?? 'system', {
      changedFields: Object.keys(data),
      tenantId: saved.tenantId,
    });
    return saved;
  }

  // ── DB-driven workflow ────────────────────────────────────────────────────

  async getWorkflow(id: string, actor: ChangeActor) {
    const ecr = await this.findECR(id, actor.tenantId);
    const workflowType = CHANGE_WORKFLOW_TYPE;
    const tenantId = actor.tenantId ?? ecr.tenantId;

    let instance = await this.workflowService.findInstanceByEntity('change', ecr.id, tenantId ?? undefined);
    if (!instance) {
      instance = await this.workflowService.createInstance(workflowType, 'change', ecr.id, {
        userId: actor.userId,
        userRole: actor.userRole,
        userPermissions: actor.userPermissions,
        tenantId: tenantId ?? undefined,
      });
      ecr.workflowInstanceId = instance.id;
      await this.ecrRepo.save(ecr);
    }

    const transitions = await this.workflowService.findTransitionsForState(
      instance.currentStateId,
      tenantId ?? undefined,
      workflowType,
    );
    const history = await this.workflowService.getInstanceHistory(instance.id, tenantId ?? undefined);
    const visible = transitions.filter((t) => {
      if (t.requiredRoles?.length && !t.requiredRoles.some((r) => actor.userRole.includes(r))) return false;
      if (t.requiredPermissions?.length && !t.requiredPermissions.some((p) => actor.userPermissions.includes(p))) return false;
      return true;
    });

    return {
      workflowType,
      instanceId: instance.id,
      currentState: instance.currentState,
      stateEnteredAt: instance.stateEnteredAt,
      availableTransitions: visible,
      history,
    };
  }

  /**
   * Execute a DB-driven transition on the ECR workflow. Mirrors the entity
   * status column from the workflow state. One transaction for everything.
   */
  async transition(id: string, transitionId: string, actor: ChangeActor, remarks?: string) {
    const ecr = await this.findECR(id, actor.tenantId);

    const result = await this.dataSource.transaction(async (em) => {
      const ecrRepo = em.getRepository(EngineeringChangeRequest);
      const current = await ecrRepo.findOne({ where: { id: ecr.id, deletedAt: IsNull() } });
      if (!current) throw new NotFoundException('Change request not found');

      let instance = await this.workflowService.findInstanceByEntity('change', ecr.id, actor.tenantId ?? ecr.tenantId ?? undefined, em);
      if (!instance) {
        instance = await this.workflowService.createInstance(CHANGE_WORKFLOW_TYPE, 'change', ecr.id, {
          userId: actor.userId,
          userRole: actor.userRole,
          userPermissions: actor.userPermissions,
          tenantId: actor.tenantId ?? ecr.tenantId ?? undefined,
        }, em);
        current.workflowInstanceId = instance.id;
      }

      const updated = await this.workflowService.executeTransition(
        instance.id,
        transitionId,
        {
          userId: actor.userId,
          userRole: actor.userRole,
          userPermissions: actor.userPermissions,
          tenantId: actor.tenantId ?? ecr.tenantId ?? undefined,
          remarks,
        },
        em,
      );

      const fromState = updated.history?.[updated.history.length - 1]?.fromState ?? current.status;
      const toState = updated.currentState?.stateCode ?? fromState;

      current.status = STATUS_BY_STATE[toState] ?? current.status;
      current.updatedBy = actor.userId;
      if (toState === 'RELEASE') current.approvedAt = new Date();
      if (toState === 'REJECTED') current.rejectionReason = remarks ?? 'Rejected';
      await ecrRepo.save(current);

      await this.auditService.logBusinessEvent(
        'engineering.change.workflow.transition',
        'EngineeringChangeRequest',
        id,
        actor.userId ?? 'system',
        { fromState, toState, transitionId, remarks, tenantId: ecr.tenantId },
        em,
      );

      return {
        entity: { id: ecr.id, status: current.status },
        transition: { from: fromState, to: toState, transitionId, performedBy: actor.userId, at: new Date() },
        instanceId: updated.id,
      };
    });

    this.publish(EngineeringDomainEventType.CHANGE_APPROVED, {
      projectId: ecr.projectId,
      entityId: ecr.id,
      entityNumber: ecr.ecrNumber,
      from: result.transition.from,
      to: result.transition.to,
    }, actor.userId);
    return result;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async generateNumber(
    repo: Repository<any>,
    field: string,
    prefix: string,
    tenantId: string | null | undefined,
    attempt = 0,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const fullPrefix = `${prefix}-${year}-`;
    const where: any = { [field]: Like(`${fullPrefix}%`) };
    if (tenantId) where.tenantId = tenantId;
    const count = await repo.count({ where });
    const seq = count + 1 + attempt;
    return `${fullPrefix}${String(seq).padStart(4, '0')}`;
  }

  private publish(eventType: EngineeringDomainEventType, payload: Record<string, any>, actorId?: string | null) {
    const event = {
      eventType,
      occurredAt: new Date(),
      tenantId: payload.tenantId ?? null,
      actorId: actorId ?? null,
      payload,
    };
    this.eventBus.publish(event);
    this.aiHooks.dispatchEvent(event).catch(() => undefined);
  }
}
