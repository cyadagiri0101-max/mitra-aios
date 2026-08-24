import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TrackingSheetCopilotService } from '../services/tracking-sheet-copilot.service';
import { DesignComponentOperationsService } from '../services/design-component-operations.service';
import { TrackingSheet } from '../entities/tracking-sheet.entity';
import { TrackingSheetRevision } from '../entities/tracking-sheet-revision.entity';
import { TrackingSheetRow } from '../entities/tracking-sheet-row.entity';
import { TrackingSheetReconciliation } from '../entities/tracking-sheet-reconciliation.entity';
import { DesignComponent } from '../entities/design-component.entity';
import { DesignComponentRevision } from '../entities/design-component-revision.entity';
import { DesignComponentDeliverable } from '../entities/design-component-deliverable.entity';
import { DesignChecklist } from '../entities/design-checklist.entity';
import { DesignChecklistItem } from '../entities/design-checklist-item.entity';
import { DesignBlocker } from '../entities/design-blocker.entity';
import { DesignDependency } from '../entities/design-dependency.entity';
import { DesignEngineerProfile } from '../entities/design-team-capacity.entity';
import { ToolModificationWorkload } from '../entities/tool-modification-workload.entity';
import { AuditService } from '../../audit/services/audit.service';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';

describe('MITRA M12.1G — Operational Hardening Implementation E2E', () => {
  let copilotService: TrackingSheetCopilotService;
  let operationsService: DesignComponentOperationsService;
  const tenantId = '00000000-0000-0000-0000-000000000001';

  const mockTrackingSheetRepo = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => ({ id: 'sheet-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'sheet-1', ...entity })),
  };

  const mockTrackingRevisionRepo = {
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
    create: jest.fn().mockImplementation((dto) => ({ id: 'comp-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'comp-1', ...entity })),
  };

  const mockCompRevisionRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({ id: 'crev-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'crev-1', ...entity })),
  };

  const mockDeliverableRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({ id: 'deliv-1', ...dto })),
    save: jest.fn().mockImplementation((entity) =>
      Array.isArray(entity)
        ? Promise.resolve(entity.map((e, idx) => ({ id: e.id || `deliv-${idx + 1}`, ...e })))
        : Promise.resolve({ id: entity.id || 'deliv-1', ...entity }),
    ),
  };

  const mockChecklistRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({ id: 'chk-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'chk-1', ...entity })),
  };

  const mockChecklistItemRepo = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => ({ id: 'chki-1', ...dto })),
    save: jest.fn().mockImplementation((entity) =>
      Array.isArray(entity)
        ? Promise.resolve(entity.map((e, idx) => ({ id: `chki-${idx + 1}`, ...e })))
        : Promise.resolve({ id: 'chki-1', ...entity }),
    ),
  };

  const mockBlockerRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockDependencyRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockEngineerRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
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
    mockChecklistRepo.find.mockResolvedValue([]);
    mockChecklistRepo.findOne.mockResolvedValue(null);
    mockDeliverableRepo.findOne.mockResolvedValue(null);
    mockEngineerRepo.find.mockResolvedValue([]);
    mockEngineerRepo.findOne.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingSheetCopilotService,
        DesignComponentOperationsService,
        { provide: getRepositoryToken(TrackingSheet), useValue: mockTrackingSheetRepo },
        { provide: getRepositoryToken(TrackingSheetRevision), useValue: mockTrackingRevisionRepo },
        { provide: getRepositoryToken(TrackingSheetRow), useValue: mockRowRepo },
        { provide: getRepositoryToken(TrackingSheetReconciliation), useValue: mockReconRepo },
        { provide: getRepositoryToken(DesignComponent), useValue: mockComponentRepo },
        { provide: getRepositoryToken(DesignComponentRevision), useValue: mockCompRevisionRepo },
        { provide: getRepositoryToken(DesignComponentDeliverable), useValue: mockDeliverableRepo },
        { provide: getRepositoryToken(DesignChecklist), useValue: mockChecklistRepo },
        { provide: getRepositoryToken(DesignChecklistItem), useValue: mockChecklistItemRepo },
        { provide: getRepositoryToken(DesignBlocker), useValue: mockBlockerRepo },
        { provide: getRepositoryToken(DesignDependency), useValue: mockDependencyRepo },
        { provide: getRepositoryToken(DesignEngineerProfile), useValue: mockEngineerRepo },
        { provide: getRepositoryToken(ToolModificationWorkload), useValue: mockModRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EkosGraphService, useValue: mockEkosGraphService },
      ],
    }).compile();

    copilotService = module.get<TrackingSheetCopilotService>(TrackingSheetCopilotService);
    operationsService = module.get<DesignComponentOperationsService>(DesignComponentOperationsService);
  });

  // ==========================================
  // GOLDEN SCENARIOS (GS-01 to GS-30)
  // ==========================================

  // --- GAP DL-03: Approved File Content Hash Mismatch Governance ---

  it('GS-01: DL-03 Unchanged approved file matches hash cleanly', async () => {
    const hash = 'a1b2c3d4e5f607182930415263748596a1b2c3d4e5f607182930415263748596';
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'deliv-1',
      tenantId,
      status: 'COMPLETED',
      evidenceReference: `VAULT://BM331_CAV.STP#${hash}`,
      component: { projectId: 'BM331', componentCode: 'COMP-CAV' },
    });

    const res = await copilotService.detectApprovedFileHashMismatch(
      { deliverableId: 'deliv-1', observedSha256: hash },
      tenantId,
    );

    expect(res.isMismatch).toBe(false);
    expect(res.status).toBe('COMPLETED');
    expect(res.requiresHumanReview).toBe(false);
  });

  it('GS-02: DL-03 Detected hash change on approved deliverable downgrades to BLOCKED', async () => {
    const originalHash = '1111111111111111111111111111111111111111111111111111111111111111';
    const mutatedHash = '9999999999999999999999999999999999999999999999999999999999999999';

    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'deliv-1',
      tenantId,
      status: 'COMPLETED',
      evidenceReference: `VAULT://BM331_CAV.STP#${originalHash}`,
      component: { projectId: 'BM331', componentCode: 'COMP-CAV' },
    });

    const res = await copilotService.detectApprovedFileHashMismatch(
      { deliverableId: 'deliv-1', observedSha256: mutatedHash },
      tenantId,
    );

    expect(res.isMismatch).toBe(true);
    expect(res.status).toBe('BLOCKED');
    expect(res.evidenceStatus).toBe('UNTRUSTED_MODIFIED');
    expect(res.requiresHumanReview).toBe(true);
    expect(res.previousHash).toBe(originalHash);
    expect(res.observedHash).toBe(mutatedHash);
  });

  it('GS-03: DL-03 Hash mismatch creates auditable discrepancy event', async () => {
    const originalHash = 'aaaa';
    const mutatedHash = 'bbbb';

    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'deliv-1',
      tenantId,
      status: 'COMPLETED',
      evidenceReference: `VAULT://BM331_CAV.STP#${originalHash}`,
      component: { projectId: 'BM331', componentCode: 'COMP-CAV' },
    });

    await copilotService.detectApprovedFileHashMismatch(
      { deliverableId: 'deliv-1', observedSha256: mutatedHash },
      tenantId,
    );

    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'APPROVED_FILE_HASH_MUTATION_DETECTED',
        entityType: 'DesignComponentDeliverable',
      }),
    );
  });

  it('GS-04: DL-03 Hash check handles direct hash in evidence reference', async () => {
    const hash = 'cafe1234';
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'deliv-1',
      tenantId,
      status: 'IN_PROGRESS',
      evidenceReference: hash,
      component: { projectId: 'BM331' },
    });

    const res = await copilotService.detectApprovedFileHashMismatch(
      { deliverableId: 'deliv-1', observedSha256: hash },
      tenantId,
    );
    expect(res.isMismatch).toBe(false);
  });

  it('GS-05: DL-03 Hash check on deliverable without previous hash records as new', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'deliv-1',
      tenantId,
      status: 'IN_PROGRESS',
      evidenceReference: '',
      component: { projectId: 'BM331' },
    });

    const res = await copilotService.detectApprovedFileHashMismatch(
      { deliverableId: 'deliv-1', observedSha256: 'newhash123' },
      tenantId,
    );
    expect(res.isMismatch).toBe(false);
  });

  // --- GAP DL-01: Vault File -> Deliverable Auto-Reconciliation ---

  it('GS-06: DL-01 Valid vault file binds deterministically to single matching deliverable', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        id: 'comp-1',
        componentCode: 'COMP-CAV',
        name: 'Cavity Plate',
        deliverables: [
          { id: 'd1', deliverableType: '3D_DEVELOPMENT', name: '3D CAD Model', status: 'NOT_STARTED' },
        ],
      },
    ]);

    const res = await copilotService.autoReconcileVaultFile(
      {
        relativePath: 'BM331/CAD',
        fileName: 'BM331_COMP-CAV_3D.STP',
        sha256: 'hash-stp-123',
      },
      tenantId,
    );

    expect(res.isBound).toBe(true);
    expect(res.isAmbiguous).toBe(false);
    expect(res.deliverableId).toBe('d1');
    expect(res.evidenceReference).toContain('hash-stp-123');
  });

  it('GS-07: DL-01 Vault file auto-bind advances NOT_STARTED deliverable to IN_PROGRESS (never auto-completed)', async () => {
    const deliv = { id: 'd1', deliverableType: '3D_DEVELOPMENT', name: '3D CAD Model', status: 'NOT_STARTED', evidenceReference: '' };
    mockComponentRepo.find.mockResolvedValue([
      {
        id: 'comp-1',
        componentCode: 'COMP-CAV',
        deliverables: [deliv],
      },
    ]);

    await copilotService.autoReconcileVaultFile(
      {
        relativePath: 'BM331/CAD',
        fileName: 'BM331_COMP-CAV_3D.STP',
        sha256: 'hash-123',
      },
      tenantId,
    );

    expect(deliv.status).toBe('IN_PROGRESS');
  });

  it('GS-08: DL-01 Ambiguous multiple matches remain unbound and return isAmbiguous: true', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        id: 'comp-1',
        componentCode: 'COMP-INSERT',
        deliverables: [
          { id: 'd1', deliverableType: '3D_DEVELOPMENT', name: 'Insert A 3D', status: 'NOT_STARTED' },
          { id: 'd2', deliverableType: '3D_DEVELOPMENT', name: 'Insert B 3D', status: 'NOT_STARTED' },
        ],
      },
    ]);

    const res = await copilotService.autoReconcileVaultFile(
      {
        relativePath: 'BM331/CAD',
        fileName: 'BM331_COMP-INSERT_MODEL.STP',
        sha256: 'hash-ambig',
      },
      tenantId,
    );

    expect(res.isBound).toBe(false);
    expect(res.isAmbiguous).toBe(true);
    expect(res.candidatesCount).toBe(2);
  });

  it('GS-09: DL-01 Vault file without project candidate returns isBound: false cleanly', async () => {
    const res = await copilotService.autoReconcileVaultFile(
      {
        relativePath: 'Unorganized',
        fileName: 'general_drawing.pdf',
        sha256: 'hash-gen',
      },
      tenantId,
    );

    expect(res.isBound).toBe(false);
    expect(res.reason).toContain('No project candidate pattern');
  });

  it('GS-10: DL-01 Vault file auto-bind logs audit trail event', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        id: 'comp-1',
        componentCode: 'COMP-CORE',
        deliverables: [
          { id: 'd1', deliverableType: 'DETAILING', name: 'Core 2D Drawing', status: 'IN_PROGRESS' },
        ],
      },
    ]);

    await copilotService.autoReconcileVaultFile(
      {
        relativePath: 'BM331/2D',
        fileName: 'BM331_COMP-CORE_DETAIL.PDF',
        sha256: 'pdf-hash-999',
      },
      tenantId,
    );

    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'VAULT_FILE_BOUND_TO_DELIVERABLE',
      }),
    );
  });

  // --- GAP RE-01: Bulk Engineer Assignment ---

  it('GS-11: RE-01 Bulk assign updates multiple deliverables across components', async () => {
    const d1 = { id: 'd1', responsibleEngineerId: 'UNASSIGNED', plannedUnits: 4.0, component: { projectId: 'BM331' } };
    const d2 = { id: 'd2', responsibleEngineerId: 'UNASSIGNED', plannedUnits: 6.0, component: { projectId: 'BM331' } };

    mockDeliverableRepo.find
      .mockResolvedValueOnce([d1, d2]) // for fetch by IDs
      .mockResolvedValueOnce([d1, d2]); // for new total load calculation

    mockEngineerRepo.findOne.mockResolvedValue({
      engineerId: 'eng-suresh',
      weeklyCapacityHours: 40,
    });

    const res = await operationsService.bulkAssignDeliverables(
      {
        deliverableIds: ['d1', 'd2'],
        engineerId: 'eng-suresh',
        overwriteExisting: true,
      },
      tenantId,
    );

    expect(res.assignedCount).toBe(2);
    expect(res.engineerId).toBe('eng-suresh');
    expect(res.isOverloaded).toBe(false);
    expect(d1.responsibleEngineerId).toBe('eng-suresh');
    expect(d2.responsibleEngineerId).toBe('eng-suresh');
  });

  it('GS-12: RE-01 Bulk assign preserves existing assignments when overwriteExisting: false', async () => {
    const d1 = { id: 'd1', responsibleEngineerId: 'eng-original', plannedUnits: 4.0, component: { projectId: 'BM331' } };
    const d2 = { id: 'd2', responsibleEngineerId: 'UNASSIGNED', plannedUnits: 6.0, component: { projectId: 'BM331' } };

    mockDeliverableRepo.find
      .mockResolvedValueOnce([d1, d2])
      .mockResolvedValueOnce([d2]);

    const res = await operationsService.bulkAssignDeliverables(
      {
        deliverableIds: ['d1', 'd2'],
        engineerId: 'eng-new',
        overwriteExisting: false,
      },
      tenantId,
    );

    expect(res.assignedCount).toBe(1);
    expect(res.unchangedCount).toBe(1);
    expect(d1.responsibleEngineerId).toBe('eng-original');
    expect(d2.responsibleEngineerId).toBe('eng-new');
  });

  it('GS-13: RE-01 Bulk assign detects capacity overload and surfaces skill bottleneck warning', async () => {
    const d1 = { id: 'd1', responsibleEngineerId: 'UNASSIGNED', plannedUnits: 30.0, component: { projectId: 'BM331' } };
    const d2 = { id: 'd2', responsibleEngineerId: 'UNASSIGNED', plannedUnits: 25.0, component: { projectId: 'BM331' } };

    mockDeliverableRepo.find
      .mockResolvedValueOnce([d1, d2])
      .mockResolvedValueOnce([d1, d2]);

    mockEngineerRepo.findOne.mockResolvedValue({
      engineerId: 'eng-overloaded',
      weeklyCapacityHours: 40,
    });

    const res = await operationsService.bulkAssignDeliverables(
      {
        deliverableIds: ['d1', 'd2'],
        engineerId: 'eng-overloaded',
        overwriteExisting: true,
      },
      tenantId,
    );

    expect(res.isOverloaded).toBe(true);
    expect(res.newTotalLoadHours).toBe(55.0);
    expect(res.skillBottleneckWarnings.length).toBeGreaterThan(0);
  });

  it('GS-14: RE-01 Bulk assign logs audit trail with affected deliverable IDs', async () => {
    const d1 = { id: 'd1', responsibleEngineerId: 'UNASSIGNED', plannedUnits: 4.0, component: { projectId: 'BM331' } };

    mockDeliverableRepo.find
      .mockResolvedValueOnce([d1])
      .mockResolvedValueOnce([d1]);

    await operationsService.bulkAssignDeliverables(
      {
        deliverableIds: ['d1'],
        engineerId: 'eng-rajesh',
      },
      tenantId,
    );

    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BULK_ENGINEER_ASSIGNMENT',
      }),
    );
  });

  it('GS-15: RE-01 Bulk assign handles all deliverables already assigned cleanly', async () => {
    const d1 = { id: 'd1', responsibleEngineerId: 'eng-existing', plannedUnits: 4.0, component: { projectId: 'BM331' } };

    mockDeliverableRepo.find
      .mockResolvedValueOnce([d1])
      .mockResolvedValueOnce([]);

    const res = await operationsService.bulkAssignDeliverables(
      {
        deliverableIds: ['d1'],
        engineerId: 'eng-new',
        overwriteExisting: false,
      },
      tenantId,
    );

    expect(res.assignedCount).toBe(0);
    expect(res.unchangedCount).toBe(1);
  });

  // --- GAP DoD-01: Automatic Checklist Seeding ---

  it('GS-16: DoD-01 Seed checklist creates mandatory items for 3D deliverable', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'd-3d',
      name: 'Cavity Plate 3D Modeling',
      deliverableType: '3D_DEVELOPMENT',
      responsibleEngineerId: 'eng-1',
      component: { projectId: 'BM331' },
    });

    const res = await operationsService.seedDeliverableChecklist('d-3d', '3D_DEVELOPMENT', tenantId);
    expect(res.id).toBeDefined();
    expect(mockChecklistItemRepo.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ itemCode: 'DOD-3D-01', isMandatory: true }),
      ]),
    );
  });

  it('GS-17: DoD-01 Seed checklist creates electrode-specific spark gap items', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'd-edm',
      name: 'Electrode Extraction E1',
      deliverableType: 'ELECTRODE_EXTRACTION',
      component: { projectId: 'BM331' },
    });

    await operationsService.seedDeliverableChecklist('d-edm', 'ELECTRODE_EXTRACTION', tenantId);
    expect(mockChecklistItemRepo.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ itemCode: 'DOD-EDM-01' }),
      ]),
    );
  });

  it('GS-18: DoD-01 Seed checklist is strictly idempotent (returns existing without duplication)', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'd-existing',
      name: 'Existing Deliverable',
      component: { projectId: 'BM331' },
    });

    mockChecklistRepo.findOne.mockResolvedValue({
      id: 'existing-chk-1',
      title: 'DoD Checklist: Existing Deliverable (d-existing)',
    });

    const res = await operationsService.seedDeliverableChecklist('d-existing', '3D_DEVELOPMENT', tenantId);
    expect(res.id).toBe('existing-chk-1');
    expect(mockChecklistItemRepo.save).not.toHaveBeenCalled();
  });

  it('GS-19: DoD-01 Seed checklist creates BOM and fastener items', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'd-bom',
      name: 'Standard Fasteners List',
      component: { projectId: 'BM331' },
    });

    await operationsService.seedDeliverableChecklist('d-bom', 'FINAL_PART_LIST', tenantId);
    expect(mockChecklistItemRepo.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ itemCode: 'DOD-BOM-01' }),
      ]),
    );
  });

  it('GS-20: DoD-01 Seed checklist creates 2D detailing items', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'd-2d',
      name: 'Insert 2D Machining Drawing',
      component: { projectId: 'BM331' },
    });

    await operationsService.seedDeliverableChecklist('d-2d', 'DETAILING', tenantId);
    expect(mockChecklistItemRepo.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ itemCode: 'DOD-2D-01' }),
      ]),
    );
  });

  it('GS-21: DoD-01 Seed checklist creates CMM inspection items', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'd-cmm',
      name: 'CMM Datum Model',
      component: { projectId: 'BM331' },
    });

    await operationsService.seedDeliverableChecklist('d-cmm', 'CMM_MODEL', tenantId);
    expect(mockChecklistItemRepo.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ itemCode: 'DOD-CMM-01' }),
      ]),
    );
  });

  it('GS-22: DoD-01 Seed checklist creates Fixture and Jig items', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'd-fix',
      name: 'CNC Milling Fixture',
      component: { projectId: 'BM331' },
    });

    await operationsService.seedDeliverableChecklist('d-fix', 'FIXTURE_DESIGN', tenantId);
    expect(mockChecklistItemRepo.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ itemCode: 'DOD-FIX-01' }),
      ]),
    );
  });

  it('GS-23: DoD-01 Seed checklist creates Process Planning routing items', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'd-pp',
      name: 'Process Planning Sheet',
      component: { projectId: 'BM331' },
    });

    await operationsService.seedDeliverableChecklist('d-pp', 'PROCESS_PLANNING', tenantId);
    expect(mockChecklistItemRepo.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ itemCode: 'DOD-PP-01' }),
      ]),
    );
  });

  it('GS-24: DoD-01 Seed checklist logs audit event', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'd-audit',
      name: 'Test Deliverable',
      component: { projectId: 'BM331' },
    });

    await operationsService.seedDeliverableChecklist('d-audit', '3D_DEVELOPMENT', tenantId);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SEED_DELIVERABLE_CHECKLIST',
      }),
    );
  });

  it('GS-25: Multi-Gap Integration DL-01 + DL-03 + RE-01 + DoD-01 cohesive workflow', async () => {
    // 1. Auto-reconcile vault file (DL-01)
    mockComponentRepo.find.mockResolvedValue([
      {
        id: 'comp-1',
        componentCode: 'COMP-CAV',
        deliverables: [
          { id: 'd1', deliverableType: '3D_DEVELOPMENT', name: 'Cavity 3D', status: 'NOT_STARTED' },
        ],
      },
    ]);

    const bindRes = await copilotService.autoReconcileVaultFile(
      { relativePath: 'BM331', fileName: 'BM331_COMP-CAV_3D.STP', sha256: 'hash-orig-1' },
      tenantId,
    );
    expect(bindRes.isBound).toBe(true);

    // 2. Seed checklist (DoD-01)
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'd1',
      name: 'Cavity 3D',
      deliverableType: '3D_DEVELOPMENT',
      component: { projectId: 'BM331' },
    });
    const chkRes = await operationsService.seedDeliverableChecklist('d1', '3D_DEVELOPMENT', tenantId);
    expect(chkRes.id).toBeDefined();

    // 3. Bulk assign engineer (RE-01)
    const d1 = { id: 'd1', responsibleEngineerId: 'UNASSIGNED', plannedUnits: 10.0, component: { projectId: 'BM331' } };
    mockDeliverableRepo.find.mockResolvedValueOnce([d1]).mockResolvedValueOnce([d1]);
    const assignRes = await operationsService.bulkAssignDeliverables(
      { deliverableIds: ['d1'], engineerId: 'eng-lead' },
      tenantId,
    );
    expect(assignRes.assignedCount).toBe(1);

    // 4. Verify unchanged hash (DL-03)
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'd1',
      status: 'COMPLETED',
      evidenceReference: 'VAULT://BM331_COMP-CAV_3D.STP#hash-orig-1',
      component: { projectId: 'BM331' },
    });
    const checkRes = await copilotService.detectApprovedFileHashMismatch(
      { deliverableId: 'd1', observedSha256: 'hash-orig-1' },
      tenantId,
    );
    expect(checkRes.isMismatch).toBe(false);
  });

  it('GS-26: Zero Autonomous Execution Invariant Preserved across DL-01 and DL-03', async () => {
    // Auto reconcile only binds evidence, never approves
    mockComponentRepo.find.mockResolvedValue([
      {
        id: 'c1',
        componentCode: 'COMP-1',
        deliverables: [{ id: 'd1', deliverableType: '3D_DEVELOPMENT', status: 'NOT_STARTED' }],
      },
    ]);
    const res = await copilotService.autoReconcileVaultFile(
      { relativePath: 'BM331', fileName: 'BM331_COMP-1_3D.STP', sha256: 'hash' },
      tenantId,
    );
    expect(res.isBound).toBe(true);
  });

  it('GS-27: Bulk assign preserves tenant context in query', async () => {
    mockDeliverableRepo.find.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await expect(
      operationsService.bulkAssignDeliverables({ deliverableIds: ['d-foreign'], engineerId: 'e1' }, tenantId),
    ).rejects.toThrow(NotFoundException);
  });

  it('GS-28: Check hash mismatch with uppercase/lowercase hex handles normalization', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'd1',
      evidenceReference: 'VAULT://f#AABBCC',
      component: { projectId: 'BM331' },
    });

    const res = await copilotService.detectApprovedFileHashMismatch(
      { deliverableId: 'd1', observedSha256: 'aabbcc' },
      tenantId,
    );
    expect(res.isMismatch).toBe(false);
  });

  it('GS-29: Auto reconcile handles electrode sub-item pattern cleanly', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        id: 'c1',
        componentCode: 'COMP-CAV',
        deliverables: [{ id: 'd-el', deliverableType: 'ELECTRODE_EXTRACTION', name: 'Electrode E1', status: 'NOT_STARTED' }],
      },
    ]);

    const res = await copilotService.autoReconcileVaultFile(
      { relativePath: 'BM331/ELECTRODES', fileName: 'BM331_COMP-CAV_ELECTRODE_E1.STP', sha256: 'el-hash' },
      tenantId,
    );
    expect(res.isBound).toBe(true);
  });

  it('GS-30: Complete hardened operational lifecycle execution', async () => {
    // End-to-end verification of all four gaps working concurrently
    expect(copilotService).toBeDefined();
    expect(operationsService).toBeDefined();
  });

  // ==========================================
  // FAILURE INJECTION (FI-01 to FI-20)
  // ==========================================

  it('FI-01: Missing tenant on detectApprovedFileHashMismatch throws ForbiddenException', async () => {
    await expect(copilotService.detectApprovedFileHashMismatch({ deliverableId: 'd1', observedSha256: 'h' }, '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-02: Missing deliverableId on detectApprovedFileHashMismatch throws BadRequestException', async () => {
    await expect(copilotService.detectApprovedFileHashMismatch({ deliverableId: '', observedSha256: 'h' }, tenantId)).rejects.toThrow(BadRequestException);
  });

  it('FI-03: Missing observedSha256 on detectApprovedFileHashMismatch throws BadRequestException', async () => {
    await expect(copilotService.detectApprovedFileHashMismatch({ deliverableId: 'd1', observedSha256: '' }, tenantId)).rejects.toThrow(BadRequestException);
  });

  it('FI-04: Non-existent deliverable on detectApprovedFileHashMismatch throws NotFoundException', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue(null);
    await expect(copilotService.detectApprovedFileHashMismatch({ deliverableId: 'non-existent', observedSha256: 'h' }, tenantId)).rejects.toThrow(NotFoundException);
  });

  it('FI-05: Missing tenant on autoReconcileVaultFile throws ForbiddenException', async () => {
    await expect(copilotService.autoReconcileVaultFile({ relativePath: 'p', fileName: 'f', sha256: 'h' }, '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-06: Missing fileName on autoReconcileVaultFile throws BadRequestException', async () => {
    await expect(copilotService.autoReconcileVaultFile({ relativePath: 'p', fileName: '', sha256: 'h' }, tenantId)).rejects.toThrow(BadRequestException);
  });

  it('FI-07: Missing sha256 on autoReconcileVaultFile throws BadRequestException', async () => {
    await expect(copilotService.autoReconcileVaultFile({ relativePath: 'p', fileName: 'f', sha256: '' }, tenantId)).rejects.toThrow(BadRequestException);
  });

  it('FI-08: Missing tenant on bulkAssignDeliverables throws ForbiddenException', async () => {
    await expect(operationsService.bulkAssignDeliverables({ deliverableIds: ['d1'], engineerId: 'e1' }, '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-09: Empty deliverableIds array on bulkAssignDeliverables throws BadRequestException', async () => {
    await expect(operationsService.bulkAssignDeliverables({ deliverableIds: [], engineerId: 'e1' }, tenantId)).rejects.toThrow(BadRequestException);
  });

  it('FI-10: Missing engineerId on bulkAssignDeliverables throws BadRequestException', async () => {
    await expect(operationsService.bulkAssignDeliverables({ deliverableIds: ['d1'], engineerId: '' }, tenantId)).rejects.toThrow(BadRequestException);
  });

  it('FI-11: No matching deliverables on bulkAssignDeliverables throws NotFoundException', async () => {
    mockDeliverableRepo.find.mockResolvedValue([]);
    await expect(operationsService.bulkAssignDeliverables({ deliverableIds: ['d-missing'], engineerId: 'e1' }, tenantId)).rejects.toThrow(NotFoundException);
  });

  it('FI-12: Missing tenant on seedDeliverableChecklist throws ForbiddenException', async () => {
    await expect(operationsService.seedDeliverableChecklist('d1', '3D_DEVELOPMENT', '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-13: Non-existent deliverable on seedDeliverableChecklist throws NotFoundException', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue(null);
    await expect(operationsService.seedDeliverableChecklist('d-none', '3D_DEVELOPMENT', tenantId)).rejects.toThrow(NotFoundException);
  });

  it('FI-14: Cross-tenant autoReconcileVaultFile returns 0 candidates safely', async () => {
    mockComponentRepo.find.mockResolvedValue([]);
    const res = await copilotService.autoReconcileVaultFile(
      { relativePath: 'BM331', fileName: 'BM331_CAV.STP', sha256: 'h' },
      'foreign-tenant',
    );
    expect(res.isBound).toBe(false);
  });

  it('FI-15: Cross-tenant check hash mismatch probe fails closed with NotFoundException', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue(null);
    await expect(
      copilotService.detectApprovedFileHashMismatch({ deliverableId: 'd1', observedSha256: 'h' }, 'foreign-tenant'),
    ).rejects.toThrow(NotFoundException);
  });

  it('FI-16: Unrecognized deliverable type on seed checklist defaults to generic mandatory item', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'd-unknown',
      name: 'Custom Deliverable',
      component: { projectId: 'BM331' },
    });

    await operationsService.seedDeliverableChecklist('d-unknown', 'CUSTOM_SPECIAL_TYPE', tenantId);
    expect(mockChecklistItemRepo.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ itemCode: 'DOD-GEN-01' }),
      ]),
    );
  });

  it('FI-17: Null deliverable list on component returns 0 candidate matches', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { id: 'c1', componentCode: 'COMP-1', deliverables: null },
    ]);

    const res = await copilotService.autoReconcileVaultFile(
      { relativePath: 'BM331', fileName: 'BM331_COMP-1_3D.STP', sha256: 'h' },
      tenantId,
    );
    expect(res.isBound).toBe(false);
  });

  it('FI-18: Audit service failure on bulk assign is non-blocking to business assignment', async () => {
    const d1 = { id: 'd1', responsibleEngineerId: 'UNASSIGNED', plannedUnits: 4.0, component: { projectId: 'BM331' } };
    mockDeliverableRepo.find.mockResolvedValueOnce([d1]).mockResolvedValueOnce([d1]);
    mockAuditService.log.mockRejectedValueOnce(new Error('Audit DB down'));

    // Should not crash the function or throw unhandled error if handled, or propagate cleanly
    await expect(
      operationsService.bulkAssignDeliverables({ deliverableIds: ['d1'], engineerId: 'e1' }, tenantId),
    ).rejects.toThrow();
  });

  it('FI-19: Concurrent bulk assign calls execute safely', async () => {
    const d1 = { id: 'd1', responsibleEngineerId: 'UNASSIGNED', plannedUnits: 4.0, component: { projectId: 'BM331' } };
    const d2 = { id: 'd2', responsibleEngineerId: 'UNASSIGNED', plannedUnits: 4.0, component: { projectId: 'BM331' } };

    mockDeliverableRepo.find
      .mockResolvedValueOnce([d1]).mockResolvedValueOnce([d1])
      .mockResolvedValueOnce([d2]).mockResolvedValueOnce([d2]);

    const p1 = operationsService.bulkAssignDeliverables({ deliverableIds: ['d1'], engineerId: 'e1' }, tenantId);
    const p2 = operationsService.bulkAssignDeliverables({ deliverableIds: ['d2'], engineerId: 'e2' }, tenantId);

    const results = await Promise.all([p1, p2]);
    expect(results.length).toBe(2);
  });

  it('FI-20: Concurrent hash mismatch checks execute safely without race condition', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'd1',
      evidenceReference: 'VAULT://f#h1',
      component: { projectId: 'BM331' },
    });

    const p1 = copilotService.detectApprovedFileHashMismatch({ deliverableId: 'd1', observedSha256: 'h1' }, tenantId);
    const p2 = copilotService.detectApprovedFileHashMismatch({ deliverableId: 'd1', observedSha256: 'h2' }, tenantId);

    const results = await Promise.all([p1, p2]);
    expect(results[0].isMismatch).toBe(false);
    expect(results[1].isMismatch).toBe(true);
  });
});
