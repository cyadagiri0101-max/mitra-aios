import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { G14TimelineLevelingService } from './g14-timeline-leveling.service';
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
import { G14DelayInferenceService } from './g14-delay-inference.service';
import { G14CapacityForecastService } from './g14-capacity-forecast.service';
import { G14ModelRegistryService } from './g14-model-registry.service';
import { AuditService } from '../../audit/services/audit.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('G14TimelineLevelingService', () => {
  let service: G14TimelineLevelingService;
  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockProjectId = '22222222-2222-2222-2222-222222222222';
  const mockMachineId = '33333333-3333-3333-3333-333333333333';
  const mockRecId = '44444444-4444-4444-4444-444444444444';

  const mockRecRepository = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve({ id: mockRecId, ...dto })),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
  };
  const mockProjectRepository = {
    findOne: jest.fn(),
  };
  const mockMilestoneRepository = {
    find: jest.fn(),
  };
  const mockMachineRepository = {
    findOne: jest.fn(),
  };
  const mockWorkOrderRepository = {
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
        { provide: getRepositoryToken(G14LevelingRecommendation), useValue: mockRecRepository },
        { provide: getRepositoryToken(Project), useValue: mockProjectRepository },
        { provide: getRepositoryToken(ProjectMilestone), useValue: mockMilestoneRepository },
        { provide: getRepositoryToken(MachineMaster), useValue: mockMachineRepository },
        { provide: getRepositoryToken(WorkOrder), useValue: mockWorkOrderRepository },
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ForbiddenException if tenantId is missing', async () => {
    await expect(
      service.getProjectTimelineRisk(mockProjectId, ''),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should compute project timeline risk summary combining M9.2 predictions', async () => {
    mockProjectRepository.findOne.mockResolvedValue({ id: mockProjectId, name: 'Tooling Rev B' });
    mockDelayInferenceService.predictProjectDelay.mockResolvedValue({
      predictedDelayDays: 6.5,
      delayProbability: 0.82,
      lowerPredictionBound: 4.0,
      upperPredictionBound: 9.0,
      modelVersion: 'G14_DELAY_RIDGE_V1',
      explanation: {
        primaryContributors: [{ featureName: 'schedule_variance_ratio', signalDirection: 'INCREASES_DELAY' }],
      },
    });
    mockMilestoneRepository.find.mockResolvedValue([
      { id: 'm1', status: 'IN_PROGRESS' },
    ]);
    mockRecRepository.count.mockResolvedValue(1);

    const summary = await service.getProjectTimelineRisk(mockProjectId, mockTenantId);

    expect(summary).toBeDefined();
    expect(summary.riskTier).toBe(LevelingRiskTier.HIGH);
    expect(summary.predictedDelayDays).toBe(6.5);
    expect(summary.activeMilestonesCount).toBe(1);
  });

  it('should generate advisory leveling recommendations without mutating schedule', async () => {
    mockProjectRepository.findOne.mockResolvedValue({ id: mockProjectId, name: 'Tooling Rev B' });
    mockDelayInferenceService.predictProjectDelay.mockResolvedValue({
      predictedDelayDays: 6.5,
      delayProbability: 0.82,
      lowerPredictionBound: 4.0,
      upperPredictionBound: 9.0,
      modelVersion: 'G14_DELAY_RIDGE_V1',
      explanation: {
        primaryContributors: [{ featureName: 'schedule_variance_ratio', signalDirection: 'INCREASES_DELAY' }],
      },
    });
    mockMilestoneRepository.find.mockResolvedValue([
      { id: 'm1', status: 'IN_PROGRESS', plannedDate: new Date() },
    ]);
    mockRecRepository.count.mockResolvedValue(0);

    const recs = await service.generateRecommendations(
      { projectId: mockProjectId },
      mockTenantId,
      'planner@mitra.ai',
    );

    expect(recs.length).toBe(1);
    expect(recs[0].status).toBe(RecommendationStatus.GENERATED);
    expect(recs[0].recommendationType).toBe(RecommendationType.ADJUST_MILESTONE_DATE);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'G14_LEVELING_RECOMMENDATION_GENERATED' }),
    );
  });

  it('should support human review, accept, modify, and reject workflow', async () => {
    const rec = {
      id: mockRecId,
      tenantId: mockTenantId,
      status: RecommendationStatus.GENERATED,
      proposedState: { bufferDays: 7 },
    };
    mockRecRepository.findOne.mockResolvedValue(rec);

    // 1. Review
    const reviewed = await service.reviewRecommendation(mockRecId, {}, mockTenantId, 'planner');
    expect(reviewed.status).toBe(RecommendationStatus.UNDER_REVIEW);

    // 2. Modify
    const modified = await service.modifyRecommendation(
      mockRecId,
      { proposedState: { bufferDays: 5 }, modificationReason: 'Customer deadline constraint' },
      mockTenantId,
      'planner',
    );
    expect(modified.status).toBe(RecommendationStatus.MODIFIED);
    expect(modified.proposedState._originalAiProposal).toEqual({ bufferDays: 7 });

    // 3. Accept
    const accepted = await service.acceptRecommendation(mockRecId, {}, mockTenantId, 'planner');
    expect(accepted.status).toBe(RecommendationStatus.ACCEPTED);
  });

  it('should require explicit confirmation and apply recommendation in transaction', async () => {
    const rec = {
      id: mockRecId,
      tenantId: mockTenantId,
      status: RecommendationStatus.ACCEPTED,
      recommendationType: RecommendationType.ADJUST_MILESTONE_DATE,
      milestoneId: 'm1',
      proposedState: { suggestedMilestonePlannedDate: new Date('2026-09-01') },
      expiresAt: new Date(Date.now() + 86400000),
    };
    mockRecRepository.findOne.mockResolvedValue(rec);
    mockQueryRunner.manager.findOne.mockResolvedValue({ id: 'm1', plannedDate: new Date('2026-08-25') });

    // Rejected if confirmExecution is false
    await expect(
      service.applyRecommendation(mockRecId, { confirmExecution: false }, mockTenantId),
    ).rejects.toThrow(BadRequestException);

    // Succeeded with explicit confirmation
    const applied = await service.applyRecommendation(
      mockRecId,
      { confirmExecution: true },
      mockTenantId,
      'planner',
    );

    expect(applied.status).toBe(RecommendationStatus.APPLIED);
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'G14_LEVELING_RECOMMENDATION_APPLIED' }),
    );
  });
});
