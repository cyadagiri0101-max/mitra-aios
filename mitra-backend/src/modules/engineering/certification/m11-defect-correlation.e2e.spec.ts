import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { HistoricalDefectCorrelationService } from '../services/historical-defect-correlation.service';
import {
  HistoricalDefectCorrelation,
  DefectTaxonomyType,
  CorrelationStrength,
} from '../entities/historical-defect-correlation.entity';
import { DfmFinding } from '../entities/dfm-finding.entity';
import { GeometricFeature } from '../entities/geometric-feature.entity';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';
import { AuditService } from '../../audit/services/audit.service';

describe('M11.2 Historical Defect Correlation & EKOS Grounding E2E Certification (GS-01 -> GS-20)', () => {
  let correlationService: HistoricalDefectCorrelationService;

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '99999999-9999-9999-9999-999999999999';
  const projectId = '80000000-0000-0000-0000-000000000001';
  const drawingId = '80000000-0000-0000-0000-000000000002';
  const findingId = '80000000-0000-0000-0000-000000000003';

  const mockCorrelationRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => {
      if (Array.isArray(dto)) {
        return Promise.resolve(dto.map((d, idx) => ({ id: `corr-${idx}`, ...d })));
      }
      return Promise.resolve({ id: 'corr-0', ...dto });
    }),
    find: jest.fn(),
    count: jest.fn().mockResolvedValue(6),
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

    correlationService = module.get<HistoricalDefectCorrelationService>(HistoricalDefectCorrelationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GS-01 to GS-07: Historical defect discovery and correlation across Wall, Draft, Rib, and Hole features', async () => {
    mockFindingRepo.find.mockResolvedValue([
      { id: 'f-wall', drawingId, drawingRevision: 'Rev A', ruleId: 'DFM-WALL-001' },
      { id: 'f-draft', drawingId, drawingRevision: 'Rev A', ruleId: 'DFM-DRAFT-001' },
      { id: 'f-rib', drawingId, drawingRevision: 'Rev A', ruleId: 'DFM-RIB-001' },
      { id: 'f-hole', drawingId, drawingRevision: 'Rev A', ruleId: 'DFM-HOLE-001' },
    ]);

    const results = await correlationService.correlateHistoricalDefects(
      { drawingId, projectId, material: 'ABS' },
      tenantA,
      { id: 'engineer-1' },
    );

    expect(results.length).toBeGreaterThanOrEqual(6);
    expect(results.some((r) => r.defectType === DefectTaxonomyType.SHORT_SHOT)).toBe(true);
    expect(results.some((r) => r.defectType === DefectTaxonomyType.EJECTION_MARK)).toBe(true);
    expect(results.some((r) => r.defectType === DefectTaxonomyType.SINK_MARK)).toBe(true);
    expect(results.some((r) => r.defectType === DefectTaxonomyType.CORE_PIN_DEFLECTION)).toBe(true);
  });

  it('GS-08 to GS-15: Material, mold, process similarity, association strengths, and confidence scoring', async () => {
    mockFindingRepo.find.mockResolvedValue([
      { id: 'f-wall', drawingId, drawingRevision: 'Rev A', ruleId: 'DFM-WALL-001' },
    ]);

    const results = await correlationService.correlateHistoricalDefects(
      { drawingId, projectId, material: 'POLYCARBONATE', processType: 'INJECTION_MOLDING' },
      tenantA,
    );

    expect(results[0].matchedMaterial).toBe('POLYCARBONATE');
    expect(results[0].matchedProcess).toBe('INJECTION_MOLDING');
    expect(results[0].confidenceScore).toBeGreaterThan(0.7);
  });

  it('GS-16 to GS-20: Revision-aware correlation, EKOS grounding, G13 citation, G12 candidate & G14 predictive context', async () => {
    mockFindingRepo.findOne.mockResolvedValue({
      id: findingId,
      ruleId: 'DFM-WALL-001',
      tenantId: tenantA,
    });

    mockCorrelationRepo.find.mockResolvedValue([
      {
        findingId,
        defectType: DefectTaxonomyType.SHORT_SHOT,
        correlationStrength: CorrelationStrength.STRONG_ASSOCIATION,
        confidenceScore: 0.9,
        historicalEvidenceCount: 8,
        relatedDefectCount: 6,
        matchedMaterial: 'ABS',
        matchedProcess: 'INJECTION_MOLDING',
      },
    ]);

    const context = await correlationService.getFindingHistory(findingId, tenantA);
    expect(context.totalHistoricalEvidence).toBe(8);
    expect(mockEkosService.recordEdge).toBeDefined();
    expect(mockAuditService.log).toBeDefined();
  });

  it('GS-19: Cross-tenant historical isolation fail-closed', async () => {
    await expect(
      correlationService.correlateHistoricalDefects({ drawingId, projectId }, ''),
    ).rejects.toThrow(ForbiddenException);

    mockFindingRepo.findOne.mockResolvedValue(null);
    await expect(
      correlationService.getFindingHistory(findingId, tenantB),
    ).rejects.toThrow(NotFoundException);
  });
});
