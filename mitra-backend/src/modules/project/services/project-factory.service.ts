import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, IsNull, Like } from 'typeorm';
import { Project, ProjectStage, ProjectHealth, ProjectType, ProjectRiskLevel } from '../entities/project.entity';
import { ProjectMilestone, MilestoneStatus } from '../entities/projectmilestone.entity';
import { MilestoneTemplate } from '../entities/milestone-template.entity';
import { MilestoneTemplateItem } from '../entities/milestone-template-item.entity';
import { ProjectFolder } from '../entities/projectfolder.entity';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';
import { WorkflowService } from '../../workflow/services/workflow.service';
import { AuditService } from '../../audit/services/audit.service';
import { DomainEventBus } from './domain-event-bus.service';
import { ProjectDomainEventType } from '../events/project.events';

export const DEFAULT_FOLDER_STRUCTURE = [
  'Drawings',
  'RFQs',
  'Quotations',
  'Meeting Notes',
  'Contracts',
  'Images',
  'Trial Reports',
] as const;

export interface QuotationSnapshot {
  quotationId: string;
  quotationNumber: string;
  customerId: string | null;
  customerName: string;
  productName: string;
  projectName: string;
  projectValue: number | null;
  targetDeliveryDate: Date | null;
  rfqId: string | null;
  currency?: string;
}

export interface CreateFromQuotationResult {
  project: Project;
  milestones: ProjectMilestone[];
  folders: ProjectFolder[];
  workflow: { instanceId: string; state: string } | null;
}

/**
 * Project Factory — the single entry point for creating a project from an
 * accepted quotation. The whole operation (project row, number generation,
 * default milestones, default folder structure, workflow initialization,
 * activity log, audit trail) executes inside ONE database transaction.
 *
 * Domain events are published AFTER commit — a failed subscriber can never
 * corrupt the project record.
 */
@Injectable()
export class ProjectFactoryService {
  private readonly logger = new Logger(ProjectFactoryService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(MilestoneTemplate) private readonly templateRepo: Repository<MilestoneTemplate>,
    private readonly workflowService: WorkflowService,
    private readonly auditService: AuditService,
    private readonly eventBus: DomainEventBus,
  ) {}

  /**
   * Create a project from an accepted quotation in a single transaction.
   * Throws — and rolls back — on any failure; the quotation is untouched.
   */
  async createFromQuotation(
    snapshot: QuotationSnapshot,
    userId: string,
    tenantId?: string | null,
  ): Promise<CreateFromQuotationResult> {
    const projectName = snapshot.projectName?.trim();
    const customerName = snapshot.customerName?.trim();
    const productName = snapshot.productName?.trim();

    if (!projectName || projectName.length < 3) {
      throw new BadRequestException('Project name must be at least 3 characters');
    }
    if (!customerName) {
      throw new BadRequestException('Customer name is required');
    }
    if (!productName) {
      throw new BadRequestException('Product name is required');
    }

    const result = await this.dataSource.transaction(async (em) => {
      const project = await this.createProject(snapshot, userId, tenantId, em);
      const milestones = await this.createDefaultMilestones(project, userId, tenantId, em);
      const folders = await this.createDefaultFolders(project, userId, tenantId, em);
      const workflow = await this.initializeWorkflow(project, userId, tenantId, em);

      await this.logActivity(
        em,
        project,
        'project.created',
        'Project Created',
        `Project ${project.projectNumber} created from quotation ${snapshot.quotationNumber}`,
        userId,
        tenantId,
        { quotationId: snapshot.quotationId, quotationNumber: snapshot.quotationNumber },
      );

      await this.auditService.logBusinessEvent(
        'project.created.from_quotation',
        'Project',
        project.id,
        userId ?? 'system',
        {
          projectNumber: project.projectNumber,
          quotationId: snapshot.quotationId,
          quotationNumber: snapshot.quotationNumber,
          tenantId,
        },
        em,
      );

      return { project, milestones, folders, workflow };
    });

    // ── Post-commit domain event ───────────────────────────────────────────
    this.eventBus.publish({
      eventType: ProjectDomainEventType.PROJECT_CREATED,
      occurredAt: new Date(),
      projectId: result.project.id,
      tenantId: tenantId ?? result.project.tenantId,
      actorId: userId ?? null,
      payload: {
        projectNumber: result.project.projectNumber,
        name: result.project.name,
        quotationId: snapshot.quotationId,
        quotationNumber: snapshot.quotationNumber,
        customerId: snapshot.customerId,
      },
    });

    return result;
  }

  // ── Transactional steps (all receive the same EntityManager) ──────────────

  private async createProject(
    snapshot: QuotationSnapshot,
    userId: string,
    tenantId: string | null | undefined,
    em: EntityManager,
  ): Promise<Project> {
    const projectRepo = em.getRepository(Project);
    const startDate = new Date();
    const plannedEnd = snapshot.targetDeliveryDate;
    const projectName = (snapshot.projectName ?? '').trim();
    const customerName = (snapshot.customerName ?? '').trim();
    const productName = (snapshot.productName ?? '').trim();

    let project: Project | null = null;
    let lastErr: unknown;

    for (let attempt = 0; attempt < 5; attempt++) {
      const projectNumber = await this.nextProjectNumber(tenantId, em, attempt);
      project = projectRepo.create({
        projectNumber,
        name: projectName,
        customerId: snapshot.customerId,
        customerName,
        productName,
        projectValue: snapshot.projectValue,
        targetDeliveryDate: plannedEnd,
        rfqNumber: undefined,
        quotationId: snapshot.quotationId,
        quotationNumber: snapshot.quotationNumber,
        projectType: ProjectType.NEW_DEVELOPMENT,
        stage: ProjectStage.PROJECT_CREATED,
        healthStatus: ProjectHealth.GREEN,
        status: 'DRAFT',
        currency: snapshot.currency ?? 'INR',
        riskLevel: ProjectRiskLevel.LOW,
        startDate,
        plannedEndDate: plannedEnd,
        stageEnteredAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
        tenantId: tenantId ?? undefined,
      });
      try {
        project = await projectRepo.save(project);
        break;
      } catch (err: any) {
        // 23505 = unique_violation — concurrent number generation race.
        if (err?.code !== '23505') throw err;
        lastErr = err;
      }
    }
    if (!project) throw lastErr;
    return project;
  }

