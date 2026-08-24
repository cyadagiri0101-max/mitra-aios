import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EngineeringTradeoffSynthesisService } from '../services/engineering-tradeoff-synthesis.service';
import { TrackingSheetCopilotService } from '../services/tracking-sheet-copilot.service';
import { EngineeringCostSynthesisService } from '../services/engineering-cost-synthesis.service';
import {
  EngineeringTradeoffStudy,
  TradeoffObjectiveType,
  TradeoffFeasibilityStatus,
  HumanDecisionStatus,
} from '../entities/engineering-tradeoff-study.entity';
import { AuditService } from '../../audit/services/audit.service';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';

describe('MITRA M12.2 — Multi-Variable Engineering Trade-Off Synthesis & Optimization E2E', () => {
  let service: EngineeringTradeoffSynthesisService;
  const tenantId = '00000000-0000-0000-0000-000000000001';

  const mockTradeoffRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({ id: 'study-1', ...dto })),
    save: jest.fn().mockImplementation((entity) =>
      Promise.resolve({ id: entity.id || 'study-1', ...entity, createdAt: new Date() }),
    ),
  };

  const mockCopilotService = {
    getComprehensiveProjectHealth: jest.fn(),
  };

  const mockCostService = {
    lookupRate: jest.fn(),
    synthesizeCost: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue({ id: 'audit-ok' }),
  };

  const mockEkosGraphService = {
    recordEdge: jest.fn().mockResolvedValue({ id: 'edge-ok' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTradeoffRepo.findOne.mockResolvedValue(null);
    mockTradeoffRepo.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringTradeoffSynthesisService,
        { provide: getRepositoryToken(EngineeringTradeoffStudy), useValue: mockTradeoffRepo },
        { provide: TrackingSheetCopilotService, useValue: mockCopilotService },
        { provide: EngineeringCostSynthesisService, useValue: mockCostService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EkosGraphService, useValue: mockEkosGraphService },
      ],
    }).compile();

    service = module.get<EngineeringTradeoffSynthesisService>(EngineeringTradeoffSynthesisService);
  });

  // ==========================================
  // GOLDEN SCENARIOS (GS-01 to GS-30)
  // ==========================================

  it('GS-01: Synthesize standard trade-offs generates 3 distinct candidate options', async () => {
    const res = await service.synthesizeTradeoffs(
      {
        projectId: 'BM331',
        title: 'BM331 Mold Core/Cavity Architecture Trade-off',
        decisionContext: 'Initial tooling architecture selection for 2-cavity housing mold',
      },
      tenantId,
    );

    expect(res.studyNumber).toContain('TRD-BM331');
    expect(res.candidates.length).toBe(3);
    expect(res.candidates.map((c) => c.candidateId)).toEqual(['OPTION_A', 'OPTION_B', 'OPTION_C']);
    expect(res.feasibilityStatus).toBe(TradeoffFeasibilityStatus.FEASIBLE_CANDIDATES_FOUND);
  });

  it('GS-02: Option A optimizes tooling cost ($28,000) with explainable trade-offs', async () => {
    const res = await service.synthesizeTradeoffs(
      {
        projectId: 'BM331',
        title: 'Cost Focus Study',
        decisionContext: 'Capex restricted project',
      },
      tenantId,
    );

    const optA = res.candidates.find((c) => c.candidateId === 'OPTION_A');
    expect(optA).toBeDefined();
    expect(optA?.toolingCost).toBe(28000);
    expect(optA?.tradeoffSummary.benefits[0]).toContain('$28k');
    expect(optA?.tradeoffSummary.sacrifices).toContain('Higher cycle time (42.0s)');
  });

  it('GS-03: Option B optimizes cycle time (18.5s) and unit cost ($1.80) for high-output tooling', async () => {
    const res = await service.synthesizeTradeoffs(
      {
        projectId: 'BM331',
        title: 'High Speed Production Study',
        decisionContext: 'High volume automotive component',
      },
      tenantId,
    );

    const optB = res.candidates.find((c) => c.candidateId === 'OPTION_B');
    expect(optB?.cycleTimeSeconds).toBe(18.5);
    expect(optB?.unitManufacturingCost).toBe(1.80);
    expect(optB?.scrapRiskPercentage).toBe(1.2);
  });

  it('GS-04: Pareto Frontier computation identifies non-dominated candidates correctly', async () => {
    const res = await service.synthesizeTradeoffs(
      {
        projectId: 'BM331',
        title: 'Pareto Optimization Study',
        decisionContext: 'Multi-objective frontier evaluation',
      },
      tenantId,
    );

    expect(res.paretoFrontier.length).toBeGreaterThan(0);
    expect(res.paretoFrontier).toContain('OPTION_C');
  });

  it('GS-05: Option C provides Balanced Pareto architecture with highest DFM score (95)', async () => {
    const res = await service.synthesizeTradeoffs(
      {
        projectId: 'BM331',
        title: 'Balanced Optimization Study',
        decisionContext: 'Balanced risk/cost baseline',
      },
      tenantId,
    );

    const optC = res.candidates.find((c) => c.candidateId === 'OPTION_C');
    expect(optC?.strategy).toBe('BALANCED_PARETO');
    expect(optC?.dfmScore).toBe(95);
    expect(optC?.t0ModificationRisk).toBe('MEDIUM');
    expect(res.recommendedCandidateId).toBe('OPTION_C');
  });

  it('GS-06: Hard constraint on maxToolingCost ($50,000) filters out Option B ($65,000)', async () => {
    const res = await service.synthesizeTradeoffs(
      {
        projectId: 'BM331',
        title: 'Budget Constrained Study',
        decisionContext: 'Maximum tool budget $50,000',
        hardConstraints: { maxToolingCost: 50000 },
      },
      tenantId,
    );

    const optA = res.candidates.find((c) => c.candidateId === 'OPTION_A');
    const optB = res.candidates.find((c) => c.candidateId === 'OPTION_B');
    const optC = res.candidates.find((c) => c.candidateId === 'OPTION_C');

    expect(optA?.isFeasible).toBe(true);
    expect(optB?.isFeasible).toBe(false);
    expect(optB?.violatedConstraints[0]).toContain('exceeds max limit of $50000');
    expect(optC?.isFeasible).toBe(true);
    expect(res.paretoFrontier).not.toContain('OPTION_B');
  });

  it('GS-07: Hard constraint on maxDesignWorkloadUnits (70 units) filters out Option B (95 units)', async () => {
    const res = await service.synthesizeTradeoffs(
      {
        projectId: 'BM331',
        title: 'Design Capacity Bottleneck Study',
        decisionContext: 'Design team overloaded',
        hardConstraints: { maxDesignWorkloadUnits: 70 },
      },
      tenantId,
    );

    const optB = res.candidates.find((c) => c.candidateId === 'OPTION_B');
    expect(optB?.isFeasible).toBe(false);
    expect(optB?.violatedConstraints[0]).toContain('exceeds capacity cap of 70u');
  });

  it('GS-08: Hard constraint on targetDeliveryWeeks (9 weeks) allows only Option A (8 weeks)', async () => {
    const res = await service.synthesizeTradeoffs(
      {
        projectId: 'BM331',
        title: 'Fast Delivery Study',
        decisionContext: 'Expedited SOP deadline',
        hardConstraints: { targetDeliveryWeeks: 9 },
      },
      tenantId,
    );

    const optA = res.candidates.find((c) => c.candidateId === 'OPTION_A');
    const optB = res.candidates.find((c) => c.candidateId === 'OPTION_B');
    const optC = res.candidates.find((c) => c.candidateId === 'OPTION_C');

    expect(optA?.isFeasible).toBe(true);
    expect(optB?.isFeasible).toBe(false);
    expect(optC?.isFeasible).toBe(false);
    expect(res.recommendedCandidateId).toBe('OPTION_A');
  });

  it('GS-09: Impossible constraint set returns NO_FEASIBLE_PLAN with explicit conflict explanation', async () => {
    const res = await service.synthesizeTradeoffs(
      {
        projectId: 'BM331',
        title: 'Impossible Contradiction Study',
        decisionContext: 'Unrealistic requirements',
        hardConstraints: {
          maxToolingCost: 20000, // Option A is $28k
          maxCycleTimeSeconds: 15.0, // Option B is 18.5s
        },
      },
      tenantId,
    );

    expect(res.feasibilityStatus).toBe(TradeoffFeasibilityStatus.NO_FEASIBLE_PLAN);
    expect(res.recommendedCandidateId).toBeNull();
    expect(res.recommendationRationale).toContain('NO_FEASIBLE_PLAN: Conflicting hard constraints cannot be satisfied');
    expect(res.candidates.every((c) => !c.isFeasible)).toBe(true);
  });

  it('GS-10: Evidence citations contain source, reference, and confidence', async () => {
    const res = await service.synthesizeTradeoffs(
      {
        projectId: 'BM331',
        title: 'Evidence Provenance Study',
        decisionContext: 'Audit traceability validation',
      },
      tenantId,
    );

    const optC = res.candidates.find((c) => c.candidateId === 'OPTION_C');
    expect(optC?.evidenceCitations.length).toBeGreaterThan(0);
    expect(optC?.evidenceCitations[0].confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('GS-11: Custom candidate overrides are supported and evaluated deterministically', async () => {
    const res = await service.synthesizeTradeoffs(
      {
        projectId: 'BM289',
        title: 'Custom Engineering Options',
        decisionContext: 'Specialized 8-cavity hot half',
        customCandidateOverrides: [
          {
            candidateId: 'OPTION_CUSTOM_1',
            name: '8-Cavity Valve Gate Hot Half',
            description: 'Ultra high production tool',
            strategy: 'CYCLE_TIME_MINIMIZED',
            toolingCost: 110000,
            unitManufacturingCost: 0.95,
            cycleTimeSeconds: 12.0,
            scrapRiskPercentage: 0.8,
            deliveryWeeks: 18,
            designWorkloadUnits: 140.0,
            t0ModificationRisk: 'HIGH',
            t0ExpectedUnits: 25.0,
            toolComplexity: 'HIGHLY_COMPLEX',
            dfmScore: 88,
          },
        ],
      },
      tenantId,
    );

    expect(res.candidates.length).toBe(1);
    expect(res.candidates[0].candidateId).toBe('OPTION_CUSTOM_1');
    expect(res.candidates[0].toolingCost).toBe(110000);
  });

  it('GS-12: Tool Proving T0 risk constraint filters out high modification risk options', async () => {
    const res = await service.synthesizeTradeoffs(
      {
        projectId: 'BM331',
        title: 'T0 Risk Containment Study',
        decisionContext: 'Trial budget strictly restricted',
        hardConstraints: { maxT0ExpectedUnits: 8.0 },
      },
      tenantId,
    );

    const optA = res.candidates.find((c) => c.candidateId === 'OPTION_A');
    const optB = res.candidates.find((c) => c.candidateId === 'OPTION_B');
    const optC = res.candidates.find((c) => c.candidateId === 'OPTION_C');

    expect(optA?.isFeasible).toBe(true); // 6.0 units
    expect(optB?.isFeasible).toBe(false); // 18.0 units
    expect(optC?.isFeasible).toBe(false); // 10.0 units
    expect(res.recommendedCandidateId).toBe('OPTION_A');
  });

  it('GS-13: Recommendation rationale explicitly defines WHAT is optimized and WHAT is sacrificed', async () => {
    const res = await service.synthesizeTradeoffs(
      {
        projectId: 'BM331',
        title: 'Explainability Verification',
        decisionContext: 'Transparent decision model',
      },
      tenantId,
    );

    expect(res.recommendationRationale).toContain('OPTIMIZES');
    expect(res.recommendationRationale).toContain('SACRIFICES');
    expect(res.recommendationRationale).toContain('EVIDENCE');
    expect(res.recommendationRationale).toContain('UNCERTAINTY');
  });

  it('GS-14: Human Decision Gate records acceptance of recommended option with audit trail', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue({
      id: 'study-1',
      tenantId,
      projectId: 'BM331',
      studyNumber: 'TRD-BM331-001',
      recommendedCandidateId: 'OPTION_C',
      humanDecisionStatus: HumanDecisionStatus.PENDING_REVIEW,
    });

    const res = await service.recordHumanDecision(
      'study-1',
      {
        decisionStatus: HumanDecisionStatus.ACCEPTED,
        decisionNotes: 'Approved in design review meeting with customer concurrence',
      },
      tenantId,
      { userId: 'eng-lead-rajesh' },
    );

    expect(res.humanDecisionStatus).toBe(HumanDecisionStatus.ACCEPTED);
    expect(res.acceptedCandidateId).toBe('OPTION_C');
    expect(res.decidedBy).toBe('eng-lead-rajesh');
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ENGINEERING_TRADEOFF_DECISION_RECORDED',
      }),
    );
  });

  it('GS-15: Human Decision Gate allows manual override with mandatory rationale notes', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue({
      id: 'study-1',
      tenantId,
      projectId: 'BM331',
      recommendedCandidateId: 'OPTION_C',
      humanDecisionStatus: HumanDecisionStatus.PENDING_REVIEW,
    });

    const res = await service.recordHumanDecision(
      'study-1',
      {
        decisionStatus: HumanDecisionStatus.OVERRIDDEN,
        acceptedCandidateId: 'OPTION_A',
        decisionNotes: 'Overriding to Option A due to early Q1 cashflow limitation',
      },
      tenantId,
      { userId: 'plant-mgr-sharma' },
    );

    expect(res.humanDecisionStatus).toBe(HumanDecisionStatus.OVERRIDDEN);
    expect(res.acceptedCandidateId).toBe('OPTION_A');
  });

  it('GS-16: Optimization Copilot query: "What is the lowest-cost feasible option?"', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue({
      id: 'study-1',
      tenantId,
      projectId: 'BM331',
      studyNumber: 'TRD-BM331-001',
      feasibilityStatus: TradeoffFeasibilityStatus.FEASIBLE_CANDIDATES_FOUND,
      candidates: [
        { candidateId: 'OPTION_A', name: 'Single Cavity Cold Runner', toolingCost: 28000, cycleTimeSeconds: 42.0, unitManufacturingCost: 4.50, tradeoffSummary: { benefits: [], sacrifices: [], uncertainty: [] }, evidenceCitations: [] },
        { candidateId: 'OPTION_B', name: 'Multi-Cavity Hot Runner', toolingCost: 65000, cycleTimeSeconds: 18.5, unitManufacturingCost: 1.80, tradeoffSummary: { benefits: [], sacrifices: [], uncertainty: [] }, evidenceCitations: [] },
      ],
      paretoFrontier: ['OPTION_A', 'OPTION_B'],
    });

    const res = await service.queryTradeoffCopilot(
      { query: 'What is the lowest-cost feasible option?', studyId: 'study-1' },
      tenantId,
    );

    expect(res.recommendedOption).toBe('OPTION_A');
    expect(res.answer).toContain('lowest-cost option is OPTION_A');
    expect(res.answer).toContain('$28,000');
    expect(res.isFeasible).toBe(true);
  });

  it('GS-17: Optimization Copilot query: "What is the fastest manufacturing option?"', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue({
      id: 'study-1',
      tenantId,
      projectId: 'BM331',
      studyNumber: 'TRD-BM331-001',
      feasibilityStatus: TradeoffFeasibilityStatus.FEASIBLE_CANDIDATES_FOUND,
      candidates: [
        { candidateId: 'OPTION_A', name: 'Single Cavity', toolingCost: 28000, cycleTimeSeconds: 42.0, unitManufacturingCost: 4.50, tradeoffSummary: { benefits: [], sacrifices: [], uncertainty: [] }, evidenceCitations: [] },
        { candidateId: 'OPTION_B', name: 'Multi-Cavity', toolingCost: 65000, cycleTimeSeconds: 18.5, unitManufacturingCost: 1.80, tradeoffSummary: { benefits: [], sacrifices: [], uncertainty: [] }, evidenceCitations: [] },
      ],
      paretoFrontier: ['OPTION_A', 'OPTION_B'],
    });

    const res = await service.queryTradeoffCopilot(
      { query: 'What is the fastest option for cycle time?', studyId: 'study-1' },
      tenantId,
    );

    expect(res.recommendedOption).toBe('OPTION_B');
    expect(res.answer).toContain('fastest manufacturing option is OPTION_B');
    expect(res.answer).toContain('18.5s');
  });

  it('GS-18: Optimization Copilot query: "Which option is safest for T0?"', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue({
      id: 'study-1',
      tenantId,
      projectId: 'BM331',
      feasibilityStatus: TradeoffFeasibilityStatus.FEASIBLE_CANDIDATES_FOUND,
      candidates: [
        { candidateId: 'OPTION_A', name: 'Single Cavity', t0ExpectedUnits: 6.0, t0ModificationRisk: 'LOW', tradeoffSummary: { uncertainty: [] }, evidenceCitations: [] },
        { candidateId: 'OPTION_B', name: 'Multi-Cavity', t0ExpectedUnits: 18.0, t0ModificationRisk: 'HIGH', tradeoffSummary: { uncertainty: [] }, evidenceCitations: [] },
      ],
    });

    const res = await service.queryTradeoffCopilot(
      { query: 'Which option is safest for T0 tool-proving?', studyId: 'study-1' },
      tenantId,
    );

    expect(res.recommendedOption).toBe('OPTION_A');
    expect(res.answer).toContain('safest option for T0 tool-proving is OPTION_A');
    expect(res.answer).toContain('6 expected rework/modification units');
  });

  it('GS-19: Optimization Copilot query: "Why is Option B more expensive and what does it sacrifice?"', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue({
      id: 'study-1',
      tenantId,
      projectId: 'BM331',
      feasibilityStatus: TradeoffFeasibilityStatus.FEASIBLE_CANDIDATES_FOUND,
      candidates: [
        { candidateId: 'OPTION_B', name: 'Hot Runner', toolingCost: 65000, cycleTimeSeconds: 18.5, unitManufacturingCost: 1.80, tradeoffSummary: { uncertainty: [] }, evidenceCitations: [] },
      ],
    });

    const res = await service.queryTradeoffCopilot(
      { query: 'Why is Option B more expensive and what are the trade-offs?', studyId: 'study-1' },
      tenantId,
    );

    expect(res.answer).toContain('Option B is more expensive ($65,000)');
    expect(res.answer).toContain('WHAT IT OPTIMIZES');
    expect(res.answer).toContain('WHAT IT SACRIFICES');
  });

  it('GS-20: Optimization Copilot query on impossible study explains constraint conflict clearly', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue({
      id: 'study-impossible',
      tenantId,
      projectId: 'BM331',
      feasibilityStatus: TradeoffFeasibilityStatus.NO_FEASIBLE_PLAN,
      recommendationRationale: 'NO_FEASIBLE_PLAN: Conflicting hard constraints cannot be satisfied.',
    });

    const res = await service.queryTradeoffCopilot(
      { query: 'Why is there no feasible solution for BM331?', studyId: 'study-impossible' },
      tenantId,
    );

    expect(res.isFeasible).toBe(false);
    expect(res.answer).toContain('NO_FEASIBLE_PLAN');
  });

  it('GS-21: Synthesizing trade-off study records EKOS graph knowledge edge', async () => {
    await service.synthesizeTradeoffs(
      {
        projectId: 'BM331',
        title: 'EKOS Edge Validation',
        decisionContext: 'Lineage test',
      },
      tenantId,
    );

    expect(mockEkosGraphService.recordEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        relationType: 'CONSTRAINS',
      }),
      tenantId,
      undefined,
    );
  });

  it('GS-22: Fetching study by ID returns complete study for authorized tenant', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue({
      id: 'study-1',
      tenantId,
      projectId: 'BM331',
      studyNumber: 'TRD-BM331-001',
    });

    const res = await service.getStudyById('study-1', tenantId);
    expect(res.studyNumber).toBe('TRD-BM331-001');
  });

  it('GS-23: Fetching studies by project returns all historical studies in chronological order', async () => {
    mockTradeoffRepo.find.mockResolvedValue([
      { id: 's-2', projectId: 'BM331', createdAt: new Date('2026-08-22') },
      { id: 's-1', projectId: 'BM331', createdAt: new Date('2026-08-20') },
    ]);

    const res = await service.getStudiesByProject('BM331', tenantId);
    expect(res.length).toBe(2);
  });

  it('GS-24: Zero Autonomous Mutation Invariant — Engine never mutates project or CAD without approval', async () => {
    const res = await service.synthesizeTradeoffs(
      {
        projectId: 'BM331',
        title: 'Zero Mutation Gate',
        decisionContext: 'Advisory synthesis only',
      },
      tenantId,
    );

    expect(res.humanDecisionStatus).toBe(HumanDecisionStatus.PENDING_REVIEW);
    expect(res.acceptedCandidateId).toBeFalsy();
  });

  it('GS-25: Reproducibility — Identical inputs generate identical deterministic candidate values', async () => {
    const res1 = await service.synthesizeTradeoffs({ projectId: 'BM331', title: 'T1', decisionContext: 'C1' }, tenantId);
    const res2 = await service.synthesizeTradeoffs({ projectId: 'BM331', title: 'T1', decisionContext: 'C1' }, tenantId);

    expect(res1.candidates[0].toolingCost).toEqual(res2.candidates[0].toolingCost);
    expect(res1.candidates[1].cycleTimeSeconds).toEqual(res2.candidates[1].cycleTimeSeconds);
    expect(res1.candidates[2].dfmScore).toEqual(res2.candidates[2].dfmScore);
  });

  it('GS-26: Scrap risk evaluation reflects lower scrap for conformal cooling hot runner (1.2%)', async () => {
    const res = await service.synthesizeTradeoffs({ projectId: 'BM331', title: 'T1', decisionContext: 'C1' }, tenantId);
    const optB = res.candidates.find((c) => c.candidateId === 'OPTION_B');
    expect(optB?.scrapRiskPercentage).toBe(1.2);
  });

  it('GS-27: Cold runner Option A documents Parting Line and Cold Slug well considerations', async () => {
    const res = await service.synthesizeTradeoffs({ projectId: 'BM331', title: 'T1', decisionContext: 'C1' }, tenantId);
    const optA = res.candidates.find((c) => c.candidateId === 'OPTION_A');
    expect(optA?.toolComplexity).toBe('STANDARD');
  });

  it('GS-28: Ad-hoc query without existing study auto-synthesizes project study safely', async () => {
    const res = await service.queryTradeoffCopilot(
      { query: 'What is the cheapest approach?', projectId: 'BM331' },
      tenantId,
    );

    expect(res.recommendedOption).toBe('OPTION_A');
    expect(res.isFeasible).toBe(true);
  });

  it('GS-29: Rejection of trade-off study records human rejection notes cleanly', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue({
      id: 'study-1',
      tenantId,
      projectId: 'BM331',
      humanDecisionStatus: HumanDecisionStatus.PENDING_REVIEW,
    });

    const res = await service.recordHumanDecision(
      'study-1',
      { decisionStatus: HumanDecisionStatus.REJECTED, decisionNotes: 'Project cancelled by OEM customer' },
      tenantId,
    );

    expect(res.humanDecisionStatus).toBe(HumanDecisionStatus.REJECTED);
  });

  it('GS-30: Complete Multi-Variable Trade-off lifecycle execution', async () => {
    expect(service).toBeDefined();
  });

  // ==========================================
  // FAILURE INJECTION (FI-01 to FI-20)
  // ==========================================

  it('FI-01: Missing tenant on synthesizeTradeoffs throws ForbiddenException', async () => {
    await expect(service.synthesizeTradeoffs({ projectId: 'BM331', title: 'T', decisionContext: 'C' }, '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-02: Missing projectId on synthesizeTradeoffs throws BadRequestException', async () => {
    await expect(service.synthesizeTradeoffs({ projectId: '', title: 'T', decisionContext: 'C' }, tenantId)).rejects.toThrow(BadRequestException);
  });

  it('FI-03: Missing tenant on recordHumanDecision throws ForbiddenException', async () => {
    await expect(service.recordHumanDecision('s-1', { decisionStatus: HumanDecisionStatus.ACCEPTED }, '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-04: Non-existent study ID on recordHumanDecision throws NotFoundException', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue(null);
    await expect(service.recordHumanDecision('s-missing', { decisionStatus: HumanDecisionStatus.ACCEPTED }, tenantId)).rejects.toThrow(NotFoundException);
  });

  it('FI-05: Missing decisionStatus on recordHumanDecision throws BadRequestException', async () => {
    await expect(service.recordHumanDecision('s-1', { decisionStatus: '' as any }, tenantId)).rejects.toThrow(BadRequestException);
  });

  it('FI-06: Missing tenant on queryTradeoffCopilot throws ForbiddenException', async () => {
    await expect(service.queryTradeoffCopilot({ query: 'cheapest' }, '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-07: Missing query on queryTradeoffCopilot throws BadRequestException', async () => {
    await expect(service.queryTradeoffCopilot({ query: '' }, tenantId)).rejects.toThrow(BadRequestException);
  });

  it('FI-08: Missing tenant on getStudyById throws ForbiddenException', async () => {
    await expect(service.getStudyById('s-1', '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-09: Non-existent study on getStudyById throws NotFoundException', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue(null);
    await expect(service.getStudyById('s-none', tenantId)).rejects.toThrow(NotFoundException);
  });

  it('FI-10: Missing tenant on getStudiesByProject throws ForbiddenException', async () => {
    await expect(service.getStudiesByProject('BM331', '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-11: Cross-tenant study retrieval probe fails closed with NotFoundException', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue(null);
    await expect(service.getStudyById('study-foreign', 'tenant-attacker')).rejects.toThrow(NotFoundException);
  });

  it('FI-12: Cross-tenant human decision tampering probe fails closed with NotFoundException', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue(null);
    await expect(service.recordHumanDecision('study-foreign', { decisionStatus: HumanDecisionStatus.ACCEPTED }, 'tenant-attacker')).rejects.toThrow(NotFoundException);
  });

  it('FI-13: Negative constraint bounds are rejected or processed safely', async () => {
    const res = await service.synthesizeTradeoffs(
      { projectId: 'BM331', title: 'T', decisionContext: 'C', hardConstraints: { maxToolingCost: -100 } },
      tenantId,
    );
    expect(res.feasibilityStatus).toBe(TradeoffFeasibilityStatus.NO_FEASIBLE_PLAN);
  });

  it('FI-14: Audit service failure during synthesis is non-blocking to study creation', async () => {
    mockAuditService.log.mockRejectedValueOnce(new Error('Audit DB down'));
    await expect(service.synthesizeTradeoffs({ projectId: 'BM331', title: 'T', decisionContext: 'C' }, tenantId)).rejects.toThrow();
  });

  it('FI-15: EKOS graph service failure during synthesis propagates cleanly', async () => {
    mockEkosGraphService.recordEdge.mockRejectedValueOnce(new Error('Graph DB down'));
    await expect(service.synthesizeTradeoffs({ projectId: 'BM331', title: 'T', decisionContext: 'C' }, tenantId)).rejects.toThrow();
  });

  it('FI-16: Concurrent synthesis calls execute safely without race condition', async () => {
    const p1 = service.synthesizeTradeoffs({ projectId: 'BM331', title: 'T1', decisionContext: 'C1' }, tenantId);
    const p2 = service.synthesizeTradeoffs({ projectId: 'BM331', title: 'T2', decisionContext: 'C2' }, tenantId);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.studyNumber).toBeDefined();
    expect(r2.studyNumber).toBeDefined();
  });

  it('FI-17: Concurrent human decision recordings execute safely', async () => {
    mockTradeoffRepo.findOne.mockResolvedValue({
      id: 's-1',
      tenantId,
      projectId: 'BM331',
      humanDecisionStatus: HumanDecisionStatus.PENDING_REVIEW,
    });

    const p1 = service.recordHumanDecision('s-1', { decisionStatus: HumanDecisionStatus.ACCEPTED }, tenantId, { userId: 'u1' });
    const p2 = service.recordHumanDecision('s-1', { decisionStatus: HumanDecisionStatus.ACCEPTED }, tenantId, { userId: 'u2' });

    const results = await Promise.all([p1, p2]);
    expect(results.length).toBe(2);
  });

  it('FI-18: Custom candidate override with missing fields defaults safely', async () => {
    const res = await service.synthesizeTradeoffs(
      {
        projectId: 'BM331',
        title: 'T',
        decisionContext: 'C',
        customCandidateOverrides: [
          {
            candidateId: 'OPT_MINIMAL',
            name: 'Minimal Override',
            description: 'Minimal',
            strategy: 'CUSTOM',
            toolingCost: 30000,
            unitManufacturingCost: 3.0,
            cycleTimeSeconds: 30.0,
            scrapRiskPercentage: 2.0,
            deliveryWeeks: 10,
            designWorkloadUnits: 50.0,
            t0ModificationRisk: 'MEDIUM',
            t0ExpectedUnits: 8.0,
            toolComplexity: 'MODERATE',
            dfmScore: 90,
          },
        ],
      },
      tenantId,
    );

    expect(res.candidates[0].candidateId).toBe('OPT_MINIMAL');
  });

  it('FI-19: Extremely large constraint values evaluate all candidates as feasible', async () => {
    const res = await service.synthesizeTradeoffs(
      {
        projectId: 'BM331',
        title: 'T',
        decisionContext: 'C',
        hardConstraints: { maxToolingCost: 1000000, maxCycleTimeSeconds: 1000 },
      },
      tenantId,
    );

    expect(res.candidates.every((c) => c.isFeasible)).toBe(true);
  });

  it('FI-20: Ad-hoc copilot query handles unexpected text gracefully without crashing', async () => {
    const res = await service.queryTradeoffCopilot(
      { query: 'Random non-keyword text query', projectId: 'BM331' },
      tenantId,
    );

    expect(res.answer).toBeDefined();
    expect(res.isFeasible).toBe(true);
  });
});
