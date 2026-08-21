import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { G14ModelTrainingService } from './g14-model-training.service';
import { G14FeatureSnapshot } from '../entities/g14-feature-snapshot.entity';
import { G14ModelArtifact } from '../entities/g14-model-artifact.entity';
import { AuditService } from '../../audit/services/audit.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('G14ModelTrainingService', () => {
  let service: G14ModelTrainingService;
  const mockTenantId = '11111111-1111-1111-1111-111111111111';

  const mockSnapshotRepository = {
    find: jest.fn(),
  };
  const mockModelRepository = {
    update: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };
  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        G14ModelTrainingService,
        { provide: getRepositoryToken(G14FeatureSnapshot), useValue: mockSnapshotRepository },
        { provide: getRepositoryToken(G14ModelArtifact), useValue: mockModelRepository },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<G14ModelTrainingService>(G14ModelTrainingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ForbiddenException if tenantId is missing', async () => {
    await expect(
      service.trainProjectDelayModel({}, ''),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException if featureVersion is unsupported', async () => {
    await expect(
      service.trainProjectDelayModel({ featureVersion: 'UNSUPPORTED' }, mockTenantId),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if historical samples are below minimum threshold', async () => {
    mockSnapshotRepository.find.mockResolvedValue([
      { id: '1', groundTruthTarget: { projectDelayDays: 5 } },
    ]);

    await expect(
      service.trainProjectDelayModel({ minSamplesThreshold: 5 }, mockTenantId),
    ).rejects.toThrow(BadRequestException);
  });

  it('should successfully train Ridge regression model on chronological snapshots', async () => {
    const mockSnapshots = Array.from({ length: 10 }, (_, i) => ({
      id: `snap-${i}`,
      predictionCutoff: new Date(`2026-0${(i % 8) + 1}-15`),
      featureVector: {
        denseVector: Array.from({ length: 20 }, (_, j) => (j === 2 ? i * 2 : (i + 1) * 0.1)),
      },
      groundTruthTarget: {
        projectDelayDays: i * 3 + 2,
        isDelayed: i > 0,
      },
    }));

    mockSnapshotRepository.find.mockResolvedValue(mockSnapshots);
    mockModelRepository.update.mockResolvedValue({ affected: 1 });
    mockModelRepository.save.mockImplementation((artifact) =>
      Promise.resolve({ id: 'model-123', ...artifact }),
    );

    const result = await service.trainProjectDelayModel(
      { minSamplesThreshold: 5, regularizationAlpha: 1.0 },
      mockTenantId,
    );

    expect(result).toBeDefined();
    expect(result.weights).toBeDefined();
    expect(result.weights.length).toBe(20);
    expect(result.evaluationMetrics).toBeDefined();
    expect(result.evaluationMetrics.mae).toBeGreaterThanOrEqual(0);
    expect(result.evaluationMetrics.sampleCount).toBe(10);
    expect(result.provenanceHash).toBeDefined();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'G14_PREDICTIVE_MODEL_TRAINED',
      }),
    );
  });
});