  private async nextProjectNumber(
    tenantId: string | null | undefined,
    em: EntityManager,
    attempt = 0,
  ): Promise<string> {
    const repo = em.getRepository(Project);
    const year = new Date().getFullYear();
    const prefix = `PRJ-${year}-`;
    const where: any = { projectNumber: Like(`${prefix}%`) };
    if (tenantId) where.tenantId = tenantId;
    const count = await repo.count({ where });
    return `${prefix}${String(count + 1 + attempt).padStart(4, '0')}`;
  }

  private async createDefaultMilestones(
    project: Project,
    userId: string,
    tenantId: string | null | undefined,
    em: EntityManager,
  ): Promise<ProjectMilestone[]> {
    const template = await em.getRepository(MilestoneTemplate).findOne({
      where: [
        { code: 'DEFAULT_MOLD', isDefault: true, tenantId: IsNull() },
        { code: 'DEFAULT_MOLD', isDefault: true, tenantId: tenantId ?? null },
        { code: 'DEFAULT_MOLD', isDefault: true },
      ] as any,
      relations: ['items'],
    });

    if (!template || !template.items?.length) {
      this.logger.warn(
        `No default milestone template found for project ${project.projectNumber} — skipping milestone generation`,
      );
      return [];
    }

    const items = [...template.items].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    const baseDate = project.startDate ?? new Date();

    const milestones = items.map((item) => {
      const planned = new Date(baseDate);
      planned.setDate(planned.getDate() + item.plannedDaysOffset);
      return em.getRepository(ProjectMilestone).create({
        projectId: project.id,
        milestoneName: item.milestoneName,
        milestoneStage: item.milestoneStage,
        sequenceNumber: item.sequenceNumber,
        plannedDate: planned,
        isCriticalPath: item.isCriticalPath,
        requiresApproval: item.requiresApproval,
        templateItemId: item.id,
        status: MilestoneStatus.PENDING,
        completionPct: 0,
        daysVariance: 0,
        delayDays: 0,
        createdBy: userId,
        updatedBy: userId,
        tenantId: project.tenantId ?? undefined,
      });
    });

    const saved = await em.getRepository(ProjectMilestone).save(milestones);

    // Wire intra-project dependencies (dependsOnSequence → dependsOnMilestoneId).
    // Must run AFTER save — TypeORM assigns ids during save().
    for (const item of items) {
      if (!item.dependsOnSequence) continue;
      const dep = saved.find((m) => m.sequenceNumber === item.dependsOnSequence);
      const target = saved.find((m) => m.sequenceNumber === item.sequenceNumber);
      if (dep && target && !target.dependsOnMilestoneId) {
        target.dependsOnMilestoneId = dep.id;
      }
    }
    if (saved.some((m) => m.dependsOnMilestoneId)) {
      await em.getRepository(ProjectMilestone).save(saved);
    }

    return saved;
  }

  private async createDefaultFolders(
    project: Project,
    userId: string,
    tenantId: string | null | undefined,
    em: EntityManager,
  ): Promise<ProjectFolder[]> {
    const folderRepo = em.getRepository(ProjectFolder);
    const folders = DEFAULT_FOLDER_STRUCTURE.map((name, idx) =>
      folderRepo.create({
        projectId: project.id,
        folderName: name,
        folderPath: `/${name}`,
        folderType: 'DEFAULT',
        sequence: idx + 1,
        isDefault: true,
        createdBy: userId,
        updatedBy: userId,
        tenantId: project.tenantId ?? undefined,
      }),
    );
    return folderRepo.save(folders);
  }

  private async initializeWorkflow(
    project: Project,
    userId: string,
    tenantId: string | null | undefined,
    em: EntityManager,
  ): Promise<{ instanceId: string; state: string } | null> {
    try {
      const instance = await this.workflowService.createInstance(
        'project_management',
        'project',
        project.id,
        { userId, userRole: [], userPermissions: [], tenantId: tenantId ?? undefined },
        em,
      );
      project.workflowInstanceId = instance.id;
      project.status = instance.currentState?.stateCode ?? project.status;
      await em.getRepository(Project).save(project);
      return { instanceId: instance.id, state: project.status };
    } catch (err) {
      // The project_management workflow may not be seeded yet (fresh DB,
      // seed not run). Project creation must still succeed — status stays DRAFT.
      this.logger.warn(`Workflow initialization skipped for ${project.projectNumber}: ${(err as Error)?.message}`);
      return null;
    }
  }

  private async logActivity(
    em: EntityManager,
    project: Project,
    type: string,
    title: string,
    description: string,
    userId: string,
    tenantId: string | null | undefined,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await em.getRepository(ProjectActivityLog).save(
      em.getRepository(ProjectActivityLog).create({
        projectId: project.id,
        activityType: type,
        title,
        description,
        actorId: userId ?? null,
        metadata: metadata ?? null,
        tenantId: project.tenantId ?? undefined,
      }),
    );
  }
}
