import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsKpiService } from './analytics-kpi.service';
import { AnalyticsDashboardService } from './analytics-dashboard.service';

describe('AnalyticsKpiService (M6 semantic hardening)', () => {
  let service: AnalyticsKpiService;
  const dashboard = {
    quotationValue: { value: 250000 },
    activeProjects: { active: 3 },
    productionStatus: { quantities: { planned: 10, completed: 8 } },
    qualityPerformance: { openRatioPct: 50 },
    serviceStatus: { closureRatePct: 67 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsKpiService,
        {
          provide: AnalyticsDashboardService,
          useValue: { getExecutiveDashboard: jest.fn().mockResolvedValue(dashboard) },
        },
      ],
    }).compile();

    service = module.get<AnalyticsKpiService>(AnalyticsKpiService);
  });

  it('redefines revenue as quotation value with a matching formula', async () => {
    const result = await service.getKpis('tenant-001');
    const kpi = result.definitions.find((d) => d.id === 'quotation-value')!
    expect(kpi).toBeDefined();
    expect(kpi.name).toBe('Quotation Value (Active Quotes)');
    expect(kpi.formula).toBe('sum(non-draft, non-rejected quotations total_amount)');
    expect(kpi.currentValue).toBe(250000);
    expect(result.definitions.some((d) => d.id === 'revenue')).toBe(false);
  });

  it('computes the production output ratio matching its declared formula', async () => {
    const result = await service.getKpis('tenant-001');
    const kpi = result.definitions.find((d) => d.id === 'production-output')!
    expect(kpi.currentValue).toBe(0.8);
    expect(kpi.formula).toBe('completedQty / plannedQty (0 when no planned qty)');
  });

  it('returns 0 output ratio when planned quantity is missing', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsKpiService,
        {
          provide: AnalyticsDashboardService,
          useValue: {
            getExecutiveDashboard: jest.fn().mockResolvedValue({
              ...dashboard,
              productionStatus: { quantities: { planned: 0, completed: 8 } },
            }),
          },
        },
      ],
    }).compile();
    const emptyService = module.get<AnalyticsKpiService>(AnalyticsKpiService);
    const result = await emptyService.getKpis('tenant-001');
    expect(result.definitions.find((d) => d.id === 'production-output')!.currentValue).toBe(0);
  });

  it('exposes open NCR ratio, not defect rate', async () => {
    const result = await service.getKpis('tenant-001');
    const kpi = result.definitions.find((d) => d.id === 'open-ncr-ratio')!
    expect(kpi).toBeDefined();
    expect(kpi.name).toBe('Open NCR Ratio');
    expect(kpi.currentValue).toBe(0.5);
    expect(result.definitions.some((d) => d.id === 'quality-defect-rate')).toBe(false);
  });

  it('exposes service request closure rate, not SLA compliance', async () => {
    const result = await service.getKpis('tenant-001');
    const kpi = result.definitions.find((d) => d.id === 'service-request-closure-rate')!
    expect(kpi).toBeDefined();
    expect(kpi.name).toBe('Service Request Closure Rate');
    expect(kpi.currentValue).toBe(0.67);
    expect(result.definitions.some((d) => d.id === 'service-sla-compliance')).toBe(false);
  });

  it('fails closed without a tenant context', async () => {
    await expect(service.getKpis(undefined)).rejects.toThrow('Tenant context required');
  });
});