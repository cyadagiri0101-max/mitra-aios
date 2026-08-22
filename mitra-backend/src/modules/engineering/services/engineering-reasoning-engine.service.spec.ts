import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EngineeringReasoningEngineService } from './engineering-reasoning-engine.service';
import {
  EngineeringReasoningResult,
  ReasoningStatus,
  ContradictionState,
  AssumptionStatus,
  RecommendationType,
} from '../entities/engineering-reasoning-result.entity';
import { DfmFinding } from '../entities/dfm-finding.entity';
import { GeometricFeature } from '../entities/geometric-feature.entity';
import { HistoricalDefectCorrelation } from '../entities/historical-defect-correlation.entity';
import { EngineeringCostSynthesisService } from './engineering-cost-synthesis.service';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';
import { AuditService } from '../../audit/services/audit.service';

describe('EngineeringReasoningEngineService Unit Tests', () => {
  let service: EngineeringReasoningEngineService;

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '99999999-9999-9999-9999-999999999999';
  const projectId = '80000000-0000-0000-0000-000000000001';
  const drawingId = '80000000-0000-0000-0000-000000000002';
  const findingId = '80000000-0000-0000-0000-000000000003';
  const featureId = '80000000-0000-0000-0000-000000000004';

  const mockReasoningRepo = {
    create: jest.fn((dto) => ({ id: 'reas-01', ...dto })),
    save: jest.fn((entity) => Promise.resolve({ id: entity.id || 'reas-01', ...entity })),
    findOne: jest.fn(),
    find: jest.fn(),
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

  const mockCostSynthesisService = {
    synthesizeCostImpact: jest.fn().mockResolvedValue({
      material: [],
      machining: [],
      tooling: [],
      quality: [],
      schedule: [],
      rework: [],
      total: { low: 8500, expected: 10000, high: 12500, currency: 'INR' },
      costRangeModel: 'THREE_POINT',
      missingComponents: [],
    }),
  };

  const mockEkosService = {
    recordEdge: jest.fn().mockResolvedValue({ id: 'ekos-edge-1' }),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringReasoningEngineService,
        {
          provide: getRepositoryToken(EngineeringReasoningResult),
          useValue: mockReasoningRepo,
        },
        {
          provide: getRepositoryToken(DfmFinding),
          useValue: mockFindingRepo,
        },
        {
          provide: getRepositoryToken(GeometricFeature),
          useValue: mockFeatureRepo,
        },
        {
          provide: getRepositoryToken(HistoricalDefectCorrelation),
          useValue: mockCorrelationRepo,
        },
        {
          provide: EngineeringCostSynthesisService,
          useValue: mockCostSynthesisService,
        },
        {
          provide: EkosGraphService,
          useValue: mockEkosService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<EngineeringReasoningEngineService>(EngineeringReasoningEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('9-Step Reasoning Pipeline Execution', () => {
    it('executes full 9-step reasoning pipeline with preserved evidence chain', async () => {
      mockFindingRepo.find.mockResolvedValueOnce([
        {
          id: findingId,
          ruleId: 'DFM-WALL-001',
          observedValue: 0.8,
          expectedThreshold: 1.2,
          unit: 'mm',
          severity: 'CRITICAL',
          explanation: 'Wall thickness below 1.2mm',
          featureId,
        },
      ]);

      mockFeatureRepo.find.mockResolvedValueOnce([
        {
          id: featureId,
          featureType: 'WALL_THICKNESS',
          measurements: { thickness: 0.8 },
          extractionMethod: 'CAD_GEOMETRY_PARSER',
          sourceHash: 'hash-feat-01',
        },
      ]);

      mockCorrelationRepo.find.mockResolvedValueOnce([
        {
          id: 'corr-01',
          findingId,
          defectType: 'SHORT_SHOT',
          correlationStrength: 'STRONG_ASSOCIATION',
          confidenceScore: 0.92,
          historicalEvidenceCount: 6,
          similarityScore: 0.95,
          matchedMaterial: 'ABS',
        },
      ]);

      mockReasoningRepo.findOne.mockResolvedValueOnce(null); // No previous duplicate

      const result = await service.evaluateReasoning(
        { drawingId, projectId, drawingRevision: 'Rev A', material: 'ABS', processType: 'INJECTION_MOLDING' },
        tenantA,
        { id: 'engineer-01' },
      );

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

      expect(result.recommendation?.type).toBe(RecommendationType.INCREASE_WALL_THICKNESS);
      expect(result.confidenceScore).toBeGreaterThan(0.75);
      expect(result.evidence.length).toBeGreaterThanOrEqual(2);
      expect(mockEkosService.recordEdge).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('returns existing generated result if evidence hash matches (Idempotency)', async () => {
      mockFindingRepo.find.mockResolvedValueOnce([
        {
          id: findingId,
          ruleId: 'DFM-WALL-001',
          observedValue: 0.8,
          expectedThreshold: 1.2,
          unit: 'mm',
          severity: 'WARNING',
        },
      ]);
      mockFeatureRepo.find.mockResolvedValueOnce([]);
      mockCorrelationRepo.find.mockResolvedValueOnce([]);

      const existingRecord = {
        id: 'existing-reas-id',
        status: ReasoningStatus.GENERATED,
        evidenceHash: 'any',
      };
      mockReasoningRepo.findOne.mockResolvedValueOnce(existingRecord);

      const res = await service.evaluateReasoning(
        { drawingId, projectId, drawingRevision: 'Rev A' },
        tenantA,
      );

      expect(res.id).toBe('existing-reas-id');
      expect(mockReasoningRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('Human Governance & Review State Transitions', () => {
    it('transitions reasoning status to ACCEPTED with mandatory decision notes', async () => {
      mockReasoningRepo.findOne.mockResolvedValueOnce({
        id: 'reas-01',
        tenantId: tenantA,
        status: ReasoningStatus.GENERATED,
        recommendation: { status: 'PENDING' },
      });

      const reviewed = await service.reviewReasoningResult(
        'reas-01',
        {
          status: ReasoningStatus.ACCEPTED,
          decisionNotes: 'Approved wall thickening for mold core redesign.',
        },
        tenantA,
        { id: 'lead-engineer-1' },
      );

      expect(reviewed.status).toBe(ReasoningStatus.ACCEPTED);
      expect(reviewed.recommendation?.status).toBe('ACCEPTED');
      expect(reviewed.reviewedBy).toBe('lead-engineer-1');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ENGINEERING_RECOMMENDATION_ACCEPTED',
        }),
      );
    });

    it('throws BadRequestException if decision notes are missing', async () => {
      mockReasoningRepo.findOne.mockResolvedValueOnce({
        id: 'reas-01',
        tenantId: tenantA,
      });

      await expect(
        service.reviewReasoningResult(
          'reas-01',
          { status: ReasoningStatus.REJECTED, decisionNotes: '' },
          tenantA,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
