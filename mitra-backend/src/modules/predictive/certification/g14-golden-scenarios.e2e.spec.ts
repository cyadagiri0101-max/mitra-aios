import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { G14TimelineLevelingService } from '../services/g14-timeline-leveling.service';
import {
  G14LevelingRecommendation,
  RecommendationType,
  RecommendationStatus,
  LevelingRiskTier,
} from '../entities/g14-leveling-recommendation.entity';
import { Project } from '../../project/entities/project.entity';
import { ProjectMilestone } from '../../project/entities/projectmilestone.entity';
import { MachineMaster } from '../../machine/entities/machinemaster.entity';
import { WorkOrder } from '../../manufacturing/entities/workorder.entity';
import { G14DelayInferenceService } from '../services/g14-delay-inference.service';
import { G14CapacityForecastService } from '../services/g14-capacity-forecast.service';
import { G14ModelRegistryService } from '../services/g14-model-registry.service';
import { AuditService } from '../../audit/services/audit.service';

describe('G14 Golden Scenario E2E Certification (GS-01 -> GS-12)', () => {
  let service: G14TimelineLevelingService;

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '99999999-9999-9999-9999-999999999999';
  const projectA = '22222222-2222-2222-2222-222222222222';
  const machineA = '33333333-3333-3333-3333-333333333333';
  const milestoneA = '44444444-4444-4444-4444-444444444444';

  const mockRecRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve({ id: 'rec-101', ...dto })),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
  };

  const mockProjectRepo = {
    findOne: jest.fn(),
  };

  const mockMilestoneRepo = {
    find: jest.fn(),
  };

  const mockMachineRepo = {
    findOne: jest.fn(),
  };

  const mockWorkOrderRepo = {
    find: jest.fn(),
  };

  const mockDelayInferenceService = {
    predictProjectDelay: jest.fn(),
  };

  const mockCapacityForecastService = {
    predictCapacity: jest.fn(),
  };

  const mockModelRegistryService = {
    getActiveModelByCapability: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      save: jest.fn((entity, val) => Promise.resolve(val || entity)),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        G14TimelineLevelingService,
        { provide: getRepositoryToken(G14LevelingRecommendation), useValue: mockRecRepo },
        { provide: getRepositoryToken(Project), useValue: mockProjectRepo },
        { provide: getRepositoryToken(ProjectMilestone), useValue: mockMilestoneRepo },
        { provide: getRepositoryToken(MachineMaster), useValue: mockMachineRepo },
        { provide: getRepositoryToken(WorkOrder), useValue: mockWorkOrderRepo },
        { provide: G14DelayInferenceService, useValue: mockDelayInferenceService },
        { provide: G14CapacityForecastService, useValue: mockCapacityForecastService },
        { provide: G14ModelRegistryService, useValue: mockModelRegistryService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<G14TimelineLevelingService>(G14TimelineLevelingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GS-01: Normal Timeline Risk (Low risk, nominal state)', async () => {
    mockProjectRepo.findOne.mockResolvedValue({ id: projectA, name: 'Normal Tooling Project' });
    mockDelayInferenceService.predictProjectDelay.mockResolvedValue({
      predictedDelayDays: 0.5,
      delayProbability: 0.1,
      lowerPredictionBound: 0,
      upperPredictionBound: 1.5,
      modelVersion: 'G14_DELAY_RIDGE_V1',
      explanation: { primaryContributors: [] },
    });
    mockMilestoneRepo.find.mockResolvedValue([]);
    mockRecRepo.count.mockResolvedValue(0);

    const summary = await service.getProjectTimelineRisk(projectA, tenantA);

    expect(summary.riskTier).toBe(LevelingRiskTier.LOW);
    expect(summary.predictedDelayDays).toBe(0.5);
  });

  it('GS-02: Project Delay Risk (High delay risk & uncertainty bounds)', async () => {
    mockProjectRepo.findOne.mockResolvedValue({ id: projectA, name: 'Complex Stamping Die' });
    mockDelayInferenceService.predictProjectDelay.mockResolvedValue({
      predictedDelayDays: 8.2,
      delayProbability: 0.85,
      lowerPredictionBound: 5.5,
      upperPredictionBound: 11.0,
      modelVersion: 'G14_DELAY_RIDGE_V1',
      explanation: {
        primaryContributors: [{ featureName: 'schedule_variance_ratio', signalDirection: 'INCREASES_DELAY' }],
      },
    });
    mockMilestoneRepo.find.mockResolvedValue([
      { id: milestoneA, status: 'IN_PROGRESS', plannedDate: new Date('2026-09-01') },
    ]);
    mockRecRepo.count.mockResolvedValue(0);

    const summary = await service.getProjectTimelineRisk(projectA, tenantA);

    expect(summary.riskTier).toBe(LevelingRiskTier.HIGH);
    expect(summary.predictionInterval.lower).toBe(5.5);
    expect(summary.predictionInterval.upper).toBe(11.0);
  });

  it('GS-03: Capacity Deficit & Bottleneck Forecasting', async () => {
    mockMachineRepo.findOne.mockResolvedValue({ id: machineA, machineNumber: 'CNC-04' });
    mockCapacityForecastService.predictCapacity.mockResolvedValue({
      machineName: '5-Axis CNC Mill #04',
      predictedUtilizationRatio: 1.45,
      predictedDeficitHours: 36.0,
      overloadProbability: 0.92,
      modelVersion: 'G14_CAPACITY_RIDGE_V1',
      explanation: {
        bottleneckRiskTier: 'CRITICAL',
        primaryContributors: [{ featureName: 'total_demand_hours', signalDirection: 'INCREASES_CAPACITY_PRESSURE' }],
      },
    });
    mockRecRepo.count.mockResolvedValue(0);

    const summary = await service.getMachineCapacityRisk(machineA, tenantA);

    expect(summary.riskTier).toBe(LevelingRiskTier.CRITICAL);
    expect(summary.capacityDeficitHours).toBe(36.0);
    expect(summary.overloadProbability).toBe(0.92);
  });

  it('GS-04: Combined Multi-Dimensional Risk Aggregation & Recommendation Generation', async () => {
    mockProjectRepo.findOne.mockResolvedValue({ id: projectA, name: 'Complex Stamping Die' });
    mockDelayInferenceService.predictProjectDelay.mockResolvedValue({
      predictedDelayDays: 8.2,
      delayProbability: 0.85,
      lowerPredictionBound: 5.5,
      upperPredictionBound: 11.0,
      modelVersion: 'G14_DELAY_RIDGE_V1',
      explanation: { primaryContributors: [{ featureName: 'schedule_variance_ratio', signalDirection: 'INCREASES_DELAY' }] },
    });
    mockMilestoneRepo.find.mockResolvedValue([
      { id: milestoneA, status: 'IN_PROGRESS', plannedDate: new Date('2026-09-01') },
    ]);
    mockRecRepo.count.mockResolvedValue(0);

    const recs = await service.generateRecommendations({ projectId: projectA }, tenantA, 'planner@mitra.ai');

    expect(recs.length).toBe(1);
    expect(recs[0].recommendationType).toBe(RecommendationType.ADJUST_MILESTONE_DATE);
    expect(recs[0].status).toBe(RecommendationStatus.GENERATED);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'G14_LEVELING_RECOMMENDATION_GENERATED' }),
    );
  });

  it('GS-05: Human ACCEPT -> Explicit Apply with confirmExecution: true', async () => {
    const rec = {
      id: 'rec-101',
      tenantId: tenantA,
      status: RecommendationStatus.GENERATED,
      recommendationType: RecommendationType.ADJUST_MILESTONE_DATE,
      milestoneId: milestoneA,
      proposedState: { suggestedMilestonePlannedDate: new Date('2026-09-10') },
      expiresAt: new Date(Date.now() + 86400000),
    };
    mockRecRepo.findOne.mockResolvedValue(rec);
    mockQueryRunner.manager.findOne.mockResolvedValue({ id: milestoneA, plannedDate: new Date('2026-09-01') });

    // 1. Review
    await service.reviewRecommendation('rec-101', {}, tenantA, 'planner');
    expect(rec.status).toBe(RecommendationStatus.UNDER_REVIEW);

    // 2. Accept
    await service.acceptRecommendation('rec-101', {}, tenantA, 'planner');
    expect(rec.status).toBe(RecommendationStatus.ACCEPTED);

    // 3. Explicit Apply
    const applied = await service.applyRecommendation('rec-101', { confirmExecution: true }, tenantA, 'planner');
    expect(applied.status).toBe(RecommendationStatus.APPLIED);
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('GS-06: Human MODIFY (Preserving original AI recommendation trace)', async () => {
    const rec = {
      id: 'rec-102',
      tenantId: tenantA,
      status: RecommendationStatus.UNDER_REVIEW,
      proposedState: { bufferDays: 8 },
    };
    mockRecRepo.findOne.mockResolvedValue(rec);

    const modified = await service.modifyRecommendation(
      'rec-102',
      { proposedState: { bufferDays: 4 }, modificationReason: 'Machining cell capacity opened' },
      tenantA,
      'planner',
    );

    expect(modified.status).toBe(RecommendationStatus.MODIFIED);
    expect(modified.proposedState._originalAiProposal).toEqual({ bufferDays: 8 });
    expect(modified.proposedState.bufferDays).toBe(4);
  });

  it('GS-07: Human REJECT (Terminal rejection without business mutation)', async () => {
    const rec = {
      id: 'rec-103',
      tenantId: tenantA,
      status: RecommendationStatus.UNDER_REVIEW,
    };
    mockRecRepo.findOne.mockResolvedValue(rec);

    const rejected = await service.rejectRecommendation(
      'rec-103',
      { rejectionReason: 'Alternative supplier engaged' },
      tenantA,
      'planner',
    );

    expect(rejected.status).toBe(RecommendationStatus.REJECTED);
    expect(rejected.rejectionReason).toBe('Alternative supplier engaged');
    expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
  });

  it('GS-08: Human CANCEL (Terminal cancellation)', async () => {
    const rec = {
      id: 'rec-104',
      tenantId: tenantA,
      status: RecommendationStatus.ACCEPTED,
    };
    mockRecRepo.findOne.mockResolvedValue(rec);

    const cancelled = await service.cancelRecommendation(
      'rec-104',
      { cancellationReason: 'Project paused' },
      tenantA,
      'planner',
    );

    expect(cancelled.status).toBe(RecommendationStatus.CANCELLED);
  });

  it('GS-09: No Confirmation Safety Test (confirmExecution: false blocked)', async () => {
    const rec = {
      id: 'rec-105',
      tenantId: tenantA,
      status: RecommendationStatus.ACCEPTED,
      expiresAt: new Date(Date.now() + 86400000),
    };
    mockRecRepo.findOne.mockResolvedValue(rec);

    await expect(
      service.applyRecommendation('rec-105', { confirmExecution: false }, tenantA, 'planner'),
    ).rejects.toThrow(BadRequestException);
  });

  it('GS-10: Tenant Isolation (Cross-tenant access blocked fail-closed)', async () => {
    mockRecRepo.findOne.mockResolvedValue(null);

    await expect(
      service.getRecommendationById('rec-101', tenantB),
    ).rejects.toThrow(NotFoundException);

    await expect(
      service.getProjectTimelineRisk(projectA, ''),
    ).rejects.toThrow(ForbiddenException);
  });

  it('GS-11: RBAC & State Machine Transition Guardrails', async () => {
    const rec = {
      id: 'rec-106',
      tenantId: tenantA,
      status: RecommendationStatus.APPLIED,
    };
    mockRecRepo.findOne.mockResolvedValue(rec);

    // Cannot apply already applied recommendation
    await expect(
      service.applyRecommendation('rec-106', { confirmExecution: true }, tenantA, 'planner'),
    ).rejects.toThrow(BadRequestException);

    // Cannot cancel applied recommendation
    await expect(
      service.cancelRecommendation('rec-106', { cancellationReason: 'Oops' }, tenantA, 'planner'),
    ).rejects.toThrow(BadRequestException);
  });

  it('GS-12: Expiry Guardrail (Expired recommendation rejected on apply)', async () => {
    const expiredRec = {
      id: 'rec-107',
      tenantId: tenantA,
      status: RecommendationStatus.ACCEPTED,
      expiresAt: new Date(Date.now() - 10000), // in the past
    };
    mockRecRepo.findOne.mockResolvedValue(expiredRec);

    await expect(
      service.applyRecommendation('rec-107', { confirmExecution: true }, tenantA, 'planner'),
    ).rejects.toThrow(BadRequestException);

    expect(expiredRec.status).toBe(RecommendationStatus.EXPIRED);
  });
});
