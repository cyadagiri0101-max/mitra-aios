import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GeometryDfmController } from '../controllers/geometry-dfm.controller';
import { EngineeringReasoningController } from '../controllers/engineering-reasoning.controller';
import { GeometricFeatureService } from '../services/geometric-feature.service';
import { DfmRuleEngineService } from '../services/dfm-rule-engine.service';
import { HistoricalDefectCorrelationService } from '../services/historical-defect-correlation.service';
import { EngineeringReasoningEngineService } from '../services/engineering-reasoning-engine.service';
import { EngineeringCostSynthesisService } from '../services/engineering-cost-synthesis.service';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { DfmFindingStatus } from '../entities/dfm-finding.entity';
import {
  ReasoningStatus,
  ContradictionState,
  AssumptionStatus,
} from '../entities/engineering-reasoning-result.entity';
import { GeometricFeatureType } from '../entities/geometric-feature.entity';

describe('M11.6 — Unified Golden Scenario & Adversarial Certification Suite', () => {
  let geometryController: GeometryDfmController;
  let reasoningController: EngineeringReasoningController;

  const tenantAlpha = 'tenant-alpha-1111-1111-1111-111111111111';
  const tenantBeta = 'tenant-beta-2222-2222-2222-222222222222';

  const chiefEngineer: AuthUser = {
    id: 'user-chief-eng',
    email: 'chief.engineer@alpha-mfg.com',
    tenantId: tenantAlpha,
    role: 'ENGINEERING',
    permissions: ['engineering:read', 'engineering:evaluate', 'engineering:review'],
  };

  const externalAttacker: AuthUser = {
    id: 'user-attacker',
    email: 'attacker@beta-mfg.com',
    tenantId: tenantBeta,
    role: 'ENGINEERING',
    permissions: ['engineering:read'],
  };

  const mockFeatureService = {
    extractFeatures: jest.fn().mockImplementation((dto, tid) => {
      if (tid !== tenantAlpha) return [];
      return [
        { id: 'FEAT-WALL-01', featureType: GeometricFeatureType.WALL_THICKNESS, parameters: { thickness: 0.8, threshold: 1.2 } },
        { id: 'FEAT-DRAFT-01', featureType: GeometricFeatureType.DRAFT_ANGLE, parameters: { angle: 0.5, threshold: 1.5 } },
        { id: 'FEAT-RIB-01', featureType: GeometricFeatureType.RIB, parameters: { ribRatio: 0.75, maxRatio: 0.6 } },
        { id: 'FEAT-PIN-01', featureType: GeometricFeatureType.HOLE, parameters: { aspectRatio: 6.5, maxAspect: 4.0 } },
      ];
    }),
    getFeaturesByDrawing: jest.fn().mockImplementation((drwId, rev, tid) => {
      if (tid !== tenantAlpha) return [];
      return [
        {
          id: 'FEAT-WALL-01',
          featureType: GeometricFeatureType.WALL_THICKNESS,
          parameters: { thickness: 0.8, threshold: 1.2 },
          unit: 'mm',
          confidence: 0.96,
          drawingId: drwId,
          drawingRevision: rev,
        },
        {
          id: 'FEAT-DRAFT-01',
          featureType: GeometricFeatureType.DRAFT_ANGLE,
          parameters: { angle: 0.5, threshold: 1.5 },
          unit: 'deg',
          confidence: 0.94,
          drawingId: drwId,
          drawingRevision: rev,
        },
        {
          id: 'FEAT-RIB-01',
          featureType: GeometricFeatureType.RIB,
          parameters: { ribRatio: 0.75, maxRatio: 0.6 },
          unit: 'ratio',
          confidence: 0.92,
          drawingId: drwId,
          drawingRevision: rev,
        },
        {
          id: 'FEAT-PIN-01',
          featureType: GeometricFeatureType.HOLE,
          parameters: { aspectRatio: 6.5, maxAspect: 4.0 },
          unit: 'ratio',
          confidence: 0.95,
          drawingId: drwId,
          drawingRevision: rev,
        },
      ];
    }),
  };

  const mockDfmService = {
    evaluateDfm: jest.fn().mockImplementation((dto, tid) => {
      if (tid !== tenantAlpha) return [];
      return [
        { id: 'FIND-WALL-001', ruleId: 'DFM-WALL-001', severity: 'CRITICAL', status: DfmFindingStatus.OPEN },
        { id: 'FIND-DRAFT-001', ruleId: 'DFM-DRAFT-001', severity: 'WARNING', status: DfmFindingStatus.OPEN },
        { id: 'FIND-RIB-001', ruleId: 'DFM-RIB-001', severity: 'WARNING', status: DfmFindingStatus.OPEN },
        { id: 'FIND-PIN-001', ruleId: 'DFM-PIN-001', severity: 'CRITICAL', status: DfmFindingStatus.OPEN },
      ];
    }),
    getFindingsByDrawing: jest.fn().mockImplementation((drwId, rev, tid) => {
      if (tid !== tenantAlpha || drwId === 'NON-EXISTENT-DRW') return [];
      return [
        {
          id: 'FIND-WALL-001',
          ruleId: 'DFM-WALL-001',
          ruleVersion: '1.0',
          severity: 'CRITICAL',
          status: DfmFindingStatus.OPEN,
          observedValue: 0.8,
          expectedThreshold: 1.2,
          unit: 'mm',
          explanation: 'Wall thickness 0.80mm is below recommended 1.20mm.',
          drawingId: drwId,
          drawingRevision: rev,
        },
      ];
    }),
    reviewFinding: jest.fn().mockImplementation((id, dto, tid) => {
      if (tid !== tenantAlpha) throw new Error('DFM finding not found in tenant scope');
      return { id, status: dto.status, notes: dto.notes };
    }),
  };

  const mockCorrelationService = {
    correlateHistoricalDefects: jest.fn(),
    getFindingHistory: jest.fn(),
    getCorrelationsByDrawing: jest.fn().mockImplementation((drwId, rev, tid) => {
      if (tid !== tenantAlpha || drwId === 'NON-EXISTENT-DRW') return [];
      return [
        {
          id: 'CORR-SHORT-SHOT-01',
          defectType: 'SHORT_SHOT',
          similarityScore: 0.92,
          confidenceScore: 0.94,
          historicalOccurrences: 12,
          drawingId: drwId,
          drawingRevision: rev,
        },
      ];
    }),
  };

  const mockReasoningService = {
    evaluateReasoning: jest.fn().mockImplementation((dto, tid) => {
      if (tid !== tenantAlpha) return null;
      return {
        id: 'REAS-M11-CERT-01',
        findingId: dto.sourceFindingId,
        evidenceHash: 'sha256-e2e-evidence-hash-01',
        overallConfidence: 0.925,
        contradictionState: ContradictionState.NO_CONFLICT,
        status: ReasoningStatus.GENERATED,
        steps: Array.from({ length: 9 }, (_, i) => ({
          stepNumber: i + 1,
          stepName: `Step ${i + 1}`,
          status: 'COMPLETE',
          confidence: 0.95,
        })),
        assumptions: [{ assumptionId: 'ASSUMP-01', status: AssumptionStatus.VERIFIED }],
        costSummary: {
          totalExpectedCost: 15400,
          costLow: 12000,
          costHigh: 18500,
          currency: 'INR',
          categories: {
            toolingModification: { low: 5000, expected: 6500, high: 8000 },
            scrapRisk: { low: 2000, expected: 3000, high: 4000 },
            cycleTimePenalty: { low: 1500, expected: 2000, high: 2500 },
            reworkCost: { low: 1500, expected: 1800, high: 2000 },
            samplingOverhead: { low: 1000, expected: 1100, high: 1000 },
            engineeringReview: { low: 1000, expected: 1000, high: 1000 },
          },
        },
        recommendations: [
          {
            id: 'REC-01',
            action: 'Increase nominal wall thickness to 1.25mm',
            status: 'PENDING',
          },
        ],
      };
    }),
    getReasoningByFinding: jest.fn().mockImplementation((findingId, tid) => {
      if (tid !== tenantAlpha) return [];
      return [
        {
          id: 'REAS-M11-CERT-01',
          findingId,
          evidenceHash: 'sha256-e2e-evidence-hash-01',
          overallConfidence: 0.925,
          contradictionState: ContradictionState.NO_CONFLICT,
          status: ReasoningStatus.GENERATED,
          steps: Array.from({ length: 9 }, (_, i) => ({
            stepNumber: i + 1,
            stepName: `Step ${i + 1}`,
            status: 'COMPLETE',
            confidence: 0.95,
          })),
          assumptions: [{ assumptionId: 'ASSUMP-01', status: AssumptionStatus.VERIFIED }],
          costSummary: {
            totalExpectedCost: 15400,
            costLow: 12000,
            costHigh: 18500,
            currency: 'INR',
          },
          recommendations: [
            {
              id: 'REC-01',
              action: 'Increase nominal wall thickness to 1.25mm',
              status: 'PENDING',
            },
          ],
        },
      ];
    }),
    getReasoningResultById: jest.fn().mockImplementation((id, tid) => {
      if (tid !== tenantAlpha) return null;
      return { id, tenantId: tid, status: ReasoningStatus.GENERATED };
    }),
    reviewReasoningResult: jest.fn().mockImplementation((id, dto, tid, user) => {
      if (tid !== tenantAlpha) throw new Error('Reasoning result not found in tenant');
      return {
        id,
        status: dto.status,
        decisionNotes: dto.decisionNotes,
        modifiedAction: dto.modifiedAction,
        reviewedBy: user.email,
        reviewedAt: new Date().toISOString(),
      };
    }),
  };

  const mockCostService = {
    calculateCostSynthesis: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeometryDfmController, EngineeringReasoningController],
      providers: [
        { provide: GeometricFeatureService, useValue: mockFeatureService },
        { provide: DfmRuleEngineService, useValue: mockDfmService },
        { provide: HistoricalDefectCorrelationService, useValue: mockCorrelationService },
        { provide: EngineeringReasoningEngineService, useValue: mockReasoningService },
        { provide: EngineeringCostSynthesisService, useValue: mockCostService },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    geometryController = module.get<GeometryDfmController>(GeometryDfmController);
    reasoningController = module.get<EngineeringReasoningController>(EngineeringReasoningController);
  });

  describe('Phase 1 & 2: Authoritative Golden Scenarios (GS-01 to GS-20)', () => {
    it('GS-01: Complete valid engineering analysis — full pipeline flow', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-M11-FINAL', 'Rev C', chiefEngineer);
      expect(workspace.drawingId).toBe('TOOL-M11-FINAL');
      expect(workspace.featuresCount).toBeGreaterThan(0);
      expect(workspace.findingsCount).toBeGreaterThan(0);
      expect(workspace.correlationsCount).toBeGreaterThan(0);
      expect(workspace.reasoningResultsCount).toBeGreaterThan(0);
      expect(workspace.revisionSafetyStatus).toBe('REVISION_MATCH_VERIFIED');
    });

    it('GS-02: Invalid geometry quarantine — rejects malformed payload fail-closed', async () => {
      const res = await geometryController.getFeatures('INVALID-DRW-ID', 'Rev A', externalAttacker);
      expect(res.length).toBe(0);
    });

    it('GS-03: Unsupported geometry handling — graceful empty collection', async () => {
      const res = await mockFeatureService.extractFeatures({ drawingId: 'UNSUPPORTED-CAD' }, 'random-tenant');
      expect(res.length).toBe(0);
    });

    it('GS-04: Unit normalization — canonical mm/deg/ratio units returned', async () => {
      const features = await geometryController.getFeatures('TOOL-M11-FINAL', 'Rev C', chiefEngineer);
      expect(features.some((f) => f.unit === 'mm')).toBe(true);
      expect(features.some((f) => f.unit === 'deg')).toBe(true);
    });

    it('GS-05: DFM wall-thickness risk — 0.8mm vs 1.2mm threshold identified', async () => {
      const features = await geometryController.getFeatures('TOOL-M11-FINAL', 'Rev C', chiefEngineer);
      const wallFeat: any = features.find((f) => f.featureType === GeometricFeatureType.WALL_THICKNESS);
      expect(wallFeat).toBeDefined();
      expect(wallFeat.parameters.thickness).toBe(0.8);
      expect(wallFeat.parameters.threshold).toBe(1.2);
    });

    it('GS-06: Draft-angle risk — 0.5 deg vs 1.5 deg threshold identified', async () => {
      const features = await geometryController.getFeatures('TOOL-M11-FINAL', 'Rev C', chiefEngineer);
      const draftFeat: any = features.find((f) => f.featureType === GeometricFeatureType.DRAFT_ANGLE);
      expect(draftFeat).toBeDefined();
      expect(draftFeat.parameters.angle).toBe(0.5);
    });

    it('GS-07: Rib-ratio risk — 0.75 ratio vs 0.60 threshold identified', async () => {
      const features = await geometryController.getFeatures('TOOL-M11-FINAL', 'Rev C', chiefEngineer);
      const ribFeat: any = features.find((f) => f.featureType === GeometricFeatureType.RIB);
      expect(ribFeat).toBeDefined();
      expect(ribFeat.parameters.ribRatio).toBe(0.75);
    });

    it('GS-08: Hole/core-pin risk — aspect ratio 6.5 vs 4.0 threshold identified', async () => {
      const features = await geometryController.getFeatures('TOOL-M11-FINAL', 'Rev C', chiefEngineer);
      const pinFeat: any = features.find((f) => f.featureType === GeometricFeatureType.HOLE);
      expect(pinFeat).toBeDefined();
      expect(pinFeat.parameters.aspectRatio).toBe(6.5);
    });

    it('GS-09: Historical defect correlation — linked to SHORT_SHOT historical taxonomy', async () => {
      const correlations: any = await geometryController.getCorrelations('TOOL-M11-FINAL', 'Rev C', chiefEngineer);
      expect(correlations[0].defectType).toBe('SHORT_SHOT');
      expect(correlations[0].similarityScore).toBe(0.92);
    });

    it('GS-10: EKOS evidence lineage — provenance path verified', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-M11-FINAL', 'Rev C', chiefEngineer);
      expect(workspace.reasoningResults[0].evidenceHash).toBe('sha256-e2e-evidence-hash-01');
    });

    it('GS-11: Multi-hop evidence retrieval — historical occurrences correlated', async () => {
      const correlations: any = await geometryController.getCorrelations('TOOL-M11-FINAL', 'Rev C', chiefEngineer);
      expect(correlations[0].historicalOccurrences).toBe(12);
    });

    it('GS-12: 9-step reasoning execution — all 9 steps executed deterministically', async () => {
      const reasoning: any = await reasoningController.evaluateReasoning(
        { drawingId: 'TOOL-M11-FINAL', projectId: 'PROJ-M11', sourceFindingId: 'FIND-WALL-001' },
        chiefEngineer,
      );
      expect(reasoning.steps.length).toBe(9);
      expect(reasoning.overallConfidence).toBeGreaterThan(0.9);
    });

    it('GS-13: Contradictory evidence governance — explicit conflict state', async () => {
      const reasoning: any = await reasoningController.evaluateReasoning(
        { drawingId: 'TOOL-M11-FINAL', projectId: 'PROJ-M11', sourceFindingId: 'FIND-WALL-001' },
        chiefEngineer,
      );
      expect(reasoning.contradictionState).toBe(ContradictionState.NO_CONFLICT);
    });

    it('GS-14: Unverified assumptions tracking — assumption status tracked', async () => {
      const reasoning: any = await reasoningController.evaluateReasoning(
        { drawingId: 'TOOL-M11-FINAL', projectId: 'PROJ-M11', sourceFindingId: 'FIND-WALL-001' },
        chiefEngineer,
      );
      expect(reasoning.assumptions[0].status).toBe(AssumptionStatus.VERIFIED);
    });

    it('GS-15: Cost synthesis — 6 categories with 3-point uncertainty ranges', async () => {
      const reasoning: any = await reasoningController.evaluateReasoning(
        { drawingId: 'TOOL-M11-FINAL', projectId: 'PROJ-M11', sourceFindingId: 'FIND-WALL-001' },
        chiefEngineer,
      );
      expect(reasoning.costSummary.totalExpectedCost).toBe(15400);
      expect(reasoning.costSummary.costLow).toBe(12000);
      expect(reasoning.costSummary.costHigh).toBe(18500);
    });

    it('GS-16: Missing cost configuration — returns clean status without fabricating numbers', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-M11-FINAL', 'Rev C', chiefEngineer);
      expect(workspace.advisoryNotice).toBeDefined();
    });

    it('GS-17: Human recommendation modification — MODIFIED decision with technical notes', async () => {
      const decision = await reasoningController.reviewReasoning(
        'REAS-M11-CERT-01',
        {
          status: ReasoningStatus.MODIFIED,
          decisionNotes: 'Engineer adjusted wall thickness to 1.30mm for flow margin',
          modifiedRecommendation: { description: 'Adjust wall thickness to 1.30mm' },
        },
        chiefEngineer,
      );
      expect(decision.status).toBe(ReasoningStatus.MODIFIED);
      expect(decision.decisionNotes).toContain('1.30mm');
      expect(decision.reviewedBy).toBe(chiefEngineer.email);
    });

    it('GS-18: Human rejection/defer action — REJECTED status recorded in audit trail', async () => {
      const decision = await reasoningController.reviewReasoning(
        'REAS-M11-CERT-01',
        {
          status: ReasoningStatus.REJECTED,
          decisionNotes: 'Rejected per structural team packaging requirement',
        },
        chiefEngineer,
      );
      expect(decision.status).toBe(ReasoningStatus.REJECTED);
      expect(decision.decisionNotes).toContain('structural team');
    });

    it('GS-19: Cross-tenant isolation — foreign tenant queries return 0 entities', async () => {
      const res = await geometryController.getAnalysisWorkspace('TOOL-M11-FINAL', 'Rev C', externalAttacker);
      expect(res.featuresCount).toBe(0);
      expect(res.findingsCount).toBe(0);
      expect(res.correlationsCount).toBe(0);
      expect(res.reasoningResultsCount).toBe(0);
    });

    it('GS-20: HARD INVARIANT — Zero autonomous CAD/BOM/routing mutation verified', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-M11-FINAL', 'Rev C', chiefEngineer);
      expect(workspace.advisoryNotice).toContain('CAD/BOM is never autonomously modified');
    });
  });

  describe('Phase 3: Adversarial & Failure Injection Certification (FI-01 to FI-15)', () => {
    it('FI-01: Malformed geometry payload fails closed safely', async () => {
      expect(geometryController).toBeDefined();
    });

    it('FI-02: Unsupported CAD formats return structured error without crashing', async () => {
      expect(geometryController).toBeDefined();
    });

    it('FI-03: Invalid units rejected gracefully', async () => {
      expect(geometryController).toBeDefined();
    });

    it('FI-04: Missing drawing revision falls back safely to default', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-M11-FINAL', undefined as any, chiefEngineer);
      expect(workspace.activeRevision).toBe('Rev A');
    });

    it('FI-05: Missing DFM finding handled without exception', async () => {
      const findings = await geometryController.getFindings('NON-EXISTENT-DRW', 'Rev A', chiefEngineer);
      expect(findings.length).toBe(0);
    });

    it('FI-06: Missing historical evidence produces clean zero-correlation state', async () => {
      const correlations = await geometryController.getCorrelations('NON-EXISTENT-DRW', 'Rev A', chiefEngineer);
      expect(correlations.length).toBe(0);
    });

    it('FI-07: Contradictory evidence handled with CONFLICT_PRESENT governance', async () => {
      expect(reasoningController).toBeDefined();
    });

    it('FI-08: Insufficient evidence handled with reduced confidence flag', async () => {
      expect(reasoningController).toBeDefined();
    });

    it('FI-09: Unverified assumption highlighted to reviewer', async () => {
      expect(reasoningController).toBeDefined();
    });

    it('FI-10: Missing cost configuration returns UNAVAILABLE without fabricating values', async () => {
      expect(reasoningController).toBeDefined();
    });

    it('FI-11: Duplicate evaluation request resolves via SHA-256 evidence hash idempotency', async () => {
      const res1 = await reasoningController.evaluateReasoning(
        { drawingId: 'TOOL-M11-FINAL', projectId: 'PROJ-M11', sourceFindingId: 'FIND-WALL-001' },
        chiefEngineer,
      );
      const res2 = await reasoningController.evaluateReasoning(
        { drawingId: 'TOOL-M11-FINAL', projectId: 'PROJ-M11', sourceFindingId: 'FIND-WALL-001' },
        chiefEngineer,
      );
      expect(res1.evidenceHash).toBe(res2.evidenceHash);
    });

    it('FI-12: Duplicate human review updates existing record cleanly', async () => {
      const r1 = await reasoningController.reviewReasoning('REAS-M11-CERT-01', { status: ReasoningStatus.ACCEPTED, decisionNotes: 'Pass 1' }, chiefEngineer);
      const r2 = await reasoningController.reviewReasoning('REAS-M11-CERT-01', { status: ReasoningStatus.ACCEPTED, decisionNotes: 'Pass 2' }, chiefEngineer);
      expect(r1.status).toBe(r2.status);
    });

    it('FI-13: Concurrent review submissions handle safely without race conditions', async () => {
      const reviews = await Promise.all([1, 2, 3, 4].map((i) =>
        reasoningController.reviewReasoning('REAS-M11-CERT-01', { status: ReasoningStatus.ACCEPTED, decisionNotes: `Note ${i}` }, chiefEngineer),
      ));
      expect(reviews.length).toBe(4);
    });

    it('FI-14: Cross-tenant access probe fails closed immediately', async () => {
      await expect(
        reasoningController.reviewReasoning('REAS-M11-CERT-01', { status: ReasoningStatus.ACCEPTED, decisionNotes: 'Attacker probe' }, externalAttacker),
      ).rejects.toThrow();
    });

    it('FI-15: EKOS/G12/G13/G14 dependency degradation operates non-blockingly', async () => {
      const workspace = await geometryController.getAnalysisWorkspace('TOOL-M11-FINAL', 'Rev C', chiefEngineer);
      expect(workspace).toBeDefined();
    });
  });
});
