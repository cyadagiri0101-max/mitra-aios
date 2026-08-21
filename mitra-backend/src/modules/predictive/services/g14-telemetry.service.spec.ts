import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { G14TelemetryService } from './g14-telemetry.service';
import { Project } from '../../project/entities/project.entity';
import { ProjectMilestone } from '../../project/entities/projectmilestone.entity';
import { ScheduleBaseline } from '../../project/entities/schedule-baseline.entity';
import { WorkOrder } from '../../manufacturing/entities/workorder.entity';
import { NcrRecord } from '../../quality/entities/ncr-record.entity';
import { TrialObservation } from '../../quality/entities/trialobservation.entity';
import { ProjectDesignLoad } from '../../design-load/entities/project-design-load.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('G14TelemetryService', () => {
  let service: G14TelemetryService;
  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockProjectId = '22222222-2222-2222-2222-222222222222';

  const mockProjectRepository = {
    findOne: jest.fn(),
  };
  const mockMilestoneRepository = {
    find: jest.fn(),
  };
  const mockBaselineRepository = {
    find: jest.fn(),
  };
  const mockWorkOrderRepository = {
    find: jest.fn(),
  };
  const mockNcrRepository = {
    find: jest.fn(),
  };
  const mockTrialRepository = {
    find: jest.fn(),
  };
  const mockDesignLoadRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        G14TelemetryService,
        { provide: getRepositoryToken(Project), useValue: mockProjectRepository },
        { provide: getRepositoryToken(ProjectMilestone), useValue: mockMilestoneRepository },
        { provide: getRepositoryToken(ScheduleBaseline), useValue: mockBaselineRepository },
        { provide: getRepositoryToken(WorkOrder), useValue: mockWorkOrderRepository },
        { provide: getRepositoryToken(NcrRecord), useValue: mockNcrRepository },
        { provide: getRepositoryToken(TrialObservation), useValue: mockTrialRepository },
        { provide: getRepositoryToken(ProjectDesignLoad), useValue: mockDesignLoadRepository },
      ],
    }).compile();

    service = module.get<G14TelemetryService>(G14TelemetryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ForbiddenException if tenantId is missing', async () => {
    await expect(
      service.extractAuthoritativeTelemetry(mockProjectId, ''),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw NotFoundException if project does not exist for tenant', async () => {
    mockProjectRepository.findOne.mockResolvedValue(null);

    await expect(
      service.extractAuthoritativeTelemetry(mockProjectId, mockTenantId, new Date('2026-06-01')),
    ).rejects.toThrow(NotFoundException);
  });

  it('should extract historical telemetry and exclude future events past cutoff', async () => {
    const cutoff = new Date('2026-06-01T00:00:00.000Z');

    mockProjectRepository.findOne.mockResolvedValue({
      id: mockProjectId,
      tenantId: mockTenantId,
      createdAt: new Date('2026-01-01'),
    });

    mockBaselineRepository.find.mockResolvedValue([
      { id: 'b1', createdAt: new Date('2026-02-01'), baselineVersion: 1 },
    ]);

    mockMilestoneRepository.find.mockResolvedValue([
      { id: 'm1', createdAt: new Date('2026-02-01') },
      { id: 'm2', createdAt: new Date('2026-07-01') }, // Future
    ]);

    mockWorkOrderRepository.find.mockResolvedValue([
      { id: 'w1', createdAt: new Date('2026-03-01') },
      { id: 'w2', createdAt: new Date('2026-08-01') }, // Future
    ]);

    mockNcrRepository.find.mockResolvedValue([
      { id: 'n1', createdAt: new Date('2026-04-01') },
    ]);

    mockTrialRepository.find.mockResolvedValue([
      { id: 't1', createdAt: new Date('2026-05-01') },
    ]);

    mockDesignLoadRepository.find.mockResolvedValue([]);

    const result = await service.extractAuthoritativeTelemetry(mockProjectId, mockTenantId, cutoff);

    expect(result.milestones.length).toBe(1);
    expect(result.workOrders.length).toBe(1);
    expect(result.futureExcludedCounts.milestones).toBe(1);
    expect(result.futureExcludedCounts.workOrders).toBe(1);
    expect(result.sourceHash).toBeDefined();
  });
});
