import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { AuditService } from '../../audit/services/audit.service';
import { OutboxService } from '../../platform/services/outbox.service';
import { ScheduleBaseline, BaselineStatus } from '../entities/schedule-baseline.entity';
import { ScheduleBaselineItem, BaselineItemType } from '../entities/schedule-baseline-item.entity';
import { Project } from '../entities/project.entity';
import { ProjectMilestone } from '../entities/projectmilestone.entity';
import { ProjectTask } from '../entities/projecttask.entity';
import { ProjectDesignLoad } from '../../design-load/entities/project-design-load.entity';
import { CreateScheduleBaselineDto, UpdateScheduleBaselineDto } from '../dto/schedule-baseline.dto';

export interface ScheduleVarianceReport {
  projectId: string;
  baselineId: string;
  baselineNumber: string;
  baselineName: string;
  baselineVersion: number;
  baselineStatus: string;
  effectiveDate: Date | null;
  overallScheduleVarianceDays: number;
  overallHoursVariance: number;
  overallVariancePct: number;
  isBehindSchedule: boolean;
  explanation: string;
  milestoneVariances: Array<{
    sourceId: string | null;
    title: string;
    baselinePlannedDate: Date | null;
    currentPlannedDate: Date | null;
    actualDate: Date | null;
    varianceDays: number;
    status: string;
  }>;
  taskVariances: Array<{
    sourceId: string | null;
    title: string;
    stageCode: string | null;
    baselineStartDate: Date | null;
    baselineFinishDate: Date | null;
    currentStartDate: Date | null;
    currentFinishDate: Date | null;
    baselineDurationDays: number;
    currentDurationDays: number;
    durationVarianceDays: number;
    baselineHours: number;
    currentHours: number;
    hoursVariance: number;
    variancePct: number;
    status: string;
  }>;
  designStageVariances: Array<{
    stageCode: string;
    stageName: string;
    baselineDurationDays: number;
    currentPlannedDurationDays: number;
    actualDurationDays: number | null;
    durationVarianceDays: number;
    baselineHours: number;
    currentPlannedHours: number;
    actualHours: number | null;
    hoursVariance: number;
    status: string;
  }>;
}

