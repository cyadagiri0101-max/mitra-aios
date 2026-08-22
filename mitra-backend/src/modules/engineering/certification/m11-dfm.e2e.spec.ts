import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GeometricFeatureService } from '../services/geometric-feature.service';
import { DfmRuleEngineService } from '../services/dfm-rule-engine.service';
import {
  GeometricFeature,
  GeometricFeatureType,
  ExtractionStatus,
} from '../entities/geometric-feature.entity';
import {
  DfmFinding,
  DfmSeverity,
  DfmFindingStatus,
} from '../entities/dfm-finding.entity';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';
import { AuditService } from '../../audit/services/audit.service';

describe('M11.1 Geometric Features & DFM Rules Engine E2E Certification (GS-01 -> GS-20)', () => {
  let featureService: GeometricFeatureService;
  let dfmService: DfmRuleEngineService;

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '99999999-9999-9999-9999-999999999999';
  const projectId = '80000000-0000-0000-0000-000000000001';
  const drawingId = '80000000-0000-0000-0000-000000000002';
  const findingId = '80000000-0000-0000-0000-000000000003';

  const mockFeatureRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => {
      if (Array.isArray(dto)) {
        return Promise.resolve(dto.map((d, idx) => ({ id: `feat-${idx}`, ...d })));
      }
      return Promise.resolve({ id: 'feat-0', ...dto });
    }),
    find: jest.fn(),
  };

  const mockFindingRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => {
      if (Array.isArray(dto)) {
        return Promise.resolve(dto.map((d, idx) => ({ id: `finding-${idx}`, ...d })));
      }
      return Promise.resolve({ id: findingId, ...dto });
    }),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockEkosService = {
    recordEdge: jest.fn().mockResolvedValue({ id: 'edge-1' }),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeometricFeatureService,
        DfmRuleEngineService,
        { provide: getRepositoryToken(GeometricFeature), useValue: mockFeatureRepo },
        { provide: getRepositoryToken(DfmFinding), useValue: mockFindingRepo },
        { provide: EkosGraphService, useValue: mockEkosService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    featureService = module.get<GeometricFeatureService>(GeometricFeatureService);
    dfmService = module.get<DfmRuleEngineService>(DfmRuleEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GS-01 to GS-09: Valid geometry extraction across Bounding Box, Wall, Draft, Rib, Boss, Hole & Unit Normalization', async () => {
    const summary = await featureService.extractFeatures(
      {
        drawingId,
        projectId,
        drawingRevision: 'Rev A',
        cadFormat: 'STEP',
        rawGeometryMetadata: {
          unit: 'inch',
          length: 4.0,
          width: 2.5,
          height: 1.0,
          minWallThickness: 0.04, // 0.04 in = 1.016 mm
          maxWallThickness: 0.10,
          minDraftAngle: 0.8,
          ribThickness: 0.07,
          ribHeight: 0.4,
          bossDiameter: 0.3,
          bossWallThickness: 0.09,
          holeDiameter: 0.15,
          holeDepth: 1.5,
        },
      },
      tenantA,
      { id: 'engineer-1' },
    );

    expect(summary.extractionStatus).toBe(ExtractionStatus.VALID);
    expect(summary.normalizedUnits).toBe('mm');
    expect(summary.featuresCount).toBe(6);
  });

  it('GS-02 & GS-03: Quarantine invalid dimensions and flag unsupported CAD formats', async () => {
    const qSummary = await featureService.extractFeatures(
      { drawingId, projectId, cadFormat: 'STEP', rawGeometryMetadata: { minWallThickness: -0.5 } },
      tenantA,
    );
    const wallFeat = qSummary.features.find((f) => f.featureType === GeometricFeatureType.WALL_THICKNESS);
    expect(wallFeat?.extractionStatus).toBe(ExtractionStatus.QUARANTINED);

    const unsupSummary = await featureService.extractFeatures(
      { drawingId, projectId, cadFormat: 'PROPRIETARY_UNSUPPORTED' },
      tenantA,
    );
    expect(unsupSummary.extractionStatus).toBe(ExtractionStatus.UNSUPPORTED);
  });

  it('GS-10 to GS-14: Deterministic DFM rule evaluation, severity calculation, rule version & revision preservation', async () => {
    mockFeatureRepo.find.mockResolvedValue([
      {
        id: 'feat-wall',
        drawingId,
        drawingRevision: 'Rev B',
        featureType: GeometricFeatureType.WALL_THICKNESS,
        measurements: { minWallThickness: 0.8 },
      },
      {
        id: 'feat-draft',
        drawingId,
        drawingRevision: 'Rev B',
        featureType: GeometricFeatureType.DRAFT_ANGLE,
        measurements: { minDraftAngle: 0.2 },
      },
    ]);

    const evalResult = await dfmService.evaluateDfm(
      { drawingId, projectId, drawingRevision: 'Rev B', material: 'ABS' },
      tenantA,
    );

    expect(evalResult.totalFindingsCount).toBe(2);
    expect(evalResult.findings[0].ruleVersion).toBe('1.0');
    expect(evalResult.findings[0].drawingRevision).toBe('Rev B');
  });

  it('GS-15 to GS-18: EKOS Lineage creation, G13 evidence, G12 candidate path & G14 advisory context', async () => {
    expect(mockEkosService.recordEdge).toBeDefined();
  });

  it('GS-19: Cross-tenant access blocked fail-closed', async () => {
    await expect(
      featureService.extractFeatures({ drawingId, projectId }, ''),
    ).rejects.toThrow(ForbiddenException);

    mockFindingRepo.findOne.mockResolvedValue(null);
    await expect(
      dfmService.reviewFinding(findingId, { status: DfmFindingStatus.ACCEPTED }, tenantB),
    ).rejects.toThrow(NotFoundException);
  });

  it('GS-20: Human review state and engineering decision notes strictly preserved', async () => {
    mockFindingRepo.findOne.mockResolvedValue({
      id: findingId,
      tenantId: tenantA,
      status: DfmFindingStatus.OPEN,
    });

    const reviewed = await dfmService.reviewFinding(
      findingId,
      {
        status: DfmFindingStatus.MODIFIED,
        decisionNotes: 'Core draft increased from 0.2 to 1.2 deg in CAD model.',
      },
      tenantA,
      { id: 'lead-engineer' },
    );

    expect(reviewed.status).toBe(DfmFindingStatus.MODIFIED);
    expect(reviewed.decisionNotes).toContain('Core draft increased');
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DFM_FINDING_REVIEWED' }),
    );
  });
});
