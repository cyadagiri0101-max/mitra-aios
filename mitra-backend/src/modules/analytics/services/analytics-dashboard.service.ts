import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { ProjectService } from '../../project/services/project.service';
import { LeadService } from '../../commercial/services/lead.service';
import { QuotationMarginService } from '../../commercial/services/quotation-margin.service';
import { EngineeringDashboardService } from '../../engineering/services/engineering-dashboard.service';
import { ProductionTrackingService } from '../../manufacturing/services/production-tracking.service';
import { NcrRecord } from '../../quality/entities/ncr-record.entity';
import { CapaVerification, CapaStatus } from '../../quality/entities/capaverification.entity';
import { InspectionReport } from '../../quality/entities/inspectionreport.entity';
import { ServiceRequest } from '../../service/entities/servicerequest.entity';
import { ProjectMilestone, MilestoneStatus } from '../../project/entities/projectmilestone.entity';
import { ProjectBudget } from '../../project/entities/projectbudget.entity';
import { DomainOutboxMessage } from '../../platform/entities/domain-outbox.entity';

@Injectable()
export class AnalyticsDashboardService {
  constructor(
    private readonly projectService: ProjectService,
    private readonly leadService: LeadService,
    private readonly quotationMarginService: QuotationMarginService,
    private readonly engineeringDashboardService: EngineeringDashboardService,
    private readonly productionTrackingService: ProductionTrackingService,
    @InjectRepository(NcrRecord) private readonly ncrRepo: Repository<NcrRecord>,
    @InjectRepository(CapaVerification) private readonly capaRepo: Repository<CapaVerification>,
    @InjectRepository(InspectionReport) private readonly inspectionRepo: Repository<InspectionReport>,
    @InjectRepository(ServiceRequest) private readonly serviceRequestRepo: Repository<ServiceRequest>,
    @InjectRepository(ProjectMilestone) private readonly milestoneRepo: Repository<ProjectMilestone>,
    @InjectRepository(ProjectBudget) private readonly budgetRepo: Repository<ProjectBudget>,
    @InjectRepository(DomainOutboxMessage) private readonly outboxRepo: Repository<DomainOutboxMessage>,
    private readonly dataSource: DataSource,
  ) {}

