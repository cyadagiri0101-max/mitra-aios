import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { ProjectService } from '../../project/services/project.service';
import { LeadService } from '../../commercial/services/lead.service';
import { QuotationMarginService } from '../../commercial/services/quotation-margin.service';
import { EngineeringDashboardService } from '../../engineering/services/engineering-dashboard.service';
import { ProductionTrackingService } from '../../manufacturing/services/production-tracking.service';
import { NcrRecord } from '../../quality/entities/ncr-record.entity';
import { ServiceRequest } from '../../service/entities/servicerequest.entity';
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
    @InjectRepository(ServiceRequest) private readonly serviceRequestRepo: Repository<ServiceRequest>,
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
    const [projectStats, leadPipeline, marginSummary, engStats, productionStatus, ncrRows, serviceRequests, eventSnapshot] = await Promise.all([
      this.projectService.getDashboardStats(scopeTenant),
      this.leadService.getPipelineSummary(scopeTenant),
      this.quotationMarginService.getMarginSummary(scopeTenant),
      this.engineeringDashboardService.getStats(scopeTenant),
      this.productionTrackingService.dashboard({}, scopeTenant),
      this.ncrRepo.find({ where: { deletedAt: IsNull(), tenantId: scopeTenant } }),
      this.serviceRequestRepo.find({ where: { deletedAt: IsNull(), tenantId: scopeTenant } }),
      this.getOutboxSnapshot(scopeTenant),
    ]);

    const totalNcrs = ncrRows.length;
    const openNcrs = ncrRows.filter((row) => row.status !== 'CLOSED').length;
    const closedNcrs = totalNcrs - openNcrs;
    const totalServiceRequests = serviceRequests.length;
    const openServiceRequests = serviceRequests.filter((row) => !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(row.status)).length;
    const resolvedServiceRequests = serviceRequests.filter((row) => ['RESOLVED', 'CLOSED'].includes(row.status)).length;
    const serviceSlaCompliance = totalServiceRequests > 0
      ? Math.round((resolvedServiceRequests / totalServiceRequests) * 100)
      : 0;

    const revenue = Number(marginSummary.totalValue ?? 0);
    const totalConversion = leadPipeline.total > 0
      ? Math.round((Number(leadPipeline.converted ?? 0) / Number(leadPipeline.total)) * 100)
      : 0;

    return {
      companyOverview: {
        tenantId: scopeTenant,
        totalProjects: projectStats.total,
        totalActiveProjects: projectStats.active,
        revenue,
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
      },
      revenue: {
        currentRevenue: revenue,
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
        defectRatePct: totalNcrs > 0 ? Math.round((openNcrs / totalNcrs) * 100) : 0,
      },
      serviceStatus: {
        totalRequests: totalServiceRequests,
        openRequests: openServiceRequests,
        resolvedRequests: resolvedServiceRequests,
        slaCompliancePct: serviceSlaCompliance,
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
      { id: 'revenue', title: 'Revenue', domain: 'commercial', type: 'trend', enabled: true, refreshIntervalSeconds: 300 },
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
}
