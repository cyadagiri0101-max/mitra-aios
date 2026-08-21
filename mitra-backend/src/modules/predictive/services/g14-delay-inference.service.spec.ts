import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { G14DelayInferenceService } from './g14-delay-inference.service';
import { G14FeatureEngineeringService } from './g14-feature-engineering.service';
import { G14ModelTrainingService } from './g14-model-training.service';
import { G14ModelArtifact } from '../entities/g14-model-artifact.entity';
import { Project } from '../../project/entities/project.entity';
import { AuditService } from '../../audit/services/audit.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('G14DelayInferenceService', () => {
  let service: G14DelayInferenceService;
  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockProjectId = '22222222-2222-2222-2222-222222222222';

  const mockFeatureEngineeringService = {
    extractProjectFeatures: jest.fn(),
  };
  const mockModelTrainingService = {
    getActiveModel: jest.fn(),
  };
  const mockModelRepository = {
    findOne: jest.fn(),
  };
  const mockProjectRepository = {
    findOne: jest.fn(),
  };
  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        G14DelayInferenceService,
        { provide: G14FeatureEngineeringService, useValue: mockFeatureEngineeringService },
        { provide: G14ModelTrainingService, useValue: mockModelTrainingService },
        { provide: getRepositoryToken(G14ModelArtifact), useValue: mockModelRepository },
        { provide: getRepositoryToken(Project), useValue: mockProjectRepository },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<G14DelayInferenceService>(G14DelayInferenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ForbiddenException if tenantId is missing', async () => {
    await expect(
      service.predictProjectDelay({ projectId: mockProjectId }, ''),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw NotFoundException if project does not exist for tenant', async () => {
    mockProjectRepository.findOne.mockResolvedValue(null);

    await expect(
      service.predictProjectDelay({ projectId: mockProjectId }, mockTenantId),
    ).rejects.toThrow(NotFoundException);
  });

  it('should return safe heuristic fallback if model is untrained or unavailable', async () => {
    mockProjectRepository.findOne.mockResolvedValue({
      id: mockProjectId,
      tenantId: mockTenantId,
    });
    mockModelTrainingService.getActiveModel.mockResolvedValue(null);
    mockFeatureEngineeringService.extractProjectFeatures.mockResolvedValue({
      featureVector: {
        project: { cumulativeScheduleVarianceDays: 8 },
        denseVector: Array(20).fill(0.5),
      },
      featureMetadata: {
        dataQuality: { hasMissingBaselines: false },
      },
    });

    const result = await service.predictProjectDelay(
      { projectId: mockProjectId },
      mockTenantId,
    );

    expect(result).toBeDefined();
    expect(result.inferenceStatus).toBe('FALLBACK_UNTRAINED_MODEL');
    expect(result.predictedDelayDays).toBe(8);
    expect(result.warningMessage).toBeDefined();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'G14_DELAY_PREDICTION_FALLBACK',
      }),
    );
  });

  it('should generate statistical delay prediction with uncertainty and explainability', async () => {
    mockProjectRepository.findOne.mockResolvedValue({
      id: mockProjectId,
      tenantId: mockTenantId,
    });

    const weights = Array(20).fill(0.1);
    weights[2] = 2.5; // High weight on cumulative variance
    weights[12] = 1.8; // High weight on capacity gap

    mockModelTrainingService.getActiveModel.mockResolvedValue({
      id: 'model-1',
      modelVersion: 'G14_RIDGE_V1_2026',
      modelType: 'RIDGE_CALIBRATED_REGRESSION',
      weights,
      intercept: 1.5,
      residualStdDev: 2.0,
      provenanceHash: 'hash-xyz',
    });

    const denseVector = Array(20).fill(0.2);
    denseVector[2] = 3.0; // High cumulative variance
    denseVector[12] = 1.5; // High capacity gap

    mockFeatureEngineeringService.extractProjectFeatures.mockResolvedValue({
      featureVector: {
        project: { cumulativeScheduleVarianceDays: 12 },
        denseVector,
      },
      featureMetadata: {
        dataQuality: { hasMissingBaselines: false },
      },
    });

    const result = await service.predictProjectDelay(
      { projectId: mockProjectId, confidenceIntervalPct: 95 },
      mockTenantId,
    );

    expect(result).toBeDefined();
    expect(result.inferenceStatus).toBe('SUCCESS');
    expect(result.predictedDelayDays).toBeGreaterThan(0);
    expect(result.delayProbability).toBeGreaterThan(0);
    expect(result.lowerPredictionBound).toBeDefined();
    expect(result.upperPredictionBound).toBeGreaterThanOrEqual(result.predictedDelayDays);
    expect(result.explanation.primaryContributors.length).toBeGreaterThan(0);
    expect(result.explanation.riskTier).toBeDefined();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'G14_DELAY_PREDICTION_GENERATED',
      }),
    );
  });
});
