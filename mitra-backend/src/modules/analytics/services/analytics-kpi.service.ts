import { Injectable, ForbiddenException } from '@nestjs/common';
import { AnalyticsDashboardService } from './analytics-dashboard.service';

@Injectable()
export class AnalyticsKpiService {
  constructor(private readonly dashboardService: AnalyticsDashboardService) {}

  async getKpis(tenantId?: string | null, period = '30d') {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for tenant-scoped operation');
    }
    const dashboard = await this.dashboardService.getExecutiveDashboard(tenantId);

    const baseDefinitions = [
      {
        id: 'quotation-value',
        domain: 'commercial',
        name: 'Quotation Value (Active Quotes)',
        formula: 'sum(non-draft, non-rejected quotations total_amount)',
        target: 1000000,
        threshold: 0.7,
        currentValue: dashboard.quotationValue.value,
        period,
      },
      {
        id: 'active-projects',
        domain: 'project',
        name: 'Active Projects',
        formula: 'count(projects where stage not in service or dispatch)',
        target: 25,
        threshold: 0.8,
        currentValue: dashboard.activeProjects.active,
        period,
      },
      {
        id: 'production-output',
        domain: 'manufacturing',
        name: 'Production Output Ratio',
        formula: 'completedQty / plannedQty (0 when no planned qty)',
        target: 0.95,
        threshold: 0.85,
        currentValue:
          dashboard.productionStatus.quantities &&
          Number(dashboard.productionStatus.quantities.planned) > 0
            ? Number(dashboard.productionStatus.quantities.completed) /
              Number(dashboard.productionStatus.quantities.planned)
            : 0,
        period,
      },
      {
        id: 'open-ncr-ratio',
        domain: 'quality',
        name: 'Open NCR Ratio',
        formula: 'openNcrs / totalNcrs',
        target: 0.5,
        threshold: 0.6,
        currentValue: dashboard.qualityPerformance.openRatioPct / 100,
        period,
      },
      {
        id: 'service-request-closure-rate',
        domain: 'service',
        name: 'Service Request Closure Rate',
        formula: 'resolvedRequests / totalRequests',
        target: 0.9,
        threshold: 0.8,
        currentValue: dashboard.serviceStatus.closureRatePct / 100,
        period,
      },
    ];

    return {
      period,
      definitions: baseDefinitions,
      generatedAt: new Date().toISOString(),
    };
  }
}