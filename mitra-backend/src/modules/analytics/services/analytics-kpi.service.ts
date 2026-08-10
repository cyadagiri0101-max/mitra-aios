import { Injectable } from '@nestjs/common';
import { AnalyticsDashboardService } from './analytics-dashboard.service';

@Injectable()
export class AnalyticsKpiService {
  constructor(private readonly dashboardService: AnalyticsDashboardService) {}

  async getKpis(tenantId?: string, period = '30d') {
    const dashboard = await this.dashboardService.getExecutiveDashboard(tenantId);

    const baseDefinitions = [
      {
        id: 'revenue',
        domain: 'commercial',
        name: 'Revenue',
        formula: 'sum(accepted quotations total_amount)',
        target: 1000000,
        threshold: 0.7,
        currentValue: dashboard.revenue.currentRevenue,
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
        name: 'Production Output',
        formula: 'completedQty / plannedQty',
        target: 0.95,
        threshold: 0.85,
        currentValue: dashboard.productionStatus.quantities?.completed ?? 0,
        period,
      },
      {
        id: 'quality-defect-rate',
        domain: 'quality',
        name: 'Quality Defect Rate',
        formula: 'openNcrs / totalNcrs',
        target: 0.05,
        threshold: 0.1,
        currentValue: dashboard.qualityPerformance.defectRatePct,
        period,
      },
      {
        id: 'service-sla-compliance',
        domain: 'service',
        name: 'Service SLA Compliance',
        formula: 'resolvedRequests / totalRequests',
        target: 0.9,
        threshold: 0.8,
        currentValue: dashboard.serviceStatus.slaCompliancePct,
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
