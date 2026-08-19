import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, IsNull, EntityManager } from 'typeorm';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import {
  EngineeringDecision, DecisionStatus, DecisionType,
} from '../entities/engineering-decision.entity';
import { AuditService } from '../../audit/services/audit.service';
import { AuditEventType } from '../../audit/entities/audit-log.entity';
import { OutboxService } from '../../platform/services/outbox.service';

const ALLOWED_TRANSITIONS: Record<DecisionStatus, DecisionStatus[]> = {
  [DecisionStatus.DRAFT]: [DecisionStatus.SUBMITTED, DecisionStatus.CANCELLED],
  [DecisionStatus.SUBMITTED]: [DecisionStatus.APPROVED, DecisionStatus.REJECTED, DecisionStatus.CANCELLED, DecisionStatus.SUPERSEDED],
  [DecisionStatus.APPROVED]: [DecisionStatus.SUPERSEDED],
  [DecisionStatus.REJECTED]: [DecisionStatus.SUPERSEDED],
  [DecisionStatus.SUPERSEDED]: [],
  [DecisionStatus.CANCELLED]: [],
};

/**
 * Engineering Decision Log service.
 *
 * Lifecycle (in-service transition map, ECR convention): DRAFT → SUBMITTED
 * → APPROVED | REJECTED → SUPERSEDED; CANCELLED from DRAFT/SUBMITTED.
 * Supersession is transactional: the successor decision and the original's
 * SUPERSEDED state + audit rows + outbox events commit atomically.
 */
@Injectable()
export class EngineeringDecisionService extends TenantAwareService<EngineeringDecision> {
  constructor(
    @InjectRepository(EngineeringDecision) repo: Repository<EngineeringDecision>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
  ) {
    super(repo, 'EngineeringDecision');
  }

