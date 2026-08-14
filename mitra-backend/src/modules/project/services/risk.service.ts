import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ProjectRisk, RiskStatus } from '../entities/projectrisk.entity';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';
import { DomainEventBus } from './domain-event-bus.service';
import { ProjectDomainEventType } from '../events/project.events';

/**
 * Risk register: risks with impact/probability, computed exposure
 * (impact × probability), mitigation, owner, review cadence and status.
 */
@Injectable()
export class RiskService {
  constructor(
    @InjectRepository(ProjectRisk) private readonly riskRepo: Repository<ProjectRisk>,
    @InjectRepository(ProjectActivityLog) private readonly activityRepo: Repository<ProjectActivityLog>,
    private readonly eventBus: DomainEventBus,
  ) {}

  private requireTenant(tenantId?: string | null): string {
    if (!tenantId || tenantId.trim() === '') {
      throw new ForbiddenException('Tenant context is required');
    }
    return tenantId;
  }

  private computeExposure(impact: number, probability: number): number {
    return Math.min(25, Math.max(1, Math.round(impact) * Math.round(probability)));
  }

  async findByProject(projectId: string, query: Record<string, any> = {}, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const qb = this.riskRepo.createQueryBuilder('r')
      .where('r.project_id = :projectId', { projectId })
      .andWhere('r.deleted_at IS NULL')
      .andWhere('r.tenant_id = :tenantId', { tenantId: scopeTenant });

    if (query.status) qb.andWhere('r.status = :status', { status: query.status });
    if (query.category) qb.andWhere('r.category = :category', { category: query.category });
    if (query.ownerId) qb.andWhere('r.owner_id = :ownerId', { ownerId: query.ownerId });
    if (query.minExposure) qb.andWhere('r.exposure >= :minExposure', { minExposure: Number(query.minExposure) });

    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    qb.orderBy('r.exposure', 'DESC').addOrderBy('r.created_at', 'DESC');
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Risk dashboard aggregation: counts, exposure distribution, heat map. */
  async dashboard(projectId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const risks = await this.riskRepo.find({
      where: { projectId, tenantId: scopeTenant, deletedAt: IsNull() },
      take: 2000,
    });
    const byStatus: Record<string, number> = { OPEN: 0, MITIGATING: 0, CLOSED: 0 };
    const byCategory: Record<string, number> = {};
    const byLevel: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    let totalExposure = 0;
    let maxExposure = 0;

    for (const r of risks) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
      const level = r.exposure >= 16 ? 'CRITICAL' : r.exposure >= 9 ? 'HIGH' : r.exposure >= 4 ? 'MEDIUM' : 'LOW';
      byLevel[level] = (byLevel[level] ?? 0) + 1;
      totalExposure += r.exposure;
      maxExposure = Math.max(maxExposure, r.exposure);
    }

    const open = risks.filter((r) => r.status !== RiskStatus.CLOSED);
    const overdueReviews = open.filter(
      (r) => r.reviewDate && new Date(r.reviewDate) < new Date(),
    ).length;

    return {
      projectId,
      total: risks.length,
      open: byStatus.OPEN + byStatus.MITIGATING,
      closed: byStatus.CLOSED,
      byStatus,
      byCategory,
      byLevel,
      averageExposure: risks.length ? Math.round(totalExposure / risks.length) : 0,
      maxExposure,
      overdueReviews,
      criticalRisks: risks.filter((r) => r.exposure >= 16 && r.status !== RiskStatus.CLOSED).length,
    };
  }

  async findOne(id: string, tenantId?: string | null): Promise<ProjectRisk> {
    const scopeTenant = this.requireTenant(tenantId);
    const risk = await this.riskRepo.findOne({ where: { id, deletedAt: IsNull(), tenantId: scopeTenant } });
    if (!risk) throw new NotFoundException('Risk not found');
    return risk;
  }

