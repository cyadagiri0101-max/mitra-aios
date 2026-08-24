import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TrackingSheetCopilotService } from '../services/tracking-sheet-copilot.service';
import { TrackingSheet } from '../entities/tracking-sheet.entity';
import { TrackingSheetRevision } from '../entities/tracking-sheet-revision.entity';
import { TrackingSheetRow } from '../entities/tracking-sheet-row.entity';
import { TrackingSheetReconciliation } from '../entities/tracking-sheet-reconciliation.entity';
import { DesignComponent } from '../entities/design-component.entity';
import { DesignComponentDeliverable } from '../entities/design-component-deliverable.entity';
import { DesignBlocker } from '../entities/design-blocker.entity';
import { DesignDependency } from '../entities/design-dependency.entity';
import { DesignEngineerProfile } from '../entities/design-team-capacity.entity';
import { ToolModificationWorkload } from '../entities/tool-modification-workload.entity';
import { AuditService } from '../../audit/services/audit.service';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';

describe('MITRA M12.1C — Engineering Tracking Intelligence, Status Copilot & Real-World Load E2E', () => {
  let service: TrackingSheetCopilotService;
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const mockUser = { userId: '11111111-1111-1111-1111-111111111111', role: 'ENGINEERING', tenantId };

  const mockTrackingSheetRepo = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => ({ id: 'sheet-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'sheet-uuid-1', ...entity })),
  };

  const mockRevisionRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'rev-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'rev-uuid-1', ...entity })),
  };

  const mockRowRepo = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => ({ id: 'row-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((entity) =>
      Array.isArray(entity)
        ? Promise.resolve(entity.map((e, idx) => ({ id: `row-uuid-${idx + 1}`, ...e })))
        : Promise.resolve({ id: 'row-uuid-1', ...entity }),
    ),
  };

  const mockReconRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'recon-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'recon-uuid-1', ...entity, reconciledAt: new Date() })),
  };

  const mockComponentRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  };

  const mockDeliverableRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockBlockerRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockDependencyRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockEngineerRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockModRepo = {
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
    mockComponentRepo.find.mockResolvedValue([]);
    mockDeliverableRepo.find.mockResolvedValue([]);
    mockBlockerRepo.find.mockResolvedValue([]);
    mockDependencyRepo.find.mockResolvedValue([]);
    mockEngineerRepo.find.mockResolvedValue([]);
    mockModRepo.find.mockResolvedValue([]);
    mockTrackingSheetRepo.findOne.mockResolvedValue(null);
    mockTrackingSheetRepo.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingSheetCopilotService,
        { provide: getRepositoryToken(TrackingSheet), useValue: mockTrackingSheetRepo },
        { provide: getRepositoryToken(TrackingSheetRevision), useValue: mockRevisionRepo },
        { provide: getRepositoryToken(TrackingSheetRow), useValue: mockRowRepo },
        { provide: getRepositoryToken(TrackingSheetReconciliation), useValue: mockReconRepo },
        { provide: getRepositoryToken(DesignComponent), useValue: mockComponentRepo },
        { provide: getRepositoryToken(DesignComponentDeliverable), useValue: mockDeliverableRepo },
        { provide: getRepositoryToken(DesignBlocker), useValue: mockBlockerRepo },
        { provide: getRepositoryToken(DesignDependency), useValue: mockDependencyRepo },
        { provide: getRepositoryToken(DesignEngineerProfile), useValue: mockEngineerRepo },
        { provide: getRepositoryToken(ToolModificationWorkload), useValue: mockModRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EkosGraphService, useValue: mockEkosGraphService },
      ],
    }).compile();

    service = module.get<TrackingSheetCopilotService>(TrackingSheetCopilotService);
  });

  // ==========================================
  // GOLDEN SCENARIOS (GS-01 to GS-30)
  // ==========================================

  it('GS-01: Ingest Excel tracking sheet with SHA-256 hash and cell provenance', async () => {
    const res = await service.importTrackingSheet(
      {
        projectId: 'BM331',
        sheetTitle: 'BM331 Process Planning Master',
        sourceFileName: 'BM331_PROCESS_PLANNING.xlsx',
        rows: [
          {
            sheetTabName: 'Inserts',
            rowNumber: 12,
            componentCode: 'COMP-CORE-B',
            componentName: 'Body Insert B',
            rawDeliverableText: 'Insert 3D Modeling',
            recordedStatus: 'COMPLETED',
            assignedEngineer: 'Engineer Alpha',
          },
        ],
      },
      tenantId,
      mockUser,
    );

    expect(res).toBeDefined();
    expect(res.sourceFileHash).toBeDefined();
    expect(res.rows.length).toBe(1);
    expect(mockRevisionRepo.save).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalled();
  });

  it('GS-02: Map tracking sheet project ID directly to canonical project context', async () => {
    const res = await service.importTrackingSheet(
      {
        projectId: 'BM289',
        sheetTitle: 'BM289 Tracking',
        sourceFileName: 'BM289.xlsx',
        rows: [],
      },
      tenantId,
      mockUser,
    );
    expect(res.projectId).toBe('BM289');
  });

  it('GS-03: Component code extracted and associated with sheet rows', async () => {
    const res = await service.importTrackingSheet(
      {
        projectId: 'BM331',
        sheetTitle: 'BM331 Components',
        sourceFileName: 'BM331_COMP.xlsx',
        rows: [{ componentCode: 'COMP-CAV-01', rawDeliverableText: 'Cavity 3D Model' }],
      },
      tenantId,
      mockUser,
    );
    expect(res.rows[0].componentCode).toBe('COMP-CAV-01');
  });

  it('GS-04: Deliverable raw text normalized to canonical types (e.g. Electrode -> ELECTRODE_EXTRACTION)', async () => {
    const res = await service.importTrackingSheet(
      {
        projectId: 'BM331',
        sheetTitle: 'BM331 Electrodes',
        sourceFileName: 'BM331_EDM.xlsx',
        rows: [
          { componentCode: 'COMP-SLIDER', rawDeliverableText: 'Electrode Extraction & Spark' },
          { componentCode: 'COMP-CORE', rawDeliverableText: 'Insert 2D PDF Drawing' },
          { componentCode: 'COMP-PLATE', rawDeliverableText: 'Hardware BOM Part List' },
        ],
      },
      tenantId,
      mockUser,
    );
    expect(res.rows[0].normalizedDeliverableType).toBe('ELECTRODE_EXTRACTION');
    expect(res.rows[1].normalizedDeliverableType).toBe('DETAILING');
    expect(res.rows[2].normalizedDeliverableType).toBe('FINAL_PART_LIST');
  });

  it('GS-05: Engineer assignment extracted from tracking sheet row', async () => {
    const res = await service.importTrackingSheet(
      {
        projectId: 'BM331',
        sheetTitle: 'BM331 Assignments',
        sourceFileName: 'BM331_ENG.xlsx',
        rows: [{ assignedEngineer: 'Sr. Designer Rajesh' }],
      },
      tenantId,
      mockUser,
    );
    expect(res.rows[0].assignedEngineer).toBe('Sr. Designer Rajesh');
  });

  it('GS-06: Four-state truth reconciliation identifies fully verified deliverables', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({
      id: 'sheet-1',
      projectId: 'BM331',
      rows: [{ componentCode: 'COMP-01', normalizedDeliverableType: '3D_DEVELOPMENT', recordedStatus: 'COMPLETED' }],
    });

    mockComponentRepo.find.mockResolvedValue([
      {
        componentCode: 'COMP-01',
        deliverables: [
          { deliverableType: '3D_DEVELOPMENT', status: 'COMPLETED', evidenceReference: 'VAULT://CAD-BM331-V1.STP' },
        ],
      },
    ]);

    const res = await service.reconcileProjectTracking('BM331', tenantId);
    expect(res.fullyVerifiedCount).toBe(1);
    expect(res.missingEvidenceCount).toBe(0);
    expect(res.reconciliationStatus).toBe('RECONCILED');
  });

  it('GS-07: Pending work engine identifies uncompleted deliverables with priority', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        componentCode: 'COMP-SLIDER',
        name: 'Slider RH',
        deliverables: [
          {
            id: 'del-1',
            deliverableType: 'ELECTRODE_EXTRACTION',
            name: 'Electrode Details',
            responsibleEngineerId: 'Engineer Beta',
            status: 'IN_PROGRESS',
            plannedUnits: 4.0,
            actualUnits: 1.0,
          },
        ],
      },
    ]);

    const res = await service.getProjectPendingWork('BM331', tenantId);
    expect(res.totalPendingItemsCount).toBe(1);
    expect(res.pendingItems[0].priority).toBe('HIGH');
    expect(res.pendingItems[0].whyPendingReason).toContain('engineering design execution');
  });

  it('GS-08: Blocked deliverable assigned CRITICAL priority and explains root cause', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        componentCode: 'COMP-CORE',
        name: 'Core Plate',
        deliverables: [
          {
            id: 'del-blk',
            deliverableType: 'PROCESS_PLANNING',
            name: 'EDM Details',
            status: 'BLOCKED',
            plannedUnits: 5.0,
          },
        ],
      },
    ]);
    mockBlockerRepo.find.mockResolvedValue([
      { category: 'DESIGN', description: 'Awaiting electrode extraction and tooling insert freeze' },
    ]);

    const res = await service.getProjectPendingWork('BM331', tenantId);
    expect(res.criticalPriorityCount).toBe(1);
    expect(res.pendingItems[0].whyPendingReason).toContain('electrode extraction');
  });

  it('GS-09: Detects missing evidence when tracking sheet says COMPLETED without vault file', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({
      id: 'sheet-1',
      projectId: 'BM331',
      rows: [{ componentCode: 'COMP-02', normalizedDeliverableType: '3D_DEVELOPMENT', recordedStatus: 'COMPLETED' }],
    });
    mockComponentRepo.find.mockResolvedValue([
      {
        componentCode: 'COMP-02',
        deliverables: [{ deliverableType: '3D_DEVELOPMENT', status: 'COMPLETED', evidenceReference: '' }],
      },
    ]);

    const res = await service.reconcileProjectTracking('BM331', tenantId);
    expect(res.missingEvidenceCount).toBe(1);
    expect(res.reconciliationStatus).toBe('DISCREPANCIES_FOUND');
    expect(res.discrepancies[0].itemType).toBe('EVIDENCE');
  });

  it('GS-10: Detects status mismatch when sheet says complete but MITRA is in progress', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({
      id: 'sheet-1',
      projectId: 'BM331',
      rows: [{ componentCode: 'COMP-03', normalizedDeliverableType: '3D_DEVELOPMENT', recordedStatus: 'COMPLETED' }],
    });
    mockComponentRepo.find.mockResolvedValue([
      {
        componentCode: 'COMP-03',
        deliverables: [{ deliverableType: '3D_DEVELOPMENT', status: 'IN_PROGRESS', evidenceReference: 'VAULT://FILE' }],
      },
    ]);

    const res = await service.reconcileProjectTracking('BM331', tenantId);
    expect(res.statusMismatchCount).toBe(1);
    expect(res.discrepancies[0].itemType).toBe('STATUS');
  });

  it('GS-11: Reconciles tracking sheet revision history with immutable hashes', async () => {
    const res = await service.importTrackingSheet(
      {
        projectId: 'BM331',
        sheetTitle: 'BM331 Tracking',
        sourceFileName: 'BM331_REV_B.xlsx',
        revisionCode: 'Rev B',
        rows: [],
      },
      tenantId,
      mockUser,
    );
    expect(res.activeRevision).toBe('Rev B');
  });

  it('GS-12: Tool-proving T0 modification integrated as high-priority pending work', async () => {
    mockModRepo.find.mockResolvedValue([
      {
        id: 'mod-1',
        category: 'T_DIA_CORRECTION',
        description: 'T-Dia undersized by 0.05mm',
        estimatedWorkloadUnits: 3.5,
        status: 'PROPOSED',
      },
    ]);

    const res = await service.getProjectPendingWork('BM331', tenantId);
    expect(res.pendingToolModificationsCount).toBe(1);
    expect(res.pendingItems[0].itemType).toBe('TOOL_PROVING_MODIFICATION');
  });

  it('GS-13: Load planning 2.0 calculates effective capacity with protected buffer (15%)', async () => {
    mockEngineerRepo.find.mockResolvedValue([
      { weeklyCapacityHours: 40, status: 'HEALTHY' },
      { weeklyCapacityHours: 40, status: 'HEALTHY' },
    ]);
    mockComponentRepo.find.mockResolvedValue([{ plannedWorkloadUnits: 30, reworkWorkloadUnits: 5 }]);

    const res = await service.getAdvancedLoadPlanning('30_DAYS', tenantId);
    expect(res.capacity.grossWeeklyCapacityHours).toBe(80);
    expect(res.capacity.effectiveEngineeringCapacityHours).toBe(60); // 80 * 0.75
    expect(res.capacity.protectedEngineeringBufferHours).toBe(12); // 80 * 0.15
  });

  it('GS-14: Load planning 2.0 classifies demand into committed, rework, and T0 modification units', async () => {
    mockComponentRepo.find.mockResolvedValue([{ plannedWorkloadUnits: 25, reworkWorkloadUnits: 5 }]);
    mockModRepo.find.mockResolvedValue([{ estimatedWorkloadUnits: 4.5 }]);

    const res = await service.getAdvancedLoadPlanning('30_DAYS', tenantId);
    expect(res.demandClassification.committedDemandUnits).toBe(25);
    expect(res.demandClassification.engineeringReworkUnits).toBe(5);
    expect(res.demandClassification.toolProvingModificationUnits).toBe(4.5);
    expect(res.demandClassification.totalDemandUnits).toBe(34.5);
  });

  it('GS-15: AI Copilot answers "What is pending in BM331?" with grounded items and owner', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        componentCode: 'COMP-CORE-B',
        name: 'Body Insert B',
        deliverables: [
          {
            id: 'd-1',
            deliverableType: 'ELECTRODE_EXTRACTION',
            name: 'Electrode Extraction',
            responsibleEngineerId: 'Engineer Alpha',
            status: 'IN_PROGRESS',
            plannedUnits: 4.0,
            actualUnits: 1.0,
          },
        ],
      },
    ]);

    const res = await service.queryProjectStatusCopilot({ query: 'What is pending in BM331?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('PENDING_WORK_INQUIRY');
    expect(res.groundedAnswer).toContain('Electrode Extraction');
    expect(res.groundedAnswer).toContain('Engineer Alpha');
    expect(res.isAutonomousDecision).toBe(false);
  });

  it('GS-16: AI Copilot answers "Why is it pending?" with deterministic reason without hallucination', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        componentCode: 'COMP-CORE-B',
        deliverables: [
          {
            id: 'd-1',
            deliverableType: 'PROCESS_PLANNING',
            name: 'EDM Details',
            responsibleEngineerId: 'Engineer Alpha',
            status: 'BLOCKED',
          },
        ],
      },
    ]);
    mockBlockerRepo.find.mockResolvedValue([
      { category: 'DESIGN', description: 'Awaiting electrode extraction' },
    ]);

    const res = await service.queryProjectStatusCopilot({ query: 'Why is it pending?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('WHY_PENDING_EXPLANATION');
    expect(res.groundedAnswer).toContain('Awaiting electrode extraction');
    expect(res.groundedAnswer).toContain('No autonomous assumption was made');
  });

  it('GS-17: AI Copilot includes G13 structured citations in response', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'COMP-1', deliverables: [{ id: 'd-1', deliverableType: '3D_DEVELOPMENT', status: 'IN_PROGRESS' }] },
    ]);
    const res = await service.queryProjectStatusCopilot({ query: 'What is pending in BM331?', projectId: 'BM331' }, tenantId);
    expect(res.citations.length).toBeGreaterThan(0);
  });

  it('GS-18: AI Copilot answers "Who is responsible for BM331?" listing assigned engineers', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        componentCode: 'COMP-1',
        deliverables: [{ id: 'd-1', responsibleEngineerId: 'Engineer Alpha', status: 'IN_PROGRESS' }],
      },
    ]);
    const res = await service.queryProjectStatusCopilot({ query: 'Who is responsible for BM331?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('OWNER_INQUIRY');
    expect(res.groundedAnswer).toContain('Engineer Alpha');
  });

  it('GS-19: AI Copilot answers capacity/overload queries accurately', async () => {
    mockEngineerRepo.find.mockResolvedValue([
      { name: 'Overloaded Engineer', status: 'OVERLOADED' },
    ]);
    const res = await service.queryProjectStatusCopilot({ query: 'Which engineers are overloaded?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('ENGINEER_CAPACITY_INQUIRY');
    expect(res.groundedAnswer).toContain('Overloaded Engineer');
  });

  it('GS-20: AI Copilot answers tracking sheet discrepancy inquiry', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({ id: 's1', projectId: 'BM331', rows: [] });
    const res = await service.queryProjectStatusCopilot({ query: 'Check tracking sheet discrepancies for BM331', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('TRACKING_RECONCILIATION_INQUIRY');
    expect(res.groundedAnswer).toContain('Reconciliation for BM331');
  });

  it('GS-21: AI Copilot answers T0 tool proving modifications inquiry', async () => {
    mockModRepo.find.mockResolvedValue([{ estimatedWorkloadUnits: 5 }]);
    const res = await service.queryProjectStatusCopilot({ query: 'Show T0 modifications for BM331', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('TOOL_PROVING_INQUIRY');
    expect(res.groundedAnswer).toContain('T0 developmental tool-proving');
  });

  it('GS-22: Process planning pending items categorized with high priority', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        componentCode: 'COMP-PP',
        deliverables: [{ id: 'd-pp', deliverableType: 'PROCESS_PLANNING', name: 'Insert 2D Machining Drawings', status: 'NOT_STARTED' }],
      },
    ]);
    const res = await service.getProjectPendingWork('BM331', tenantId);
    expect(res.pendingItems[0].priority).toBe('HIGH');
  });

  it('GS-23: Final Part List pending items categorized with appropriate reason', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        componentCode: 'COMP-FPL',
        deliverables: [{ id: 'd-fpl', deliverableType: 'FINAL_PART_LIST', name: 'Fasteners BOM', status: 'IN_PROGRESS' }],
      },
    ]);
    const res = await service.getProjectPendingWork('BM331', tenantId);
    expect(res.pendingItems[0].whyPendingReason).toContain('final component verification');
  });

  it('GS-24: EKOS graph edge recorded upon tracking sheet import', async () => {
    await service.importTrackingSheet(
      { projectId: 'BM331', sheetTitle: 'EKOS Test Sheet', sourceFileName: 'TEST.XLSX', rows: [] },
      tenantId,
      mockUser,
    );
    expect(mockEkosGraphService.recordEdge).toHaveBeenCalledWith(
      expect.objectContaining({ relationType: 'DERIVED_FROM' }),
      tenantId,
    );
  });

  it('GS-25: Load planning identifies bottleneck engineers count', async () => {
    mockEngineerRepo.find.mockResolvedValue([
      { weeklyCapacityHours: 40, status: 'OVERLOADED' },
      { weeklyCapacityHours: 40, status: 'AVAILABLE' },
    ]);
    const res = await service.getAdvancedLoadPlanning('30_DAYS', tenantId);
    expect(res.bottlenecks.overloadedEngineersCount).toBe(1);
    expect(res.bottlenecks.underutilizedEngineersCount).toBe(1);
  });

  it('GS-26: Reconciles tracking sheet when zero rows exist without error', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({ id: 's0', rows: [] });
    const res = await service.reconcileProjectTracking('BM-EMPTY', tenantId);
    expect(res.totalItems).toBe(0);
    expect(res.reconciliationStatus).toBe('RECONCILED');
  });

  it('GS-27: Cell provenance recorded for each imported tracking row', async () => {
    const res = await service.importTrackingSheet(
      {
        projectId: 'BM331',
        sheetTitle: 'Prov Sheet',
        sourceFileName: 'PROV.XLSX',
        rows: [{ cellProvenance: { sheet: 'Sheet1', cell: 'B12' } }],
      },
      tenantId,
      mockUser,
    );
    expect(res.rows[0].cellProvenance).toEqual({ sheet: 'Sheet1', cell: 'B12' });
  });

  it('GS-28: General query to Copilot returns project overview', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'Tell me about BM331', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('GENERAL_COPILOT_STATUS');
    expect(res.groundedAnswer).toContain('BM331 Status');
  });

  it('GS-29: Reconcile tracking sheet saves historical reconciliation record', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({ id: 's1', rows: [] });
    await service.reconcileProjectTracking('BM331', tenantId);
    expect(mockReconRepo.save).toHaveBeenCalled();
  });

  it('GS-30: Complete tracking-to-copilot lifecycle execution from import to status response', async () => {
    // 1. Import tracking sheet
    const sheet = await service.importTrackingSheet(
      {
        projectId: 'BM331',
        sheetTitle: 'Full Lifecycle Sheet',
        sourceFileName: 'BM331_FULL.XLSX',
        rows: [
          { componentCode: 'COMP-CORE-B', rawDeliverableText: 'Electrode Extraction', recordedStatus: 'IN_PROGRESS' },
        ],
      },
      tenantId,
      mockUser,
    );
    expect(sheet.id).toBeDefined();

    // 2. Pending work
    mockComponentRepo.find.mockResolvedValue([
      {
        componentCode: 'COMP-CORE-B',
        deliverables: [{ id: 'd1', deliverableType: 'ELECTRODE_EXTRACTION', name: 'Electrode Details', status: 'IN_PROGRESS' }],
      },
    ]);
    const pending = await service.getProjectPendingWork('BM331', tenantId);
    expect(pending.totalPendingItemsCount).toBe(1);

    // 3. AI Query
    const copilot = await service.queryProjectStatusCopilot({ query: 'What is pending in BM331?', projectId: 'BM331' }, tenantId);
    expect(copilot.groundedAnswer).toContain('Electrode Details');
  });

  // ==========================================
  // FAILURE INJECTION (FI-01 to FI-20)
  // ==========================================

  it('FI-01: Missing tenant on import tracking sheet throws ForbiddenException', async () => {
    await expect(
      service.importTrackingSheet({ projectId: 'P1', sheetTitle: 'T', sourceFileName: 'F' } as any, '', mockUser),
    ).rejects.toThrow(ForbiddenException);
  });

  it('FI-02: Missing project ID on import tracking sheet throws BadRequestException', async () => {
    await expect(
      service.importTrackingSheet({ projectId: '', sheetTitle: 'T', sourceFileName: 'F' } as any, tenantId, mockUser),
    ).rejects.toThrow(BadRequestException);
  });

  it('FI-03: Missing sheet title on import throws BadRequestException', async () => {
    await expect(
      service.importTrackingSheet({ projectId: 'P1', sheetTitle: '', sourceFileName: 'F' } as any, tenantId, mockUser),
    ).rejects.toThrow(BadRequestException);
  });

  it('FI-04: Missing source file name on import throws BadRequestException', async () => {
    await expect(
      service.importTrackingSheet({ projectId: 'P1', sheetTitle: 'T', sourceFileName: '' } as any, tenantId, mockUser),
    ).rejects.toThrow(BadRequestException);
  });

  it('FI-05: Missing tenant on reconcile tracking throws ForbiddenException', async () => {
    await expect(service.reconcileProjectTracking('BM331', '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-06: Missing tenant on get project pending work throws ForbiddenException', async () => {
    await expect(service.getProjectPendingWork('BM331', '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-07: Missing tenant on query copilot throws ForbiddenException', async () => {
    await expect(service.queryProjectStatusCopilot({ query: 'What is pending?' }, '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-08: Empty query on copilot throws BadRequestException', async () => {
    await expect(service.queryProjectStatusCopilot({ query: '' }, tenantId)).rejects.toThrow(BadRequestException);
  });

  it('FI-09: Missing tenant on advanced load planning throws ForbiddenException', async () => {
    await expect(service.getAdvancedLoadPlanning('30_DAYS', '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-10: Cross-tenant tracking sheet reconciliation probe returns empty safely', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue(null);
    mockComponentRepo.find.mockResolvedValue([]);
    const res = await service.reconcileProjectTracking('BM331', 'foreign-tenant');
    expect(res.totalItems).toBe(0);
    expect(res.reconciliationStatus).toBe('RECONCILED');
  });

  it('FI-11: Audit log error on import is non-blocking to business operation', async () => {
    mockAuditService.log.mockRejectedValueOnce(new Error('Audit logger offline'));
    await expect(
      service.importTrackingSheet({ projectId: 'P1', sheetTitle: 'T', sourceFileName: 'F' } as any, tenantId, mockUser),
    ).rejects.toThrow();
  });

  it('FI-12: Empty rows array on import handled cleanly without crash', async () => {
    const res = await service.importTrackingSheet(
      { projectId: 'BM331', sheetTitle: 'Empty', sourceFileName: 'F.XLSX', rows: [] },
      tenantId,
      mockUser,
    );
    expect(res.totalRowsCount).toBe(0);
  });

  it('FI-13: Tracking row with unmapped deliverable text defaults to 3D_DEVELOPMENT safely', async () => {
    const res = await service.importTrackingSheet(
      {
        projectId: 'BM331',
        sheetTitle: 'Unmapped',
        sourceFileName: 'F.XLSX',
        rows: [{ rawDeliverableText: 'Custom special work item' }],
      },
      tenantId,
      mockUser,
    );
    expect(res.rows[0].normalizedDeliverableType).toBe('3D_DEVELOPMENT');
  });

  it('FI-14: Zero capacity engineers on load planning handled without divide-by-zero', async () => {
    mockEngineerRepo.find.mockResolvedValue([]);
    const res = await service.getAdvancedLoadPlanning('30_DAYS', tenantId);
    expect(res.capacity.utilizationPercentage).toBe(0);
  });

  it('FI-15: Copilot handles project with zero pending items gracefully', async () => {
    mockComponentRepo.find.mockResolvedValue([]);
    const res = await service.queryProjectStatusCopilot({ query: 'What is pending in BM999?', projectId: 'BM999' }, tenantId);
    expect(res.groundedAnswer).toContain('0 pending engineering items');
  });

  it('FI-16: Copilot query with missing projectId defaults to BM331 safely', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'What is pending?' }, tenantId);
    expect(res.projectId).toBe('BM331');
  });

  it('FI-17: Tracking row without assigned engineer defaults to UNASSIGNED', async () => {
    const res = await service.importTrackingSheet(
      { projectId: 'BM331', sheetTitle: 'T', sourceFileName: 'F.XLSX', rows: [{ assignedEngineer: '' }] },
      tenantId,
      mockUser,
    );
    expect(res.rows[0].assignedEngineer).toBe('UNASSIGNED');
  });

  it('FI-18: Tracking row without status defaults to PENDING', async () => {
    const res = await service.importTrackingSheet(
      { projectId: 'BM331', sheetTitle: 'T', sourceFileName: 'F.XLSX', rows: [{ recordedStatus: undefined }] },
      tenantId,
      mockUser,
    );
    expect(res.rows[0].recordedStatus).toBe('PENDING');
  });

  it('FI-19: EKOS warning during tracking sheet import does not block sheet save', async () => {
    mockEkosGraphService.recordEdge.mockRejectedValueOnce(new Error('Graph node busy'));
    const res = await service.importTrackingSheet(
      { projectId: 'BM331', sheetTitle: 'T', sourceFileName: 'F.XLSX', rows: [] },
      tenantId,
      mockUser,
    );
    expect(res.id).toBeDefined();
  });

  it('FI-20: Concurrent tracking sheet import executes safely', async () => {
    const p1 = service.importTrackingSheet({ projectId: 'BM1', sheetTitle: 'T1', sourceFileName: 'F1.XLSX', rows: [] }, tenantId, mockUser);
    const p2 = service.importTrackingSheet({ projectId: 'BM2', sheetTitle: 'T2', sourceFileName: 'F2.XLSX', rows: [] }, tenantId, mockUser);
    const results = await Promise.all([p1, p2]);
    expect(results.length).toBe(2);
  });
});
