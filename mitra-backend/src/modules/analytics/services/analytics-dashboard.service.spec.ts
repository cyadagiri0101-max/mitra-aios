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
import { ServiceRequest } from '../../service/entities/servicerequest.entity';
import { DomainOutboxMessage } from '../../platform/entities/domain-outbox.entity';

describe('AnalyticsDashboardService', () => {
  let service: AnalyticsDashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsDashboardService,
        { provide: ProjectService, useValue: { getDashboardStats: jest.fn().mockResolvedValue({ total: 5, active: 3, dispatched: 1, inService: 1, byStage: {}, byHealth: { GREEN: 2, YELLOW: 0, RED: 1 } }) } },
        { provide: LeadService, useValue: { getPipelineSummary: jest.fn().mockResolvedValue({ total: 10, open: 4, byStatus: {}, pipelineValue: 120000, converted: 2 }) } },
        { provide: QuotationMarginService, useValue: { getMarginSummary: jest.fn().mockResolvedValue({ count: 8, totalValue: 250000, totalCost: 150000, totalMargin: 100000, avgMarginPct: 40 }) } },
        { provide: EngineeringDashboardService, useValue: { getStats: jest.fn().mockResolvedValue({ totals: { drawings: 4 } }) } },
        { provide: ProductionTrackingService, useValue: { dashboard: jest.fn().mockResolvedValue({ totalWorkOrders: 2, statusCounts: {}, quantities: { planned: 10, completed: 8, rejected: 1, rework: 0, scrap: 0 }, hours: { estimated: 5, actual: 4 }, jobs: { open: 1, inProgress: 1, runningMachines: 1, onTime: 1, late: 0 } }) } },
        { provide: getRepositoryToken(NcrRecord), useValue: { find: jest.fn().mockResolvedValue([{ status: 'OPEN' }, { status: 'CLOSED' }]) } },
        { provide: getRepositoryToken(ServiceRequest), useValue: { find: jest.fn().mockResolvedValue([{ status: 'OPEN' }, { status: 'RESOLVED' }, { status: 'CLOSED' }]) } },
        { provide: getRepositoryToken(DomainOutboxMessage), useValue: { find: jest.fn().mockResolvedValue([]) } },
        { provide: DataSource, useValue: { query: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();

    service = module.get<AnalyticsDashboardService>(AnalyticsDashboardService);
  });

  it('returns an executive dashboard payload with domain summary sections', async () => {
    const result = await service.getExecutiveDashboard('tenant-001');
    expect(result).toHaveProperty('companyOverview');
    expect(result).toHaveProperty('activeProjects');
    expect(result).toHaveProperty('revenue');
    expect(result).toHaveProperty('productionStatus');
    expect(result).toHaveProperty('qualityPerformance');
    expect(result).toHaveProperty('serviceStatus');
    expect(result).toHaveProperty('enterpriseHealth');
    expect(result).toHaveProperty('widgets');
  });
});
