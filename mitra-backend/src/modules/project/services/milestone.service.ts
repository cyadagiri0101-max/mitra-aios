import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { ProjectMilestone, MilestoneStatus } from '../entities/projectmilestone.entity';
import { MilestoneTemplate } from '../entities/milestone-template.entity';
import { MilestoneTemplateItem } from '../entities/milestone-template-item.entity';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';
import { DomainEventBus } from './domain-event-bus.service';
import { ProjectDomainEventType } from '../events/project.events';

/**
 * Milestone management: configurable templates, completion tracking,
 * approval gates, dependency resolution and delay calculation.
 */
@Injectable()
export class MilestoneService {
  constructor(
    @InjectRepository(ProjectMilestone) private readonly milestoneRepo: Repository<ProjectMilestone>,
    @InjectRepository(MilestoneTemplate) private readonly templateRepo: Repository<MilestoneTemplate>,
    @InjectRepository(MilestoneTemplateItem) private readonly itemRepo: Repository<MilestoneTemplateItem>,
    @InjectRepository(ProjectActivityLog) private readonly activityRepo: Repository<ProjectActivityLog>,
    private readonly eventBus: DomainEventBus,
  ) {}

  // ── Milestones ─────────────────────────────────────────────────────────────

  async findByProject(projectId: string, tenantId?: string | null) {
    const where: any = { projectId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const milestones = await this.milestoneRepo.find({
      where,
      order: { sequenceNumber: 'ASC' },
      take: 500,
    });
    const byId = new Map(milestones.map((m) => [m.id, m]));
    return milestones.map((m) => ({
      ...m,
      dependsOnMilestoneName: m.dependsOnMilestoneId ? byId.get(m.dependsOnMilestoneId)?.milestoneName ?? null : null,
      isBlocked: m.dependsOnMilestoneId
        ? !['COMPLETED', 'CANCELLED'].includes(byId.get(m.dependsOnMilestoneId)?.status ?? '')
        : false,
    }));
  }

  async findOne(id: string, tenantId?: string | null): Promise<ProjectMilestone> {
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const milestone = await this.milestoneRepo.findOne({ where });
    if (!milestone) throw new NotFoundException('Milestone not found');
    return milestone;
  }

  async update(id: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const milestone = await this.findOne(id, tenantId);
    const previous = { ...milestone };
    Object.assign(milestone, data, { updatedBy: userId });
    const saved = await this.milestoneRepo.save(milestone);
    await this.logActivity(milestone, 'milestone.updated', 'Milestone updated', userId, {
      from: previous,
      to: data,
    });
    return saved;
  }

  /**
   * Mark a milestone complete. Computes delay (actual − planned) and sets
   * status DELAYED when completed after the planned date. Milestones with
   * `requiresApproval` move to a completion-pending state until approved.
   */
  async complete(id: string, actualDate: Date | null, remarks: string | null, userId: string, tenantId?: string | null) {
    const milestone = await this.findOne(id, tenantId);

    if (milestone.dependsOnMilestoneId) {
      const dep = await this.milestoneRepo.findOne({ where: { id: milestone.dependsOnMilestoneId, deletedAt: IsNull() } });
      if (dep && dep.status !== MilestoneStatus.COMPLETED && dep.status !== MilestoneStatus.CANCELLED) {
        throw new BadRequestException(
          `Cannot complete "${milestone.milestoneName}": dependency "${dep.milestoneName}" is not completed`,
        );
      }
    }

    const actual = actualDate ?? new Date();
    const planned = milestone.plannedDate ? new Date(milestone.plannedDate) : null;
    const daysVariance = planned
      ? Math.round((actual.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    milestone.actualDate = actual;
    milestone.daysVariance = daysVariance;
    milestone.completionPct = 100;
    milestone.remarks = remarks ?? milestone.remarks;
    milestone.updatedBy = userId;

    if (milestone.requiresApproval) {
      milestone.status = MilestoneStatus.IN_PROGRESS;
      milestone.completionPct = 100;
    } else {
      milestone.status = daysVariance > 0 ? MilestoneStatus.DELAYED : MilestoneStatus.COMPLETED;
    }
    milestone.delayDays = Math.max(0, daysVariance);

    const saved = await this.milestoneRepo.save(milestone);
    await this.logActivity(milestone, 'milestone.completed', `Milestone completed: ${milestone.milestoneName}`, userId, {
      actualDate,
      daysVariance,
      delayDays: milestone.delayDays,
      pendingApproval: milestone.requiresApproval,
    });

    this.eventBus.publish({
      eventType: daysVariance > 0
        ? ProjectDomainEventType.MILESTONE_DELAYED
        : ProjectDomainEventType.MILESTONE_COMPLETED,
      occurredAt: new Date(),
      projectId: milestone.projectId,
      tenantId: milestone.tenantId,
      actorId: userId ?? null,
      payload: { milestoneId: milestone.id, milestoneName: milestone.milestoneName, daysVariance, delayDays: milestone.delayDays },
    });

    return saved;
  }

  /** Approve a milestone that required approval. */
  async approve(id: string, userId: string, tenantId?: string | null) {
    const milestone = await this.findOne(id, tenantId);
    if (!milestone.requiresApproval) {
      throw new BadRequestException('This milestone does not require approval');
    }
    if (milestone.completionPct < 100) {
      throw new BadRequestException('Milestone must be completed before approval');
    }

    milestone.approvedBy = userId;
    milestone.approvedAt = new Date();
    milestone.status = milestone.daysVariance > 0 ? MilestoneStatus.DELAYED : MilestoneStatus.COMPLETED;
    milestone.updatedBy = userId;

    const saved = await this.milestoneRepo.save(milestone);
    await this.logActivity(milestone, 'milestone.approved', `Milestone approved: ${milestone.milestoneName}`, userId, {
      approvedBy: userId,
    });
    return saved;
  }

  // ── Templates ──────────────────────────────────────────────────────────────

  async findAllTemplates(tenantId?: string | null) {
    const where: any = { deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    return this.templateRepo.find({
      where,
      relations: ['items'],
      order: { name: 'ASC' } as any,
      take: 100,
    });
  }

  async findTemplate(id: string, tenantId?: string | null) {
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const template = await this.templateRepo.findOne({ where, relations: ['items'] });
    if (!template) throw new NotFoundException('Milestone template not found');
    template.items = template.items?.sort((a, b) => a.sequenceNumber - b.sequenceNumber) ?? [];
    return template;
  }

  async createTemplate(data: Record<string, any>, userId: string, tenantId?: string | null) {
    const existing = await this.templateRepo.findOne({
      where: { code: data.code, deletedAt: IsNull() },
    });
    if (existing) throw new BadRequestException(`Template code already exists: ${data.code}`);
    const template = this.templateRepo.create({
      ...data,
      isActive: true,
      createdBy: userId,
      updatedBy: userId,
      tenantId: tenantId ?? undefined,
    });
    return this.templateRepo.save(template);
  }

  async updateTemplate(id: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const template = await this.findTemplate(id, tenantId);
    Object.assign(template, data, { updatedBy: userId });
    return this.templateRepo.save(template);
  }

  async removeTemplate(id: string, userId: string, tenantId?: string | null) {
    const template = await this.findTemplate(id, tenantId);
    template.deletedAt = new Date();
    template.updatedBy = userId;
    return this.templateRepo.save(template);
  }

  async addTemplateItem(templateId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    await this.findTemplate(templateId, tenantId);
    const item = this.itemRepo.create({
      ...data,
      templateId,
      createdBy: userId,
      updatedBy: userId,
      tenantId: tenantId ?? undefined,
    });
    return this.itemRepo.save(item);
  }

  async updateTemplateItem(itemId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const where: any = { id: itemId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const item = await this.itemRepo.findOne({ where });
    if (!item) throw new NotFoundException('Milestone template item not found');
    Object.assign(item, data, { updatedBy: userId });
    return this.itemRepo.save(item);
  }

  async removeTemplateItem(itemId: string, userId: string, tenantId?: string | null) {
    const where: any = { id: itemId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const item = await this.itemRepo.findOne({ where });
    if (!item) throw new NotFoundException('Milestone template item not found');
    item.deletedAt = new Date();
    item.updatedBy = userId;
    return this.itemRepo.save(item);
  }

  async remove(id: string, userId: string, tenantId?: string | null) {
    const milestone = await this.findOne(id, tenantId);
    milestone.deletedAt = new Date();
    milestone.updatedBy = userId;
    const saved = await this.milestoneRepo.save(milestone);
    await this.logActivity(milestone, 'milestone.removed', `Milestone removed: ${milestone.milestoneName}`, userId);
    return saved;
  }

  /** Re-sync the delay status of all milestones of a project (health refresh). */  async refreshDelays(projectId: string, tenantId?: string | null): Promise<{ updated: number; delayed: number }> {
    const milestones = await this.milestoneRepo.find({
      where: { projectId, deletedAt: IsNull() },
      take: 500,
    });
    let updated = 0;
    let delayed = 0;
    const today = new Date();
    for (const m of milestones) {
      if (m.status === MilestoneStatus.COMPLETED || m.status === MilestoneStatus.CANCELLED) continue;
      const planned = m.plannedDate ? new Date(m.plannedDate) : null;
      const nowOverdue = planned && planned < today;
      if (nowOverdue && m.status !== MilestoneStatus.DELAYED) {
        const diffMs = today.getTime() - planned!.getTime();
        const delayDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        m.status = MilestoneStatus.DELAYED;
        m.delayDays = delayDays;
        m.updatedBy = null;
        await this.milestoneRepo.save(m);
        updated++;
        delayed++;
      }
    }
    return { updated, delayed };
  }

  private async logActivity(
    milestone: ProjectMilestone,
    type: string,
    title: string,
    userId: string,
    metadata?: Record<string, any>,
  ) {
    await this.activityRepo.save(
      this.activityRepo.create({
        projectId: milestone.projectId,
        activityType: type,
        title,
        actorId: userId ?? null,
        tenantId: milestone.tenantId ?? undefined,
        metadata: metadata ?? null,
      }),
    );
  }
}
