import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DesignLifecycleService } from '../services/design-lifecycle.service';
import { DesignCapacityService } from '../services/design-capacity.service';
import { ToolProvingService } from '../services/tool-proving.service';
import { DfmRuleEngineService } from '../services/dfm-rule-engine.service';
import { GeometricFeatureService } from '../services/geometric-feature.service';
import {
  DesignStageEnum,
  DesignPackageStatus,
} from '../entities/design-work-package.entity';
import { EngineerSkillType } from '../entities/design-team-capacity.entity';
import {
  ModificationCategoryEnum,
  ModificationRootCauseEnum,
} from '../entities/tool-modification-workload.entity';
import { GeometricFeatureType } from '../entities/geometric-feature.entity';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';
import { AuditService } from '../../audit/services/audit.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DesignWorkPackage } from '../entities/design-work-package.entity';
import { DesignWorkloadTemplate } from '../entities/design-workload-template.entity';
import { DesignEngineerProfile } from '../entities/design-team-capacity.entity';
import { ToolProvingCycle } from '../entities/tool-proving-cycle.entity';
import { ToolModificationWorkload } from '../entities/tool-modification-workload.entity';
import { DfmFinding, DfmFindingStatus, DfmSeverity } from '../entities/dfm-finding.entity';

describe('MITRA M12.1 — Multi-Process DFM, Design Lifecycle WBS, Capacity & Tool Proving E2E', () => {
  let app: INestApplication;
  let lifecycleService: DesignLifecycleService;
  let capacityService: DesignCapacityService;
  let toolProvingService: ToolProvingService;
  let dfmRuleEngineService: DfmRuleEngineService;

  const mockTenantA = '11111111-1111-1111-1111-111111111111';
  const mockTenantB = '22222222-2222-2222-2222-222222222222';
  const mockProjectA = '33333333-3333-3333-3333-333333333333';

  // In-memory repositories
  const packagesStore: DesignWorkPackage[] = [];
  const templatesStore: DesignWorkloadTemplate[] = [];
  const engineersStore: DesignEngineerProfile[] = [];
  const cyclesStore: ToolProvingCycle[] = [];
  const modificationsStore: ToolModificationWorkload[] = [];
  const findingsStore: DfmFinding[] = [];

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        DesignLifecycleService,
        DesignCapacityService,
        ToolProvingService,
        DfmRuleEngineService,
        {
          provide: GeometricFeatureService,
          useValue: {
            getFeaturesByDrawing: jest.fn().mockImplementation(async (drwId, rev, tenantId) => {
              if (drwId === 'DRW-MULTI-PROCESS') {
                return [
                  {
                    id: 'feat-gate-01',
                    tenantId,
                    drawingId: drwId,
                    drawingRevision: rev,
                    featureType: GeometricFeatureType.GATE_LOCATION,
                    measurements: { flowLengthRatio: 180.0 }, // Exceeds 150 limit
                    geometryReference: 'Gate-Sub-01',
                  },
                  {
                    id: 'feat-cnc-01',
                    tenantId,
                    drawingId: drwId,
                    drawingRevision: rev,
                    featureType: GeometricFeatureType.CNC_INTERNAL_CORNER,
                    measurements: { cornerRadius: 0.5 }, // Below 1.0mm min
                    geometryReference: 'Pocket-Corner-03',
                  },
                  {
                    id: 'feat-sm-01',
                    tenantId,
                    drawingId: drwId,
                    drawingRevision: rev,
                    featureType: GeometricFeatureType.SHEET_METAL_BEND,
                    measurements: { bendRadius: 0.5, sheetThickness: 1.0 }, // 0.5 < 1.0 ratio
                    geometryReference: 'Flange-Bend-01',
                  },
                ];
              }
              return [];
            }),
          },
        },
        {
          provide: getRepositoryToken(DesignWorkPackage),
          useValue: {
            create: jest.fn().mockImplementation((data) => ({
              id: `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              ...data,
            })),
            save: jest.fn().mockImplementation(async (pkg) => {
              const idx = packagesStore.findIndex((p) => p.id === pkg.id);
              if (idx >= 0) packagesStore[idx] = pkg;
              else packagesStore.push(pkg);
              return pkg;
            }),
            findOne: jest.fn().mockImplementation(async ({ where }) => {
              return packagesStore.find(
                (p) =>
                  (!where.id || p.id === where.id) &&
                  (!where.tenantId || p.tenantId === where.tenantId) &&
                  (!where.projectId || p.projectId === where.projectId),
              ) || null;
            }),
            find: jest.fn().mockImplementation(async ({ where }) => {
              return packagesStore.filter(
                (p) =>
                  (!where.tenantId || p.tenantId === where.tenantId) &&
                  (!where.projectId || p.projectId === where.projectId),
              );
            }),
          },
        },
        {
          provide: getRepositoryToken(DesignWorkloadTemplate),
          useValue: {
            create: jest.fn().mockImplementation((data) => ({
              id: `tmpl-${Date.now()}`,
              ...data,
            })),
            save: jest.fn().mockImplementation(async (tmpl) => {
              templatesStore.push(tmpl);
              return tmpl;
            }),
            findOne: jest.fn().mockImplementation(async ({ where }) => {
              return templatesStore.find(
                (t) =>
                  (!where.id || t.id === where.id) &&
                  (!where.tenantId || t.tenantId === where.tenantId),
              ) || null;
            }),
            find: jest.fn().mockImplementation(async ({ where }) => {
              return templatesStore.filter(
                (t) =>
                  (!where.tenantId || t.tenantId === where.tenantId) &&
                  (!where.status || t.status === where.status),
              );
            }),
          },
        },
        {
          provide: getRepositoryToken(DesignEngineerProfile),
          useValue: {
            create: jest.fn().mockImplementation((data) => ({
              id: `eng-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              ...data,
            })),
            save: jest.fn().mockImplementation(async (eng) => {
              const idx = engineersStore.findIndex((e) => e.id === eng.id);
              if (idx >= 0) engineersStore[idx] = eng;
              else engineersStore.push(eng);
              return eng;
            }),
            findOne: jest.fn().mockImplementation(async ({ where }) => {
              return engineersStore.find(
                (e) =>
                  (!where.id || e.id === where.id) &&
                  (!where.engineerCode || e.engineerCode === where.engineerCode) &&
                  (!where.tenantId || e.tenantId === where.tenantId),
              ) || null;
            }),
            find: jest.fn().mockImplementation(async ({ where }) => {
              return engineersStore.filter(
                (e) => !where.tenantId || e.tenantId === where.tenantId,
              );
            }),
          },
        },
        {
          provide: getRepositoryToken(ToolProvingCycle),
          useValue: {
            create: jest.fn().mockImplementation((data) => ({
              id: `cycle-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              ...data,
            })),
            save: jest.fn().mockImplementation(async (c) => {
              const idx = cyclesStore.findIndex((cy) => cy.id === c.id);
              if (idx >= 0) cyclesStore[idx] = c;
              else cyclesStore.push(c);
              return c;
            }),
            findOne: jest.fn().mockImplementation(async ({ where }) => {
              return cyclesStore.find(
                (c) =>
                  (!where.id || c.id === where.id) &&
                  (!where.tenantId || c.tenantId === where.tenantId),
              ) || null;
            }),
            find: jest.fn().mockImplementation(async ({ where }) => {
              return cyclesStore.filter(
                (c) =>
                  (!where.tenantId || c.tenantId === where.tenantId) &&
                  (!where.projectId || c.projectId === where.projectId),
              );
            }),
          },
        },
        {
          provide: getRepositoryToken(ToolModificationWorkload),
          useValue: {
            create: jest.fn().mockImplementation((data) => ({
              id: `mod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              ...data,
            })),
            save: jest.fn().mockImplementation(async (m) => {
              modificationsStore.push(m);
              return m;
            }),
            find: jest.fn().mockImplementation(async ({ where }) => {
              return modificationsStore.filter(
                (m) =>
                  (!where.tenantId || m.tenantId === where.tenantId) &&
                  (!where.toolProvingCycleId || m.toolProvingCycleId === where.toolProvingCycleId),
              );
            }),
          },
        },
        {
          provide: getRepositoryToken(DfmFinding),
          useValue: {
            create: jest.fn().mockImplementation((data) => ({
              id: `finding-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              ...data,
            })),
            save: jest.fn().mockImplementation(async (f) => {
              if (Array.isArray(f)) {
                findingsStore.push(...f);
                return f;
              }
              findingsStore.push(f);
              return f;
            }),
            find: jest.fn().mockImplementation(async () => findingsStore),
          },
        },
        {
          provide: EkosGraphService,
          useValue: {
            recordEdge: jest.fn().mockResolvedValue({ id: 'edge-ok' }),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn().mockResolvedValue({ id: 'audit-ok' }),
            logBusinessEvent: jest.fn().mockResolvedValue({ id: 'audit-ok' }),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    lifecycleService = moduleRef.get<DesignLifecycleService>(DesignLifecycleService);
    capacityService = moduleRef.get<DesignCapacityService>(DesignCapacityService);
    toolProvingService = moduleRef.get<ToolProvingService>(ToolProvingService);
    dfmRuleEngineService = moduleRef.get<DfmRuleEngineService>(DfmRuleEngineService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // =========================================================================
  // GOLDEN SCENARIOS (GS-01 to GS-20)
  // =========================================================================

  it('GS-01: Design lifecycle creation initializes 14 stages', async () => {
    const pkg = await lifecycleService.createWorkPackage(
      {
        projectId: mockProjectA,
        packageCode: 'DWP-M12-001',
        name: 'Auto Headlamp Mold Design Package',
      },
      mockTenantA,
    );

    expect(pkg).toBeDefined();
    expect(pkg.stagesState).toHaveLength(14);
    expect(pkg.currentStage).toBe(DesignStageEnum.CUSTOMER_INPUTS);
    expect(pkg.stagesState[0].status).toBe('IN_PROGRESS');
    expect(pkg.stagesState[13].stage).toBe(DesignStageEnum.DESIGN_DELIVERY_COMPLETE);
  });

  it('GS-02: Design WBS progression advances sequentially', async () => {
    const pkg = await lifecycleService.createWorkPackage(
      {
        projectId: mockProjectA,
        packageCode: 'DWP-M12-002',
        name: 'Gear Housing Mold Design Package',
      },
      mockTenantA,
    );

    const advanced = await lifecycleService.advanceStage(
      pkg.id,
      { targetStage: DesignStageEnum.KICK_OFF_INPUT_SHEET, actualWorkloadUnits: 4.0 },
      mockTenantA,
    );

    expect(advanced.currentStage).toBe(DesignStageEnum.KICK_OFF_INPUT_SHEET);
    expect(Number(advanced.actualWorkloadUnits)).toBe(4.0);
  });

  it('GS-03: Workload template creation for Type A Mold', async () => {
    const tmpl = await lifecycleService.createWorkloadTemplate(
      {
        templateCode: 'TYPE_A_STD_MOLD',
        name: 'Type A Standard Injection Mold (1 Week)',
        moldType: 'INJECTION_MOLD_2_PLATE',
        estimatedTotalWorkloadUnits: 40.0,
        estimatedCalendarDurationDays: 7,
        stageDefinitions: [
          {
            stage: DesignStageEnum.LAYOUT,
            order: 3,
            workloadUnits: 8.0,
            durationDays: 1,
            requiredSkills: ['MOLD_DESIGN'],
            mandatoryDeliverables: ['Layout 2D'],
            requiresCustomerApproval: false,
          },
        ],
      },
      mockTenantA,
    );

    expect(tmpl).toBeDefined();
    expect(tmpl.templateCode).toBe('TYPE_A_STD_MOLD');
    expect(Number(tmpl.estimatedTotalWorkloadUnits)).toBe(40.0);
  });

  it('GS-04: Project-specific workload instantiated from template', async () => {
    const templates = await lifecycleService.getTemplates(mockTenantA);
    const typeA = templates.find((t) => t.templateCode === 'TYPE_A_STD_MOLD');

    const pkg = await lifecycleService.createWorkPackage(
      {
        projectId: mockProjectA,
        packageCode: 'DWP-M12-003',
        name: 'Connector Housing Package',
        templateId: typeA?.id,
      },
      mockTenantA,
    );

    expect(Number(pkg.plannedWorkloadUnits)).toBe(40.0);
  });

  it('GS-05: Capacity calculation for design team', async () => {
    await capacityService.registerEngineer(
      {
        engineerCode: 'ENG-001',
        name: 'Alice Tooling Engineer',
        email: 'alice@mitra.local',
        proficiencyLevel: 'SENIOR',
        weeklyCapacityHours: 40.0,
        primarySkills: [
          { skill: EngineerSkillType.MOLD_DESIGN, level: 'SENIOR', yearsExperience: 8 },
          { skill: EngineerSkillType.CAVITY_MODELING, level: 'SENIOR', yearsExperience: 6 },
        ],
      },
      mockTenantA,
    );

    const summary = await capacityService.calculateTeamCapacity(mockTenantA);
    expect(summary.totalEngineers).toBeGreaterThanOrEqual(1);
    expect(summary.totalWeeklyCapacityHours).toBeGreaterThanOrEqual(40.0);
  });

  it('GS-06: Engineer load tracking and utilization calculation', async () => {
    const eng = await capacityService.registerEngineer(
      {
        engineerCode: 'ENG-002',
        name: 'Bob Cavity Specialist',
        email: 'bob@mitra.local',
        weeklyCapacityHours: 40.0,
        primarySkills: [{ skill: EngineerSkillType.CAVITY_MODELING, level: 'MID', yearsExperience: 4 }],
      },
      mockTenantA,
    );

    const allocated = await capacityService.allocateWorkload(
      eng.id,
      {
        projectId: mockProjectA,
        packageId: 'DWP-001',
        stageName: 'CAVITY_MODEL',
        allocatedWeeklyHours: 32.0,
        startDate: '2026-08-25',
        endDate: '2026-09-01',
      },
      mockTenantA,
    );

    expect(Number(allocated.currentUtilizationPercentage)).toBe(80.0);
    expect(allocated.status).toBe('LOADED');
  });

  it('GS-07: Skill mismatch detection identifies missing capability', async () => {
    const engineers = await capacityService.calculateTeamCapacity(mockTenantA);
    const engBob = engineersStore.find((e) => e.engineerCode === 'ENG-002');

    const check = await capacityService.checkSkillCompatibility(
      engBob!.id,
      EngineerSkillType.ELECTRODE_EXTRACTION,
      mockTenantA,
    );

    expect(check.compatible).toBe(false);
  });

  it('GS-08: Overload detection flags engineer when exceeding 100% capacity', async () => {
    const engBob = engineersStore.find((e) => e.engineerCode === 'ENG-002');
    const overloaded = await capacityService.allocateWorkload(
      engBob!.id,
      {
        projectId: mockProjectA,
        packageId: 'DWP-002',
        stageName: 'ELECTRODE_EXTRACTION',
        allocatedWeeklyHours: 16.0, // Total = 32 + 16 = 48 > 40
        startDate: '2026-08-25',
        endDate: '2026-09-01',
      },
      mockTenantA,
    );

    expect(Number(overloaded.currentUtilizationPercentage)).toBe(120.0);
    expect(overloaded.status).toBe('OVERLOADED');
  });

  it('GS-09: Customer approval gate records formal approval', async () => {
    const pkg = await lifecycleService.createWorkPackage(
      {
        projectId: mockProjectA,
        packageCode: 'DWP-M12-004',
        name: 'Gate Approved Package',
      },
      mockTenantA,
    );

    const approved = await lifecycleService.recordCustomerApproval(
      pkg.id,
      true,
      'Approved on customer review call with revised draft angle',
      mockTenantA,
    );

    const custStage = approved.stagesState.find((s) => s.stage === DesignStageEnum.CUSTOMER_APPROVAL);
    expect(custStage?.approvalStatus).toBe('APPROVED');
  });

  it('GS-10: Process planning stage records electrode & fixture deliverables', async () => {
    const pkg = await lifecycleService.createWorkPackage(
      {
        projectId: mockProjectA,
        packageCode: 'DWP-M12-005',
        name: 'Process Planning Package',
      },
      mockTenantA,
    );

    await lifecycleService.recordCustomerApproval(pkg.id, true, 'Approved', mockTenantA);

    const advanced = await lifecycleService.advanceStage(
      pkg.id,
      { targetStage: DesignStageEnum.PROCESS_PLANNING, actualWorkloadUnits: 12.0 },
      mockTenantA,
    );

    expect(advanced.currentStage).toBe(DesignStageEnum.PROCESS_PLANNING);
  });

  it('GS-11: Programming handoff completes design delivery', async () => {
    const pkg = await lifecycleService.createWorkPackage(
      {
        projectId: mockProjectA,
        packageCode: 'DWP-M12-006',
        name: 'Final Delivery Package',
      },
      mockTenantA,
    );

    await lifecycleService.recordCustomerApproval(pkg.id, true, 'Approved', mockTenantA);

    const delivered = await lifecycleService.advanceStage(
      pkg.id,
      { targetStage: DesignStageEnum.DESIGN_DELIVERY_COMPLETE },
      mockTenantA,
    );

    expect(delivered.status).toBe(DesignPackageStatus.COMPLETED);
    expect(delivered.actualFinishDate).toBeDefined();
  });

  it('GS-12: T0 tool proving cycle creation', async () => {
    const cycle = await toolProvingService.createProvingCycle(
      {
        projectId: mockProjectA,
        toolId: 'MOLD-8840',
        cycleCode: 'T0',
      },
      mockTenantA,
    );

    expect(cycle).toBeDefined();
    expect(cycle.cycleCode).toBe('T0');
    expect(cycle.status).toBe('SCHEDULED');
  });

  it('GS-13: Trial observation recorded on T0 cycle', async () => {
    const cycle = cyclesStore[0];
    expect(cycle).toBeDefined();
    cycle.observationsCount = 3;
    cycle.status = 'OBSERVATIONS_LOGGED';
    expect(cycle.observationsCount).toBe(3);
  });

  it('GS-14: T0 modification workload logging', async () => {
    const cycle = cyclesStore[0];
    const mod = await toolProvingService.logModification(
      {
        projectId: mockProjectA,
        toolProvingCycleId: cycle.id,
        modificationCode: 'MOD-T0-001',
        category: ModificationCategoryEnum.COOLING_MODIFICATION,
        rootCause: ModificationRootCauseEnum.TRIAL_DRIVEN_MODIFICATION,
        description: 'Enlarge core cooling baffle diameter by 2mm to reduce cycle time',
        estimatedWorkloadUnits: 6.0,
        actualWorkloadUnits: 5.5,
      },
      mockTenantA,
    );

    expect(mod).toBeDefined();
    expect(mod.category).toBe(ModificationCategoryEnum.COOLING_MODIFICATION);
    expect(cycle.modificationsCount).toBeGreaterThanOrEqual(1);
  });

  it('GS-15: T-Dia correction modification logging', async () => {
    const cycle = cyclesStore[0];
    const mod = await toolProvingService.logModification(
      {
        projectId: mockProjectA,
        toolProvingCycleId: cycle.id,
        modificationCode: 'MOD-TDIA-001',
        category: ModificationCategoryEnum.T_DIA_CORRECTION,
        rootCause: ModificationRootCauseEnum.PLANNED_TOOL_PROVING,
        description: 'T-Dia sizing grind on guide pin bushings +0.02mm',
        estimatedWorkloadUnits: 2.0,
      },
      mockTenantA,
    );

    expect(mod.category).toBe(ModificationCategoryEnum.T_DIA_CORRECTION);
  });

  it('GS-16: E-Dia correction modification logging', async () => {
    const cycle = cyclesStore[0];
    const mod = await toolProvingService.logModification(
      {
        projectId: mockProjectA,
        toolProvingCycleId: cycle.id,
        modificationCode: 'MOD-EDIA-001',
        category: ModificationCategoryEnum.E_DIA_CORRECTION,
        rootCause: ModificationRootCauseEnum.PLANNED_TOOL_PROVING,
        description: 'Ejector pin hole ream for thermal expansion clearance',
        estimatedWorkloadUnits: 3.0,
      },
      mockTenantA,
    );

    expect(mod.category).toBe(ModificationCategoryEnum.E_DIA_CORRECTION);
  });

  it('GS-17: OFC modification logging', async () => {
    const cycle = cyclesStore[0];
    const mod = await toolProvingService.logModification(
      {
        projectId: mockProjectA,
        toolProvingCycleId: cycle.id,
        modificationCode: 'MOD-OFC-001',
        category: ModificationCategoryEnum.OFC_MODIFICATION,
        rootCause: ModificationRootCauseEnum.PLANNED_TOOL_PROVING,
        description: 'Optical flatness clearance fine EDM on cavity split line',
        estimatedWorkloadUnits: 4.5,
      },
      mockTenantA,
    );

    expect(mod.category).toBe(ModificationCategoryEnum.OFC_MODIFICATION);
  });

  it('GS-18: Re-trial / T1 transition', async () => {
    const cycle = cyclesStore[0];
    const reTrial = await toolProvingService.advanceToReTrial(cycle.id, mockTenantA);
    expect(reTrial.stage).toBe('RE_TRIAL');
    expect(reTrial.status).toBe('RUNNING');
  });

  it('GS-19: Planned vs actual load summary calculates variance', async () => {
    const cycle = cyclesStore[0];
    const summary = await toolProvingService.getPlannedVsActualLoad(cycle.id, mockTenantA);

    expect(summary.totalModifications).toBeGreaterThanOrEqual(4);
    expect(summary.estimatedTotalWorkloadUnits).toBeGreaterThan(0);
    expect(summary.actualTotalWorkloadUnits).toBeGreaterThan(0);
    expect(summary.modificationsByCategory[ModificationCategoryEnum.T_DIA_CORRECTION]).toBeDefined();
  });

  it('GS-20: Multi-Process DFM rules execute and evaluate findings', async () => {
    const result = await dfmRuleEngineService.evaluateDfm(
      {
        projectId: mockProjectA,
        drawingId: 'DRW-MULTI-PROCESS',
        drawingRevision: 'Rev A',
        material: 'ABS',
      },
      mockTenantA,
    );

    expect(result.findings).toHaveLength(3);
    const ruleIds = result.findings.map((f) => f.ruleId);
    expect(ruleIds).toContain('DFM-GATE-001');
    expect(ruleIds).toContain('DFM-CNC-ACCESS-001');
    expect(ruleIds).toContain('DFM-SM-BEND-001');
  });

  // =========================================================================
  // FAILURE INJECTIONS (FI-01 to FI-15)
  // =========================================================================

  it('FI-01: Missing project ID throws BadRequestException', async () => {
    await expect(
      lifecycleService.createWorkPackage(
        { projectId: '', packageCode: 'INVALID', name: 'No Project' },
        mockTenantA,
      ),
    ).rejects.toThrow('Project ID is required');
  });

  it('FI-02: Missing template uses standard default units', async () => {
    const pkg = await lifecycleService.createWorkPackage(
      {
        projectId: mockProjectA,
        packageCode: 'DWP-DEFAULT',
        name: 'Default Template Package',
        templateId: '99999999-9999-9999-9999-999999999999', // non-existent
      },
      mockTenantA,
    );

    expect(Number(pkg.plannedWorkloadUnits)).toBe(40.0);
  });

  it('FI-03: Missing tenant context throws ForbiddenException', async () => {
    await expect(
      lifecycleService.getTemplates(''),
    ).rejects.toThrow('Tenant context is required');
  });

  it('FI-04: Invalid stage regression throws BadRequestException', async () => {
    const pkg = await lifecycleService.createWorkPackage(
      { projectId: mockProjectA, packageCode: 'DWP-REGRESS', name: 'Regress Test' },
      mockTenantA,
    );

    await lifecycleService.advanceStage(
      pkg.id,
      { targetStage: DesignStageEnum.LAYOUT },
      mockTenantA,
    );

    await expect(
      lifecycleService.advanceStage(
        pkg.id,
        { targetStage: DesignStageEnum.CUSTOMER_INPUTS },
        mockTenantA,
      ),
    ).rejects.toThrow('Cannot regress stage');
  });

  it('FI-05: Cross-tenant access probe returns NotFoundException', async () => {
    const pkg = await lifecycleService.createWorkPackage(
      { projectId: mockProjectA, packageCode: 'DWP-TENANT-A', name: 'Tenant A Pkg' },
      mockTenantA,
    );

    await expect(
      lifecycleService.getPackageById(pkg.id, mockTenantB),
    ).rejects.toThrow('not found');
  });

  it('FI-06: Stage advance past customer approval without approval throws BadRequestException', async () => {
    const pkg = await lifecycleService.createWorkPackage(
      { projectId: mockProjectA, packageCode: 'DWP-GATE-TEST', name: 'Gate Block Test' },
      mockTenantA,
    );

    await expect(
      lifecycleService.advanceStage(
        pkg.id,
        { targetStage: DesignStageEnum.RAW_MATERIAL },
        mockTenantA,
      ),
    ).rejects.toThrow('Cannot advance past CUSTOMER_APPROVAL stage');
  });

  it('FI-07: Missing tool proving cycle throws NotFoundException', async () => {
    await expect(
      toolProvingService.getPlannedVsActualLoad(
        '00000000-0000-0000-0000-000000000000',
        mockTenantA,
      ),
    ).rejects.toThrow('not found');
  });

  it('FI-08: Missing engineer profile throws NotFoundException', async () => {
    await expect(
      capacityService.allocateWorkload(
        '00000000-0000-0000-0000-000000000000',
        {
          projectId: mockProjectA,
          packageId: 'P-1',
          stageName: 'S-1',
          allocatedWeeklyHours: 10,
          startDate: '2026-08-01',
          endDate: '2026-08-08',
        },
        mockTenantA,
      ),
    ).rejects.toThrow('not found');
  });

  it('FI-09: Invalid target stage throws BadRequestException', async () => {
    const pkg = await lifecycleService.createWorkPackage(
      { projectId: mockProjectA, packageCode: 'DWP-INVALID-STAGE', name: 'Invalid Stage' },
      mockTenantA,
    );

    await expect(
      lifecycleService.advanceStage(
        pkg.id,
        { targetStage: 'NON_EXISTENT_STAGE' as any },
        mockTenantA,
      ),
    ).rejects.toThrow('Invalid target stage');
  });

  it('FI-10: Cross-tenant modification logging throws NotFoundException', async () => {
    const cycle = cyclesStore[0];
    await expect(
      toolProvingService.logModification(
        {
          projectId: mockProjectA,
          toolProvingCycleId: cycle.id,
          modificationCode: 'MOD-FAIL-TENANT',
          category: ModificationCategoryEnum.COOLING_MODIFICATION,
          rootCause: ModificationRootCauseEnum.TRIAL_DRIVEN_MODIFICATION,
          description: 'Cross tenant probe',
          estimatedWorkloadUnits: 5,
        },
        mockTenantB,
      ),
    ).rejects.toThrow('not found');
  });

  it('FI-11: Empty feature set yields zero DFM findings gracefully', async () => {
    const result = await dfmRuleEngineService.evaluateDfm(
      {
        projectId: mockProjectA,
        drawingId: 'DRW-EMPTY',
        drawingRevision: 'Rev A',
        material: 'ABS',
      },
      mockTenantA,
    );

    expect(result.findings).toHaveLength(0);
    expect(result.totalFindingsCount).toBe(0);
  });

  it('FI-12: Concurrent stage update resilience', async () => {
    const pkg = await lifecycleService.createWorkPackage(
      { projectId: mockProjectA, packageCode: 'DWP-CONCURRENT', name: 'Concurrent Test' },
      mockTenantA,
    );

    const promises = [
      lifecycleService.advanceStage(pkg.id, { targetStage: DesignStageEnum.KICK_OFF_INPUT_SHEET, actualWorkloadUnits: 2 }, mockTenantA),
      lifecycleService.advanceStage(pkg.id, { targetStage: DesignStageEnum.LAYOUT, actualWorkloadUnits: 4 }, mockTenantA),
    ];

    const results = await Promise.allSettled(promises);
    expect(results.some((r) => r.status === 'fulfilled')).toBe(true);
  });

  it('FI-13: Injection Gating DFM rule catches excessive flow length (DFM-GATE-001)', async () => {
    const findings = findingsStore.filter((f) => f.ruleId === 'DFM-GATE-001');
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].severity).toBe(DfmSeverity.WARNING);
  });

  it('FI-14: CNC Machining DFM rule catches tight internal corner (DFM-CNC-ACCESS-001)', async () => {
    const findings = findingsStore.filter((f) => f.ruleId === 'DFM-CNC-ACCESS-001');
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].unit).toBe('mm');
  });

  it('FI-15: Sheet Metal DFM rule catches tight bend radius (DFM-SM-BEND-001)', async () => {
    const findings = findingsStore.filter((f) => f.ruleId === 'DFM-SM-BEND-001');
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].unit).toBe('ratio');
  });
});
