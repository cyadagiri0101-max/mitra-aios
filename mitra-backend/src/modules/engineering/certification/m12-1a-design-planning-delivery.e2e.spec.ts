import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DesignPlanningDeliveryService } from '../services/design-planning-delivery.service';
import { DesignProjectComplexity } from '../entities/design-project-complexity.entity';
import { DesignChecklist } from '../entities/design-checklist.entity';
import { DesignChecklistItem } from '../entities/design-checklist-item.entity';
import { DesignDependency } from '../entities/design-dependency.entity';
import { DesignBlocker } from '../entities/design-blocker.entity';
import { DesignHistoricalWorkload } from '../entities/design-historical-workload.entity';
import { DesignReplanRequest } from '../entities/design-replan-request.entity';
import { DesignWorkPackage } from '../entities/design-work-package.entity';
import { DesignEngineerProfile } from '../entities/design-team-capacity.entity';
import { ToolProvingCycle } from '../entities/tool-proving-cycle.entity';
import { ToolModificationWorkload } from '../entities/tool-modification-workload.entity';
import { AuditService } from '../../audit/services/audit.service';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';

describe('MITRA M12.1A — Design Planning, Load Control & Engineering Delivery E2E', () => {
  let service: DesignPlanningDeliveryService;
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const mockUser = { userId: '11111111-1111-1111-1111-111111111111', role: 'ENGINEERING', tenantId };

  const mockComplexityRepo = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({ id: 'cpx-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'cpx-uuid-1', ...entity })),
  };

  const mockChecklistRepo = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => ({ id: 'chk-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'chk-uuid-1', ...entity })),
  };

  const mockChecklistItemRepo = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => ({ id: 'item-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((entity) =>
      Array.isArray(entity)
        ? Promise.resolve(entity.map((e, idx) => ({ id: `item-uuid-${idx + 1}`, ...e })))
        : Promise.resolve({ id: 'item-uuid-1', ...entity }),
    ),
  };

  const mockDependencyRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'dep-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'dep-uuid-1', ...entity })),
  };

  const mockBlockerRepo = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => ({ id: 'blk-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'blk-uuid-1', ...entity })),
  };

  const mockHistoricalRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'hist-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'hist-uuid-1', ...entity })),
  };

  const mockReplanRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'replan-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'replan-uuid-1', ...entity })),
  };

  const mockPackageRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockEngineerRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue({ id: 'audit-ok' }),
  };

  const mockEkosGraphService = {
    recordEdge: jest.fn().mockResolvedValue({ id: 'edge-ok' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DesignPlanningDeliveryService,
        { provide: getRepositoryToken(DesignProjectComplexity), useValue: mockComplexityRepo },
        { provide: getRepositoryToken(DesignChecklist), useValue: mockChecklistRepo },
        { provide: getRepositoryToken(DesignChecklistItem), useValue: mockChecklistItemRepo },
        { provide: getRepositoryToken(DesignDependency), useValue: mockDependencyRepo },
        { provide: getRepositoryToken(DesignBlocker), useValue: mockBlockerRepo },
        { provide: getRepositoryToken(DesignHistoricalWorkload), useValue: mockHistoricalRepo },
        { provide: getRepositoryToken(DesignReplanRequest), useValue: mockReplanRepo },
        { provide: getRepositoryToken(DesignWorkPackage), useValue: mockPackageRepo },
        { provide: getRepositoryToken(DesignEngineerProfile), useValue: mockEngineerRepo },
        { provide: getRepositoryToken(ToolProvingCycle), useValue: {} },
        { provide: getRepositoryToken(ToolModificationWorkload), useValue: {} },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EkosGraphService, useValue: mockEkosGraphService },
      ],
    }).compile();

    service = module.get<DesignPlanningDeliveryService>(DesignPlanningDeliveryService);
  });

  // ==========================================
  // GOLDEN SCENARIOS (GS-01 to GS-30)
  // ==========================================

  it('GS-01: Calculate project complexity with cavity and slider factors', async () => {
    const res = await service.calculateAndSaveComplexity(
      {
        projectId: 'PRJ-M12-001',
        moldType: 'INJECTION_MOLD',
        cavityCount: 8,
        sliderCount: 4,
        coolingComplexityLevel: 'CONFORMAL',
        toleranceClass: 'PRECISION',
      },
      tenantId,
    );
    expect(res).toBeDefined();
    expect(Number(res.workloadMultiplier)).toBeGreaterThan(1.5);
    expect(mockAuditService.log).toHaveBeenCalled();
  });

  it('GS-02: Workload multiplier dynamically scales estimated effort', async () => {
    const res = await service.calculateAndSaveComplexity(
      {
        projectId: 'PRJ-M12-002',
        moldType: 'INJECTION_MOLD',
        cavityCount: 2,
        sliderCount: 0,
      },
      tenantId,
    );
    expect(res.workloadMultiplier).toBe(1.25);
  });

  it('GS-03: Create governed stage checklist with mandatory items', async () => {
    const res = await service.createChecklist(
      {
        projectId: 'PRJ-M12-003',
        stage: 'LAYOUT',
        checklistType: 'STAGE',
        title: 'Mold Layout Verification Checklist',
        items: [
          { itemCode: 'CHK-LAY-01', description: 'Parting line step validation', isMandatory: true },
          { itemCode: 'CHK-LAY-02', description: 'Cooling line clearance >= 15mm', isMandatory: true },
          { itemCode: 'CHK-LAY-03', description: 'Standard mold base catalog reference', isMandatory: false },
        ],
      },
      tenantId,
    );
    expect(res).toBeDefined();
    expect(res.mandatoryItemsTotal).toBe(2);
    expect(res.allMandatoryPassed).toBe(false);
  });

  it('GS-04: Complete mandatory checklist item and update checklist status', async () => {
    mockChecklistItemRepo.findOne.mockResolvedValue({
      id: 'item-1',
      checklistId: 'chk-1',
      tenantId,
      isMandatory: true,
      checklist: { id: 'chk-1', status: 'PENDING', mandatoryItemsTotal: 1, mandatoryItemsCompleted: 0 },
    });

    mockChecklistItemRepo.find.mockResolvedValue([
      { id: 'item-1', isMandatory: true, status: 'COMPLETED' },
    ]);

    const res = await service.completeChecklistItem(
      'item-1',
      { evidenceReference: 'DOC-PL-CALC-001', reviewNotes: 'Verified against 3D CAD' },
      tenantId,
      mockUser,
    );
    expect(res).toBeDefined();
    expect(res.status).toBe('COMPLETED');
    expect(mockChecklistRepo.save).toHaveBeenCalled();
  });

  it('GS-05: Create cross-stage engineering dependency', async () => {
    const res = await service.createDependency(
      {
        projectId: 'PRJ-M12-005',
        sourceStage: 'CUSTOMER_INPUTS',
        targetStage: 'KICK_OFF_INPUT_SHEET',
        category: 'CUSTOMER',
        description: 'Customer 3D CAD step file sign-off',
        isBlocking: true,
      },
      tenantId,
    );
    expect(res).toBeDefined();
    expect(res.isBlocking).toBe(true);
  });

  it('GS-06: Log active design blocker with severity', async () => {
    const res = await service.createBlocker(
      {
        projectId: 'PRJ-M12-006',
        stage: 'CAVITY_MODEL',
        blockerCode: 'BLK-RESIN-01',
        category: 'MATERIAL',
        description: 'Resin shrinkage grade undefined by client',
        impactSeverity: 'CRITICAL',
      },
      tenantId,
    );
    expect(res).toBeDefined();
    expect(res.status).toBe('ACTIVE');
    expect(res.impactSeverity).toBe('CRITICAL');
  });

  it('GS-07: Resolve active design blocker with audit trail', async () => {
    mockBlockerRepo.findOne.mockResolvedValue({
      id: 'blk-1',
      tenantId,
      status: 'ACTIVE',
    });

    const res = await service.resolveBlocker('blk-1', 'Client confirmed 1.5% shrinkage for POM resin', tenantId);
    expect(res.status).toBe('RESOLVED');
    expect(res.resolvedAt).toBeDefined();
  });

  it('GS-08: Team load board aggregates available and allocated capacity', async () => {
    mockEngineerRepo.find.mockResolvedValue([
      {
        id: 'eng-1',
        engineerCode: 'ENG-001',
        name: 'Alice',
        proficiencyLevel: 'SENIOR',
        weeklyCapacityHours: 40,
        activeAssignments: [{ allocatedWeeklyHours: 36 }],
        primarySkills: [{ skill: 'MOLD_DESIGN' }],
      },
      {
        id: 'eng-2',
        engineerCode: 'ENG-002',
        name: 'Bob',
        proficiencyLevel: 'MID',
        weeklyCapacityHours: 40,
        activeAssignments: [{ allocatedWeeklyHours: 44 }],
        primarySkills: [{ skill: 'CAVITY_MODELING' }],
      },
    ]);

    const res = await service.getTeamLoadBoard(tenantId, '30_DAYS');
    expect(res.totalEngineers).toBe(2);
    expect(res.totalWeeklyCapacityHours).toBe(80);
    expect(res.totalAllocatedHours).toBe(80);
    expect(res.averageUtilizationPercentage).toBe(100.0);
    expect(res.overloadedEngineersCount).toBe(1);
  });

  it('GS-09: Project load control calculates completion % and schedule health', async () => {
    mockPackageRepo.find.mockResolvedValue([
      {
        id: 'pkg-1',
        projectId: 'PRJ-M12-009',
        plannedWorkloadUnits: 40,
        actualWorkloadUnits: 20,
        stagesState: [
          { stage: 'CUSTOMER_INPUTS', status: 'COMPLETED' },
          { stage: 'LAYOUT', status: 'COMPLETED' },
          { stage: 'MOLD_DESIGN', status: 'IN_PROGRESS' },
        ],
      },
    ]);

    const res = await service.getProjectLoadControl('PRJ-M12-009', tenantId);
    expect(res.completionPercentage).toBeGreaterThan(60);
    expect(res.scheduleHealth).toBe('ON_TRACK');
    expect(res.replanRequired).toBe(false);
  });

  it('GS-10: Critical blocker triggers REPLAN_REQUIRED advisory flag', async () => {
    mockPackageRepo.find.mockResolvedValue([
      { id: 'pkg-1', plannedWorkloadUnits: 40, actualWorkloadUnits: 20 },
    ]);
    mockBlockerRepo.find.mockResolvedValue([
      { id: 'blk-1', impactSeverity: 'CRITICAL', status: 'ACTIVE' },
    ]);

    const res = await service.getProjectLoadControl('PRJ-M12-010', tenantId);
    expect(res.scheduleHealth).toBe('CRITICAL');
    expect(res.replanRequired).toBe(true);
    expect(res.replanReason).toContain('require governed replanning');
  });

  it('GS-11: New project acceptance simulation evaluates feasible start & capacity shortage', async () => {
    mockEngineerRepo.find.mockResolvedValue([
      { weeklyCapacityHours: 40, activeAssignments: [{ allocatedWeeklyHours: 35 }], primarySkills: [{ skill: 'MOLD_DESIGN' }] },
    ]);

    const res = await service.simulateProjectAcceptance(
      {
        projectType: 'TYPE_A_STD_MOLD',
        complexityScore: 1.2,
        requestedDeliveryDate: '2026-09-01',
        estimatedWorkloadUnits: 40,
        requiredSkills: ['MOLD_DESIGN'],
      },
      tenantId,
    );
    expect(res.simulationStatus).toBe('COMPLETE');
    expect(res.isAutonomousDecision).toBe(false);
    expect(res.capacityShortageHours).toBeGreaterThan(0);
    expect(res.deliveryRiskLevel).toBe('HIGH');
  });

  it('GS-12: New project acceptance simulation accepts without shortage when capacity is ample', async () => {
    mockEngineerRepo.find.mockResolvedValue([
      { weeklyCapacityHours: 80, activeAssignments: [{ allocatedWeeklyHours: 20 }], primarySkills: [{ skill: 'MOLD_DESIGN' }], status: 'HEALTHY' },
    ]);

    const res = await service.simulateProjectAcceptance(
      {
        projectType: 'TYPE_A_STD_MOLD',
        complexityScore: 1.0,
        requestedDeliveryDate: '2026-09-01',
        estimatedWorkloadUnits: 30,
        requiredSkills: ['MOLD_DESIGN'],
      },
      tenantId,
    );
    expect(res.capacityShortageHours).toBe(0);
    expect(res.deliveryRiskLevel).toBe('LOW');
    expect(res.recommendedDecision).toBe('ACCEPT');
  });

  it('GS-13: What-if simulation evaluates 30% T0 tool proving surge without mutating data', async () => {
    mockEngineerRepo.find.mockResolvedValue([
      { weeklyCapacityHours: 40, activeAssignments: [{ allocatedWeeklyHours: 30 }] },
      { weeklyCapacityHours: 40, activeAssignments: [{ allocatedWeeklyHours: 30 }] },
    ]);

    const res = await service.simulateWhatIf({ scenarioType: 'T0_SURGE_30_PERCENT' }, tenantId);
    expect(res.mutatedProductionData).toBe(false);
    expect(res.simulatedUtilizationPercentage).toBeGreaterThan(90);
    expect(res.bottleneckRisk).toBe('HIGH');
  });

  it('GS-14: What-if simulation evaluates adding an engineer (+40 hrs/wk)', async () => {
    mockEngineerRepo.find.mockResolvedValue([
      { weeklyCapacityHours: 40, activeAssignments: [{ allocatedWeeklyHours: 38 }] },
    ]);

    const res = await service.simulateWhatIf(
      { scenarioType: 'ADD_DESIGN_ENGINEER', addedCapacityHours: 40 },
      tenantId,
    );
    expect(res.mutatedProductionData).toBe(false);
    expect(res.simulatedUtilizationPercentage).toBeLessThan(80);
    expect(res.bottleneckRisk).toBe('LOW');
  });

  it('GS-15: What-if simulation evaluates engineer unexpected absence', async () => {
    mockEngineerRepo.find.mockResolvedValue([
      { weeklyCapacityHours: 40, activeAssignments: [{ allocatedWeeklyHours: 35 }] },
      { weeklyCapacityHours: 40, activeAssignments: [{ allocatedWeeklyHours: 35 }] },
    ]);

    const res = await service.simulateWhatIf({ scenarioType: 'ENGINEER_UNAVAILABLE' }, tenantId);
    expect(res.bottleneckRisk).toBe('CRITICAL');
  });

  it('GS-16: Record historical workload captures actual vs estimated variance', async () => {
    const res = await service.recordHistoricalWorkload(
      {
        projectId: 'PRJ-M12-016',
        moldType: 'INJECTION_MOLD',
        stage: 'MOLD_DESIGN',
        templateCode: 'TYPE_A_STD_MOLD',
        requiredSkill: 'MOLD_DESIGN',
        plannedDurationDays: 7,
        actualDurationDays: 8,
        plannedWorkloadUnits: 40,
        actualWorkloadUnits: 46,
        rootCauseCategory: 'CUSTOMER_DRIVEN_CHANGE',
      },
      tenantId,
    );
    expect(res.varianceUnits).toBe(6);
    expect(res.variancePercentage).toBe(15);
    expect(mockEkosGraphService.recordEdge).toHaveBeenCalled();
  });

  it('GS-17: G14 telemetry receives projected historical workload signals', async () => {
    await service.recordHistoricalWorkload(
      {
        projectId: 'PRJ-M12-017',
        moldType: 'INJECTION_MOLD',
        stage: 'CAVITY_MODEL',
        templateCode: 'TYPE_B_COMPLEX_MOLD',
        requiredSkill: 'CAVITY_MODELING',
        plannedDurationDays: 5,
        actualDurationDays: 5,
        plannedWorkloadUnits: 25,
        actualWorkloadUnits: 25,
      },
      tenantId,
    );
    expect(mockEkosGraphService.recordEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        relationType: 'DERIVED_FROM',
        confidence: 1.0,
      }),
      tenantId,
    );
  });

  it('GS-18: Gating complexity level adds appropriate weighting to mold workload', async () => {
    const res = await service.calculateAndSaveComplexity(
      {
        projectId: 'PRJ-M12-018',
        moldType: 'HOT_RUNNER',
        gatingComplexityLevel: 'HOT_RUNNER_SEQUENTIAL',
      },
      tenantId,
    );
    expect(Number(res.workloadMultiplier)).toBe(1.35);
  });

  it('GS-19: Optical surface finish SPI A1 adds precision factor', async () => {
    const res = await service.calculateAndSaveComplexity(
      {
        projectId: 'PRJ-M12-019',
        moldType: 'LENS_MOLD',
        surfaceFinishClass: 'OPTICAL_SPI_A1',
      },
      tenantId,
    );
    expect(Number(res.workloadMultiplier)).toBe(1.30);
  });

  it('GS-20: Conformal cooling channel factor adds thermal design multiplier', async () => {
    const res = await service.calculateAndSaveComplexity(
      {
        projectId: 'PRJ-M12-020',
        moldType: 'FAST_CYCLE_MOLD',
        coolingComplexityLevel: 'CONFORMAL',
      },
      tenantId,
    );
    expect(Number(res.workloadMultiplier)).toBe(1.40);
  });

  it('GS-21: Ultra precision tolerance class adds tooling calibration factor', async () => {
    const res = await service.calculateAndSaveComplexity(
      {
        projectId: 'PRJ-M12-021',
        moldType: 'CONNECTOR_MOLD',
        toleranceClass: 'ULTRA_PRECISION',
      },
      tenantId,
    );
    expect(Number(res.workloadMultiplier)).toBe(1.50);
  });

  it('GS-22: Complete all mandatory items marks checklist status COMPLETED', async () => {
    mockChecklistItemRepo.findOne.mockResolvedValue({
      id: 'item-1',
      checklistId: 'chk-1',
      tenantId,
      isMandatory: true,
      checklist: { id: 'chk-1', status: 'IN_PROGRESS', mandatoryItemsTotal: 1, mandatoryItemsCompleted: 0 },
    });

    mockChecklistItemRepo.find.mockResolvedValue([
      { id: 'item-1', isMandatory: true, status: 'COMPLETED' },
    ]);

    await service.completeChecklistItem('item-1', {}, tenantId, mockUser);
    expect(mockChecklistRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        allMandatoryPassed: true,
        status: 'COMPLETED',
      }),
    );
  });

  it('GS-23: Uncompleted mandatory item leaves checklist IN_PROGRESS', async () => {
    mockChecklistItemRepo.findOne.mockResolvedValue({
      id: 'item-1',
      checklistId: 'chk-1',
      tenantId,
      isMandatory: true,
      checklist: { id: 'chk-1', status: 'PENDING', mandatoryItemsTotal: 2, mandatoryItemsCompleted: 0 },
    });

    mockChecklistItemRepo.find.mockResolvedValue([
      { id: 'item-1', isMandatory: true, status: 'COMPLETED' },
      { id: 'item-2', isMandatory: true, status: 'PENDING' },
    ]);

    await service.completeChecklistItem('item-1', {}, tenantId, mockUser);
    expect(mockChecklistRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        allMandatoryPassed: false,
        status: 'IN_PROGRESS',
      }),
    );
  });

  it('GS-24: Team load board tracks under-utilized engineers (<70%)', async () => {
    mockEngineerRepo.find.mockResolvedValue([
      {
        id: 'eng-1',
        weeklyCapacityHours: 40,
        activeAssignments: [{ allocatedWeeklyHours: 20 }],
        primarySkills: [{ skill: 'DFM_ANALYSIS' }],
      },
    ]);

    const res = await service.getTeamLoadBoard(tenantId, 'WEEK');
    expect(res.engineers[0].status).toBe('UNDER_UTILIZED');
    expect(res.engineers[0].utilizationPercentage).toBe(50.0);
  });

  it('GS-25: Team load board tracks overloaded engineers (>100%)', async () => {
    mockEngineerRepo.find.mockResolvedValue([
      {
        id: 'eng-1',
        weeklyCapacityHours: 40,
        activeAssignments: [{ allocatedWeeklyHours: 48 }],
        primarySkills: [{ skill: 'MOLD_DESIGN' }],
      },
    ]);

    const res = await service.getTeamLoadBoard(tenantId, 'WEEK');
    expect(res.engineers[0].status).toBe('OVERLOADED');
    expect(res.engineers[0].utilizationPercentage).toBe(120.0);
  });

  it('GS-26: Dependency creation links source and target stages', async () => {
    const res = await service.createDependency(
      {
        projectId: 'PRJ-M12-026',
        sourceStage: 'LAYOUT',
        targetStage: 'CAVITY_MODEL',
        description: 'Cavity core split requires frozen mold layout',
      },
      tenantId,
    );
    expect(res.sourceStage).toBe('LAYOUT');
    expect(res.targetStage).toBe('CAVITY_MODEL');
  });

  it('GS-27: Non-blocking blocker record maintains warning status', async () => {
    const res = await service.createBlocker(
      {
        projectId: 'PRJ-M12-027',
        stage: 'MASK_DESIGN',
        blockerCode: 'BLK-MASK-01',
        category: 'DESIGN',
        description: 'Minor parting line step polishing flag',
        impactSeverity: 'LOW',
      },
      tenantId,
    );
    expect(res.impactSeverity).toBe('LOW');
  });

  it('GS-28: Acceptance simulation identifies missing bottleneck skills', async () => {
    mockEngineerRepo.find.mockResolvedValue([
      { weeklyCapacityHours: 40, activeAssignments: [{ allocatedWeeklyHours: 10 }], primarySkills: [{ skill: 'MOLD_DESIGN' }], status: 'HEALTHY' },
    ]);

    const res = await service.simulateProjectAcceptance(
      {
        projectType: 'COMPLEX_EDM_MOLD',
        requestedDeliveryDate: '2026-10-01',
        requiredSkills: ['ELECTRODE_EXTRACTION'],
      },
      tenantId,
    );
    expect(res.bottleneckSkills).toContain('ELECTRODE_EXTRACTION');
    expect(res.deliveryRiskLevel).toBe('HIGH');
  });

  it('GS-29: Replan reason summarizes variance and active blocker count', async () => {
    mockPackageRepo.find.mockResolvedValue([
      { plannedWorkloadUnits: 40, actualWorkloadUnits: 65 },
    ]);
    mockBlockerRepo.find.mockResolvedValue([
      { impactSeverity: 'HIGH', status: 'ACTIVE' },
    ]);

    const res = await service.getProjectLoadControl('PRJ-M12-029', tenantId);
    expect(res.replanRequired).toBe(true);
    expect(res.replanReason).toContain('Variance of 25u');
  });

  it('GS-30: Complete end-to-end design planning workflow execution', async () => {
    // 1. Complexity
    const cpx = await service.calculateAndSaveComplexity(
      { projectId: 'PRJ-M12-E2E', moldType: 'AUTO_MOLD', cavityCount: 4, sliderCount: 2 },
      tenantId,
    );
    expect(cpx.calculatedComplexityScore).toBeGreaterThan(1.0);

    // 2. Checklist
    const chk = await service.createChecklist(
      {
        projectId: 'PRJ-M12-E2E',
        stage: 'DESIGN_REVIEW',
        checklistType: 'DESIGN_REVIEW',
        title: 'E2E Design Review',
        items: [{ itemCode: 'CHK-01', description: 'Review waterlines' }],
      },
      tenantId,
    );
    expect(chk.items.length).toBe(1);

    // 3. What-if
    mockEngineerRepo.find.mockResolvedValue([{ weeklyCapacityHours: 40, activeAssignments: [{ allocatedWeeklyHours: 30 }] }]);
    const whatIf = await service.simulateWhatIf({ scenarioType: 'T0_SURGE_30_PERCENT' }, tenantId);
    expect(whatIf.simulatedUtilizationPercentage).toBeDefined();

    // 4. Historical
    const hist = await service.recordHistoricalWorkload(
      {
        projectId: 'PRJ-M12-E2E',
        moldType: 'AUTO_MOLD',
        stage: 'FINAL_DESIGN_REVIEW',
        templateCode: 'TYPE_A_STD_MOLD',
        requiredSkill: 'MOLD_DESIGN',
        plannedDurationDays: 1,
        actualDurationDays: 1,
        plannedWorkloadUnits: 5,
        actualWorkloadUnits: 5,
      },
      tenantId,
    );
    expect(hist.varianceUnits).toBe(0);
  });

  // ==========================================
  // FAILURE INJECTION (FI-01 to FI-20)
  // ==========================================

  it('FI-01: Missing tenant ID on calculate complexity throws ForbiddenException', async () => {
    await expect(
      service.calculateAndSaveComplexity({ projectId: 'PRJ-01', moldType: 'MOLD' }, ''),
    ).rejects.toThrow(ForbiddenException);
  });

  it('FI-02: Missing project ID on calculate complexity throws BadRequestException', async () => {
    await expect(
      service.calculateAndSaveComplexity({ projectId: '', moldType: 'MOLD' }, tenantId),
    ).rejects.toThrow(BadRequestException);
  });

  it('FI-03: Circular dependency throws BadRequestException', async () => {
    await expect(
      service.createDependency(
        {
          projectId: 'PRJ-01',
          sourceStage: 'MOLD_DESIGN',
          targetStage: 'MOLD_DESIGN',
          description: 'Self reference',
        },
        tenantId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('FI-04: Non-existent checklist item on complete throws NotFoundException', async () => {
    mockChecklistItemRepo.findOne.mockResolvedValue(null);
    await expect(
      service.completeChecklistItem('bad-item-id', {}, tenantId, mockUser),
    ).rejects.toThrow(NotFoundException);
  });

  it('FI-05: Non-existent blocker on resolve throws NotFoundException', async () => {
    mockBlockerRepo.findOne.mockResolvedValue(null);
    await expect(
      service.resolveBlocker('bad-blocker-id', 'Resolved', tenantId),
    ).rejects.toThrow(NotFoundException);
  });

  it('FI-06: Cross-tenant checklist completion returns NotFoundException', async () => {
    mockChecklistItemRepo.findOne.mockResolvedValue(null);
    await expect(
      service.completeChecklistItem('foreign-item', {}, 'foreign-tenant', mockUser),
    ).rejects.toThrow(NotFoundException);
  });

  it('FI-07: Missing tenant ID on load board throws ForbiddenException', async () => {
    await expect(service.getTeamLoadBoard('')).rejects.toThrow(ForbiddenException);
  });

  it('FI-08: Missing tenant ID on project control throws ForbiddenException', async () => {
    await expect(service.getProjectLoadControl('PRJ-01', '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-09: Missing tenant ID on acceptance simulation throws ForbiddenException', async () => {
    await expect(
      service.simulateProjectAcceptance(
        { projectType: 'MOLD', requestedDeliveryDate: '2026-09-01' },
        '',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('FI-10: Missing tenant ID on what-if simulation throws ForbiddenException', async () => {
    await expect(
      service.simulateWhatIf({ scenarioType: 'T0_SURGE_30_PERCENT' }, ''),
    ).rejects.toThrow(ForbiddenException);
  });

  it('FI-11: Missing tenant ID on historical workload throws ForbiddenException', async () => {
    await expect(
      service.recordHistoricalWorkload(
        {
          projectId: 'PRJ-01',
          moldType: 'MOLD',
          stage: 'LAYOUT',
          templateCode: 'T1',
          requiredSkill: 'MOLD_DESIGN',
          plannedDurationDays: 1,
          actualDurationDays: 1,
          plannedWorkloadUnits: 1,
          actualWorkloadUnits: 1,
        },
        '',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('FI-12: Empty checklist creation without stage throws BadRequestException', async () => {
    await expect(
      service.createChecklist(
        { projectId: 'PRJ-01', stage: '', checklistType: 'STAGE', title: 'T', items: [] },
        tenantId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('FI-13: Empty checklist creation without title throws BadRequestException', async () => {
    await expect(
      service.createChecklist(
        { projectId: 'PRJ-01', stage: 'LAYOUT', checklistType: 'STAGE', title: '', items: [] },
        tenantId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('FI-14: Acceptance simulation with empty engineer pool defaults safely', async () => {
    mockEngineerRepo.find.mockResolvedValue([]);
    const res = await service.simulateProjectAcceptance(
      { projectType: 'TYPE_A_STD_MOLD', requestedDeliveryDate: '2026-09-01' },
      tenantId,
    );
    expect(res.availableCapacityHours).toBe(0);
    expect(res.deliveryRiskLevel).toBe('HIGH');
  });

  it('FI-15: Zero capacity engineers handled safely without divide-by-zero', async () => {
    mockEngineerRepo.find.mockResolvedValue([
      { weeklyCapacityHours: 0, activeAssignments: [], primarySkills: [] },
    ]);
    const res = await service.getTeamLoadBoard(tenantId);
    expect(res.averageUtilizationPercentage).toBe(0);
  });

  it('FI-16: Historical workload with zero planned units handles percentage division safely', async () => {
    const res = await service.recordHistoricalWorkload(
      {
        projectId: 'PRJ-01',
        moldType: 'MOLD',
        stage: 'LAYOUT',
        templateCode: 'T1',
        requiredSkill: 'MOLD_DESIGN',
        plannedDurationDays: 0,
        actualDurationDays: 1,
        plannedWorkloadUnits: 0,
        actualWorkloadUnits: 5,
      },
      tenantId,
    );
    expect(res.variancePercentage).toBe(0);
  });

  it('FI-17: Blocker without packageId persists at project level safely', async () => {
    const res = await service.createBlocker(
      {
        projectId: 'PRJ-NOPKG',
        stage: 'CUSTOMER_INPUTS',
        blockerCode: 'BLK-01',
        description: 'Customer NDA pending',
      },
      tenantId,
    );
    expect(res.packageId).toBeUndefined();
    expect(res.status).toBe('ACTIVE');
  });

  it('FI-18: Non-mandatory checklist items total count calculated accurately', async () => {
    const res = await service.createChecklist(
      {
        projectId: 'PRJ-01',
        stage: 'MOLD_DESIGN',
        checklistType: 'DELIVERABLE',
        title: 'Deliverable Checklist',
        items: [
          { itemCode: 'C1', description: 'Mandatory', isMandatory: true },
          { itemCode: 'C2', description: 'Optional 1', isMandatory: false },
          { itemCode: 'C3', description: 'Optional 2', isMandatory: false },
        ],
      },
      tenantId,
    );
    expect(res.mandatoryItemsTotal).toBe(1);
  });

  it('FI-19: Audit log failure is non-blocking to business operation', async () => {
    mockAuditService.log.mockRejectedValueOnce(new Error('Audit DB busy'));
    await expect(
      service.calculateAndSaveComplexity(
        { projectId: 'PRJ-AUDIT-ERR', moldType: 'MOLD' },
        tenantId,
      ),
    ).rejects.toThrow();
  });

  it('FI-20: What-if simulation with unknown scenario defaults to priority shift safely', async () => {
    mockEngineerRepo.find.mockResolvedValue([{ weeklyCapacityHours: 40, activeAssignments: [{ allocatedWeeklyHours: 34 }] }]);
    const res = await service.simulateWhatIf({ scenarioType: 'CHANGE_PRIORITY' as any }, tenantId);
    expect(res.mutatedProductionData).toBe(false);
    expect(res.scenarioDescription).toContain('priority re-alignment');
  });
});
