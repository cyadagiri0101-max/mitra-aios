import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { G14FeatureEngineeringService, G14_CURRENT_FEATURE_VERSION } from './g14-feature-engineering.service';
import { G14TelemetryService } from './g14-telemetry.service';
import { G14FeatureSnapshot } from '../entities/g14-feature-snapshot.entity';
import { AuditService } from '../../audit/services/audit.service';
import { MilestoneStatus } from '../../project/entities/projectmilestone.entity';
import { NcrSeverity, NcrStatus } from '../../quality/entities/ncr-record.entity';
import { TrialResult } from '../../quality/entities/trialobservation.entity';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('G14FeatureEngineeringService', () => {
  let service: G14FeatureEngineeringService;
  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockProjectId = '22222222-2222-2222-2222-222222222222';

  const mockTelemetryService = {
    extractAuthoritativeTelemetry: jest.fn(),
  };
  const mockSnapshotRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        G14FeatureEngineeringService,
        { provide: G14TelemetryService, useValue: mockTelemetryService },
        { provide: getRepositoryToken(G14FeatureSnapshot), useValue: mockSnapshotRepository },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<G14FeatureEngineeringService>(G14FeatureEngineeringService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ForbiddenException if tenantId is missing', async () => {
    await expect(
      service.extractProjectFeatures(
        { projectId: mockProjectId },
        '',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException if featureVersion is unsupported', async () => {
    await expect(
      service.extractProjectFeatures(
        {
          projectId: mockProjectId,
          featureVersion: 'UNSUPPORTED_V99',
        },
        mockTenantId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should extract comprehensive feature vector and compute dense vector', async () => {
    const cutoff = new Date('2026-06-01T00:00:00.000Z');

    mockTelemetryService.extractAuthoritativeTelemetry.mockResolvedValue({
      project: {
        id: mockProjectId,
        createdAt: new Date('2026-01-01'),
        enquiryDate: new Date('2026-01-01'),
        targetDeliveryDate: new Date('2026-12-31'),
        dispatchedAt: null,
      },
      milestones: [
        {
          id: 'm1',
          milestoneName: 'Design Approval',
          status: MilestoneStatus.COMPLETED,
          plannedDate: new Date('2026-03-01'),
          actualDate: new Date('2026-03-10'),
          daysVariance: 9,
          createdAt: new Date('2026-01-02'),
        },
        {
          id: 'm2',
          milestoneName: 'Core Machining',
          status: MilestoneStatus.IN_PROGRESS,
          plannedDate: new Date('2026-05-01'),
          actualDate: null,
          daysVariance: 0,
          createdAt: new Date('2026-01-02'),
        },
      ],
      baselines: [
        { id: 'b1', baselineVersion: 1, createdAt: new Date('2026-01-05') },
      ],
      workOrders: [
        {
          id: 'w1',
          status: 'COMPLETED',
          plannedEndDate: new Date('2026-03-01'),
          actualEndDate: new Date('2026-03-05'),
          createdAt: new Date('2026-01-10'),
        },
      ],
      ncrs: [
        {
          id: 'n1',
          status: NcrStatus.OPEN,
          severity: NcrSeverity.CRITICAL,
          createdAt: new Date('2026-02-01'),
        },
      ],
      trials: [
        {
          id: 't1',
          result: TrialResult.FAIL,
          createdAt: new Date('2026-04-01'),
        },
      ],
      designLoads: [
        { plannedHours: 120, standardHours: 100, createdAt: new Date('2026-01-01') },
      ],
      predictionCutoff: cutoff,
      sourceHash: 'abcd1234efgh5678',
      futureExcludedCounts: { milestones: 0, workOrders: 0, ncrs: 0, trials: 0 },
    });

    mockSnapshotRepository.findOne.mockResolvedValue(null);
    mockSnapshotRepository.save.mockImplementation((s) => Promise.resolve({ id: 's-123', ...s }));

    const result = await service.extractProjectFeatures(
      {
        projectId: mockProjectId,
        predictionCutoff: cutoff.toISOString(),
        persistSnapshot: true,
        computeGroundTruthTarget: true,
      },
      mockTenantId,
    );

    expect(result.featureVector).toBeDefined();
    expect(result.featureVector.project.totalMilestonesCount).toBe(2);
    expect(result.featureVector.project.completedMilestonesCount).toBe(1);
    expect(result.featureVector.execution.totalWorkOrdersCount).toBe(1);
    expect(result.featureVector.quality.openNcrCount).toBe(1);
    expect(result.featureVector.capacity.isOverloaded).toBe(true);
    expect(result.featureVector.denseVector.length).toBe(20);
    expect(result.groundTruthTarget).toBeDefined();
    expect(result.snapshot).toBeDefined();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'G14_FEATURE_SNAPSHOT_EXTRACTED',
      }),
    );
  });
});