@Injectable()
export class ScheduleBaselineService extends TenantAwareService<ScheduleBaseline> {
  constructor(
    @InjectRepository(ScheduleBaseline) repo: Repository<ScheduleBaseline>,
    @InjectRepository(ScheduleBaselineItem)
    private readonly itemRepo: Repository<ScheduleBaselineItem>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMilestone)
    private readonly milestoneRepo: Repository<ProjectMilestone>,
    @InjectRepository(ProjectTask)
    private readonly taskRepo: Repository<ProjectTask>,
    @InjectRepository(ProjectDesignLoad)
    private readonly designLoadRepo: Repository<ProjectDesignLoad>,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly dataSource: DataSource,
  ) {
    super(repo, 'ScheduleBaseline');
  }

  async findAllForProject(
    projectId: string,
    tenantId?: string | null,
  ): Promise<ScheduleBaseline[]> {
    const scopeTenant = this.requireTenant(tenantId);
    return this.repo.find({
      where: { projectId, tenantId: scopeTenant, deletedAt: IsNull() } as any,
      order: { version: 'DESC' } as any,
      relations: ['items'],
    });
  }

  async findActiveBaseline(
    projectId: string,
    tenantId?: string | null,
  ): Promise<ScheduleBaseline | null> {
    const scopeTenant = this.requireTenant(tenantId);
    return this.repo.findOne({
      where: {
        projectId,
        status: BaselineStatus.ACTIVE,
        tenantId: scopeTenant,
        deletedAt: IsNull(),
      } as any,
      relations: ['items'],
      order: { version: 'DESC' } as any,
    });
  }

  async findOneWithItems(
    id: string,
    tenantId?: string | null,
  ): Promise<ScheduleBaseline> {
    const scopeTenant = this.requireTenant(tenantId);
    const baseline = await this.repo.findOne({
      where: { id, tenantId: scopeTenant, deletedAt: IsNull() } as any,
      relations: ['items', 'project'],
    });
    if (!baseline) {
      throw new NotFoundException(`Schedule baseline ${id} not found`);
    }
    return baseline;
  }

  async createBaseline(
    projectId: string,
    dto: CreateScheduleBaselineDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<ScheduleBaseline> {
    const scopeTenant = this.requireTenant(tenantId);

    // Verify project exists in tenant
    const project = await this.projectRepo.findOne({
      where: { id: projectId, tenantId: scopeTenant, deletedAt: IsNull() } as any,
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // Fetch existing baselines to compute sequence & version
    const existingCount = await this.repo.count({
      where: { projectId, tenantId: scopeTenant, deletedAt: IsNull() } as any,
    });
    const nextVersion = existingCount + 1;
    const baselineNumber = `BL-${String(nextVersion).padStart(4, '0')}`;

    // Fetch live schedule elements
    const [milestones, tasks, designLoads] = await Promise.all([
      this.milestoneRepo.find({
        where: { projectId, tenantId: scopeTenant, deletedAt: IsNull() } as any,
        order: { sequenceNumber: 'ASC' } as any,
      }),
      this.taskRepo.find({
        where: { projectId, tenantId: scopeTenant, deletedAt: IsNull() } as any,
        order: { createdAt: 'ASC' } as any,
      }),
      this.designLoadRepo.find({
        where: { projectId, tenantId: scopeTenant, deletedAt: IsNull() } as any,
        relations: ['stages'],
      }),
    ]);

    // Calculate aggregated planned metrics
    let totalPlannedDurationDays = 0;
    let totalPlannedHours = 0;
    let plannedStartDate: Date | null = project.startDate ? new Date(project.startDate) : null;
    let plannedFinishDate: Date | null = project.plannedEndDate ? new Date(project.plannedEndDate) : null;

    // From tasks
    for (const t of tasks) {
      totalPlannedHours += Number(t.estimatedHours || 0);
      if (t.startDate) {
        const d = new Date(t.startDate);
        if (!plannedStartDate || d < plannedStartDate) plannedStartDate = d;
      }
      if (t.dueDate) {
        const d = new Date(t.dueDate);
        if (!plannedFinishDate || d > plannedFinishDate) plannedFinishDate = d;
      }
    }

    // From design loads
    for (const dl of designLoads) {
      totalPlannedDurationDays += Number(dl.plannedDurationDays || dl.standardDurationDays || 0);
      if (tasks.length === 0) {
        totalPlannedHours += Number(dl.plannedHours || dl.standardHours || 0);
      }
    }

    if (totalPlannedDurationDays === 0 && plannedStartDate && plannedFinishDate) {
      const diffTime = Math.abs(plannedFinishDate.getTime() - plannedStartDate.getTime());
      totalPlannedDurationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Build item snapshot records
    const itemsToCreate: Array<Partial<ScheduleBaselineItem>> = [];

    // 1. Milestones
    for (const m of milestones) {
      itemsToCreate.push({
        tenantId: scopeTenant,
        projectId,
        itemType: BaselineItemType.MILESTONE,
        sourceId: m.id,
        title: m.milestoneName,
        stageCode: m.milestoneStage,
        sequence: m.sequenceNumber,
        plannedStartDate: m.plannedDate ? new Date(m.plannedDate) : null,
        plannedFinishDate: m.plannedDate ? new Date(m.plannedDate) : null,
        durationDays: 0,
        plannedHours: 0,
        isCriticalPath: m.isCriticalPath || false,
        createdBy: userId,
      });
    }

    // 2. Tasks
    let taskSeq = 1;
    for (const t of tasks) {
      let durationDays = 0;
      if (t.startDate && t.dueDate) {
        const start = new Date(t.startDate).getTime();
        const finish = new Date(t.dueDate).getTime();
        durationDays = Math.max(1, Math.ceil((finish - start) / (1000 * 60 * 60 * 24)));
      }
      itemsToCreate.push({
        tenantId: scopeTenant,
        projectId,
        itemType: BaselineItemType.TASK,
        sourceId: t.id,
        title: t.title,
        sequence: taskSeq++,
        plannedStartDate: t.startDate ? new Date(t.startDate) : null,
        plannedFinishDate: t.dueDate ? new Date(t.dueDate) : null,
        durationDays,
        plannedHours: Number(t.estimatedHours || 0),
        assignedResourceId: t.assigneeId || null,
        assignedResourceName: t.assigneeName || null,
        createdBy: userId,
      });
    }

    // 3. Design Stages
    for (const dl of designLoads) {
      for (const stg of dl.stages || []) {
        itemsToCreate.push({
          tenantId: scopeTenant,
          projectId,
          itemType: BaselineItemType.DESIGN_STAGE,
          sourceId: stg.id,
          title: stg.stageName,
          stageCode: stg.stageCode,
          sequence: stg.sequence,
          plannedStartDate: stg.plannedStartDate ? new Date(stg.plannedStartDate) : null,
          plannedFinishDate: stg.plannedFinishDate ? new Date(stg.plannedFinishDate) : null,
          durationDays: Number(stg.plannedDurationDays || stg.standardDurationDays || 0),
          plannedHours: Number(stg.plannedHours || stg.standardHours || 0),
          assignedResourceId: stg.assignedEmployeeId || null,
          createdBy: userId,
        });
      }
    }

    // Execute in transaction
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const baseline = this.repo.create({
        tenantId: scopeTenant,
        projectId,
        baselineNumber,
        name: dto.name.trim(),
        description: dto.description || null,
        reason: dto.reason || null,
        version: nextVersion,
        status: BaselineStatus.DRAFT,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
        totalPlannedDurationDays,
        totalPlannedHours,
        plannedStartDate,
        plannedFinishDate,
        isLocked: false,
        createdBy: userId,
      });

      const savedBaseline = await qr.manager.save(baseline);

      const items = itemsToCreate.map((it) =>
        this.itemRepo.create({
          ...it,
          baselineId: savedBaseline.id,
        }),
      );

      if (items.length > 0) {
        await qr.manager.save(items);
      }

      await qr.commitTransaction();

      // Audit & Outbox
      await this.auditService.logBusinessEvent(
        'baseline.created',
        'schedule_baseline',
        savedBaseline.id,
        userId ?? 'system',
        {
          baselineNumber: savedBaseline.baselineNumber,
          version: savedBaseline.version,
          itemCount: items.length,
        },
        undefined,
        projectId,
        scopeTenant,
      );

      await this.outboxService.append(
        'schedule_baseline.created',
        'schedule_baseline',
        savedBaseline.id,
        {
          projectId,
          baselineId: savedBaseline.id,
          baselineNumber: savedBaseline.baselineNumber,
          version: savedBaseline.version,
        },
        { tenantId: scopeTenant, actorId: userId },
      );

      return this.findOneWithItems(savedBaseline.id, scopeTenant);
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  async activateBaseline(
    id: string,
    userId?: string,
    tenantId?: string | null,
  ): Promise<ScheduleBaseline> {
    const scopeTenant = this.requireTenant(tenantId);
    const baseline = await this.findOneWithItems(id, scopeTenant);

    if (baseline.status === BaselineStatus.ACTIVE) {
      return baseline;
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // 1. Mark existing ACTIVE baseline for this project as SUPERSEDED
      const currentActive = await qr.manager.findOne(ScheduleBaseline, {
        where: {
          projectId: baseline.projectId,
          status: BaselineStatus.ACTIVE,
          tenantId: scopeTenant,
          deletedAt: IsNull(),
        } as any,
      });

      if (currentActive && currentActive.id !== baseline.id) {
        currentActive.status = BaselineStatus.SUPERSEDED;
        currentActive.updatedBy = userId ?? null;
        await qr.manager.save(currentActive);

        await this.auditService.logBusinessEvent(
          'baseline.superseded',
          'schedule_baseline',
          currentActive.id,
          userId ?? 'system',
          { supersededByBaselineId: baseline.id, baselineNumber: currentActive.baselineNumber },
          undefined,
          baseline.projectId,
          scopeTenant,
        );
      }

      // 2. Set this baseline to ACTIVE and lock it
      baseline.status = BaselineStatus.ACTIVE;
      baseline.isLocked = true;
      baseline.activatedAt = new Date();
      baseline.activatedBy = userId ?? null;
      baseline.updatedBy = userId ?? null;

      const updated = await qr.manager.save(baseline);

      await qr.commitTransaction();

      await this.auditService.logBusinessEvent(
        'baseline.activated',
        'schedule_baseline',
        updated.id,
        userId ?? 'system',
        { baselineNumber: updated.baselineNumber, version: updated.version },
        undefined,
        baseline.projectId,
        scopeTenant,
      );

      await this.outboxService.append(
        'schedule_baseline.activated',
        'schedule_baseline',
        updated.id,
        {
          projectId: baseline.projectId,
          baselineId: updated.id,
          baselineNumber: updated.baselineNumber,
        },
        { tenantId: scopeTenant, actorId: userId },
      );

      return updated;
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  async calculateVariance(
    projectId: string,
    baselineId?: string,
    tenantId?: string | null,
  ): Promise<ScheduleVarianceReport> {
    const scopeTenant = this.requireTenant(tenantId);

    // 1. Resolve baseline (target baseline or current ACTIVE)
    let baseline: ScheduleBaseline | null = null;
    if (baselineId) {
      baseline = await this.findOneWithItems(baselineId, scopeTenant);
    } else {
      baseline = await this.findActiveBaseline(projectId, scopeTenant);
      if (!baseline) {
        const allBaselines = await this.findAllForProject(projectId, scopeTenant);
        baseline = allBaselines[0] || null;
      }
    }

    if (!baseline) {
      throw new NotFoundException(`No schedule baseline found for project ${projectId}`);
    }

    // 2. Fetch live data
    const [liveMilestones, liveTasks, liveDesignLoads] = await Promise.all([
      this.milestoneRepo.find({
        where: { projectId, tenantId: scopeTenant, deletedAt: IsNull() } as any,
      }),
      this.taskRepo.find({
        where: { projectId, tenantId: scopeTenant, deletedAt: IsNull() } as any,
      }),
      this.designLoadRepo.find({
        where: { projectId, tenantId: scopeTenant, deletedAt: IsNull() } as any,
        relations: ['stages'],
      }),
    ]);

    const liveMilestonesMap = new Map(liveMilestones.map((m) => [m.id, m]));
    const liveTasksMap = new Map(liveTasks.map((t) => [t.id, t]));
    const liveTasksTitleMap = new Map(liveTasks.map((t) => [t.title.trim().toLowerCase(), t]));

    const milestoneVariances: ScheduleVarianceReport['milestoneVariances'] = [];
    const taskVariances: ScheduleVarianceReport['taskVariances'] = [];
    const designStageVariances: ScheduleVarianceReport['designStageVariances'] = [];

    let overallScheduleVarianceDays = 0;
    let overallHoursVariance = 0;

    // 3. Compare Baseline Items vs Current Live
    for (const item of baseline.items || []) {
      if (item.itemType === BaselineItemType.MILESTONE) {
        const live = (item.sourceId ? liveMilestonesMap.get(item.sourceId) : null) ||
          liveMilestones.find((m) => m.milestoneName === item.title);

        const baselineDate = item.plannedFinishDate ? new Date(item.plannedFinishDate) : null;
        const currentPlannedDate = live?.plannedDate ? new Date(live.plannedDate) : baselineDate;
        const actualDate = live?.actualDate ? new Date(live.actualDate) : null;

        let varianceDays = 0;
        if (baselineDate && currentPlannedDate) {
          varianceDays = Math.round(
            (currentPlannedDate.getTime() - baselineDate.getTime()) / (1000 * 60 * 60 * 24),
          );
        }

        milestoneVariances.push({
          sourceId: item.sourceId,
          title: item.title,
          baselinePlannedDate: baselineDate,
          currentPlannedDate,
          actualDate,
          varianceDays,
          status: live?.status || 'PENDING',
        });
      } else if (item.itemType === BaselineItemType.TASK) {
        const live = (item.sourceId ? liveTasksMap.get(item.sourceId) : null) ||
          liveTasksTitleMap.get(item.title.trim().toLowerCase());

        const baseStart = item.plannedStartDate ? new Date(item.plannedStartDate) : null;
        const baseFinish = item.plannedFinishDate ? new Date(item.plannedFinishDate) : null;
        const curStart = live?.startDate ? new Date(live.startDate) : baseStart;
        const curFinish = live?.dueDate ? new Date(live.dueDate) : baseFinish;

        const baseDuration = Number(item.durationDays || 0);
        let curDuration = baseDuration;
        if (curStart && curFinish) {
          curDuration = Math.max(
            1,
            Math.ceil((curFinish.getTime() - curStart.getTime()) / (1000 * 60 * 60 * 24)),
          );
        }

        const durationVarianceDays = curDuration - baseDuration;
        const baseHours = Number(item.plannedHours || 0);
        const curHours = live ? Number(live.estimatedHours || 0) : baseHours;
        const hoursVariance = curHours - baseHours;
        const variancePct = baseDuration > 0 ? Math.round((durationVarianceDays / baseDuration) * 100) : 0;

        overallScheduleVarianceDays += durationVarianceDays;
        overallHoursVariance += hoursVariance;

        taskVariances.push({
          sourceId: item.sourceId,
          title: item.title,
          stageCode: item.stageCode,
          baselineStartDate: baseStart,
          baselineFinishDate: baseFinish,
          currentStartDate: curStart,
          currentFinishDate: curFinish,
          baselineDurationDays: baseDuration,
          currentDurationDays: curDuration,
          durationVarianceDays,
          baselineHours: baseHours,
          currentHours: curHours,
          hoursVariance,
          variancePct,
          status: live?.status || 'TODO',
        });
      }
    }

    // 4. Design Stages Comparison
    for (const dl of liveDesignLoads) {
      for (const stg of dl.stages || []) {
        const baseItem = (baseline.items || []).find(
          (it) => it.itemType === BaselineItemType.DESIGN_STAGE && (it.sourceId === stg.id || it.stageCode === stg.stageCode),
        );

        const baseDurationDays = baseItem ? Number(baseItem.durationDays || 0) : Number(stg.standardDurationDays || 0);
        const curPlannedDays = Number(stg.plannedDurationDays || stg.standardDurationDays || 0);
        const actualDays = stg.actualDurationDays != null ? Number(stg.actualDurationDays) : null;
        const durationVarianceDays = curPlannedDays - baseDurationDays;

        const baseHours = baseItem ? Number(baseItem.plannedHours || 0) : Number(stg.standardHours || 0);
        const curPlannedHours = Number(stg.plannedHours || stg.standardHours || 0);
        const actualHours = stg.actualHours != null ? Number(stg.actualHours) : null;
        const hoursVariance = curPlannedHours - baseHours;

        designStageVariances.push({
          stageCode: stg.stageCode,
          stageName: stg.stageName,
          baselineDurationDays: baseDurationDays,
          currentPlannedDurationDays: curPlannedDays,
          actualDurationDays: actualDays,
          durationVarianceDays,
          baselineHours: baseHours,
          currentPlannedHours: curPlannedHours,
          actualHours,
          hoursVariance,
          status: stg.status,
        });
      }
    }

    const baseTotalDuration = Number(baseline.totalPlannedDurationDays || 0);
    const overallVariancePct = baseTotalDuration > 0
      ? Number(((overallScheduleVarianceDays / baseTotalDuration) * 100).toFixed(1))
      : 0;

    const isBehindSchedule = overallScheduleVarianceDays > 0;

    const explanation = `Baseline [${baseline.baselineNumber}] (${baseline.name}) planned for ${baseTotalDuration} days. Current schedule variance is ${overallScheduleVarianceDays >= 0 ? '+' : ''}${overallScheduleVarianceDays} days (${overallVariancePct >= 0 ? '+' : ''}${overallVariancePct}%), with ${overallHoursVariance >= 0 ? '+' : ''}${overallHoursVariance}h workload variance.`;

    return {
      projectId,
      baselineId: baseline.id,
      baselineNumber: baseline.baselineNumber,
      baselineName: baseline.name,
      baselineVersion: baseline.version,
      baselineStatus: baseline.status,
      effectiveDate: baseline.effectiveDate,
      overallScheduleVarianceDays,
      overallHoursVariance,
      overallVariancePct,
      isBehindSchedule,
      explanation,
      milestoneVariances,
      taskVariances,
      designStageVariances,
    };
  }
}
