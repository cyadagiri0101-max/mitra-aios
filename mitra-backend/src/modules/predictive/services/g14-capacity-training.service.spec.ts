import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { G14CapacityTrainingService } from './g14-capacity-training.service';
import { G14CapacitySnapshot } from '../entities/g14-capacity-snapshot.entity';
import { G14CapacityModelArtifact } from '../entities/g14-capacity-model-artifact.entity';
import { AuditService } from '../../audit/services/audit.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('G14CapacityTrainingService', () => {
  let service: G14CapacityTrainingService;
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
        G14CapacityTrainingService,
        { provide: getRepositoryToken(G14CapacitySnapshot), useValue: mockSnapshotRepository },
        { provide: getRepositoryToken(G14CapacityModelArtifact), useValue: mockModelRepository },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<G14CapacityTrainingService>(G14CapacityTrainingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ForbiddenException if tenantId is missing', async () => {
    await expect(
      service.trainCapacityModel({}, ''),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException if historical snapshots are below threshold', async () => {
    mockSnapshotRepository.find.mockResolvedValue([
      { id: '1', groundTruthTarget: { capacityDeficitHours: 10 } },
    ]);

    await expect(
      service.trainCapacityModel({ minSamplesThreshold: 5 }, mockTenantId),
    ).rejects.toThrow(BadRequestException);
  });

  it('should train Ridge capacity deficit model on chronological snapshots', async () => {
    const mockSnapshots = Array.from({ length: 10 }, (_, i) => ({
      id: `snap-${i}`,
      predictionCutoff: new Date(`2026-0${(i % 8) + 1}-15`),
      featureVector: {
        denseVector: Array.from({ length: 15 }, (_, j) => (j === 3 ? i * 5 : (i + 1) * 0.1)),
      },
      groundTruthTarget: {
        capacityDeficitHours: i * 4,
        isOverloaded: i > 2,
      },
    }));

    mockSnapshotRepository.find.mockResolvedValue(mockSnapshots);
    mockModelRepository.update.mockResolvedValue({ affected: 1 });
    mockModelRepository.save.mockImplementation((artifact) =>
      Promise.resolve({ id: 'model-cap-123', ...artifact }),
    );

    const result = await service.trainCapacityModel(
      { minSamplesThreshold: 5, regularizationAlpha: 1.0 },
      mockTenantId,
    );

    expect(result).toBeDefined();
    expect(result.weights).toBeDefined();
    expect(result.weights.length).toBe(15);
    expect(result.evaluationMetrics).toBeDefined();
    expect(result.evaluationMetrics.mae).toBeGreaterThanOrEqual(0);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'G14_CAPACITY_MODEL_TRAINED',
      }),
    );
  });
});