  async findAll(
    tenantId?: string | null,
    page = 1,
    limit = 20,
    projectId?: string,
    status?: string,
    decisionType?: string,
    search?: string,
  ) {
    const scopeTenant = this.requireTenant(tenantId);
    const qb = this.repo
      .createQueryBuilder('d')
      .where('d.deleted_at IS NULL')
      .andWhere('d.tenant_id = :tenantId', { tenantId: scopeTenant });

    if (projectId) qb.andWhere('d.project_id = :projectId', { projectId });
    if (status) qb.andWhere('d.status = :status', { status });
    if (decisionType) qb.andWhere('d.decision_type = :decisionType', { decisionType });
    if (search?.trim()) {
      qb.andWhere(
        '(d.title ILIKE :search OR d.decision_number ILIKE :search OR d.description ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    qb.orderBy('d.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(Math.min(limit, 100));

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(
    dto: Record<string, unknown>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<EngineeringDecision> {
    const scopeTenant = this.requireTenant(tenantId);
    const allowed = this.extractAllowedFields(dto);
    const saved = await this.saveWithNumberRetry(async (decisionNumber: string) => {
      const decision = this.repo.create({
        ...allowed,
        status: DecisionStatus.DRAFT,
        decisionNumber,
        projectId: allowed.projectId ?? null,
        tenantId: scopeTenant,
        createdBy: userId ?? null,
        updatedBy: userId ?? null,
      } as unknown as EngineeringDecision);
      return this.repo.save(decision);
    }, scopeTenant);

    await this.auditService.logBusinessEvent(
      'engineering_decision.created',
      'EngineeringDecision',
      saved.id,
      userId ?? 'system',
      { decisionNumber: saved.decisionNumber, title: saved.title, projectId: saved.projectId ?? undefined, tenantId: scopeTenant },
      undefined,
      saved.projectId ?? undefined,
    );
    await this.outboxService.append(
      'engineering_decision.created',
      'engineering_decision',
      saved.id,
      { decisionNumber: saved.decisionNumber, title: saved.title, status: saved.status, projectId: saved.projectId },
      { tenantId: scopeTenant, actorId: userId ?? null },
    );
    return saved;
  }

  async update(
    id: string,
    dto: Record<string, unknown>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<EngineeringDecision> {
    const scopeTenant = this.requireTenant(tenantId);
    const decision = await this.findOne(id, scopeTenant);
    if (![DecisionStatus.DRAFT, DecisionStatus.SUBMITTED].includes(decision.status)) {
      throw new BadRequestException(
        `Decision in status ${decision.status} cannot be edited; only DRAFT/SUBMITTED decisions are editable`,
      );
    }

    const allowed = this.extractAllowedFields(dto);
    Object.assign(decision, allowed, { updatedBy: userId ?? null });
    const saved = await this.repo.save(decision);
    await this.auditService.logBusinessEvent(
      'engineering_decision.updated',
      'EngineeringDecision',
      saved.id,
      userId ?? 'system',
      { decisionNumber: saved.decisionNumber, changedFields: Object.keys(allowed), projectId: saved.projectId ?? undefined, tenantId: scopeTenant },
      undefined,
      saved.projectId ?? undefined,
    );
    return saved;
  }

  async submit(id: string, userId?: string, tenantId?: string | null): Promise<EngineeringDecision> {
    const decision = await this.findOne(id, tenantId);
    this.assertTransition(decision.status, DecisionStatus.SUBMITTED);
    return this.transition(
      decision,
      DecisionStatus.SUBMITTED,
      'engineering_decision.submitted',
      userId,
      undefined,
      { submittedBy: userId ?? 'system' },
    );
  }

  async approve(id: string, userId?: string, tenantId?: string | null): Promise<EngineeringDecision> {
    const decision = await this.findOne(id, tenantId);
    this.assertTransition(decision.status, DecisionStatus.APPROVED);
    decision.approvedBy = userId ?? null;
    decision.approvedAt = new Date();
    return this.transition(
      decision,
      DecisionStatus.APPROVED,
      'engineering_decision.approved',
      userId,
      undefined,
      { approvedBy: userId ?? 'system' },
    );
  }

  async reject(
    id: string,
    reason: string,
    userId?: string,
    tenantId?: string | null,
  ): Promise<EngineeringDecision> {
    if (!reason?.trim()) throw new BadRequestException('reason is required when rejecting a decision');
    const decision = await this.findOne(id, tenantId);
    this.assertTransition(decision.status, DecisionStatus.REJECTED);
    decision.rejectedBy = userId ?? null;
    decision.rejectedAt = new Date();
    decision.rejectionReason = reason.trim();
    return this.transition(
      decision,
      DecisionStatus.REJECTED,
      'engineering_decision.rejected',
      userId,
      undefined,
      { rejectedBy: userId ?? 'system', reason: reason.trim() },
    );
  }

  async cancel(id: string, userId?: string, tenantId?: string | null): Promise<EngineeringDecision> {
    const decision = await this.findOne(id, tenantId);
    this.assertTransition(decision.status, DecisionStatus.CANCELLED);
    return this.transition(
      decision,
      DecisionStatus.CANCELLED,
      'engineering_decision.cancelled',
      userId,
      undefined,
      { cancelledBy: userId ?? 'system' },
    );
  }

  /**
   * Supersede a decision with a successor — one transaction.
   * - successor created (supersedesDecisionId → original)
   * - original moved to SUPERSEDED (supersededByDecisionId → successor)
   * - audit rows + outbox events for both records
   */
  async supersede(
    id: string,
    dto: Record<string, unknown>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<{ original: EngineeringDecision; successor: EngineeringDecision }> {
    const scopeTenant = this.requireTenant(tenantId);
    const original = await this.findOne(id, scopeTenant);
    this.assertTransition(original.status, DecisionStatus.SUPERSEDED);
    if (!dto.title) throw new BadRequestException('title is required for the successor decision');

    return this.dataSource.transaction(async (em: EntityManager) => {
      const successor = await this.saveWithNumberRetry(async (decisionNumber: string) => {
        const row = em.getRepository(EngineeringDecision).create({
          decisionNumber,
          title: String(dto.title),
          decisionType: (dto.decisionType as DecisionType) ?? original.decisionType,
          description: (dto.description as string) ?? original.description,
          context: (dto.context as string) ?? original.context,
          optionsConsidered: (dto.optionsConsidered as string) ?? original.optionsConsidered,
          selectedOption: (dto.selectedOption as string) ?? original.selectedOption,
          rationale: (dto.rationale as string) ?? original.rationale,
          decision: (dto.decision as string) ?? original.decision,
          decisionDate: dto.decisionDate ? new Date(String(dto.decisionDate)) : original.decisionDate,
          decisionOwnerId: (dto.decisionOwnerId as string) ?? original.decisionOwnerId,
          projectId: original.projectId,
          supersedesDecisionId: original.id,
          status: DecisionStatus.DRAFT,
          tenantId: scopeTenant,
          createdBy: userId ?? null,
          updatedBy: userId ?? null,
        } as unknown as EngineeringDecision);
        return em.getRepository(EngineeringDecision).save(row);
      }, scopeTenant);
      const savedSuccessor = successor;

      original.status = DecisionStatus.SUPERSEDED;
      original.supersededByDecisionId = savedSuccessor.id;
      original.updatedBy = userId ?? null;
      const savedOriginal = await em.getRepository(EngineeringDecision).save(original);

      await this.auditService.log(
        {
          entityType: 'EngineeringDecision',
          entityId: savedOriginal.id,
          action: 'engineering_decision.superseded',
          eventType: AuditEventType.BUSINESS,
          userId: userId ?? 'system',
          tenantId: scopeTenant,
          projectId: savedOriginal.projectId ?? undefined,
          afterState: {
            status: savedOriginal.status,
            supersededByDecisionId: savedSuccessor.id,
            successorNumber: savedSuccessor.decisionNumber,
          },
        },
        em,
      );
      await this.auditService.log(
        {
          entityType: 'EngineeringDecision',
          entityId: savedSuccessor.id,
          action: 'engineering_decision.created',
          eventType: AuditEventType.BUSINESS,
          userId: userId ?? 'system',
          tenantId: scopeTenant,
          projectId: savedSuccessor.projectId ?? undefined,
          afterState: { decisionNumber: savedSuccessor.decisionNumber, title: savedSuccessor.title, supersedesDecisionId: savedOriginal.id },
        },
        em,
      );

      await this.outboxService.append(
        'engineering_decision.superseded',
        'engineering_decision',
        savedOriginal.id,
        { decisionNumber: savedOriginal.decisionNumber, supersededByDecisionId: savedSuccessor.id, successorNumber: savedSuccessor.decisionNumber },
        { tenantId: scopeTenant, actorId: userId ?? null, em },
      );
      await this.outboxService.append(
        'engineering_decision.created',
        'engineering_decision',
        savedSuccessor.id,
        { decisionNumber: savedSuccessor.decisionNumber, title: savedSuccessor.title, status: savedSuccessor.status, supersedesDecisionId: savedOriginal.id },
        { tenantId: scopeTenant, actorId: userId ?? null, em },
      );

      return { original: savedOriginal, successor: savedSuccessor };
    });
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  private assertTransition(current: DecisionStatus, next: DecisionStatus): void {
    const allowed = ALLOWED_TRANSITIONS[current];
    if (!allowed?.includes(next)) {
      throw new BadRequestException(`Invalid transition: ${current} → ${next}`);
    }
  }

  private async transition(
    decision: EngineeringDecision,
    next: DecisionStatus,
    auditAction: string,
    userId?: string,
    reason?: string,
    metadata?: Record<string, unknown>,
  ): Promise<EngineeringDecision> {
    decision.status = next;
    decision.updatedBy = userId ?? null;
    const saved = await this.repo.save(decision);
    await this.auditService.logBusinessEvent(
      auditAction,
      'EngineeringDecision',
      saved.id,
      userId ?? 'system',
      { decisionNumber: saved.decisionNumber, projectId: saved.projectId ?? undefined, ...(reason ? { reason } : {}), ...metadata },
      undefined,
      saved.projectId ?? undefined,
    );
    await this.outboxService.append(
      `engineering_decision.${next.toLowerCase()}`,
      'engineering_decision',
      saved.id,
      { decisionNumber: saved.decisionNumber, status: saved.status, projectId: saved.projectId },
      { tenantId: saved.tenantId, actorId: userId ?? null },
    );
    return saved;
  }

  /** DEC-{year}-{NNNN} with unique-violation retry (ECR generateNumber convention). */
  private async generateDecisionNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DEC-${year}-`;
    const count = await this.repo.count({
      where: { tenantId, deletedAt: IsNull() } as any,
    });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Persist a new decision with a generated number; if the number collides
   * (unique index on decision_number+tenant_id, PG 23505), regenerate and
   * retry — mirrors the ECR generateNumber-with-retry convention.
   */
  private async saveWithNumberRetry<T extends EngineeringDecision>(
    save: (decisionNumber: string) => Promise<T>,
    tenantId: string,
  ): Promise<T> {
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidate = await this.generateDecisionNumber(tenantId);
      try {
        return await save(candidate);
      } catch (err: any) {
        if (err?.code === '23505' || String(err?.message ?? '').includes('duplicate key')) {
          continue;
        }
        throw err;
      }
    }
    throw new BadRequestException('Could not allocate a unique decision number — retry the request');
  }
}