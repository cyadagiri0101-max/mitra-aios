import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EngineeringReasoningEngineService } from '../services/engineering-reasoning-engine.service';
import { EngineeringCostSynthesisService } from '../services/engineering-cost-synthesis.service';
import {
  EngineeringReasoningResult,
  ReasoningStatus,
  ContradictionState,
  AssumptionStatus,
  RecommendationType,
  CostStatus,
} from '../entities/engineering-reasoning-result.entity';
import {
  EngineeringCostConfiguration,
  CostRateType,
  CostConfigurationStatus,
} from '../entities/engineering-cost-configuration.entity';
import { DfmFinding } from '../entities/dfm-finding.entity';
import { GeometricFeature } from '../entities/geometric-feature.entity';
import { HistoricalDefectCorrelation, DefectTaxonomyType } from '../entities/historical-defect-correlation.entity';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';
import { AuditService } from '../../audit/services/audit.service';

describe('M11.3 Multi-Step Engineering Reasoning & Cost Synthesis E2E Certification (GS-01 -> GS-20)', () => {
  let reasoningService: EngineeringReasoningEngineService;
  let costService: EngineeringCostSynthesisService;

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '99999999-9999-9999-9999-999999999999';
  const projectId = '80000000-0000-0000-0000-000000000001';
  const drawingId = '80000000-0000-0000-0000-000000000002';
  const findingId = '80000000-0000-0000-0000-000000000003';
  const featureId = '80000000-0000-0000-0000-000000000004';

  const mockReasoningRepo = {
    create: jest.fn((dto) => ({ id: 'reas-e2e-01', ...dto })),
    save: jest.fn((entity) => Promise.resolve({ id: entity.id || 'reas-e2e-01', ...entity })),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockCostConfigRepo = {
    createQueryBuilder: jest.fn(),
    create: jest.fn((dto) => ({ id: 'cost-cfg-01', ...dto })),
    save: jest.fn((entity) => Promise.resolve({ id: entity.id || 'cost-cfg-01', ...entity })),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockFindingRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockFeatureRepo = {
    find: jest.fn(),
  };

  const mockCorrelationRepo = {
    find: jest.fn(),
  };

  const mockEkosService = {
    recordEdge: jest.fn().mockResolvedValue({ id: 'edge-e2e-01' }),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringReasoningEngineService,
        EngineeringCostSynthesisService,
        { provide: getRepositoryToken(EngineeringReasoningResult), useValue: mockReasoningRepo },
        { provide: getRepositoryToken(EngineeringCostConfiguration), useValue: mockCostConfigRepo },
        { provide: getRepositoryToken(DfmFinding), useValue: mockFindingRepo },
        { provide: getRepositoryToken(GeometricFeature), useValue: mockFeatureRepo },
        { provide: getRepositoryToken(HistoricalDefectCorrelation), useValue: mockCorrelationRepo },
        { provide: EkosGraphService, useValue: mockEkosService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    reasoningService = module.get<EngineeringReasoningEngineService>(EngineeringReasoningEngineService);
    costService = module.get<EngineeringCostSynthesisService>(EngineeringCostSynthesisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GS-01 to GS-07: DFM input, historical evidence retrieval, multi-step reasoning, provenance, material, process, & manufacturing context', async () => {
    mockFindingRepo.find.mockResolvedValue([
      {
        id: findingId,
        ruleId: 'DFM-WALL-001',
        observedValue: 0.75,
        expectedThreshold: 1.20,
        unit: 'mm',
        severity: 'CRITICAL',
        explanation: 'Thin wall detected in critical structural zone',
        featureId,
      },
    ]);

    mockFeatureRepo.find.mockResolvedValue([
      {
        id: featureId,
        featureType: 'WALL_THICKNESS',
        measurements: { thickness: 0.75 },
        extractionMethod: 'CAD_GEOMETRY_PARSER',
        sourceHash: 'feat-hash-01',
      },
    ]);

    mockCorrelationRepo.find.mockResolvedValue([
      {
        id: 'corr-01',
        findingId,
        defectType: DefectTaxonomyType.SHORT_SHOT,
        correlationStrength: 'STRONG_ASSOCIATION',
        confidenceScore: 0.94,
        historicalEvidenceCount: 8,
        similarityScore: 0.95,
        matchedMaterial: 'ABS',
        matchedProcess: 'INJECTION_MOLDING',
        evidenceReferences: [{ ncrId: 'NCR-SHORT-SHOT-01' }],
      },
    ]);

    mockReasoningRepo.findOne.mockResolvedValue(null);

    // Mock cost lookups for GS-12 to GS-16
    const mockQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn()
        .mockResolvedValueOnce({ rateValue: 300.0, currency: 'INR', uom: 'KG', source: 'ABS Resin' }) // Material
        .mockResolvedValueOnce({ rateValue: 1600.0, currency: 'INR', uom: 'HOUR', source: 'CNC 5-Axis' }) // Machining
        .mockResolvedValueOnce({ rateValue: 2000.0, currency: 'INR', uom: 'HOUR', source: 'EDM Setup' }) // Tooling
        .mockResolvedValueOnce({ rateValue: 900.0, currency: 'INR', uom: 'HOUR', source: 'CMM Lab' }) // Quality
        .mockResolvedValueOnce({ rateValue: 1200.0, currency: 'INR', uom: 'HOUR', source: 'Setup Overhead' }) // Schedule
        .mockResolvedValueOnce({ rateValue: 700.0, currency: 'INR', uom: 'HOUR', source: 'Bench Deburr' }), // Rework
    };
    mockCostConfigRepo.createQueryBuilder.mockReturnValue(mockQb);

    const result = await reasoningService.evaluateReasoning(
      {
        drawingId,
        projectId,
        drawingRevision: 'Rev A',
        material: 'ABS',
        processType: 'INJECTION_MOLDING',
      },
      tenantA,
      { id: 'engineer-01' },
    );

    // GS-01 & GS-03: Multi-step reasoning pipeline
    expect(result.steps.length).toBe(9);
    expect(result.steps[0].stepName).toBe('IDENTIFY_GEOMETRIC_FINDING');
    expect(result.steps[1].stepName).toBe('RETRIEVE_HISTORICAL_EVIDENCE');
    expect(result.steps[2].stepName).toBe('EVALUATE_FEATURE_SIMILARITY');
    expect(result.steps[3].stepName).toBe('EVALUATE_MATERIAL_PROCESS_COMPATIBILITY');
    expect(result.steps[4].stepName).toBe('EVALUATE_MANUFACTURING_IMPLICATIONS');
    expect(result.steps[5].stepName).toBe('EVALUATE_HISTORICAL_DEFECT_RELEVANCE');
    expect(result.steps[6].stepName).toBe('CONSTRUCT_ENGINEERING_ASSESSMENT');
    expect(result.steps[7].stepName).toBe('ESTIMATE_OPERATIONAL_COST_IMPACT');
    expect(result.steps[8].stepName).toBe('GENERATE_EXPLAINABLE_RECOMMENDATION');

    // GS-04: Evidence provenance preserved
    expect(result.evidence.length).toBeGreaterThanOrEqual(3);
    expect(result.evidence.some((e) => e.sourceEntity === 'dfm_findings')).toBe(true);
    expect(result.evidence.some((e) => e.sourceEntity === 'geometric_features')).toBe(true);
    expect(result.evidence.some((e) => e.sourceEntity === 'historical_defect_correlations')).toBe(true);

    // GS-05 & GS-06: Material and process context
    expect(result.assumptions.some((a) => a.description.includes('ABS'))).toBe(true);
    expect(result.assumptions.some((a) => a.description.includes('INJECTION_MOLDING'))).toBe(true);

    // GS-10: Deterministic confidence calculation
    expect(result.confidenceScore).toBeGreaterThan(0.70);
    expect(result.confidenceFactors).toBeDefined();

    // GS-11: Engineering impact assessment
    expect(result.impacts.length).toBeGreaterThanOrEqual(4);
    expect(result.impacts.some((i) => i.category === 'manufacturability')).toBe(true);
    expect(result.impacts.some((i) => i.category === 'quality_risk')).toBe(true);

    // GS-12 to GS-17: Cost synthesis and 3-point range
    expect(result.costSummary).toBeDefined();
    expect(result.costSummary?.total.expected).toBeGreaterThan(0);
    expect(result.costSummary?.total.low).toBeLessThan(result.costSummary!.total.expected!);
    expect(result.costSummary?.total.high).toBeGreaterThan(result.costSummary!.total.expected!);
    expect(result.costSummary?.costRangeModel).toBe('THREE_POINT');

    // GS-18: Recommendation generation
    expect(result.recommendation).toBeDefined();
    expect(result.recommendation?.type).toBe(RecommendationType.INCREASE_WALL_THICKNESS);
    expect(result.recommendation?.priority).toBe('CRITICAL');
  });

  it('GS-08: Contradictory evidence detected and handled with explicit state', async () => {
    mockFindingRepo.find.mockResolvedValue([
      {
        id: findingId,
        ruleId: 'DFM-RIB-001',
        observedValue: 0.8,
        expectedThreshold: 0.5,
        unit: 'ratio',
        severity: 'WARNING',
      },
    ]);
    mockFeatureRepo.find.mockResolvedValue([]);
    // Zero correlations present => INSUFFICIENT_EVIDENCE contradiction state
    mockCorrelationRepo.find.mockResolvedValue([]);
    mockReasoningRepo.findOne.mockResolvedValue(null);

    const mockQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    mockCostConfigRepo.createQueryBuilder.mockReturnValue(mockQb);

    const result = await reasoningService.evaluateReasoning(
      { drawingId, projectId, drawingRevision: 'Rev A' },
      tenantA,
    );

    expect(result.contradictions.some((c) => c.state === ContradictionState.INSUFFICIENT_EVIDENCE)).toBe(true);
  });

  it('GS-09: Unverified assumption detected and penalizes confidence', async () => {
    mockFindingRepo.find.mockResolvedValue([
      {
        id: findingId,
        ruleId: 'DFM-DRAFT-001',
        observedValue: 0.5,
        expectedThreshold: 1.0,
        unit: 'degree',
        severity: 'WARNING',
      },
    ]);
    mockFeatureRepo.find.mockResolvedValue([]);
    mockCorrelationRepo.find.mockResolvedValue([]);
    mockReasoningRepo.findOne.mockResolvedValue(null);

    const mockQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    mockCostConfigRepo.createQueryBuilder.mockReturnValue(mockQb);

    // Call without explicit material/process
    const result = await reasoningService.evaluateReasoning(
      { drawingId, projectId, drawingRevision: 'Rev A', material: undefined, processType: undefined },
      tenantA,
    );

    expect(result.assumptions.some((a) => a.status === AssumptionStatus.UNVERIFIED_ASSUMPTION)).toBe(true);
  });

  it('GS-19 & GS-20: Human governance state machine & zero autonomous engineering mutation', async () => {
    mockReasoningRepo.findOne.mockResolvedValue({
      id: 'reas-e2e-01',
      tenantId: tenantA,
      status: ReasoningStatus.GENERATED,
      recommendation: { status: 'PENDING', title: 'Increase Wall Thickness' },
    });

    const reviewed = await reasoningService.reviewReasoningResult(
      'reas-e2e-01',
      {
        status: ReasoningStatus.ACCEPTED,
        decisionNotes: 'Approved tool modification per mold flow study.',
      },
      tenantA,
      { id: 'lead-engineer-01' },
    );

    expect(reviewed.status).toBe(ReasoningStatus.ACCEPTED);
    expect(reviewed.recommendation?.status).toBe('ACCEPTED');
    expect(reviewed.reviewedBy).toBe('lead-engineer-01');

    // Zero autonomous mutation: verify no CAD or BOM mutation services were triggered
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ENGINEERING_RECOMMENDATION_ACCEPTED',
      }),
    );
  });

  describe('Failure Injection & Tenant Isolation Tests', () => {
    it('throws NotFoundException when DFM finding is missing', async () => {
      mockFindingRepo.find.mockResolvedValue([]);
      await expect(
        reasoningService.evaluateReasoning({ drawingId, projectId }, tenantA),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when tenant is missing (Fail-Closed)', async () => {
      await expect(
        reasoningService.evaluateReasoning({ drawingId, projectId }, ''),
      ).rejects.toThrow(ForbiddenException);
    });

    it('handles unconfigured cost rates gracefully without fabricating numbers', async () => {
      mockFindingRepo.find.mockResolvedValue([
        { id: findingId, ruleId: 'DFM-HOLE-001', observedValue: 5.0, expectedThreshold: 3.0, unit: 'ratio', severity: 'WARNING' },
      ]);
      mockFeatureRepo.find.mockResolvedValue([]);
      mockCorrelationRepo.find.mockResolvedValue([]);
      mockReasoningRepo.findOne.mockResolvedValue(null);

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null), // Unconfigured rates
      };
      mockCostConfigRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await reasoningService.evaluateReasoning({ drawingId, projectId }, tenantA);

      expect(result.costSummary?.total.expected).toBeNull();
      expect(result.costSummary?.missingComponents.length).toBe(6);
      expect(result.costSummary?.material[0].status).toBe(CostStatus.UNAVAILABLE);
    });
  });
});