  async create(projectId: string, data: Record<string, any>, userId: string, userName: string | null, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    if (data.status === RiskStatus.CLOSED) {
      throw new BadRequestException('A risk cannot be created as CLOSED — raise it, then close it via the close endpoint');
    }
    const impact = Math.round(Number(data.impact ?? 1));
    const probability = Math.round(Number(data.probability ?? 1));
    const risk = this.riskRepo.create({
      ...data,
      projectId,
      impact,
      probability,
      exposure: this.computeExposure(impact, probability),
      status: data.status ?? RiskStatus.OPEN,
      raisedBy: userId ?? null,
      raisedByName: userName,
      createdBy: userId,
      updatedBy: userId,
      tenantId: scopeTenant,
    });
    const saved = await this.riskRepo.save(risk);

    await this.logActivity(saved, 'risk.created', `Risk raised: ${saved.title}`, userId, scopeTenant);
    this.eventBus.publish({
      eventType: ProjectDomainEventType.RISK_CREATED,
      occurredAt: new Date(),
      projectId,
      tenantId: scopeTenant,
      actorId: userId ?? null,
      payload: { riskId: saved.id, title: saved.title, exposure: saved.exposure },
    });
    return saved;
  }

  async update(id: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const risk = await this.findOne(id, scopeTenant);
    if (data.status !== undefined && data.status !== risk.status) {
      throw new BadRequestException('Status changes are only allowed via POST /:id/close or POST /:id/reopen');
    }
    Object.assign(risk, data, { updatedBy: userId });
    if (data.impact !== undefined || data.probability !== undefined) {
      risk.exposure = this.computeExposure(
        Number(data.impact ?? risk.impact),
        Number(data.probability ?? risk.probability),
      );
    }
    const saved = await this.riskRepo.save(risk);
    await this.logActivity(saved, 'risk.updated', `Risk updated: ${saved.title}`, userId, scopeTenant);
    return saved;
  }

  /** Close an open/mitigating risk with an optional resolution note. */
  async close(id: string, resolution: string | null, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const risk = await this.findOne(id, scopeTenant);
    if (risk.status === RiskStatus.CLOSED) {
      throw new BadRequestException('Risk is already closed');
    }
    risk.status = RiskStatus.CLOSED;
    risk.closedAt = new Date();
    risk.updatedBy = userId;
    const saved = await this.riskRepo.save(risk);

    await this.logActivity(saved, 'risk.closed', `Risk closed: ${saved.title}`, userId, scopeTenant, {
      resolution,
    });
    this.eventBus.publish({
      eventType: ProjectDomainEventType.RISK_CLOSED,
      occurredAt: new Date(),
      projectId: saved.projectId,
      tenantId: scopeTenant,
      actorId: userId ?? null,
      payload: { riskId: saved.id, title: saved.title, resolution },
    });
    return saved;
  }

  /** Reopen a closed risk (returns it to OPEN with a fresh review window). */
  async reopen(id: string, reason: string | null, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const risk = await this.findOne(id, scopeTenant);
    if (risk.status !== RiskStatus.CLOSED) {
      throw new BadRequestException('Only closed risks can be reopened');
    }
    risk.status = RiskStatus.OPEN;
    risk.closedAt = null;
    risk.updatedBy = userId;
    const saved = await this.riskRepo.save(risk);

    await this.logActivity(saved, 'risk.reopened', `Risk reopened: ${saved.title}`, userId, scopeTenant, {
      reason,
    });
    return saved;
  }

  async remove(id: string, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const risk = await this.findOne(id, scopeTenant);
    risk.deletedAt = new Date();
    risk.updatedBy = userId;
    const saved = await this.riskRepo.save(risk);
    await this.logActivity(saved, 'risk.deleted', `Risk deleted: ${saved.title}`, userId, scopeTenant);
    return { deleted: true, id };
  }

  private async logActivity(
    risk: ProjectRisk,
    type: string,
    title: string,
    userId: string,
    tenantId: string | null | undefined,
    metadata?: Record<string, any>,
  ) {
    const scopeTenant = this.requireTenant(tenantId);
    await this.activityRepo.save(
      this.activityRepo.create({
        projectId: risk.projectId,
        activityType: type,
        title,
        actorId: userId ?? null,
        tenantId: scopeTenant,
        metadata: metadata ?? null,
      }),
    );
  }
}
