import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThan, Like } from 'typeorm';
import { Project, ProjectStage, ProjectHealth } from '../entities/project.entity';
import { ProjectMilestone, MilestoneStatus } from '../entities/projectmilestone.entity';
import { ProjectBudget } from '../entities/projectbudget.entity';
import { WorkflowService, MOLD_ALLOWED_TRANSITIONS } from '../../workflow/services/workflow.service';

// ─── MITRA Project Health Engine ───────────────────────────────────────────
// GREEN  → On track: no overdue milestones, budget variance < 10%
// YELLOW → At risk:  1-2 overdue milestones OR budget variance 10-25%
// RED    → Critical: 3+ overdue milestones OR budget variance > 25% OR stage overdue

export interface HealthCheckResult {
  health: ProjectHealth;
  reasons: string[];
  overdueMilestones: number;
  budgetVariancePct: number;
  stageDaysOverdue: number;
}

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMilestone) private readonly milestoneRepo: Repository<ProjectMilestone>,
    @InjectRepository(ProjectBudget) private readonly budgetRepo: Repository<ProjectBudget>,
    private readonly workflowService: WorkflowService,
  ) {}

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async findAll(tenantId?: string, page = 1, limit = 20) {
    const where: any = { deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const [data, total] = await this.projectRepo.findAndCount({
      where, skip: (page - 1) * limit, take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Advanced listing: pagination, free-text search, structured filters,
   * whitelisted sorting (Sprint 2.2).
   */
  async findAllAdvanced(tenantId?: string, query: Record<string, any> = {}) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));

    const qb = this.projectRepo.createQueryBuilder('p').where('p.deleted_at IS NULL');
    if (tenantId) qb.andWhere('p.tenant_id = :tenantId', { tenantId });
    if (query.search) {
      qb.andWhere(
        '(p.name ILIKE :search OR p.project_number ILIKE :search OR p.customer_name ILIKE :search OR p.product_name ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.status) qb.andWhere('p.status = :status', { status: query.status });
    if (query.projectType) qb.andWhere('p.project_type = :projectType', { projectType: query.projectType });
    if (query.riskLevel) qb.andWhere('p.risk_level = :riskLevel', { riskLevel: query.riskLevel });
    if (query.priority) qb.andWhere('p.priority = :priority', { priority: query.priority });
    if (query.customerId) qb.andWhere('p.customer_id = :customerId', { customerId: query.customerId });
    if (query.businessUnit) qb.andWhere('p.business_unit = :businessUnit', { businessUnit: query.businessUnit });
    if (query.stage) qb.andWhere('p.stage = :stage', { stage: query.stage });

    // Whitelisted sort fields — anything else falls back to createdAt DESC.
    const SORTABLE = new Set(['name', 'projectNumber', 'createdAt', 'plannedEndDate', 'budget', 'priority', 'status']);
    const sortBy = query.sortBy ?? 'createdAt';
    const field = SORTABLE.has(sortBy) ? `p.${sortBy}` : 'p.created_at';
    const direction = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(field, direction).addOrderBy('p.created_at', 'DESC');

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId?: string | null) {
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const project = await this.projectRepo.findOne({ where });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async findByProjectNumber(projectNumber: string) {
    return this.projectRepo.findOne({ where: { projectNumber, deletedAt: IsNull() } });
  }

  async create(data: Record<string, any>, userId: string, tenantId?: string | null) {
    let saved: Project | undefined;
    let lastErr: any;

    for (let attempt = 0; attempt < 5; attempt++) {
      const projectNumber = await this.generateProjectNumber(tenantId, attempt);
      const project = this.projectRepo.create({
        ...data,
        projectNumber,
        stage: ProjectStage.ENQUIRY,
        healthStatus: ProjectHealth.GREEN,
        stageEnteredAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
        tenantId: tenantId ?? undefined,
      });
      try {
        saved = await this.projectRepo.save(project);
        break;
      } catch (err: any) {
        // 23505 = unique_violation. Another concurrent request grabbed the
        // same sequential number first — retry with the next candidate.
        if (err?.code !== '23505') throw err;
        lastErr = err;
      }
    }
    if (!saved) throw lastErr;

    // Auto-create workflow instance
    try {
      await this.workflowService.createInstance('mold_project', 'project', saved.id, {
        userId, userRole: [], userPermissions: [], tenantId: tenantId ?? saved.tenantId ?? undefined,
      });
    } catch { /* workflow states not seeded yet */ }

    return saved;
  }

  /**
   * Generates the next sequential project number for the given tenant in
   * the format PRJ-{year}-{4-digit seq}, e.g. PRJ-2026-0001. Numbering is
   * per-tenant (matches the composite uq_projects_number_tenant index).
   * `attempt` bumps the candidate forward to dodge a just-lost race without
   * re-querying the count.
   */
  private async generateProjectNumber(tenantId: string | null | undefined, attempt = 0): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PRJ-${year}-`;
    const where: any = { projectNumber: Like(`${prefix}%`) };
    if (tenantId) where.tenantId = tenantId;
    const count = await this.projectRepo.count({ where });
    const seq = count + 1 + attempt;
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  async update(id: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const project = await this.findOne(id, tenantId);
    Object.assign(project, data, { updatedBy: userId });
    return this.projectRepo.save(project);
  }

  async remove(id: string, userId: string, tenantId?: string | null) {
    const project = await this.findOne(id, tenantId);
    project.deletedAt = new Date();
    project.updatedBy = userId;
    return this.projectRepo.save(project);
  }

  // ─── STAGE TRANSITION (enforces MITRA lifecycle) ───────────────────────────

  async transitionStage(id: string, toStage: string, userId: string, tenantId?: string | null, remarks?: string) {
    const project = await this.findOne(id, tenantId);
    const fromStage = project.stage as string;

    // Validate transition via WorkflowService
    this.workflowService.validateMoldTransition(fromStage, toStage);

    const previous = project.stage;
    project.stage = toStage as ProjectStage;
    project.stageEnteredAt = new Date();
    project.updatedBy = userId;

    // Special stage logic
    if (toStage === ProjectStage.DISPATCH) {
      project.dispatchedAt = new Date();
    }

    const saved = await this.projectRepo.save(project);

    return {
      project: saved,
      transition: { from: previous, to: toStage, remarks, performedBy: userId, at: new Date() },
    };
  }

  // ─── PROJECT HEALTH ENGINE ─────────────────────────────────────────────────

  async computeHealth(id: string, tenantId?: string | null): Promise<HealthCheckResult> {
    const project = await this.findOne(id, tenantId);
    const today = new Date();
    const reasons: string[] = [];

    // 1. Overdue milestone check
    const milestones = await this.milestoneRepo.find({
      where: { projectId: id, deletedAt: IsNull() },
      take: 500,
    });
    const overdueMilestones = milestones.filter(
      (m) =>
        m.plannedDate &&
        m.plannedDate < today &&
        m.status !== MilestoneStatus.COMPLETED &&
        m.status !== MilestoneStatus.CANCELLED,
    ).length;

    if (overdueMilestones > 0) {
      reasons.push(`${overdueMilestones} milestone(s) overdue`);
    }

    // 2. Budget variance check
    let budgetVariancePct = 0;
    const budget = await this.budgetRepo.findOne({ where: { projectId: id, deletedAt: IsNull() } });
    if (budget && budget.totalBudgeted > 0) {
      budgetVariancePct = ((Number(budget.totalActual) - Number(budget.totalBudgeted)) / Number(budget.totalBudgeted)) * 100;
      if (budgetVariancePct > 10) reasons.push(`Budget overspent by ${budgetVariancePct.toFixed(1)}%`);
    }

    // 3. Stage delivery deadline check
    let stageDaysOverdue = 0;
    if (project.targetDeliveryDate) {
      const diffMs = today.getTime() - new Date(project.targetDeliveryDate).getTime();
      stageDaysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      if (stageDaysOverdue > 0) {
        reasons.push(`Project delivery overdue by ${stageDaysOverdue} day(s)`);
      }
    }

    // ── Compute final health ──────────────────────────────────────────────
    let health = ProjectHealth.GREEN;

    if (
      overdueMilestones >= 3 ||
      budgetVariancePct > 25 ||
      stageDaysOverdue > 14
    ) {
      health = ProjectHealth.RED;
    } else if (
      overdueMilestones >= 1 ||
      budgetVariancePct > 10 ||
      stageDaysOverdue > 0
    ) {
      health = ProjectHealth.YELLOW;
    }

    // Persist computed health
    if (project.healthStatus !== health) {
      project.healthStatus = health;
      project.daysOverdue = stageDaysOverdue;
      await this.projectRepo.save(project);
    }

    return { health, reasons, overdueMilestones, budgetVariancePct, stageDaysOverdue };
  }

  async refreshAllHealthStatuses(tenantId?: string) {
    // Process in batches of 50 to avoid loading thousands of project IDs at once.
    // tenantId is required except for super-admin operations (no tenantId = all tenants).
    const BATCH = 50;
    let skip = 0;
    let total = 0;
    let updated = 0;

    while (true) {
      const where: any = { deletedAt: IsNull() };
      if (tenantId) where.tenantId = tenantId;

      const batch = await this.projectRepo.find({
        where,
        select: ['id'],
        take: BATCH,
        skip,
      });
      if (!batch.length) break;
      total += batch.length;
      const results = await Promise.allSettled(batch.map((p) => this.computeHealth(p.id, tenantId)));
      updated += results.filter((r) => r.status === 'fulfilled').length;
      if (batch.length < BATCH) break;
      skip += BATCH;
    }

    return { updated, total };
  }

  async getDashboardStats(tenantId?: string) {
    // Use aggregate SQL rather than loading every project row into Node memory.
    // This makes the endpoint O(1) instead of O(n) as the project count grows.
    const qb = this.projectRepo
      .createQueryBuilder('p')
      .select('p.stage', 'stage')
      .addSelect('p.health_status', 'healthStatus')
      .addSelect('COUNT(*)', 'count')
      .where('p.deleted_at IS NULL')
      .groupBy('p.stage, p.health_status');

    if (tenantId) qb.andWhere('p.tenant_id = :tenantId', { tenantId });

    const rows: { stage: string; healthStatus: string; count: string }[] = await qb.getRawMany();

    const byStage: Record<string, number> = {};
    const byHealth: Record<string, number> = { GREEN: 0, YELLOW: 0, RED: 0 };
    let total = 0;
    let dispatched = 0;
    let inService = 0;

    for (const row of rows) {
      const count = parseInt(row.count, 10);
      byStage[row.stage] = (byStage[row.stage] ?? 0) + count;
      byHealth[row.healthStatus] = (byHealth[row.healthStatus] ?? 0) + count;
      total += count;
      if (row.stage === ProjectStage.DISPATCH)  dispatched += count;
      if (row.stage === ProjectStage.SERVICE)   inService  += count;
    }

    const active = total - dispatched - inService;
    return { total, active, dispatched, inService, byStage, byHealth };
  }
}
