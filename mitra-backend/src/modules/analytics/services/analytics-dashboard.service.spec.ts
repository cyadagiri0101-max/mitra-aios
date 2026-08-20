import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AnalyticsDashboardService } from './analytics-dashboard.service';
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

describe('AnalyticsDashboardService', () => {
  let service: AnalyticsDashboardService;
  let capaRepo: any;
  let inspectionRepo: any;
  let milestoneRepo: any;
  let budgetRepo: any;
  let dataSource: any;

  beforeEach(async () => {
    capaRepo = { find: jest.fn().mockResolvedValue([{ status: CapaStatus.OPEN }, { status: CapaStatus.CLOSED }]) };
    inspectionRepo = { find: jest.fn().mockResolvedValue([{ sampleSize: 10, acceptedQty: 9, rejectedQty: 1 }]) };
    milestoneRepo = {
      find: jest.fn().mockResolvedValue([
        { projectId: 'p-1', plannedDate: new Date('2020-01-01'), status: MilestoneStatus.COMPLETED },
        { projectId: 'p-1', plannedDate: new Date('2020-01-01'), status: MilestoneStatus.COMPLETED },
        { projectId: 'p-1', plannedDate: new Date('2020-01-01'), status: MilestoneStatus.PENDING },
        { projectId: 'p-2', plannedDate: new Date('2020-01-01'), status: MilestoneStatus.PENDING },
      ]),
    };
    budgetRepo = {
      find: jest.fn().mockResolvedValue([{ totalBudgeted: 100000, totalActual: 110000 }, { totalBudgeted: 50000, totalActual: 50000 }]),
    };
    dataSource = { query: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsDashboardService,
        { provide: ProjectService, useValue: { getDashboardStats: jest.fn().mockResolvedValue({ total: 5, active: 3, dispatched: 1, inService: 1, byStage: {}, byHealth: { GREEN: 2, YELLOW: 0, RED: 1 } }) } },
        { provide: LeadService, useValue: { getPipelineSummary: jest.fn().mockResolvedValue({ total: 10, open: 4, byStatus: {}, pipelineValue: 120000, converted: 2 }) } },
        { provide: QuotationMarginService, useValue: { getMarginSummary: jest.fn().mockResolvedValue({ count: 8, totalValue: 250000, totalCost: 150000, totalMargin: 100000, avgMarginPct: 40 }) } },
        { provide: EngineeringDashboardService, useValue: { getStats: jest.fn().mockResolvedValue({ totals: { drawings: 4 } }) } },
        { provide: ProductionTrackingService, useValue: { dashboard: jest.fn().mockResolvedValue({ totalWorkOrders: 2, statusCounts: {}, quantities: { planned: 10, completed: 8, rejected: 1, rework: 0, scrap: 0 }, hours: { estimated: 5, actual: 4 }, jobs: { open: 1, inProgress: 1, runningMachines: 1, late: 0 } }) } },
        { provide: getRepositoryToken(NcrRecord), useValue: { find: jest.fn().mockResolvedValue([{ status: 'OPEN', severity: 'CRITICAL' }, { status: 'CLOSED', severity: 'MAJOR' }]) } },
        { provide: getRepositoryToken(CapaVerification), useValue: capaRepo },
        { provide: getRepositoryToken(InspectionReport), useValue: inspectionRepo },
        { provide: getRepositoryToken(ServiceRequest), useValue: { find: jest.fn().mockResolvedValue([{ status: 'OPEN' }, { status: 'RESOLVED' }, { status: 'CLOSED' }]) } },
        { provide: getRepositoryToken(ProjectMilestone), useValue: milestoneRepo },
        { provide: getRepositoryToken(ProjectBudget), useValue: budgetRepo },
        { provide: getRepositoryToken(DomainOutboxMessage), useValue: { find: jest.fn().mockResolvedValue([]) } },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AnalyticsDashboardService>(AnalyticsDashboardService);
  });

  it('returns an executive dashboard payload with domain summary sections', async () => {
    const result = await service.getExecutiveDashboard('tenant-001');
    expect(result).toHaveProperty('companyOverview');
    expect(result).toHaveProperty('activeProjects');
    expect(result).toHaveProperty('quotationValue');
    expect(result).toHaveProperty('productionStatus');
    expect(result).toHaveProperty('qualityPerformance');
    expect(result).toHaveProperty('serviceStatus');
    expect(result).toHaveProperty('costPerformance');
    expect(result).toHaveProperty('enterpriseHealth');
    expect(result).toHaveProperty('widgets');
  });

  it('exposes quotation value — never a key named revenue', async () => {
    const result = await service.getExecutiveDashboard('tenant-001');
    expect(result.companyOverview.quotationValue).toBe(250000);
    expect(result.quotationValue.value).toBe(250000);
    expect(result.quotationValue.marginPct).toBe(40);
    expect(result.quotationValue.quoteCount).toBe(8);
    expect(result as any).not.toHaveProperty('revenue');
    expect(result.companyOverview as any).not.toHaveProperty('revenue');
  });

  it('exposes open NCR ratio and severity mix — never a defect rate', async () => {
    const result = await service.getExecutiveDashboard('tenant-001');
    expect(result.qualityPerformance.totalNcrs).toBe(2);
    expect(result.qualityPerformance.openNcrs).toBe(1);
    expect(result.qualityPerformance.openRatioPct).toBe(50);
    expect(result.qualityPerformance.ncrBySeverity).toEqual({ CRITICAL: 1, MAJOR: 1 });
    expect(result.qualityPerformance as any).not.toHaveProperty('defectRatePct');
  });

  it('exposes CAPA status distribution and open count', async () => {
    const result = await service.getExecutiveDashboard('tenant-001');
    expect(result.qualityPerformance.capaByStatus).toEqual({ OPEN: 1, CLOSED: 1 });
    expect(result.qualityPerformance.capaOpenCount).toBe(1);
  });

  it('exposes inspection pass rate with explicit numerator and denominator', async () => {
    const result = await service.getExecutiveDashboard('tenant-001');
    expect(result.qualityPerformance.inspectionPassRate).toEqual({
      inspectedQty: 10,
      acceptedQty: 9,
      rejectedQty: 1,
      passRatePct: 90,
    });
  });

  it('exposes service closure rate — never SLA compliance', async () => {
    const result = await service.getExecutiveDashboard('tenant-001');
    expect(result.serviceStatus.totalRequests).toBe(3);
    expect(result.serviceStatus.resolvedRequests).toBe(2);
    expect(result.serviceStatus.closureRatePct).toBe(67);
    expect(result.serviceStatus as any).not.toHaveProperty('slaCompliancePct');
  });

  it('exposes delayed-project count and milestone completion percentage', async () => {
    const result = await service.getExecutiveDashboard('tenant-001');
    expect(result.activeProjects.delayedProjects).toBe(2);
    expect(result.activeProjects.completionPct).toBe(50);
  });

  it('exposes cost performance from project budgets', async () => {
    const result = await service.getExecutiveDashboard('tenant-001');
    expect(result.costPerformance).toEqual({
      budgetedCount: 2,
      totalBudgeted: 150000,
      totalActual: 160000,
      variancePct: 6.7,
    });
  });

  it('returns empty-safe aggregates when no quality/planning data exists', async () => {
    capaRepo.find.mockResolvedValue([]);
    inspectionRepo.find.mockResolvedValue([]);
    milestoneRepo.find.mockResolvedValue([]);
    budgetRepo.find.mockResolvedValue([]);
    const result = await service.getExecutiveDashboard('tenant-001');
    expect(result.qualityPerformance.capaOpenCount).toBe(0);
    expect(result.qualityPerformance.inspectionPassRate.passRatePct).toBe(0);
    expect(result.activeProjects.delayedProjects).toBe(0);
    expect(result.activeProjects.completionPct).toBe(0);
    expect(result.costPerformance.budgetedCount).toBe(0);
    expect(result.costPerformance.variancePct).toBe(0);
  });

  it('fails closed without a tenant context', async () => {
    await expect(service.getExecutiveDashboard(undefined)).rejects.toThrow('Tenant context required');
  });

  describe('getTrends', () => {
    it('buckets projects, NCRs and CAPAs into calendar months from real creation dates', async () => {
      const now = new Date();
      const monthKey = (offset: number) => {
        const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      };
      const m3 = monthKey(2);
      const m2 = monthKey(1);
      const m1 = monthKey(0);

      dataSource.query.mockResolvedValueOnce([
        { created_at: `${m3}-10T10:00:00Z` },
        { created_at: `${m2}-01T10:00:00Z` },
        { created_at: `${m1}-15T10:00:00Z` },
      ]);
      dataSource.query.mockResolvedValueOnce([{ created_at: `${m2}-02T10:00:00Z` }]);
      dataSource.query.mockResolvedValueOnce([{ created_at: `${m3}-20T10:00:00Z` }, { created_at: `${m1}-01T10:00:00Z` }]);

      const result = await service.getTrends('tenant-001', 3);
      expect(result.projectTrends).toEqual([
        { month: m3, value: 1 },
        { month: m2, value: 1 },
        { month: m1, value: 1 },
      ]);
      expect(result.qualityTrends).toEqual([
        { month: m3, ncrs: 0, capas: 1 },
        { month: m2, ncrs: 1, capas: 0 },
        { month: m1, ncrs: 0, capas: 1 },
      ]);
    });

    it('returns zero-filled buckets when no records exist', async () => {
      dataSource.query.mockResolvedValue([]);
      const result = await service.getTrends('tenant-001', 2);
      expect(result.projectTrends).toHaveLength(2);
      expect(result.projectTrends.every((t) => t.value === 0)).toBe(true);
      expect(result.qualityTrends.every((t) => t.ncrs === 0 && t.capas === 0)).toBe(true);
    });

    it('fails closed without a tenant context', async () => {
      await expect(service.getTrends(undefined)).rejects.toThrow('Tenant context required');
    });
  });
});