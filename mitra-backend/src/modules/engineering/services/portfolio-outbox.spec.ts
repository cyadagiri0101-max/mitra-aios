import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PortfolioSnapshotService } from './portfolio-snapshot.service';
import { PortfolioDemandService } from './portfolio-demand.service';
import { PortfolioCapacityService } from './portfolio-capacity.service';
import { PortfolioBalancingService } from './portfolio-balancing.service';
import { OutboxService } from '../../platform/services/outbox.service';
import { EnterprisePortfolioSnapshot } from '../entities/enterprise-portfolio-snapshot.entity';
import { CrossProjectAllocation } from '../entities/cross-project-allocation.entity';
import { EngineeringDomainEventType } from '../events/engineering.events';

describe('M12.5 Sprint 3: Portfolio Transactional Outbox Integration', () => {
  let service: PortfolioSnapshotService;
  let outboxService: OutboxService;
  let snapshotRepo: any;
  let allocationRepo: any;

  const mockTenantId = 'tenant-automotive-01';

  beforeEach(async () => {
    snapshotRepo = {
      create: jest.fn((dto) => ({ id: 'snap-100', ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'snap-100', ...entity })),
      findOne: jest.fn(),
    };

    allocationRepo = {
      create: jest.fn((dto) => ({ id: 'alloc-100', ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'alloc-100', ...entity })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockDemandService = {
      calculatePortfolioDemand: jest.fn().mockResolvedValue({
        tenantId: mockTenantId,
        totalDemandHours: 350,
        totalDeliverablesCount: 15,
        activeProjectsCount: 2,
        uncalibratedDeliverablesCount: 0,
        projects: [{ projectId: 'BM289', estimatedTotalHours: 200, totalDeliverablesCount: 10, complexityTier: 'HIGH' }],
      }),
    };

    const mockCapacityService = {
      calculatePortfolioCapacity: jest.fn().mockResolvedValue({
        tenantId: mockTenantId,
        totalAvailableWeeklyCapacityHours: 400,
        totalAllocatedWeeklyCapacityHours: 350,
        overallUtilizationPercentage: 87.5,
        totalEngineersCount: 10,
        overloadedEngineersCount: 0,
        underutilizedEngineersCount: 1,
        engineers: [],
      }),
    };

    const mockBalancingService = {
      analyzeAndBalance: jest.fn().mockResolvedValue({
        tenantId: mockTenantId,
        overallHealthScore: 92,
        bottlenecks: [],
        recommendations: [],
      }),
    };

    const mockOutboxService = {
      append: jest.fn().mockResolvedValue({ id: 'outbox-msg-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioSnapshotService,
        { provide: getRepositoryToken(EnterprisePortfolioSnapshot), useValue: snapshotRepo },
        { provide: getRepositoryToken(CrossProjectAllocation), useValue: allocationRepo },
        { provide: PortfolioDemandService, useValue: mockDemandService },
        { provide: PortfolioCapacityService, useValue: mockCapacityService },
        { provide: PortfolioBalancingService, useValue: mockBalancingService },
        { provide: OutboxService, useValue: mockOutboxService },
      ],
    }).compile();

    service = module.get<PortfolioSnapshotService>(PortfolioSnapshotService);
    outboxService = module.get<OutboxService>(OutboxService);
  });

  it('appends PORTFOLIO_SNAPSHOT_CREATED outbox message on snapshot capture', async () => {
    const snapshot = await service.createSnapshot(mockTenantId, {
      snapshotName: 'Q3 Milestone Freeze',
      actorId: 'PLANNER_USER_01',
    });

    expect(snapshot.id).toBe('snap-100');
    expect(outboxService.append).toHaveBeenCalledWith(
      EngineeringDomainEventType.PORTFOLIO_SNAPSHOT_CREATED,
      'enterprise_portfolio_snapshot',
      'snap-100',
      expect.objectContaining({
        snapshotId: 'snap-100',
        snapshotName: 'Q3 Milestone Freeze',
        totalDemandHours: 350,
        totalCapacityHours: 400,
      }),
      expect.objectContaining({
        tenantId: mockTenantId,
        actorId: 'PLANNER_USER_01',
      }),
    );
  });

  it('appends PORTFOLIO_ALLOCATION_CREATED outbox message on cross-project allocation', async () => {
    const allocation = await service.createAllocation(
      mockTenantId,
      {
        projectId: 'BM289',
        engineerId: 'ENG_SR_01',
        engineerName: 'Rajesh Sharma',
        allocationRole: 'LEAD_DESIGNER',
        allocatedHoursPerWeek: 20,
        startDate: '2026-09-01',
        endDate: '2026-10-01',
        reviewRationale: 'Workload balancing',
      },
      'LEAD_PROJECT_MANAGER',
    );

    expect(allocation.id).toBe('alloc-100');
    expect(outboxService.append).toHaveBeenCalledWith(
      EngineeringDomainEventType.PORTFOLIO_ALLOCATION_CREATED,
      'cross_project_allocation',
      'alloc-100',
      expect.objectContaining({
        allocationId: 'alloc-100',
        projectId: 'BM289',
        engineerId: 'ENG_SR_01',
        allocatedHoursPerWeek: 20,
      }),
      expect.objectContaining({
        tenantId: mockTenantId,
        actorId: 'LEAD_PROJECT_MANAGER',
      }),
    );
  });

  it('appends PORTFOLIO_ALLOCATION_STATUS_UPDATED outbox message on status update', async () => {
    allocationRepo.findOne.mockResolvedValueOnce({
      id: 'alloc-100',
      tenantId: mockTenantId,
      projectId: 'BM289',
      engineerId: 'ENG_SR_01',
      allocationStatus: 'ACTIVE',
    });

    const updated = await service.updateAllocationStatus(
      mockTenantId,
      'alloc-100',
      { status: 'RELEASED', rationale: 'Milestone delivered' },
      'LEAD_PROJECT_MANAGER',
    );

    expect(updated.allocationStatus).toBe('RELEASED');
    expect(outboxService.append).toHaveBeenCalledWith(
      EngineeringDomainEventType.PORTFOLIO_ALLOCATION_STATUS_UPDATED,
      'cross_project_allocation',
      'alloc-100',
      expect.objectContaining({
        allocationId: 'alloc-100',
        projectId: 'BM289',
        allocationStatus: 'RELEASED',
        reviewRationale: 'Milestone delivered',
      }),
      expect.objectContaining({
        tenantId: mockTenantId,
        actorId: 'LEAD_PROJECT_MANAGER',
      }),
    );
  });
});
