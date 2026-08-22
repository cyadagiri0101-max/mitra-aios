import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { EngineeringReasoningController } from './engineering-reasoning.controller';
import { EngineeringReasoningEngineService } from '../services/engineering-reasoning-engine.service';
import { EngineeringCostSynthesisService } from '../services/engineering-cost-synthesis.service';
import { ReasoningStatus } from '../entities/engineering-reasoning-result.entity';
import { CostRateType } from '../entities/engineering-cost-configuration.entity';

describe('EngineeringReasoningController Unit Tests', () => {
  let controller: EngineeringReasoningController;

  const mockUser = {
    id: 'user-001',
    tenantId: '11111111-1111-1111-1111-111111111111',
    email: 'engineer@mitra.ai',
    roles: ['ENGINEERING'],
  };

  const mockReasoningService = {
    evaluateReasoning: jest.fn().mockResolvedValue({ id: 'reas-01', status: ReasoningStatus.GENERATED }),
    getReasoningResultById: jest.fn().mockResolvedValue({ id: 'reas-01' }),
    getEvidenceById: jest.fn().mockResolvedValue({ reasoningId: 'reas-01', evidence: [] }),
    getCostById: jest.fn().mockResolvedValue({ reasoningId: 'reas-01', costSummary: {} }),
    getRecommendationById: jest.fn().mockResolvedValue({ reasoningId: 'reas-01', recommendation: {} }),
    reviewReasoningResult: jest.fn().mockResolvedValue({ id: 'reas-01', status: ReasoningStatus.ACCEPTED }),
    getReasoningByFinding: jest.fn().mockResolvedValue([{ id: 'reas-01' }]),
  };

  const mockCostSynthesisService = {
    createCostConfiguration: jest.fn().mockResolvedValue({ id: 'cfg-01', rateType: CostRateType.MACHINE_HOUR }),
    getCostConfigurations: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    getCostConfigurationById: jest.fn().mockResolvedValue({ id: 'cfg-01' }),
    updateCostConfiguration: jest.fn().mockResolvedValue({ id: 'cfg-01' }),
    deleteCostConfiguration: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EngineeringReasoningController],
      providers: [
        { provide: EngineeringReasoningEngineService, useValue: mockReasoningService },
        { provide: EngineeringCostSynthesisService, useValue: mockCostSynthesisService },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EngineeringReasoningController>(EngineeringReasoningController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('evaluates engineering reasoning', async () => {
    const dto = { drawingId: 'draw-01', projectId: 'proj-01' };
    const res = await controller.evaluateReasoning(dto, mockUser as any);
    expect(res.id).toBe('reas-01');
    expect(mockReasoningService.evaluateReasoning).toHaveBeenCalledWith(dto, mockUser.tenantId, mockUser);
  });

  it('retrieves evidence chain', async () => {
    const res = await controller.getEvidence('reas-01', mockUser as any);
    expect(res.reasoningId).toBe('reas-01');
    expect(mockReasoningService.getEvidenceById).toHaveBeenCalledWith('reas-01', mockUser.tenantId);
  });

  it('reviews reasoning result', async () => {
    const dto = { status: ReasoningStatus.ACCEPTED, decisionNotes: 'Approved' };
    const res = await controller.reviewReasoning('reas-01', dto, mockUser as any);
    expect(res.status).toBe(ReasoningStatus.ACCEPTED);
    expect(mockReasoningService.reviewReasoningResult).toHaveBeenCalledWith('reas-01', dto, mockUser.tenantId, mockUser);
  });

  it('manages cost configurations', async () => {
    const dto = { rateType: CostRateType.MACHINE_HOUR, rateName: 'CNC', rateValue: 1500 };
    const created = await controller.createCostConfiguration(dto, mockUser as any);
    expect(created.id).toBe('cfg-01');
    expect(mockCostSynthesisService.createCostConfiguration).toHaveBeenCalledWith(dto, mockUser.tenantId, mockUser);
  });
});