  /** Fail-closed guard — tenant context is mandatory for tenant-scoped data. */
  private requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for tenant-scoped operation');
    }
    return tenantId;
  }

  async getExecutiveDashboard(tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const [projectStats, leadPipeline, marginSummary, engStats, productionStatus, ncrRows, capaRows, inspectionRows, serviceRequests, milestones, budgets, eventSnapshot] = await Promise.all([
      this.projectService.getDashboardStats(scopeTenant),
      this.leadService.getPipelineSummary(scopeTenant),
      this.quotationMarginService.getMarginSummary(scopeTenant),
      this.engineeringDashboardService.getStats(scopeTenant),
      this.productionTrackingService.dashboard({}, scopeTenant),
      this.ncrRepo.find({ where: { deletedAt: IsNull(), tenantId: scopeTenant } }),
      this.capaRepo.find({ where: { deletedAt: IsNull(), tenantId: scopeTenant } }),
      this.inspectionRepo.find({ where: { deletedAt: IsNull(), tenantId: scopeTenant } }),
      this.serviceRequestRepo.find({ where: { deletedAt: IsNull(), tenantId: scopeTenant } }),
      this.milestoneRepo.find({ where: { deletedAt: IsNull(), tenantId: scopeTenant } }),
      this.budgetRepo.find({ where: { deletedAt: IsNull(), tenantId: scopeTenant } }),
      this.getOutboxSnapshot(scopeTenant),
    ]);

    const totalNcrs = ncrRows.length;
    const openNcrs = ncrRows.filter((row) => row.status !== 'CLOSED').length;
    const closedNcrs = totalNcrs - openNcrs;
    const openRatioPct = totalNcrs > 0 ? Math.round((openNcrs / totalNcrs) * 1000) / 10 : 0;
    const ncrBySeverity: Record<string, number> = {};
    for (const row of ncrRows) ncrBySeverity[row.severity] = (ncrBySeverity[row.severity] ?? 0) + 1;
    const capaByStatus: Record<string, number> = {};
    let capaOpenCount = 0;
    for (const row of capaRows) {
      capaByStatus[row.status] = (capaByStatus[row.status] ?? 0) + 1;
      if (row.status !== CapaStatus.CLOSED && row.status !== CapaStatus.REJECTED) capaOpenCount++;
    }
    const inspectedQty = inspectionRows.reduce((s, r) => s + Number(r.sampleSize ?? 0), 0);
    const acceptedQty = inspectionRows.reduce((s, r) => s + Number(r.acceptedQty ?? 0), 0);
    const rejectedQty = inspectionRows.reduce((s, r) => s + Number(r.rejectedQty ?? 0), 0);
    const passRatePct = inspectedQty > 0 ? Math.round((acceptedQty / inspectedQty) * 1000) / 10 : 0;

    const totalServiceRequests = serviceRequests.length;
    const openServiceRequests = serviceRequests.filter((row) => !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(row.status)).length;
    const resolvedServiceRequests = serviceRequests.filter((row) => ['RESOLVED', 'CLOSED'].includes(row.status)).length;
    const closureRatePct = totalServiceRequests > 0
      ? Math.round((resolvedServiceRequests / totalServiceRequests) * 100)
      : 0;

    const quotationValue = Number(marginSummary.totalValue ?? 0);
    const totalConversion = leadPipeline.total > 0
      ? Math.round((Number(leadPipeline.converted ?? 0) / Number(leadPipeline.total)) * 100)
      : 0;

    const delayedProjects = this.computeDelayedProjects(milestones);
    const projectCompletionPct = this.computeProjectCompletionPct(milestones);
    const costPerformance = this.computeBudgetSummary(budgets);

    return {
      companyOverview: {
        tenantId: scopeTenant,
        totalProjects: projectStats.total,
        totalActiveProjects: projectStats.active,
        quotationValue,
        openRfqs: leadPipeline.open ?? 0,
        pipelineValue: Number(leadPipeline.pipelineValue ?? 0),
      },
      activeProjects: {
        total: projectStats.total,
        active: projectStats.active,
        dispatched: projectStats.dispatched,
        inService: projectStats.inService,
        byStage: projectStats.byStage,
        byHealth: projectStats.byHealth,
        delayedProjects,
        completionPct: projectCompletionPct,
      },
      quotationValue: {
        value: quotationValue,
        marginValue: marginSummary.totalMargin,
        marginPct: marginSummary.avgMarginPct,
        quoteCount: marginSummary.count,
      },
      openRfqs: {
        total: leadPipeline.total,
        open: leadPipeline.open,
        byStatus: leadPipeline.byStatus,
      },
      conversionRate: {
        ratePct: totalConversion,
        converted: Number(leadPipeline.converted ?? 0),
        total: leadPipeline.total,
      },
      productionStatus: productionStatus,
      qualityPerformance: {
        totalNcrs,
        openNcrs,
        closedNcrs,
        openRatioPct,
        ncrBySeverity,
        capaByStatus,
        capaOpenCount,
        inspectionPassRate: {
          inspectedQty,
          acceptedQty,
          rejectedQty,
          passRatePct,
        },
      },
      serviceStatus: {
        totalRequests: totalServiceRequests,
        openRequests: openServiceRequests,
        resolvedRequests: resolvedServiceRequests,
        closureRatePct,
      },
      costPerformance: {
        budgetedCount: costPerformance.budgetedCount,
        totalBudgeted: costPerformance.totalBudgeted,
        totalActual: costPerformance.totalActual,
        variancePct: costPerformance.variancePct,
      },
      profitability: {
        totalCost: marginSummary.totalCost,
        totalMargin: marginSummary.totalMargin,
        avgMarginPct: marginSummary.avgMarginPct,
      },
      enterpriseHealth: {
        byHealth: projectStats.byHealth,
        engineeringCoverage: engStats.totals?.drawings ?? 0,
        eventSnapshots: eventSnapshot,
      },
      widgets: this.getWidgetDefinitions(),
    };
  }

  async getWidgetDefinitions() {
    return [
      { id: 'company-overview', title: 'Company Overview', domain: 'enterprise', type: 'summary', enabled: true, refreshIntervalSeconds: 300 },
      { id: 'active-projects', title: 'Active Projects', domain: 'project', type: 'progress', enabled: true, refreshIntervalSeconds: 300 },
      { id: 'quotation-value', title: 'Quotation Value', domain: 'commercial', type: 'trend', enabled: true, refreshIntervalSeconds: 300 },
      { id: 'production-status', title: 'Production Status', domain: 'manufacturing', type: 'status', enabled: true, refreshIntervalSeconds: 300 },
      { id: 'quality-performance', title: 'Quality Performance', domain: 'quality', type: 'status', enabled: true, refreshIntervalSeconds: 300 },
      { id: 'service-status', title: 'Service Status', domain: 'service', type: 'status', enabled: true, refreshIntervalSeconds: 300 },
    ];
  }

  private async getOutboxSnapshot(tenantId?: string) {
    const scopeTenant = this.requireTenant(tenantId);
    const rows = await this.dataSource.query(
      `SELECT event_type AS "eventType", COUNT(*)::int AS count
       FROM domain_outbox
       WHERE deleted_at IS NULL
         AND tenant_id = $1
       GROUP BY event_type
       ORDER BY count DESC
       LIMIT 5`,
      [scopeTenant],
    );

    return rows.map((row: any) => ({ eventType: row.eventType, count: Number(row.count) }));
  }

  /**
   * Delayed-project count: projects carrying at least one milestone past its
   * planned date that is neither completed nor cancelled. Same rule as
   * ProjectService.computeHealth's first health check.
   */
  private computeDelayedProjects(milestones: ProjectMilestone[]): number {
    const today = new Date();
    const delayedProjects = new Set<string>();
    for (const m of milestones) {
      if (
        m.plannedDate &&
        new Date(m.plannedDate) < today &&
        m.status !== MilestoneStatus.COMPLETED &&
        m.status !== MilestoneStatus.CANCELLED
      ) {
        delayedProjects.add(m.projectId);
      }
    }
    return delayedProjects.size;
  }

  /**
   * Overall milestone completion percentage across projects.
   * Denominator = milestones that are not cancelled; numerator = completed.
   */
  private computeProjectCompletionPct(milestones: ProjectMilestone[]): number {
    const considered = milestones.filter((m) => m.status !== MilestoneStatus.CANCELLED);
    if (considered.length === 0) return 0;
    const completed = considered.filter((m) => m.status === MilestoneStatus.COMPLETED).length;
    return Math.round((completed / considered.length) * 1000) / 10;
  }

  /** Budget exposure: planned vs actual cost, variance %, from project_budgets. */
  private computeBudgetSummary(budgets: ProjectBudget[]) {
    const totalBudgeted = budgets.reduce((s, b) => s + Number(b.totalBudgeted ?? 0), 0);
    const totalActual = budgets.reduce((s, b) => s + Number(b.totalActual ?? 0), 0);
    const variancePct = totalBudgeted > 0
      ? Math.round(((totalActual - totalBudgeted) / totalBudgeted) * 1000) / 10
      : 0;
    return { budgetedCount: budgets.length, totalBudgeted, totalActual, variancePct };
  }

  /**
   * Monthly time series (last `months` buckets, calendar months) from real
   * record creation dates. Deterministic counts — NOT a forecast.
   * Keys intentionally match the frontend chart contract:
   *   projectTrends: [{ month, value }]
   *   qualityTrends: [{ month, ncrs, capas }]
   */
  async getTrends(tenantId?: string | null, months = 6): Promise<{
    projectTrends: Array<{ month: string; value: number }>;
    qualityTrends: Array<{ month: string; ncrs: number; capas: number }>;
    meta: { label: string; forecast: boolean };
  }> {
    const scopeTenant = this.requireTenant(tenantId);
    const bucketCount = Math.max(1, Math.min(months, 24));
    const now = new Date();
    const buckets: string[] = [];
    const projectCounts = new Map<string, number>();
    const ncrCounts = new Map<string, number>();
    const capaCounts = new Map<string, number>();

    for (let i = bucketCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.push(key);
      projectCounts.set(key, 0);
      ncrCounts.set(key, 0);
      capaCounts.set(key, 0);
    }
    const bucketKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const [projectRows, ncrRows, capaRows] = await Promise.all([
      this.dataSource.query(
        `SELECT created_at FROM projects WHERE deleted_at IS NULL AND tenant_id = $1 AND created_at >= $2`,
        [scopeTenant, `${buckets[0]}-01`],
      ),
      this.dataSource.query(
        `SELECT created_at FROM ncr_records WHERE deleted_at IS NULL AND tenant_id = $1 AND created_at >= $2`,
        [scopeTenant, `${buckets[0]}-01`],
      ),
      this.dataSource.query(
        `SELECT created_at FROM capa_verifications WHERE deleted_at IS NULL AND tenant_id = $1 AND created_at >= $2`,
        [scopeTenant, `${buckets[0]}-01`],
      ),
    ]);

    for (const row of projectRows) {
      const key = bucketKey(new Date(row.created_at));
      if (projectCounts.has(key)) projectCounts.set(key, (projectCounts.get(key) ?? 0) + 1);
    }
    for (const row of ncrRows) {
      const key = bucketKey(new Date(row.created_at));
      if (ncrCounts.has(key)) ncrCounts.set(key, (ncrCounts.get(key) ?? 0) + 1);
    }
    for (const row of capaRows) {
      const key = bucketKey(new Date(row.created_at));
      if (capaCounts.has(key)) capaCounts.set(key, (capaCounts.get(key) ?? 0) + 1);
    }

    return {
      projectTrends: buckets.map((month) => ({ month, value: projectCounts.get(month) ?? 0 })),
      qualityTrends: buckets.map((month) => ({
        month,
        ncrs: ncrCounts.get(month) ?? 0,
        capas: capaCounts.get(month) ?? 0,
      })),
      meta: {
        label: 'Indicative - monthly counts from real record dates, not a forecast',
        forecast: false,
      },
    };
  }
}
