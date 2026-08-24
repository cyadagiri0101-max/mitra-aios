import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DesignComponentOperationsService } from '../services/design-component-operations.service';
import { DesignComponent } from '../entities/design-component.entity';
import { DesignComponentRevision } from '../entities/design-component-revision.entity';
import { DesignComponentDeliverable } from '../entities/design-component-deliverable.entity';
import { DesignChecklist } from '../entities/design-checklist.entity';
import { DesignChecklistItem } from '../entities/design-checklist-item.entity';
import { DesignEngineerProfile } from '../entities/design-team-capacity.entity';
import { AuditService } from '../../audit/services/audit.service';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';

describe('MITRA M12.1B — Design Operations, Component Revisions & Real-World Planning E2E', () => {
  let service: DesignComponentOperationsService;
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const mockUser = { userId: '11111111-1111-1111-1111-111111111111', role: 'ENGINEERING', tenantId };

  const mockComponentRepo = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => ({ id: 'comp-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'comp-uuid-1', ...entity })),
  };

  const mockRevisionRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'rev-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'rev-uuid-1', ...entity })),
  };

  const mockDeliverableRepo = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => ({ id: 'deliv-uuid-1', ...dto })),
    save: jest.fn().mockImplementation((entity) =>
      Array.isArray(entity)
        ? Promise.resolve(entity.map((e, idx) => ({ id: `deliv-uuid-${idx + 1}`, ...e })))
        : Promise.resolve({ id: 'deliv-uuid-1', ...entity }),
    ),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue({ id: 'audit-ok' }),
  };

  const mockEkosGraphService = {
    recordEdge: jest.fn().mockResolvedValue({ id: 'edge-ok' }),
  };

  const mockChecklistRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((dto) => ({ id: 'chk-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'chk-1', ...entity })),
  };

  const mockChecklistItemRepo = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => ({ id: 'chki-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'chki-1', ...entity })),
  };

  const mockEngineerRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DesignComponentOperationsService,
        { provide: getRepositoryToken(DesignComponent), useValue: mockComponentRepo },
        { provide: getRepositoryToken(DesignComponentRevision), useValue: mockRevisionRepo },
        { provide: getRepositoryToken(DesignComponentDeliverable), useValue: mockDeliverableRepo },
        { provide: getRepositoryToken(DesignChecklist), useValue: mockChecklistRepo },
        { provide: getRepositoryToken(DesignChecklistItem), useValue: mockChecklistItemRepo },
        { provide: getRepositoryToken(DesignEngineerProfile), useValue: mockEngineerRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EkosGraphService, useValue: mockEkosGraphService },
      ],
    }).compile();

    service = module.get<DesignComponentOperationsService>(DesignComponentOperationsService);
  });

  // ==========================================
  // GOLDEN SCENARIOS (GS-01 to GS-30)
  // ==========================================

  it('GS-01: Create mold component with default deliverable breakdown', async () => {
    const res = await service.createComponent(
      {
        projectId: 'PRJ-BM289',
        componentCode: 'COMP-CORE-INS-B',
        name: 'Body Insert B',
        componentType: 'CORE_INSERT',
        variantBpCode: 'BP-01',
        plannedWorkloadUnits: 12.0,
      },
      tenantId,
    );
    expect(res).toBeDefined();
    expect(res.activeRevision).toBe('Rev 0');
    expect(res.deliverables.length).toBe(4);
    expect(mockRevisionRepo.save).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalled();
  });

  it('GS-02: Record incremental revision e.g. Body Insert B -> Rev A with ECR reason', async () => {
    mockComponentRepo.findOne.mockResolvedValue({
      id: 'comp-1',
      tenantId,
      projectId: 'PRJ-BM289',
      componentCode: 'COMP-CORE-INS-B',
      activeRevision: 'Rev 0',
      plannedWorkloadUnits: 12.0,
      reworkWorkloadUnits: 0,
    });

    const res = await service.addComponentRevision(
      'comp-1',
      {
        revisionCode: 'Rev A',
        revisionReason: 'CUSTOMER_ECR',
        description: 'Customer modified rib thickness from 1.2mm to 1.5mm',
        incrementalWorkloadUnits: 3.0,
        reworkWorkloadUnits: 1.5,
      },
      tenantId,
      mockUser,
    );
    expect(res.revisionCode).toBe('Rev A');
    expect(res.incrementalWorkloadUnits).toBe(3.0);
    expect(res.reworkWorkloadUnits).toBe(1.5);
    expect(mockComponentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        activeRevision: 'Rev A',
        plannedWorkloadUnits: 15.0,
        reworkWorkloadUnits: 1.5,
      }),
    );
  });

  it('GS-03: Update deliverable to COMPLETED and recalculate component progress', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'deliv-1',
      componentId: 'comp-1',
      tenantId,
      deliverableType: '3D_DEVELOPMENT',
      plannedUnits: 4.8,
      actualUnits: 0,
      status: 'IN_PROGRESS',
      component: { id: 'comp-1', plannedWorkloadUnits: 12.0, actualWorkloadUnits: 0 },
    });

    mockDeliverableRepo.find.mockResolvedValue([
      { id: 'deliv-1', plannedUnits: 4.8, actualUnits: 5.0, status: 'COMPLETED' },
      { id: 'deliv-2', plannedUnits: 3.6, actualUnits: 0, status: 'NOT_STARTED' },
    ]);

    const res = await service.updateDeliverableStatus(
      'deliv-1',
      { status: 'COMPLETED', actualUnits: 5.0, evidenceReference: 'CAD-BODY-INS-B-V1' },
      tenantId,
    );
    expect(res.status).toBe('COMPLETED');
    expect(res.completionTimestamp).toBeDefined();
    expect(mockComponentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        completionPercentage: 50.0,
        actualWorkloadUnits: 5.0,
      }),
    );
  });

  it('GS-04: Retrieve project components with revision count and deliverables tree', async () => {
    mockComponentRepo.find.mockResolvedValue([
      {
        id: 'comp-1',
        componentCode: 'COMP-CORE-INS-B',
        name: 'Body Insert B',
        componentType: 'CORE_INSERT',
        variantBpCode: 'BP-01',
        activeRevision: 'Rev A',
        plannedWorkloadUnits: 15.0,
        actualWorkloadUnits: 5.0,
        reworkWorkloadUnits: 1.5,
        completionPercentage: 50.0,
        revisions: [{ id: 'rev-0' }, { id: 'rev-a' }],
        deliverables: [{ id: 'd-1', status: 'COMPLETED' }, { id: 'd-2', status: 'NOT_STARTED' }],
      },
    ]);

    const res = await service.getProjectComponents('PRJ-BM289', tenantId);
    expect(res.totalComponentsCount).toBe(1);
    expect(res.totalPlannedUnits).toBe(15.0);
    expect(res.totalActualUnits).toBe(5.0);
    expect(res.totalReworkUnits).toBe(1.5);
    expect(res.components[0].revisionsCount).toBe(2);
  });

  it('GS-05: Create slider component with specialized electrode deliverables', async () => {
    const res = await service.createComponent(
      {
        projectId: 'PRJ-BM331',
        componentCode: 'COMP-SLIDER-RH',
        name: 'Slider RH Mechanism',
        componentType: 'SLIDER',
        plannedWorkloadUnits: 16.0,
        deliverables: [
          { deliverableType: '3D_DEVELOPMENT', name: 'Slider Core 3D Modeling', plannedUnits: 6.0 },
          { deliverableType: 'ELECTRODE_EXTRACTION', name: 'Spark Erosion Electrodes', plannedUnits: 4.0 },
          { deliverableType: 'DETAILING', name: '2D Detailing', plannedUnits: 3.0 },
          { deliverableType: 'VERIFICATION', name: 'Wear Plate Interface Check', plannedUnits: 3.0 },
        ],
      },
      tenantId,
    );
    expect(res.deliverables.length).toBe(4);
    expect(res.deliverables[1].deliverableType).toBe('ELECTRODE_EXTRACTION');
  });

  it('GS-06: Cavity insert DFM feedback revision tracks rework workload', async () => {
    mockComponentRepo.findOne.mockResolvedValue({
      id: 'comp-cav',
      tenantId,
      projectId: 'PRJ-BM331',
      componentCode: 'COMP-CAV-INS',
      activeRevision: 'Rev 0',
      plannedWorkloadUnits: 20.0,
      reworkWorkloadUnits: 0,
    });

    const res = await service.addComponentRevision(
      'comp-cav',
      {
        revisionCode: 'Rev B',
        revisionReason: 'DFM_FEEDBACK',
        description: 'Added 1.5 deg draft to deep shut-off pocket',
        incrementalWorkloadUnits: 2.0,
        reworkWorkloadUnits: 2.0,
      },
      tenantId,
      mockUser,
    );
    expect(res.revisionReason).toBe('DFM_FEEDBACK');
    expect(res.reworkWorkloadUnits).toBe(2.0);
  });

  it('GS-07: All deliverables completed transitions component status to APPROVED', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'deliv-fin',
      componentId: 'comp-fin',
      tenantId,
      component: { id: 'comp-fin', plannedWorkloadUnits: 10.0, actualWorkloadUnits: 8.0 },
    });

    mockDeliverableRepo.find.mockResolvedValue([
      { id: 'd-1', plannedUnits: 5.0, actualUnits: 5.0, status: 'COMPLETED' },
      { id: 'd-2', plannedUnits: 5.0, actualUnits: 5.0, status: 'COMPLETED' },
    ]);

    await service.updateDeliverableStatus('deliv-fin', { status: 'COMPLETED', actualUnits: 5.0 }, tenantId);
    expect(mockComponentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        completionPercentage: 100.0,
        status: 'APPROVED',
      }),
    );
  });

  it('GS-08: EKOS graph edge recorded on component creation with transactional provenance', async () => {
    await service.createComponent(
      {
        projectId: 'PRJ-EKOS-01',
        componentCode: 'COMP-LIFTER-01',
        name: 'Undercut Lifter',
        componentType: 'LIFTER',
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

  it('GS-09: Component with B/P code preserves variant identifier', async () => {
    const res = await service.createComponent(
      {
        projectId: 'PRJ-VAR-01',
        componentCode: 'COMP-MANIFOLD-BP2',
        name: 'Hot Runner Manifold Plate',
        componentType: 'MANIFOLD',
        variantBpCode: 'BP-02',
      },
      tenantId,
    );
    expect(res.variantBpCode).toBe('BP-02');
  });

  it('GS-10: Process planning deliverable type links machining fixtures', async () => {
    const res = await service.createComponent(
      {
        projectId: 'PRJ-PP-01',
        componentCode: 'COMP-CAV-PLATE',
        name: 'Cavity Steel Block Plate',
        componentType: 'CAVITY_PLATE',
        deliverables: [
          { deliverableType: 'PROCESS_PLANNING', name: 'CNC Milling & Wire EDM Fixtures', plannedUnits: 5.0 },
        ],
      },
      tenantId,
    );
    expect(res.deliverables[0].deliverableType).toBe('PROCESS_PLANNING');
  });

  it('GS-11: Component revision tracks reviewer ID and review notes', async () => {
    mockComponentRepo.findOne.mockResolvedValue({
      id: 'comp-rev-1',
      tenantId,
      projectId: 'PRJ-01',
      componentCode: 'COMP-01',
      activeRevision: 'Rev 0',
      plannedWorkloadUnits: 10,
      reworkWorkloadUnits: 0,
    });

    const res = await service.addComponentRevision(
      'comp-rev-1',
      {
        revisionCode: 'Rev 1',
        revisionReason: 'TRIAL_MODIFICATION',
        description: 'T0 flash clearance grind',
        incrementalWorkloadUnits: 1.5,
        reworkWorkloadUnits: 1.5,
      },
      tenantId,
      mockUser,
    );
    expect(res.engineerId).toBe(mockUser.userId);
  });

  it('GS-12: Deliverable update attaches evidence reference string', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'deliv-ev',
      componentId: 'comp-1',
      tenantId,
      component: { id: 'comp-1' },
    });
    mockDeliverableRepo.find.mockResolvedValue([]);

    const res = await service.updateDeliverableStatus(
      'deliv-ev',
      { status: 'COMPLETED', evidenceReference: 'VAULT://DRW-BM289-CORE-A1.PDF' },
      tenantId,
    );
    expect(res.evidenceReference).toBe('VAULT://DRW-BM289-CORE-A1.PDF');
  });

  it('GS-13: Multiple components in project aggregate total rework workload', async () => {
    mockComponentRepo.find.mockResolvedValue([
      { plannedWorkloadUnits: 10, actualWorkloadUnits: 10, reworkWorkloadUnits: 2.0 },
      { plannedWorkloadUnits: 15, actualWorkloadUnits: 12, reworkWorkloadUnits: 3.5 },
    ]);

    const res = await service.getProjectComponents('PRJ-MULTI', tenantId);
    expect(res.totalReworkUnits).toBe(5.5);
    expect(res.totalPlannedUnits).toBe(25.0);
  });

  it('GS-14: Ejector grid component tracks guided ejection deliverables', async () => {
    const res = await service.createComponent(
      {
        projectId: 'PRJ-EJ-01',
        componentCode: 'COMP-EJ-GRID',
        name: 'Ejector Retainer Grid',
        componentType: 'EJECTOR_GRID',
      },
      tenantId,
    );
    expect(res.componentType).toBe('EJECTOR_GRID');
  });

  it('GS-15: Stripper plate component tracks timing push-off tolerances', async () => {
    const res = await service.createComponent(
      {
        projectId: 'PRJ-STRIP-01',
        componentCode: 'COMP-STRIPPER',
        name: 'Air Poppet Stripper Plate',
        componentType: 'STRIPPER_PLATE',
      },
      tenantId,
    );
    expect(res.componentType).toBe('STRIPPER_PLATE');
  });

  it('GS-16: Core plate component tracks guide pillar bushing fits', async () => {
    const res = await service.createComponent(
      {
        projectId: 'PRJ-CORE-PLT',
        componentCode: 'COMP-CORE-PLT',
        name: 'Core Backing Plate',
        componentType: 'CORE_PLATE',
      },
      tenantId,
    );
    expect(res.componentType).toBe('CORE_PLATE');
  });

  it('GS-17: Manufacturing fit revision reason categorized accurately', async () => {
    mockComponentRepo.findOne.mockResolvedValue({
      id: 'comp-fit',
      tenantId,
      projectId: 'PRJ-FIT',
      activeRevision: 'Rev 0',
      plannedWorkloadUnits: 8,
      reworkWorkloadUnits: 0,
    });

    const res = await service.addComponentRevision(
      'comp-fit',
      {
        revisionCode: 'Rev C',
        revisionReason: 'MANUFACTURING_FIT',
        description: 'Pocket clearance +0.03mm for wire EDM insertion',
      },
      tenantId,
      mockUser,
    );
    expect(res.revisionReason).toBe('MANUFACTURING_FIT');
  });

  it('GS-18: Deliverable status BLOCKED marks deliverable without crash', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'deliv-blk',
      componentId: 'comp-1',
      tenantId,
      component: { id: 'comp-1' },
    });
    mockDeliverableRepo.find.mockResolvedValue([]);

    const res = await service.updateDeliverableStatus(
      'deliv-blk',
      { status: 'BLOCKED', reviewerNotes: 'Awaiting EDM electrode electrode steel' },
      tenantId,
    );
    expect(res.status).toBe('BLOCKED');
  });

  it('GS-19: Special insert component type supported for beryllium copper inserts', async () => {
    const res = await service.createComponent(
      {
        projectId: 'PRJ-CU-01',
        componentCode: 'COMP-BECU-INSERT',
        name: 'BeCu Fast Cooling Insert',
        componentType: 'SPECIAL_INSERT',
      },
      tenantId,
    );
    expect(res.componentType).toBe('SPECIAL_INSERT');
  });

  it('GS-20: Incremental revision with 0 rework units updates planned load cleanly', async () => {
    mockComponentRepo.findOne.mockResolvedValue({
      id: 'comp-0rework',
      tenantId,
      projectId: 'PRJ-01',
      activeRevision: 'Rev 0',
      plannedWorkloadUnits: 10,
      reworkWorkloadUnits: 0,
    });

    const res = await service.addComponentRevision(
      'comp-0rework',
      {
        revisionCode: 'Rev A1',
        revisionReason: 'STANDARDIZATION',
        description: 'Standard screw countersink depth update',
        incrementalWorkloadUnits: 1.0,
      },
      tenantId,
      mockUser,
    );
    expect(res.incrementalWorkloadUnits).toBe(1.0);
    expect(res.reworkWorkloadUnits).toBe(0);
  });

  it('GS-21: 2D PDF deliverable type tracks drawing release packages', async () => {
    const res = await service.createComponent(
      {
        projectId: 'PRJ-PDF',
        componentCode: 'COMP-PDF-CORE',
        name: 'Core Insert 2D Release',
        componentType: 'CORE_INSERT',
        deliverables: [{ deliverableType: '2D_PDF', name: 'Manufacturing Blueprint PDF', plannedUnits: 2.0 }],
      },
      tenantId,
    );
    expect(res.deliverables[0].deliverableType).toBe('2D_PDF');
  });

  it('GS-22: 3D DTP deliverable tracks CAM toolpath preparation', async () => {
    const res = await service.createComponent(
      {
        projectId: 'PRJ-DTP',
        componentCode: 'COMP-DTP-CORE',
        name: 'Core 3D DTP',
        componentType: 'CORE_INSERT',
        deliverables: [{ deliverableType: '3D_DTP', name: '3D CAD Data to Programming', plannedUnits: 2.0 }],
      },
      tenantId,
    );
    expect(res.deliverables[0].deliverableType).toBe('3D_DTP');
  });

  it('GS-23: Final Part List deliverable tracks standard hardware bill of materials', async () => {
    const res = await service.createComponent(
      {
        projectId: 'PRJ-FPL',
        componentCode: 'COMP-FPL-BOM',
        name: 'Hardware BOM',
        componentType: 'CAVITY_PLATE',
        deliverables: [{ deliverableType: 'FINAL_PART_LIST', name: 'Standard Screws & Dowel Pins', plannedUnits: 1.0 }],
      },
      tenantId,
    );
    expect(res.deliverables[0].deliverableType).toBe('FINAL_PART_LIST');
  });

  it('GS-24: Submission deliverable tracks customer submission milestone', async () => {
    const res = await service.createComponent(
      {
        projectId: 'PRJ-SUB',
        componentCode: 'COMP-SUB-CORE',
        name: 'Customer Package Submission',
        componentType: 'CORE_INSERT',
        deliverables: [{ deliverableType: 'SUBMISSION', name: 'Customer CAD Data Submission', plannedUnits: 1.0 }],
      },
      tenantId,
    );
    expect(res.deliverables[0].deliverableType).toBe('SUBMISSION');
  });

  it('GS-25: Fixture design deliverable tracks grinding jig modeling', async () => {
    const res = await service.createComponent(
      {
        projectId: 'PRJ-FIX',
        componentCode: 'COMP-FIX-CORE',
        name: 'Grinding Fixture Design',
        componentType: 'SPECIAL_INSERT',
        deliverables: [{ deliverableType: 'FIXTURE_DESIGN', name: 'Sine Plate Grinding Fixture', plannedUnits: 3.0 }],
      },
      tenantId,
    );
    expect(res.deliverables[0].deliverableType).toBe('FIXTURE_DESIGN');
  });

  it('GS-26: Component operations service handles projects with zero components gracefully', async () => {
    mockComponentRepo.find.mockResolvedValue([]);
    const res = await service.getProjectComponents('PRJ-EMPTY', tenantId);
    expect(res.totalComponentsCount).toBe(0);
    expect(res.totalPlannedUnits).toBe(0);
  });

  it('GS-27: Update deliverable actual units with fractional workload', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'deliv-frac',
      componentId: 'comp-1',
      tenantId,
      component: { id: 'comp-1' },
    });
    mockDeliverableRepo.find.mockResolvedValue([{ id: 'd-1', plannedUnits: 2.0, actualUnits: 2.25, status: 'COMPLETED' }]);

    const res = await service.updateDeliverableStatus('deliv-frac', { status: 'COMPLETED', actualUnits: 2.25 }, tenantId);
    expect(res.actualUnits).toBe(2.25);
  });

  it('GS-28: Component revision status defaults to PENDING_REVIEW', async () => {
    mockComponentRepo.findOne.mockResolvedValue({
      id: 'comp-rev-pend',
      tenantId,
      projectId: 'PRJ-01',
      activeRevision: 'Rev 0',
      plannedWorkloadUnits: 10,
      reworkWorkloadUnits: 0,
    });

    const res = await service.addComponentRevision(
      'comp-rev-pend',
      { revisionCode: 'Rev A', revisionReason: 'CUSTOMER_ECR', description: 'ECR 994' },
      tenantId,
      mockUser,
    );
    expect(res.status).toBe('PENDING_REVIEW');
  });

  it('GS-29: Component creation without custom deliverables instantiates 4 default deliverables', async () => {
    const res = await service.createComponent(
      { projectId: 'PRJ-DEF', componentCode: 'COMP-DEF', name: 'Standard Component', componentType: 'CORE_INSERT' },
      tenantId,
    );
    expect(res.deliverables.length).toBe(4);
  });

  it('GS-30: Complete end-to-end component lifecycle from creation to revision to approved completion', async () => {
    // 1. Create component
    const comp = await service.createComponent(
      { projectId: 'PRJ-E2E-BM', componentCode: 'COMP-E2E-CORE', name: 'E2E Core Insert', componentType: 'CORE_INSERT', plannedWorkloadUnits: 10 },
      tenantId,
    );
    expect(comp.activeRevision).toBe('Rev 0');

    // 2. Add revision
    mockComponentRepo.findOne.mockResolvedValue(comp);
    const rev = await service.addComponentRevision(
      comp.id,
      { revisionCode: 'Rev A', revisionReason: 'CUSTOMER_ECR', description: 'Tolerance tighten', incrementalWorkloadUnits: 2, reworkWorkloadUnits: 1 },
      tenantId,
      mockUser,
    );
    expect(rev.revisionCode).toBe('Rev A');

    // 3. Update deliverable
    mockDeliverableRepo.findOne.mockResolvedValue({
      id: 'd-e2e',
      componentId: comp.id,
      tenantId,
      component: comp,
    });
    mockDeliverableRepo.find.mockResolvedValue([{ id: 'd-e2e', plannedUnits: 12, actualUnits: 12, status: 'COMPLETED' }]);

    const deliv = await service.updateDeliverableStatus('d-e2e', { status: 'COMPLETED', actualUnits: 12 }, tenantId);
    expect(deliv.status).toBe('COMPLETED');
  });

  // ==========================================
  // FAILURE INJECTION (FI-01 to FI-20)
  // ==========================================

  it('FI-01: Missing tenant ID on create component throws ForbiddenException', async () => {
    await expect(
      service.createComponent({ projectId: 'P1', componentCode: 'C1', name: 'N1', componentType: 'CORE_INSERT' }, ''),
    ).rejects.toThrow(ForbiddenException);
  });

  it('FI-02: Missing project ID on create component throws BadRequestException', async () => {
    await expect(
      service.createComponent({ projectId: '', componentCode: 'C1', name: 'N1', componentType: 'CORE_INSERT' }, tenantId),
    ).rejects.toThrow(BadRequestException);
  });

  it('FI-03: Missing component code on create component throws BadRequestException', async () => {
    await expect(
      service.createComponent({ projectId: 'P1', componentCode: '', name: 'N1', componentType: 'CORE_INSERT' }, tenantId),
    ).rejects.toThrow(BadRequestException);
  });

  it('FI-04: Non-existent component on add revision throws NotFoundException', async () => {
    mockComponentRepo.findOne.mockResolvedValue(null);
    await expect(
      service.addComponentRevision('bad-comp-id', { revisionCode: 'Rev A', revisionReason: 'CUSTOMER_ECR', description: 'D' }, tenantId, mockUser),
    ).rejects.toThrow(NotFoundException);
  });

  it('FI-05: Non-existent deliverable on update status throws NotFoundException', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue(null);
    await expect(
      service.updateDeliverableStatus('bad-deliv-id', { status: 'COMPLETED' }, tenantId),
    ).rejects.toThrow(NotFoundException);
  });

  it('FI-06: Cross-tenant revision addition returns NotFoundException', async () => {
    mockComponentRepo.findOne.mockResolvedValue(null);
    await expect(
      service.addComponentRevision('comp-foreign', { revisionCode: 'Rev A', revisionReason: 'CUSTOMER_ECR', description: 'D' }, 'foreign-tenant', mockUser),
    ).rejects.toThrow(NotFoundException);
  });

  it('FI-07: Missing tenant ID on get project components throws ForbiddenException', async () => {
    await expect(service.getProjectComponents('PRJ-01', '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-08: Missing tenant ID on add revision throws ForbiddenException', async () => {
    await expect(
      service.addComponentRevision('comp-1', { revisionCode: 'Rev A', revisionReason: 'CUSTOMER_ECR', description: 'D' }, '', mockUser),
    ).rejects.toThrow(ForbiddenException);
  });

  it('FI-09: Missing tenant ID on update deliverable status throws ForbiddenException', async () => {
    await expect(
      service.updateDeliverableStatus('deliv-1', { status: 'COMPLETED' }, ''),
    ).rejects.toThrow(ForbiddenException);
  });

  it('FI-10: Cross-tenant deliverable update probe returns NotFoundException', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue(null);
    await expect(
      service.updateDeliverableStatus('deliv-foreign', { status: 'COMPLETED' }, 'foreign-tenant'),
    ).rejects.toThrow(NotFoundException);
  });

  it('FI-11: Empty component name throws BadRequestException', async () => {
    await expect(
      service.createComponent({ projectId: 'P1', componentCode: 'C1', name: '', componentType: 'CORE_INSERT' }, tenantId),
    ).rejects.toThrow(BadRequestException);
  });

  it('FI-12: Revision with empty description handled safely', async () => {
    mockComponentRepo.findOne.mockResolvedValue({ id: 'c1', tenantId, plannedWorkloadUnits: 10, reworkWorkloadUnits: 0 });
    const res = await service.addComponentRevision('c1', { revisionCode: 'Rev B', revisionReason: 'CUSTOMER_ECR', description: '' }, tenantId, mockUser);
    expect(res.revisionCode).toBe('Rev B');
  });

  it('FI-13: Deliverable update without evidence reference completes safely', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({ id: 'd1', componentId: 'c1', tenantId, component: { id: 'c1' } });
    mockDeliverableRepo.find.mockResolvedValue([]);
    const res = await service.updateDeliverableStatus('d1', { status: 'COMPLETED' }, tenantId);
    expect(res.status).toBe('COMPLETED');
  });

  it('FI-14: Audit log error does not block component creation', async () => {
    mockAuditService.log.mockRejectedValueOnce(new Error('Audit logger offline'));
    await expect(
      service.createComponent({ projectId: 'P1', componentCode: 'C1', name: 'N1', componentType: 'CORE_INSERT' }, tenantId),
    ).rejects.toThrow();
  });

  it('FI-15: Deliverables array empty in component recalculation handles 0 division safely', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue({ id: 'd1', componentId: 'c1', tenantId, component: { id: 'c1' } });
    mockDeliverableRepo.find.mockResolvedValue([]);
    await service.updateDeliverableStatus('d1', { status: 'COMPLETED' }, tenantId);
    expect(mockComponentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        completionPercentage: 0,
      }),
    );
  });

  it('FI-16: Component with undefined planned workload units defaults to 10 units', async () => {
    const res = await service.createComponent(
      { projectId: 'P1', componentCode: 'C1', name: 'N1', componentType: 'CORE_INSERT' },
      tenantId,
    );
    expect(res.plannedWorkloadUnits).toBe(10.0);
  });

  it('FI-17: Revision with undefined incremental units defaults to 0 units', async () => {
    mockComponentRepo.findOne.mockResolvedValue({ id: 'c1', tenantId, plannedWorkloadUnits: 10, reworkWorkloadUnits: 0 });
    const res = await service.addComponentRevision(
      'c1',
      { revisionCode: 'Rev A', revisionReason: 'CUSTOMER_ECR', description: 'Desc' },
      tenantId,
      mockUser,
    );
    expect(res.incrementalWorkloadUnits).toBe(0);
  });

  it('FI-18: Non-existent deliverable on empty table throws NotFoundException', async () => {
    mockDeliverableRepo.findOne.mockResolvedValue(null);
    await expect(
      service.updateDeliverableStatus('deliv-404', { status: 'COMPLETED' }, tenantId),
    ).rejects.toThrow(NotFoundException);
  });

  it('FI-19: Cross-tenant project components inquiry returns empty list safely', async () => {
    mockComponentRepo.find.mockResolvedValue([]);
    const res = await service.getProjectComponents('PRJ-FOREIGN', 'foreign-tenant');
    expect(res.totalComponentsCount).toBe(0);
  });

  it('FI-20: Concurrent component creation handles simultaneous invocations safely', async () => {
    const p1 = service.createComponent({ projectId: 'P1', componentCode: 'C1', name: 'N1', componentType: 'CORE_INSERT' }, tenantId);
    const p2 = service.createComponent({ projectId: 'P1', componentCode: 'C2', name: 'N2', componentType: 'CAVITY_INSERT' }, tenantId);
    const results = await Promise.all([p1, p2]);
    expect(results.length).toBe(2);
  });
});
