import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { G14ModelRegistryService } from './g14-model-registry.service';
import {
  G14ModelRegistry,
  ModelCapability,
  ModelLifecycleStatus,
} from '../entities/g14-model-registry.entity';
import { AuditService } from '../../audit/services/audit.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('G14ModelRegistryService', () => {
  let service: G14ModelRegistryService;
  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockModelId = '22222222-2222-2222-2222-222222222222';

  const mockRegistryRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
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
      save: jest.fn((entity) => Promise.resolve(entity)),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        G14ModelRegistryService,
        { provide: getRepositoryToken(G14ModelRegistry), useValue: mockRegistryRepository },
        { provide: AuditService, useValue: mockAuditService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<G14ModelRegistryService>(G14ModelRegistryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ForbiddenException if tenantId is missing', async () => {
    await expect(
      service.listModels({}, ''),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should register a newly trained model artifact', async () => {
    const dto = {
      capability: ModelCapability.DELAY_PREDICTION,
      modelVersion: 'G14_DELAY_RIDGE_V1',
      featureVersion: 'G14_FEATURES_V1',
      modelType: 'RIDGE_CALIBRATED_REGRESSION',
      weights: Array(20).fill(0.1),
      intercept: 1.5,
      residualStdDev: 2.0,
      evaluationMetrics: { mae: 2.1 },
      provenanceHash: 'prov-hash-123',
      trainingSampleCount: 10,
    };

    mockRegistryRepository.save.mockImplementation((val) =>
      Promise.resolve({ id: mockModelId, ...val }),
    );

    const result = await service.registerModel(dto, mockTenantId, 'admin@mitra.ai');

    expect(result).toBeDefined();
    expect(result.status).toBe(ModelLifecycleStatus.TRAINED);
    expect(result.artifactHash).toBeDefined();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'G14_MODEL_REGISTERED' }),
    );
  });

  it('should evaluate a trained model and transition to EVALUATED', async () => {
    const model = {
      id: mockModelId,
      tenantId: mockTenantId,
      status: ModelLifecycleStatus.TRAINED,
      trainingSampleCount: 10,
      evaluationMetrics: {},
    };
    mockRegistryRepository.findOne.mockResolvedValue(model);
    mockRegistryRepository.save.mockImplementation((m) => Promise.resolve(m));

    const result = await service.evaluateModel(
      mockModelId,
      { evaluationMetrics: { mae: 1.8 } },
      mockTenantId,
      'tester',
    );

    expect(result.status).toBe(ModelLifecycleStatus.EVALUATED);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'G14_MODEL_EVALUATED' }),
    );
  });

  it('should fail evaluation gate if sample count is below 5', async () => {
    const model = {
      id: mockModelId,
      tenantId: mockTenantId,
      status: ModelLifecycleStatus.TRAINED,
      trainingSampleCount: 3,
      evaluationMetrics: {},
    };
    mockRegistryRepository.findOne.mockResolvedValue(model);

    await expect(
      service.evaluateModel(mockModelId, {}, mockTenantId),
    ).rejects.toThrow(BadRequestException);
  });

  it('should request approval and approve model through state machine', async () => {
    const model = {
      id: mockModelId,
      tenantId: mockTenantId,
      status: ModelLifecycleStatus.EVALUATED,
    };
    mockRegistryRepository.findOne.mockResolvedValue(model);
    mockRegistryRepository.save.mockImplementation((m) => Promise.resolve(m));

    // Request approval
    const requested = await service.requestApproval(mockModelId, mockTenantId, 'analyst');
    expect(requested.status).toBe(ModelLifecycleStatus.PENDING_APPROVAL);

    // Approve
    const approved = await service.approveModel(
      mockModelId,
      { approvalNotes: 'Validated on Q3 data' },
      mockTenantId,
      'approver',
    );
    expect(approved.status).toBe(ModelLifecycleStatus.APPROVED);
    expect(approved.approvedBy).toBe('approver');
  });

  it('should atomically activate an approved model and retire previous active champion', async () => {
    const weights = Array(20).fill(0.1);
    const artifactHash = service.computeArtifactHash(
      ModelCapability.DELAY_PREDICTION,
      'G14_DELAY_RIDGE_V2',
      'G14_FEATURES_V1',
      weights,
      1.5,
      2.0,
    );

    const modelToActivate = {
      id: 'model-v2',
      tenantId: mockTenantId,
      capability: ModelCapability.DELAY_PREDICTION,
      modelVersion: 'G14_DELAY_RIDGE_V2',
      featureVersion: 'G14_FEATURES_V1',
      weights,
      intercept: 1.5,
      residualStdDev: 2.0,
      artifactHash,
      status: ModelLifecycleStatus.APPROVED,
    };

    const currentActiveModel = {
      id: 'model-v1',
      tenantId: mockTenantId,
      capability: ModelCapability.DELAY_PREDICTION,
      modelVersion: 'G14_DELAY_RIDGE_V1',
      status: ModelLifecycleStatus.ACTIVE,
    };

    mockRegistryRepository.findOne.mockResolvedValue(modelToActivate);
    mockQueryRunner.manager.findOne.mockResolvedValue(currentActiveModel);

    const result = await service.activateModel('model-v2', {}, mockTenantId, 'admin');

    expect(result.status).toBe(ModelLifecycleStatus.ACTIVE);
    expect(currentActiveModel.status).toBe(ModelLifecycleStatus.RETIRED);
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('should reject activation if artifact hash integrity is compromised', async () => {
    const modelTampered = {
      id: 'model-tampered',
      tenantId: mockTenantId,
      capability: ModelCapability.DELAY_PREDICTION,
      modelVersion: 'G14_DELAY_RIDGE_V2',
      featureVersion: 'G14_FEATURES_V1',
      weights: Array(20).fill(0.1),
      intercept: 1.5,
      residualStdDev: 2.0,
      artifactHash: 'invalid-tampered-hash',
      status: ModelLifecycleStatus.APPROVED,
    };

    mockRegistryRepository.findOne.mockResolvedValue(modelTampered);

    await expect(
      service.activateModel('model-tampered', {}, mockTenantId),
    ).rejects.toThrow(BadRequestException);
  });

  it('should rollback active model to previous retired champion model', async () => {
    const currentActive = {
      id: 'model-v2',
      tenantId: mockTenantId,
      capability: ModelCapability.DELAY_PREDICTION,
      status: ModelLifecycleStatus.ACTIVE,
    };

    const previousRetired = {
      id: 'model-v1',
      tenantId: mockTenantId,
      capability: ModelCapability.DELAY_PREDICTION,
      status: ModelLifecycleStatus.RETIRED,
      retiredAt: new Date('2026-08-20'),
    };

    mockRegistryRepository.findOne.mockImplementation(({ where }) => {
      if (where.status === ModelLifecycleStatus.RETIRED) {
        return Promise.resolve(previousRetired);
      }
      return Promise.resolve(currentActive);
    });

    const result = await service.rollbackModel(
      'model-v2',
      { rollbackReason: 'Higher variance in production' },
      mockTenantId,
      'admin',
    );

    expect(result.id).toBe('model-v1');
    expect(result.status).toBe(ModelLifecycleStatus.ACTIVE);
    expect(currentActive.status).toBe(ModelLifecycleStatus.ROLLED_BACK);
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
  });
});
