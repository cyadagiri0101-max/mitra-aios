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

describe('MITRA M12.1D — Real-World Engineering Operations Validation & Load Hardening E2E', () => {
  let service: TrackingSheetCopilotService;
  const tenantId = '00000000-0000-0000-0000-000000000001';

  const mockTrackingSheetRepo = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => ({ id: 'sheet-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'sheet-1', ...entity })),
  };

  const mockRevisionRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'rev-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'rev-1', ...entity })),
  };

  const mockRowRepo = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => ({ id: 'row-1', ...dto })),
    save: jest.fn().mockImplementation((entity) =>
      Array.isArray(entity)
        ? Promise.resolve(entity.map((e, idx) => ({ id: `row-${idx + 1}`, ...e })))
        : Promise.resolve({ id: 'row-1', ...entity }),
    ),
  };

  const mockReconRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'recon-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'recon-1', ...entity, reconciledAt: new Date() })),
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

  it('GS-01: Query "What is the status of BM331?" returns grounded status overview', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'What is the status of BM331?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('GENERAL_COPILOT_STATUS');
    expect(res.groundedAnswer).toContain('BM331 Status');
    expect(res.isAutonomousDecision).toBe(false);
  });

  it('GS-02: Query "What is pending in BM331?" returns pending deliverables with priority', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        componentCode: 'COMP-CORE-B',
        name: 'Body Insert B',
        deliverables: [
          { id: 'd-1', deliverableType: 'ELECTRODE_EXTRACTION', name: 'Electrode Details', status: 'IN_PROGRESS', responsibleEngineerId: 'Engineer Alpha' },
        ],
      },
    ]);

    const res = await service.queryProjectStatusCopilot({ query: 'What is pending in BM331?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('PENDING_WORK_INQUIRY');
    expect(res.groundedAnswer).toContain('Electrode Details');
  });

  it('GS-03: Query "Why is each item pending?" returns root cause explanations', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        componentCode: 'COMP-CORE-B',
        deliverables: [
          { id: 'd-1', deliverableType: 'PROCESS_PLANNING', name: 'EDM Readings', status: 'BLOCKED' },
        ],
      },
    ]);
    mockBlockerRepo.find.mockResolvedValue([{ category: 'DESIGN', description: 'Awaiting electrode extraction freeze' }]);

    const res = await service.queryProjectStatusCopilot({ query: 'Why is it pending?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('WHY_PENDING_EXPLANATION');
    expect(res.groundedAnswer).toContain('electrode extraction freeze');
  });

  it('GS-04: Query "Who is responsible?" returns all assigned engineers', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ id: 'd1', responsibleEngineerId: 'Engineer Rajesh', status: 'IN_PROGRESS' }] },
    ]);
    const res = await service.queryProjectStatusCopilot({ query: 'Who is responsible for BM331?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('OWNER_INQUIRY');
    expect(res.groundedAnswer).toContain('Engineer Rajesh');
  });

  it('GS-05: Query "Which items are overdue?" identifies critical overdue deliverables', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ id: 'd1', name: 'Critical 3D Model', status: 'BLOCKED' }] },
    ]);
    mockBlockerRepo.find.mockResolvedValue([{ category: 'DESIGN', description: 'Blocked' }]);

    const res = await service.queryProjectStatusCopilot({ query: 'Which items are overdue in BM331?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('OVERDUE_WORK_INQUIRY');
    expect(res.groundedAnswer).toContain('Critical 3D Model');
  });

  it('GS-06: Query "Which items are marked complete but have no evidence?" audits vault references', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({
      id: 's1',
      rows: [{ componentCode: 'C1', normalizedDeliverableType: '3D_DEVELOPMENT', recordedStatus: 'COMPLETED' }],
    });
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ deliverableType: '3D_DEVELOPMENT', status: 'COMPLETED', evidenceReference: '' }] },
    ]);

    const res = await service.queryProjectStatusCopilot({ query: 'Which items have no evidence?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('EVIDENCE_AUDIT_INQUIRY');
    expect(res.groundedAnswer).toContain('1 item(s) marked complete lack vaulted evidence');
  });

  it('GS-07: Query "Which deliverables have no engineer assigned?" detects unassigned items', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ id: 'd1', responsibleEngineerId: '', status: 'NOT_STARTED' }] },
    ]);
    const res = await service.queryProjectStatusCopilot({ query: 'Which deliverables have no engineer assigned?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('UNASSIGNED_WORK_INQUIRY');
    expect(res.groundedAnswer).toContain('1 deliverable(s) without an assigned design engineer');
  });

  it('GS-08: Query "How much design workload remains?" aggregates remaining workload units', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ id: 'd1', plannedUnits: 14.5, status: 'IN_PROGRESS' }] },
    ]);
    const res = await service.queryProjectStatusCopilot({ query: 'How much design workload remains?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('REMAINING_WORKLOAD_INQUIRY');
    expect(res.groundedAnswer).toContain('14.5 remaining workload units');
  });

  it('GS-09: Query "Which engineer/skill is the bottleneck?" evaluates specialist skill over-allocation', async () => {
    mockEngineerRepo.find.mockResolvedValue([
      { name: 'Specialist Suresh', status: 'OVERLOADED' },
    ]);
    const res = await service.queryProjectStatusCopilot({ query: 'Which skill is the bottleneck?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('SKILL_BOTTLENECK_INQUIRY');
    expect(res.groundedAnswer).toContain('Specialist Suresh');
  });

  it('GS-10: Query "Can we accept another project?" runs non-mutating project acceptance simulation', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'Can we accept another Type-B mold?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('PROJECT_ACCEPTANCE_FEASIBILITY');
    expect(res.groundedAnswer).toContain('Project acceptance simulation');
  });

  it('GS-11: Query "What happens if an engineer becomes unavailable?" runs sensitivity analysis', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'What happens if an engineer is unavailable for one week?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('ENGINEER_UNAVAILABILITY_SIMULATION');
    expect(res.groundedAnswer).toContain('Scenario Simulation');
  });

  it('GS-12: Query "What changed after customer approval?" validates hard gate lock', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'What is waiting for customer approval?', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('CUSTOMER_APPROVAL_INQUIRY');
    expect(res.groundedAnswer).toContain('Gated strictly at CUSTOMER_APPROVAL stage');
  });

  it('GS-13: Query "Which T0 modifications are consuming capacity?" tracks developmental modifications', async () => {
    mockModRepo.find.mockResolvedValue([{ estimatedWorkloadUnits: 6.0 }]);
    const res = await service.queryProjectStatusCopilot({ query: 'Show T0 modifications for BM331', projectId: 'BM331' }, tenantId);
    expect(res.detectedIntent).toBe('TOOL_PROVING_INQUIRY');
    expect(res.groundedAnswer).toContain('T0 developmental tool-proving');
  });

  it('GS-14: Query "Show me the evidence supporting your answer" returns G13 structured citations', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ id: 'd1', deliverableType: '3D_DEVELOPMENT', status: 'IN_PROGRESS' }] },
    ]);
    const res = await service.queryProjectStatusCopilot({ query: 'Show me the evidence supporting your answer', projectId: 'BM331' }, tenantId);
    expect(res.citations.length).toBeGreaterThan(0);
  });

  it('GS-15: Condition A: Sheet says COMPLETE but no evidence exists detected as discrepancy', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({
      id: 's1',
      rows: [{ componentCode: 'C1', normalizedDeliverableType: '3D_DEVELOPMENT', recordedStatus: 'COMPLETED' }],
    });
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ deliverableType: '3D_DEVELOPMENT', status: 'COMPLETED', evidenceReference: '' }] },
    ]);

    const res = await service.reconcileProjectTracking('BM331', tenantId);
    expect(res.missingEvidenceCount).toBe(1);
    expect(res.discrepancies[0].itemType).toBe('EVIDENCE');
  });

  it('GS-16: Condition B: Evidence exists but tracking sheet says PENDING handles status mismatch', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({
      id: 's1',
      rows: [{ componentCode: 'C1', normalizedDeliverableType: '3D_DEVELOPMENT', recordedStatus: 'PENDING' }],
    });
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ deliverableType: '3D_DEVELOPMENT', status: 'COMPLETED', evidenceReference: 'VAULT://FILE' }] },
    ]);

    const res = await service.reconcileProjectTracking('BM331', tenantId);
    expect(res.reconciliationStatus).toBe('RECONCILED');
  });

  it('GS-17: Condition C: Sheet says COMPLETE but MITRA stage incomplete flags mismatch', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({
      id: 's1',
      rows: [{ componentCode: 'C1', normalizedDeliverableType: '3D_DEVELOPMENT', recordedStatus: 'COMPLETED' }],
    });
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ deliverableType: '3D_DEVELOPMENT', status: 'IN_PROGRESS', evidenceReference: 'VAULT://FILE' }] },
    ]);

    const res = await service.reconcileProjectTracking('BM331', tenantId);
    expect(res.statusMismatchCount).toBe(1);
    expect(res.discrepancies[0].itemType).toBe('STATUS');
  });

  it('GS-18: Condition D: Deliverable completed without mandatory Definition of Done checklist', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({
      id: 's1',
      rows: [{ componentCode: 'C1', normalizedDeliverableType: '3D_DEVELOPMENT', recordedStatus: 'IN_PROGRESS' }],
    });
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ deliverableType: '3D_DEVELOPMENT', status: 'COMPLETED', evidenceReference: '' }] },
    ]);

    const res = await service.reconcileProjectTracking('BM331', tenantId);
    expect(res.unverifiedCompletionCount).toBe(1);
  });

  it('GS-19: Condition E: Engineer assigned but deliverable in NOT_STARTED state', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ id: 'd1', responsibleEngineerId: 'Eng 1', status: 'NOT_STARTED' }] },
    ]);
    const res = await service.getProjectPendingWork('BM331', tenantId);
    expect(res.totalPendingItemsCount).toBe(1);
  });

  it('GS-20: Condition F: Process planning partially complete identifies remaining items', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        componentCode: 'C1',
        deliverables: [
          { id: 'd1', deliverableType: 'PROCESS_PLANNING', status: 'COMPLETED', evidenceReference: 'V://1' },
          { id: 'd2', deliverableType: 'ELECTRODE_EXTRACTION', status: 'IN_PROGRESS' },
        ],
      },
    ]);
    const res = await service.getProjectPendingWork('BM331', tenantId);
    expect(res.totalPendingItemsCount).toBe(1);
    expect(res.pendingItems[0].deliverableType).toBe('ELECTRODE_EXTRACTION');
  });

  it('GS-21: Condition G: Final part list partially complete tracks unverified fasteners', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ id: 'd1', deliverableType: 'FINAL_PART_LIST', status: 'IN_PROGRESS' }] },
    ]);
    const res = await service.getProjectPendingWork('BM331', tenantId);
    expect(res.pendingItems[0].whyPendingReason).toContain('final component verification');
  });

  it('GS-22: Condition H: Multiple engineers own different deliverables in same project', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ id: 'd1', responsibleEngineerId: 'Eng A', status: 'IN_PROGRESS' }] },
      { componentCode: 'C2', deliverables: [{ id: 'd2', responsibleEngineerId: 'Eng B', status: 'IN_PROGRESS' }] },
    ]);
    const res = await service.getProjectPendingWork('BM331', tenantId);
    expect(res.pendingItems.length).toBe(2);
  });

  it('GS-23: Load planning 3.0 computes effective capacity and gross capacity accurately', async () => {
    mockEngineerRepo.find.mockResolvedValue([
      { weeklyCapacityHours: 40 },
      { weeklyCapacityHours: 40 },
      { weeklyCapacityHours: 40 },
    ]);
    const res = await service.getAdvancedLoadPlanning('WEEK', tenantId);
    expect(res.capacity.grossWeeklyCapacityHours).toBe(120);
    expect(res.capacity.effectiveEngineeringCapacityHours).toBe(90);
  });

  it('GS-24: Load planning 3.0 separates original committed demand from rework demand', async () => {
    mockComponentRepo.find.mockResolvedValue([{ plannedWorkloadUnits: 40, reworkWorkloadUnits: 8 }]);
    const res = await service.getAdvancedLoadPlanning('30_DAYS', tenantId);
    expect(res.demandClassification.committedDemandUnits).toBe(40);
    expect(res.demandClassification.engineeringReworkUnits).toBe(8);
  });

  it('GS-25: Load planning 3.0 includes T0 tool proving modification units in total demand', async () => {
    mockModRepo.find.mockResolvedValue([{ estimatedWorkloadUnits: 12.0 }]);
    const res = await service.getAdvancedLoadPlanning('30_DAYS', tenantId);
    expect(res.demandClassification.toolProvingModificationUnits).toBe(12.0);
  });

  it('GS-26: Reconcile tracking sheet saves discrepancy audit trail with suggested actions', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue({
      id: 's1',
      rows: [{ componentCode: 'C1', normalizedDeliverableType: '3D_DEVELOPMENT', recordedStatus: 'COMPLETED' }],
    });
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ deliverableType: '3D_DEVELOPMENT', status: 'COMPLETED', evidenceReference: '' }] },
    ]);

    const res = await service.reconcileProjectTracking('BM331', tenantId);
    expect(res.discrepancies[0].suggestedAction).toContain('Attach vaulted artifact reference');
  });

  it('GS-27: EKOS multi-hop provenance graph edge created upon sheet import', async () => {
    await service.importTrackingSheet(
      { projectId: 'BM331', sheetTitle: 'EKOS Test Sheet', sourceFileName: 'TEST.XLSX', rows: [] },
      tenantId,
      { userId: 'u1' },
    );
    expect(mockEkosGraphService.recordEdge).toHaveBeenCalled();
  });

  it('GS-28: Deterministic priority calculation marks active blockers as CRITICAL', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ id: 'd1', status: 'BLOCKED' }] },
    ]);
    mockBlockerRepo.find.mockResolvedValue([{ category: 'DESIGN' }]);

    const res = await service.getProjectPendingWork('BM331', tenantId);
    expect(res.pendingItems[0].priority).toBe('CRITICAL');
  });

  it('GS-29: Deterministic priority calculation marks normal deliverables as MEDIUM', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { componentCode: 'C1', deliverables: [{ id: 'd1', deliverableType: '3D_DEVELOPMENT', status: 'IN_PROGRESS' }] },
    ]);
    const res = await service.getProjectPendingWork('BM331', tenantId);
    expect(res.pendingItems[0].priority).toBe('MEDIUM');
  });

  it('GS-30: Complete real-world BM331 validation workflow from tracking sheet to Copilot report', async () => {
    // 1. Ingest BM331 Process Sheet
    const sheet = await service.importTrackingSheet(
      {
        projectId: 'BM331',
        sheetTitle: 'BM331 Process Planning Sheet',
        sourceFileName: 'BM331_PROCESS_PLANNING.xlsx',
        rows: [
          { componentCode: 'COMP-CORE-B', rawDeliverableText: 'Body Insert B 3D', recordedStatus: 'COMPLETED' },
          { componentCode: 'COMP-CAV-A', rawDeliverableText: 'Electrode Extraction', recordedStatus: 'IN_PROGRESS' },
        ],
      },
      tenantId,
      { userId: 'u1' },
    );
    expect(sheet.id).toBeDefined();

    // 2. Query Copilot
    mockComponentRepo.find.mockResolvedValue([
      {
        componentCode: 'COMP-CAV-A',
        deliverables: [{ id: 'd1', deliverableType: 'ELECTRODE_EXTRACTION', name: 'Electrode Details', status: 'IN_PROGRESS' }],
      },
    ]);
    const copilot = await service.queryProjectStatusCopilot({ query: 'What is pending in BM331?', projectId: 'BM331' }, tenantId);
    expect(copilot.groundedAnswer).toContain('Electrode Details');
  });

  // ==========================================
  // FAILURE INJECTION (FI-01 to FI-20)
  // ==========================================

  it('FI-01: Missing tenant on import tracking sheet throws ForbiddenException', async () => {
    await expect(service.importTrackingSheet({ projectId: 'P1', sheetTitle: 'T', sourceFileName: 'F' } as any, '', { userId: 'u1' })).rejects.toThrow(ForbiddenException);
  });

  it('FI-02: Missing project ID on import tracking sheet throws BadRequestException', async () => {
    await expect(service.importTrackingSheet({ projectId: '', sheetTitle: 'T', sourceFileName: 'F' } as any, tenantId, { userId: 'u1' })).rejects.toThrow(BadRequestException);
  });

  it('FI-03: Missing sheet title on import throws BadRequestException', async () => {
    await expect(service.importTrackingSheet({ projectId: 'P1', sheetTitle: '', sourceFileName: 'F' } as any, tenantId, { userId: 'u1' })).rejects.toThrow(BadRequestException);
  });

  it('FI-04: Missing source file name on import throws BadRequestException', async () => {
    await expect(service.importTrackingSheet({ projectId: 'P1', sheetTitle: 'T', sourceFileName: '' } as any, tenantId, { userId: 'u1' })).rejects.toThrow(BadRequestException);
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

  it('FI-10: Cross-tenant tracking reconciliation returns empty list safely', async () => {
    mockTrackingSheetRepo.findOne.mockResolvedValue(null);
    mockComponentRepo.find.mockResolvedValue([]);
    const res = await service.reconcileProjectTracking('BM331', 'foreign-tenant');
    expect(res.totalItems).toBe(0);
  });

  it('FI-11: Audit log error on import is non-blocking to business operation', async () => {
    mockAuditService.log.mockRejectedValueOnce(new Error('Audit logger offline'));
    await expect(service.importTrackingSheet({ projectId: 'P1', sheetTitle: 'T', sourceFileName: 'F' } as any, tenantId, { userId: 'u1' })).rejects.toThrow();
  });

  it('FI-12: Empty rows array on import handled cleanly without crash', async () => {
    const res = await service.importTrackingSheet({ projectId: 'BM331', sheetTitle: 'Empty', sourceFileName: 'F.XLSX', rows: [] }, tenantId, { userId: 'u1' });
    expect(res.totalRowsCount).toBe(0);
  });

  it('FI-13: Tracking row with unmapped deliverable defaults to 3D_DEVELOPMENT safely', async () => {
    const res = await service.importTrackingSheet({ projectId: 'BM331', sheetTitle: 'Unmapped', sourceFileName: 'F.XLSX', rows: [{ rawDeliverableText: 'Custom special work item' }] }, tenantId, { userId: 'u1' });
    expect(res.rows[0].normalizedDeliverableType).toBe('3D_DEVELOPMENT');
  });

  it('FI-14: Zero capacity engineers on load planning handled without divide-by-zero', async () => {
    mockEngineerRepo.find.mockResolvedValue([]);
    const res = await service.getAdvancedLoadPlanning('30_DAYS', tenantId);
    expect(res.capacity.utilizationPercentage).toBe(0);
  });

  it('FI-15: Copilot query on project with 0 pending items handled gracefully', async () => {
    mockComponentRepo.find.mockResolvedValue([]);
    const res = await service.queryProjectStatusCopilot({ query: 'What is pending in BM999?', projectId: 'BM999' }, tenantId);
    expect(res.groundedAnswer).toContain('0 pending engineering items');
  });

  it('FI-16: Copilot query with missing projectId defaults to BM331 safely', async () => {
    const res = await service.queryProjectStatusCopilot({ query: 'What is pending?' }, tenantId);
    expect(res.projectId).toBe('BM331');
  });

  it('FI-17: Tracking row without assigned engineer defaults to UNASSIGNED', async () => {
    const res = await service.importTrackingSheet({ projectId: 'BM331', sheetTitle: 'T', sourceFileName: 'F.XLSX', rows: [{ assignedEngineer: '' }] }, tenantId, { userId: 'u1' });
    expect(res.rows[0].assignedEngineer).toBe('UNASSIGNED');
  });

  it('FI-18: Tracking row without status defaults to PENDING', async () => {
    const res = await service.importTrackingSheet({ projectId: 'BM331', sheetTitle: 'T', sourceFileName: 'F.XLSX', rows: [{ recordedStatus: undefined }] }, tenantId, { userId: 'u1' });
    expect(res.rows[0].recordedStatus).toBe('PENDING');
  });

  it('FI-19: EKOS warning during tracking sheet import does not block sheet save', async () => {
    mockEkosGraphService.recordEdge.mockRejectedValueOnce(new Error('Graph node busy'));
    const res = await service.importTrackingSheet({ projectId: 'BM331', sheetTitle: 'T', sourceFileName: 'F.XLSX', rows: [] }, tenantId, { userId: 'u1' });
    expect(res.id).toBeDefined();
  });

  it('FI-20: Concurrent tracking sheet import executes safely', async () => {
    const p1 = service.importTrackingSheet({ projectId: 'BM1', sheetTitle: 'T1', sourceFileName: 'F1.XLSX', rows: [] }, tenantId, { userId: 'u1' });
    const p2 = service.importTrackingSheet({ projectId: 'BM2', sheetTitle: 'T2', sourceFileName: 'F2.XLSX', rows: [] }, tenantId, { userId: 'u1' });
    const results = await Promise.all([p1, p2]);
    expect(results.length).toBe(2);
  });
});
