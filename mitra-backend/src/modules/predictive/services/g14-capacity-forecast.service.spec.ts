import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { G14CapacityForecastService } from './g14-capacity-forecast.service';
import { G14CapacityFeatureService } from './g14-capacity-feature.service';
import { G14CapacityTrainingService } from './g14-capacity-training.service';
import { MachineMaster, MachineStatus } from '../../machine/entities/machinemaster.entity';
import { G14CapacityModelArtifact } from '../entities/g14-capacity-model-artifact.entity';
import { AuditService } from '../../audit/services/audit.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('G14CapacityForecastService', () => {
  let service: G14CapacityForecastService;
  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockMachineId = '22222222-2222-2222-2222-222222222222';

  const mockFeatureService = {
    extractMachineCapacityFeatures: jest.fn(),
  };
  const mockTrainingService = {
    getActiveModel: jest.fn(),
  };
  const mockMachineRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const mockModelRepository = {
    findOne: jest.fn(),
  };
  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        G14CapacityForecastService,
        { provide: G14CapacityFeatureService, useValue: mockFeatureService },
        { provide: G14CapacityTrainingService, useValue: mockTrainingService },
        { provide: getRepositoryToken(MachineMaster), useValue: mockMachineRepository },
        { provide: getRepositoryToken(G14CapacityModelArtifact), useValue: mockModelRepository },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<G14CapacityForecastService>(G14CapacityForecastService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ForbiddenException if tenantId is missing', async () => {
    await expect(
      service.predictCapacity({ machineId: mockMachineId }, ''),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw NotFoundException if machine does not exist', async () => {
    mockMachineRepository.findOne.mockResolvedValue(null);

    await expect(
      service.predictCapacity({ machineId: mockMachineId }, mockTenantId),
    ).rejects.toThrow(NotFoundException);
  });

  it('should return safe heuristic fallback if capacity model is untrained', async () => {
    mockMachineRepository.findOne.mockResolvedValue({
      id: mockMachineId,
      machineNumber: 'EDM-01',
      machineName: 'Wire EDM',
      tenantId: mockTenantId,
    });
    mockTrainingService.getActiveModel.mockResolvedValue(null);
    mockFeatureService.extractMachineCapacityFeatures.mockResolvedValue({
      featureVector: {
        machine: {
          availableMachineHours: 240,
          totalDemandHours: 300,
        },
        denseVector: Array(15).fill(0.5),
      },
      featureMetadata: {
        dataQuality: { hasZeroAvailableHours: false },
      },
      sourceRecordsHash: 'hash-123',
    });

    const result = await service.predictCapacity(
      { machineId: mockMachineId },
      mockTenantId,
    );

    expect(result).toBeDefined();
    expect(result.inferenceStatus).toBe('FALLBACK_UNTRAINED_MODEL');
    expect(result.predictedDeficitHours).toBe(60);
    expect(result.explanation.bottleneckRiskTier).toBeDefined();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'G14_CAPACITY_PREDICTION_FALLBACK',
      }),
    );
  });

  it('should generate capacity forecast with uncertainty and risk tiers', async () => {
    mockMachineRepository.findOne.mockResolvedValue({
      id: mockMachineId,
      machineNumber: 'CNC-05',
      machineName: '5-Axis High Speed CNC',
      tenantId: mockTenantId,
    });

    const weights = Array(15).fill(0.2);
    weights[3] = 3.5; // High weight on total demand

    mockTrainingService.getActiveModel.mockResolvedValue({
      id: 'cap-model-1',
      modelVersion: 'G14_CAPACITY_RIDGE_V1_2026',
      modelType: 'RIDGE_CAPACITY_DEFICIT_REGRESSION',
      weights,
      intercept: 5.0,
      residualStdDev: 4.0,
      provenanceHash: 'provenance-123',
    });

    const denseVector = Array(15).fill(0.3);
    denseVector[3] = 1.5;

    mockFeatureService.extractMachineCapacityFeatures.mockResolvedValue({
      featureVector: {
        machine: {
          availableMachineHours: 240,
          totalDemandHours: 280,
        },
        denseVector,
      },
      featureMetadata: {
        dataQuality: { hasZeroAvailableHours: false },
      },
      sourceRecordsHash: 'source-123',
    });

    const result = await service.predictCapacity(
      { machineId: mockMachineId, confidenceIntervalPct: 95 },
      mockTenantId,
    );

    expect(result).toBeDefined();
    expect(result.inferenceStatus).toBe('SUCCESS');
    expect(result.predictedDeficitHours).toBeGreaterThan(0);
    expect(result.overloadProbability).toBeGreaterThan(0);
    expect(result.explanation.primaryContributors.length).toBeGreaterThan(0);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'G14_CAPACITY_FORECAST_GENERATED',
      }),
    );
  });

  it('should scan machines and rank bottlenecks', async () => {
    mockMachineRepository.find.mockResolvedValue([
      { id: 'm1', machineNumber: 'CNC-01', machineName: 'CNC Mill', location: 'Bay 1', tenantId: mockTenantId },
      { id: 'm2', machineNumber: 'EDM-01', machineName: 'Wire EDM', location: 'Bay 2', tenantId: mockTenantId },
    ]);

    jest.spyOn(service, 'predictCapacity').mockImplementation(async (dto) => {
      if (dto.machineId === 'm1') {
        return {
          machineId: 'm1',
          machineNumber: 'CNC-01',
          machineName: 'CNC Mill',
          location: 'Bay 1',
          predictedDeficitHours: 45.0,
          predictedUtilizationRatio: 1.25,
          overloadProbability: 0.88,
          explanation: {
            primaryContributors: [{ description: 'High work order queue', featureValue: 12 }],
            bottleneckRiskTier: 'HIGH',
            summary: 'High overload',
          },
        } as any;
      }
      return {
        machineId: 'm2',
        machineNumber: 'EDM-01',
        machineName: 'Wire EDM',
        location: 'Bay 2',
        predictedDeficitHours: 0.0,
        predictedUtilizationRatio: 0.65,
        overloadProbability: 0.1,
        explanation: {
          primaryContributors: [{ description: 'Normal load', featureValue: 2 }],
          bottleneckRiskTier: 'LOW',
          summary: 'Normal',
        },
      } as any;
    });

    const bottlenecks = await service.getBottlenecks({}, mockTenantId);

    expect(bottlenecks).toBeDefined();
    expect(bottlenecks.length).toBe(2);
    expect(bottlenecks[0].machineId).toBe('m1'); // m1 ranked first (HIGH vs LOW)
    expect(bottlenecks[0].riskTier).toBe('HIGH');
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'G14_BOTTLENECK_FORECAST_GENERATED',
      }),
    );
  });
});
