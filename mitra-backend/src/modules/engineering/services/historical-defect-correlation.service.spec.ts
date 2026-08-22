import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { HistoricalDefectCorrelationService } from './historical-defect-correlation.service';
import {
  HistoricalDefectCorrelation,
  DefectTaxonomyType,
  CorrelationStrength,
} from '../entities/historical-defect-correlation.entity';
import { DfmFinding } from '../entities/dfm-finding.entity';
import { GeometricFeature } from '../entities/geometric-feature.entity';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';
import { AuditService } from '../../audit/services/audit.service';

describe('HistoricalDefectCorrelationService', () => {
  let service: HistoricalDefectCorrelationService;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockProjectId = '22222222-2222-2222-2222-222222222222';
  const mockDrawingId = '33333333-3333-3333-3333-333333333333';
  const mockFindingId = '44444444-4444-4444-4444-444444444444';

  const mockCorrelationRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => {
      if (Array.isArray(dto)) {
        return Promise.resolve(dto.map((d, idx) => ({ id: `corr-${idx}`, ...d })));
      }
      return Promise.resolve({ id: 'corr-0', ...dto });
    }),
    find: jest.fn(),
    count: jest.fn().mockResolvedValue(5),
  };

  const mockFindingRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockFeatureRepo = {
    find: jest.fn(),
  };

  const mockEkosService = {
    recordEdge: jest.fn().mockResolvedValue({ id: 'edge-corr-1' }),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoricalDefectCorrelationService,
        { provide: getRepositoryToken(HistoricalDefectCorrelation), useValue: mockCorrelationRepo },
        { provide: getRepositoryToken(DfmFinding), useValue: mockFindingRepo },
        { provide: getRepositoryToken(GeometricFeature), useValue: mockFeatureRepo },
        { provide: EkosGraphService, useValue: mockEkosService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<HistoricalDefectCorrelationService>(HistoricalDefectCorrelationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should correlate DFM findings with historical quality defects and project to EKOS', async () => {
    mockFindingRepo.find.mockResolvedValue([
      {
        id: mockFindingId,
        drawingId: mockDrawingId,
        drawingRevision: 'Rev A',
        ruleId: 'DFM-WALL-001',
        featureId: 'feat-wall-1',
      },
    ]);

    const results = await service.correlateHistoricalDefects(
      {
        drawingId: mockDrawingId,
        projectId: mockProjectId,
        material: 'ABS',
      },
      mockTenantId,
      { id: 'engineer-1' },
    );

    expect(results.length).toBe(2); // SHORT_SHOT and THIN_WALL_FAILURE
    expect(results[0].defectType).toBe(DefectTaxonomyType.SHORT_SHOT);
    expect(results[0].correlationStrength).toBe(CorrelationStrength.STRONG_ASSOCIATION);
    expect(mockEkosService.recordEdge).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'HISTORICAL_CORRELATION_COMPLETED' }),
    );
  });

  it('should return historical context for a finding', async () => {
    mockFindingRepo.findOne.mockResolvedValue({
      id: mockFindingId,
      ruleId: 'DFM-WALL-001',
      tenantId: mockTenantId,
    });

    mockCorrelationRepo.find.mockResolvedValue([
      {
        findingId: mockFindingId,
        defectType: DefectTaxonomyType.SHORT_SHOT,
        correlationStrength: CorrelationStrength.STRONG_ASSOCIATION,
        confidenceScore: 0.88,
        historicalEvidenceCount: 9,
        relatedDefectCount: 6,
        matchedMaterial: 'ABS',
        matchedProcess: 'INJECTION_MOLDING',
      },
    ]);

    const context = await service.getFindingHistory(mockFindingId, mockTenantId);
    expect(context.findingId).toBe(mockFindingId);
    expect(context.totalHistoricalEvidence).toBe(9);
    expect(context.topRiskDefect).toBe(DefectTaxonomyType.SHORT_SHOT);
  });
});
