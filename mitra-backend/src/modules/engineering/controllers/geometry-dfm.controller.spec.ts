import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GeometryDfmController } from './geometry-dfm.controller';
import { GeometricFeatureService } from '../services/geometric-feature.service';
import { DfmRuleEngineService } from '../services/dfm-rule-engine.service';
import { HistoricalDefectCorrelationService } from '../services/historical-defect-correlation.service';
import { EngineeringReasoningEngineService } from '../services/engineering-reasoning-engine.service';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { DfmFindingStatus } from '../entities/dfm-finding.entity';

describe('GeometryDfmController', () => {
  let controller: GeometryDfmController;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockUser: AuthUser = {
    id: 'user-1',
    email: 'engineer@mitra.ai',
    tenantId: mockTenantId,
    role: 'ENGINEERING',
    permissions: [],
  };

  const mockFeatureService = {
    extractFeatures: jest.fn(),
    getFeaturesByDrawing: jest.fn().mockResolvedValue([{ id: 'feat-1' }]),
  };

  const mockDfmService = {
    evaluateDfm: jest.fn(),
    getFindingsByDrawing: jest.fn().mockResolvedValue([{ id: 'find-1' }]),
    reviewFinding: jest.fn(),
  };

  const mockCorrelationService = {
    correlateHistoricalDefects: jest.fn(),
    getFindingHistory: jest.fn(),
    getCorrelationsByDrawing: jest.fn().mockResolvedValue([{ id: 'corr-1' }]),
  };

  const mockReasoningService = {
    getReasoningByFinding: jest.fn().mockResolvedValue([{ id: 'reas-1' }]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeometryDfmController],
      providers: [
        { provide: GeometricFeatureService, useValue: mockFeatureService },
        { provide: DfmRuleEngineService, useValue: mockDfmService },
        { provide: HistoricalDefectCorrelationService, useValue: mockCorrelationService },
        { provide: EngineeringReasoningEngineService, useValue: mockReasoningService },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GeometryDfmController>(GeometryDfmController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get unified analysis workspace via GET /drawings/:drawingId/analysis-workspace', async () => {
    const res = await controller.getAnalysisWorkspace('drw-1', 'Rev A', mockUser);
    expect(res.drawingId).toBe('drw-1');
    expect(res.featuresCount).toBe(1);
    expect(res.findingsCount).toBe(1);
    expect(res.correlationsCount).toBe(1);
    expect(res.reasoningResultsCount).toBe(1);
    expect(res.revisionSafetyStatus).toBe('REVISION_MATCH_VERIFIED');
  });

  it('should correlate defects via POST /defects/correlate', async () => {
    mockCorrelationService.correlateHistoricalDefects.mockResolvedValue([{ defectType: 'SHORT_SHOT' }]);

    const res = await controller.correlateDefects(
      { drawingId: 'drw-1', projectId: 'p-1' },
      mockUser,
    );

    expect(res.length).toBe(1);
  });

  it('should get finding history via GET /dfm/findings/:id/history', async () => {
    mockCorrelationService.getFindingHistory.mockResolvedValue({ findingId: 'f-1', totalHistoricalEvidence: 10 });

    const res = await controller.getFindingHistory('f-1', mockUser);
    expect(res.totalHistoricalEvidence).toBe(10);
  });
});
