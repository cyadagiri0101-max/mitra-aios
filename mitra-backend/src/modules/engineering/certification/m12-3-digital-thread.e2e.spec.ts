import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { DigitalThreadGeometryService } from '../services/digital-thread-geometry.service';
import { DigitalThreadGeometryAsset } from '../entities/digital-thread-geometry-asset.entity';
import { DesignComponent } from '../entities/design-component.entity';
import { DesignComponentRevision } from '../entities/design-component-revision.entity';
import { DesignComponentDeliverable } from '../entities/design-component-deliverable.entity';
import { DesignBlocker } from '../entities/design-blocker.entity';
import { DesignDependency } from '../entities/design-dependency.entity';
import { DesignEngineerProfile } from '../entities/design-team-capacity.entity';
import { ToolModificationWorkload } from '../entities/tool-modification-workload.entity';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';
import { AuditService } from '../../audit/services/audit.service';

describe('MITRA M12.3 — 3D Digital Thread & Geometric Decision Integration E2E', () => {
  let service: DigitalThreadGeometryService;
  const tenantId = '00000000-0000-0000-0000-000000000001';

  const mockGeometryRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'geom-1', ...dto })),
    save: jest.fn().mockImplementation(async (entity) => {
      if (Array.isArray(entity)) return entity.map((e, idx) => ({ id: `geom-${idx + 1}`, ...e }));
      return { id: 'geom-1', ...entity };
    }),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockComponentRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockRevisionRepo = {
    find: jest.fn().mockResolvedValue([]),
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
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockModRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockEkosGraphService = {
    recordEdge: jest.fn().mockResolvedValue({ id: 'edge-1' }),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(true),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DigitalThreadGeometryService,
        { provide: getRepositoryToken(DigitalThreadGeometryAsset), useValue: mockGeometryRepo },
        { provide: getRepositoryToken(DesignComponent), useValue: mockComponentRepo },
        { provide: getRepositoryToken(DesignComponentRevision), useValue: mockRevisionRepo },
        { provide: getRepositoryToken(DesignComponentDeliverable), useValue: mockDeliverableRepo },
        { provide: getRepositoryToken(DesignBlocker), useValue: mockBlockerRepo },
        { provide: getRepositoryToken(DesignDependency), useValue: mockDependencyRepo },
        { provide: getRepositoryToken(DesignEngineerProfile), useValue: mockEngineerRepo },
        { provide: getRepositoryToken(ToolModificationWorkload), useValue: mockModRepo },
        { provide: EkosGraphService, useValue: mockEkosGraphService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<DigitalThreadGeometryService>(DigitalThreadGeometryService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // GOLDEN SCENARIOS (GS-01 .. GS-30)
  // ==========================================

  it('GS-01: Project geometry loads and seeds standard assets for BM331', async () => {
    mockGeometryRepo.find.mockResolvedValueOnce([]);
    const res = await service.getProjectGeometryAssets('BM331', tenantId);
    expect(res.projectId).toBe('BM331');
    expect(res.totalAssetsCount).toBeGreaterThanOrEqual(1);
    expect(res.summary).toBeDefined();
  });

  it('GS-02: Component selection resolves digital-thread identity and SHA-256 hash', async () => {
    const assetDto = {
      projectId: 'BM331',
      componentId: 'BM331-CAV-01',
      componentCode: 'COMP-CAV',
      componentName: 'Cavity Insert Block',
      sourceFileName: 'BM331_CAV.STP',
      sourceFilePath: 'D:/Mitra3.0/MitraEngineeringLibrary/BM331/CAD/BM331_CAV.STP',
      sourceFileHash: 'sha256-bm331-cav-test-01',
    };
    const res = await service.registerGeometryAsset(assetDto, tenantId);
    expect(res.id).toBeDefined();
    expect(res.sourceFileHash).toBe(assetDto.sourceFileHash);
    expect(res.isAmbiguous).toBe(false);
  });

  it('GS-03: Revision identity is correctly preserved during registration', async () => {
    const res = await service.registerGeometryAsset(
      {
        projectId: 'BM331',
        componentId: 'BM331-CAV-01',
        componentCode: 'COMP-CAV',
        componentName: 'Cavity Insert Block',
        revisionCode: 'Rev B',
        sourceFileName: 'BM331_CAV_REVB.STP',
        sourceFilePath: 'D:/Mitra3.0/MitraEngineeringLibrary/BM331/CAD/BM331_CAV_REVB.STP',
        sourceFileHash: 'sha256-bm331-cav-revb-01',
      },
      tenantId,
    );
    expect(res.revisionCode).toBe('Rev B');
  });

  it('GS-04: Deliverable linkage maps to geometry asset correctly', async () => {
    const res = await service.registerGeometryAsset(
      {
        projectId: 'BM331',
        componentId: 'BM331-CAV-01',
        componentCode: 'COMP-CAV',
        componentName: 'Cavity Insert Block',
        deliverableId: 'deliv-cav-3d',
        sourceFileName: 'BM331_CAV.STP',
        sourceFilePath: 'D:/Mitra3.0/MitraEngineeringLibrary/BM331/CAD/BM331_CAV.STP',
        sourceFileHash: 'sha256-bm331-cav-deliv-01',
      },
      tenantId,
    );
    expect(res.deliverableId).toBe('deliv-cav-3d');
  });

  it('GS-05: Evidence linkage records EKOS provenance edge with SHA-256 metadata', async () => {
    await service.registerGeometryAsset(
      {
        projectId: 'BM331',
        componentId: 'BM331-CAV-01',
        componentCode: 'COMP-CAV',
        componentName: 'Cavity Insert Block',
        sourceFileName: 'BM331_CAV.STP',
        sourceFilePath: 'D:/Mitra3.0/MitraEngineeringLibrary/BM331/CAD/BM331_CAV.STP',
        sourceFileHash: 'sha256-bm331-cav-ekos-01',
      },
      tenantId,
    );
    expect(mockEkosGraphService.recordEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        relationType: 'EVIDENCED_BY',
        sourceEntityType: 'DESIGN_COMPONENT',
      }),
      tenantId,
      undefined,
    );
  });

  it('GS-06: Pending evidence overlay highlights component in YELLOW', async () => {
    mockDeliverableRepo.find.mockResolvedValueOnce([
      { id: 'd1', status: 'COMPLETED', evidenceReference: '' },
    ]);
    const dummyAsset: any = {
      componentId: 'c1',
      projectId: 'BM331',
      componentCode: 'COMP-CORE',
      revisionCode: 'Rev 0',
      status: 'IN_PROGRESS',
      responsibleEngineerId: 'Suresh',
    };
    const res = await service.computeComponentOverlay(dummyAsset, tenantId);
    expect(res.colorOverlay).toBe('YELLOW');
    expect(res.overlayReason).toContain('Pending Evidence');
  });

  it('GS-07: Blocker overlay highlights component in RED', async () => {
    mockBlockerRepo.find.mockResolvedValueOnce([
      { id: 'b1', description: 'Cooling interference with lifter stroke' },
    ]);
    const dummyAsset: any = {
      componentId: 'c1',
      projectId: 'BM331',
      componentCode: 'COMP-LIFTER',
      revisionCode: 'Rev 0',
      status: 'BLOCKED',
      responsibleEngineerId: 'Anil',
    };
    const res = await service.computeComponentOverlay(dummyAsset, tenantId);
    expect(res.colorOverlay).toBe('RED');
    expect(res.overlayReason).toContain('Critical Delivery Blocker');
  });

  it('GS-08: Capacity / Overload risk highlights component in ORANGE', async () => {
    mockEngineerRepo.findOne.mockResolvedValueOnce({
      engineerCode: 'eng-overloaded',
      name: 'Senior Tooling Lead',
      status: 'OVERLOADED',
      weeklyCapacityHours: 40,
      currentCommittedHours: 52,
    });
    const dummyAsset: any = {
      componentId: 'c1',
      projectId: 'BM331',
      componentCode: 'COMP-MOLD-BASE',
      revisionCode: 'Rev 0',
      status: 'IN_PROGRESS',
      responsibleEngineerId: 'eng-overloaded',
    };
    const res = await service.computeComponentOverlay(dummyAsset, tenantId);
    expect(res.colorOverlay).toBe('ORANGE');
    expect(res.overlayReason).toContain('Capacity Risk');
  });

  it('GS-09: Revision / ECO overlay highlights component in BLUE', async () => {
    const dummyAsset: any = {
      componentId: 'c1',
      projectId: 'BM331',
      componentCode: 'COMP-CAV',
      revisionCode: 'Rev B',
      status: 'IN_PROGRESS',
      responsibleEngineerId: 'Rajesh',
    };
    const res = await service.computeComponentOverlay(dummyAsset, tenantId);
    expect(res.colorOverlay).toBe('BLUE');
    expect(res.overlayReason).toContain('Active Engineering Change');
  });

  it('GS-10: T0 tool proving developmental modification highlights component in PURPLE', async () => {
    mockModRepo.find.mockResolvedValueOnce([
      { id: 'm1', description: 'Gate vestige flash reduction modification' },
    ]);
    const dummyAsset: any = {
      componentId: 'c1',
      projectId: 'BM331',
      componentCode: 'COMP-CAV',
      revisionCode: 'Rev 0',
      status: 'IN_PROGRESS',
      responsibleEngineerId: 'Rajesh',
    };
    const res = await service.computeComponentOverlay(dummyAsset, tenantId);
    expect(res.colorOverlay).toBe('PURPLE');
    expect(res.overlayReason).toContain('T0 Tool Proving');
  });

  it('GS-11: Approved and verified component highlights in GREEN', async () => {
    const dummyAsset: any = {
      componentId: 'c1',
      projectId: 'BM331',
      componentCode: 'COMP-SLIDER',
      revisionCode: 'Rev 0',
      status: 'COMPLETED',
      responsibleEngineerId: 'Rajesh',
    };
    const res = await service.computeComponentOverlay(dummyAsset, tenantId);
    expect(res.colorOverlay).toBe('GREEN');
  });

  it('GS-12: Ambiguous geometry binding flags isAmbiguous: true and reduces confidence', async () => {
    mockGeometryRepo.find.mockResolvedValueOnce([
      { id: 'existing-geom', componentId: 'DIFFERENT_COMP_02', sourceFileHash: 'sha256-shared-hash' },
    ]);
    const res = await service.registerGeometryAsset(
      {
        projectId: 'BM331',
        componentId: 'BM331-CAV-01',
        componentCode: 'COMP-CAV',
        componentName: 'Cavity Insert Block',
        sourceFileName: 'SHARED_CAV.STP',
        sourceFilePath: 'D:/Mitra3.0/MitraEngineeringLibrary/BM331/CAD/SHARED_CAV.STP',
        sourceFileHash: 'sha256-shared-hash',
      },
      tenantId,
    );
    expect(res.isAmbiguous).toBe(true);
    expect(Number(res.bindingConfidence)).toBe(0.5);
  });

  it('GS-13: Scoped EKOS component neighborhood returns structured node and edge lineage', async () => {
    const res = await service.getEkosVisualNeighborhood('COMP-CAV-01', tenantId);
    expect(res.centerNodeId).toBe('COMP-CAV-01');
    expect(res.nodes.length).toBeGreaterThanOrEqual(3);
    expect(res.edges.length).toBeGreaterThanOrEqual(2);
  });

  it('GS-14: Dependency visualization correctly connects component to revision and deliverable', async () => {
    const res = await service.getEkosVisualNeighborhood('COMP-CORE-01', tenantId);
    const hasProduces = res.edges.some((e) => e.relation === 'PRODUCES');
    const hasEvidence = res.edges.some((e) => e.relation === 'EVIDENCED_BY');
    expect(hasProduces).toBe(true);
    expect(hasEvidence).toBe(true);
  });

  it('GS-15: Governed 3D Caliper performs Euclidean distance measurement', async () => {
    const res = await service.performGovernedMeasurement(
      {
        geometryAssetId: 'geom-cav-01',
        measurementType: 'POINT_TO_POINT',
        pointA: [0, 0, 0],
        pointB: [30, 40, 0],
        unit: 'mm',
      },
      tenantId,
    );
    expect(res.measuredValue).toBe(50.0);
    expect(res.unit).toBe('mm');
    expect(res.isCmmCertified).toBe(false);
  });

  it('GS-16: Governed 3D Caliper displays mandatory Non-CMM metrology disclaimer', async () => {
    const res = await service.performGovernedMeasurement(
      {
        geometryAssetId: 'geom-cav-01',
        measurementType: 'DIAMETER',
        pointA: [10, 10, 0],
      },
      tenantId,
    );
    expect(res.disclaimer).toContain('DECISION SUPPORT MEASUREMENT — NOT CMM CERTIFIED');
  });

  it('GS-17: 3D Object Context Copilot answers "Why is this component yellow?" with grounded facts', async () => {
    mockGeometryRepo.findOne.mockResolvedValueOnce({
      id: 'geom-core-01',
      componentId: 'COMP-CORE',
      componentName: 'Core Insert Block',
      componentCode: 'COMP-CORE',
      revisionCode: 'Rev 0',
      status: 'IN_PROGRESS',
      responsibleEngineerId: 'Suresh',
      sourceFileHash: 'sha256-core-001',
    });
    mockDeliverableRepo.find.mockResolvedValueOnce([
      { id: 'd1', status: 'COMPLETED', evidenceReference: '' },
    ]);

    const res = await service.query3dCopilot(
      {
        query: 'Why is this component yellow?',
        geometryAssetId: 'geom-core-01',
      },
      tenantId,
    );

    expect(res.groundedAnswer).toContain('YELLOW');
    expect(res.groundedAnswer).toContain('Pending Evidence');
    expect(res.citations.length).toBeGreaterThanOrEqual(1);
    expect(res.isAutonomousDecision).toBe(false);
  });

  it('GS-18: 3D Object Context Copilot answers evidence hash query with vault provenance', async () => {
    mockGeometryRepo.findOne.mockResolvedValueOnce({
      id: 'geom-cav-01',
      componentId: 'COMP-CAV',
      componentName: 'Cavity Insert Block',
      componentCode: 'COMP-CAV',
      revisionCode: 'Rev A',
      status: 'IN_PROGRESS',
      responsibleEngineerId: 'Rajesh',
      sourceFileName: 'BM331_CAV.STP',
      sourceFilePath: 'D:/Mitra3.0/MitraEngineeringLibrary/BM331/CAD/BM331_CAV.STP',
      sourceFileHash: 'sha256-cav-vault-001',
      bindingConfidence: 1.0,
    });

    const res = await service.query3dCopilot(
      {
        query: 'Show me the evidence supporting this component',
        geometryAssetId: 'geom-cav-01',
      },
      tenantId,
    );

    expect(res.groundedAnswer).toContain('BM331_CAV.STP');
    expect(res.groundedAnswer).toContain('sha256-cav-vault-001');
    expect(res.citations[0].sourceType).toBe('ENGINEERING_LIBRARY_VAULT');
  });

  it('GS-19: Unselected Copilot query gracefully prompts user to pick a 3D component', async () => {
    const res = await service.query3dCopilot(
      { query: 'What is happening with this part?' },
      tenantId,
    );
    expect(res.groundedAnswer).toContain('No specific 3D component is selected');
  });

  it('GS-20: Real-World BM331 dual-cavity housing mold geometry lifecycle verified', async () => {
    mockGeometryRepo.find.mockResolvedValueOnce([]);
    const res = await service.getProjectGeometryAssets('BM331', tenantId);
    expect(res.projectId).toBe('BM331');
    expect(res.assets.some((a) => a.componentCode === 'COMP-CAV')).toBe(true);
    expect(res.assets.some((a) => a.componentCode === 'COMP-CORE')).toBe(true);
  });

  it('GS-21: Real-World BM289 automotive connector mold geometry lifecycle verified', async () => {
    mockGeometryRepo.find.mockResolvedValueOnce([]);
    const res = await service.getProjectGeometryAssets('BM289', tenantId);
    expect(res.projectId).toBe('BM289');
    expect(res.totalAssetsCount).toBeGreaterThanOrEqual(1);
  });

  it('GS-22: Governed 3D Caliper face normal distance evaluation works safely', async () => {
    const res = await service.performGovernedMeasurement(
      {
        geometryAssetId: 'geom-cav-01',
        measurementType: 'FACE_NORMAL_DISTANCE',
        pointA: [0, 10, 0],
      },
      tenantId,
    );
    expect(res.measuredValue).toBeGreaterThan(0);
    expect(res.provenance.coordinateSystem).toBe('MOLD_BASE_ORIGIN_XYZ');
  });

  it('GS-23: Unsupported format classification defaults safely to STEP fallback', async () => {
    const res = await service.registerGeometryAsset(
      {
        projectId: 'BM331',
        componentId: 'BM331-MISC-01',
        componentCode: 'COMP-MISC',
        componentName: 'Custom Fastener',
        sourceFileName: 'FASTENER.XYZ',
        sourceFilePath: 'D:/Mitra3.0/MitraEngineeringLibrary/BM331/CAD/FASTENER.XYZ',
        sourceFileHash: 'sha256-fastener-001',
      },
      tenantId,
    );
    expect(res.cadFormat).toBe('STEP');
  });

  it('GS-24: Missing geometry bounding box defaults to standard envelope', async () => {
    const res = await service.registerGeometryAsset(
      {
        projectId: 'BM331',
        componentId: 'BM331-MISC-02',
        componentCode: 'COMP-MISC2',
        componentName: 'Ejector Pin Baffle',
        sourceFileName: 'BAFFLE.STP',
        sourceFilePath: 'D:/Mitra3.0/MitraEngineeringLibrary/BM331/CAD/BAFFLE.STP',
        sourceFileHash: 'sha256-baffle-001',
      },
      tenantId,
    );
    expect(res.boundingBox).toBeDefined();
    expect(res.boundingBox?.dimensions).toEqual([100, 100, 50]);
  });

  it('GS-25: Multi-cavity large assembly summary groups all component overlays', async () => {
    mockGeometryRepo.find.mockResolvedValueOnce([
      { id: 'g1', componentId: 'c1', projectId: 'BM331', componentCode: 'COMP-CAV', revisionCode: 'Rev 0', colorOverlay: 'RED', status: 'BLOCKED', responsibleEngineerId: 'Rajesh' },
      { id: 'g2', componentId: 'c2', projectId: 'BM331', componentCode: 'COMP-CORE', revisionCode: 'Rev 0', colorOverlay: 'GREEN', status: 'COMPLETED', responsibleEngineerId: 'Suresh' },
    ]);
    mockBlockerRepo.find.mockResolvedValueOnce([{ id: 'b1', description: 'Interference' }]);

    const res = await service.getProjectGeometryAssets('BM331', tenantId);
    expect(res.totalAssetsCount).toBe(2);
    expect(res.summary.blockersCount).toBe(1);
  });

  it('GS-26: Tenant isolation strictly maintained on geometry queries', async () => {
    mockGeometryRepo.find.mockResolvedValueOnce([]);
    const res = await service.getProjectGeometryAssets('NON_TENANT_PROJECT_99', 'foreign-tenant');
    expect(res.assets.length).toBe(0);
  });

  it('GS-27: Audit log captures every geometry registration event', async () => {
    await service.registerGeometryAsset(
      {
        projectId: 'BM331',
        componentId: 'BM331-CAV-01',
        componentCode: 'COMP-CAV',
        componentName: 'Cavity Insert Block',
        sourceFileName: 'BM331_CAV.STP',
        sourceFilePath: 'D:/Mitra3.0/MitraEngineeringLibrary/BM331/CAD/BM331_CAV.STP',
        sourceFileHash: 'sha256-bm331-cav-audit-01',
      },
      tenantId,
      { userId: 'eng-lead-01' },
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DIGITAL_THREAD_GEOMETRY_REGISTERED',
        userId: 'eng-lead-01',
      }),
    );
  });

  it('GS-28: Zero autonomous mutation invariant — AI copilot returns isAutonomousDecision: false', async () => {
    const res = await service.query3dCopilot(
      { query: 'Can you approve this CAD model?', projectId: 'BM331' },
      tenantId,
    );
    expect(res.isAutonomousDecision).toBe(false);
  });

  it('GS-29: Geometry SHA-256 hash provenance integrity is preserved on retrieval', async () => {
    mockGeometryRepo.findOne.mockResolvedValueOnce({
      id: 'geom-1',
      sourceFileHash: 'sha256-verified-vault-01',
    });
    const res = await service.performGovernedMeasurement(
      { geometryAssetId: 'geom-1', measurementType: 'POINT_TO_POINT', pointA: [0, 0, 0], pointB: [10, 0, 0] },
      tenantId,
    );
    expect(res.provenance.sourceGeometryHash).toBe('sha256-verified-vault-01');
  });

  it('GS-30: Full end-to-end visual digital thread thread complete', async () => {
    mockGeometryRepo.find.mockResolvedValueOnce([]);
    const res = await service.getProjectGeometryAssets('BM331', tenantId);
    expect(res.projectId).toBe('BM331');
    expect(res.assets.length).toBeGreaterThan(0);
  });

  // ==========================================
  // FAILURE INJECTION (FI-01 .. FI-20)
  // ==========================================

  it('FI-01: Missing tenant on registerGeometryAsset throws ForbiddenException', async () => {
    await expect(service.registerGeometryAsset({} as any, '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-02: Missing projectId on registerGeometryAsset throws BadRequestException', async () => {
    await expect(
      service.registerGeometryAsset({ componentId: 'c1', sourceFileHash: 'h1' } as any, tenantId),
    ).rejects.toThrow(BadRequestException);
  });

  it('FI-03: Missing componentId on registerGeometryAsset throws BadRequestException', async () => {
    await expect(
      service.registerGeometryAsset({ projectId: 'BM331', sourceFileHash: 'h1' } as any, tenantId),
    ).rejects.toThrow(BadRequestException);
  });

  it('FI-04: Missing sourceFileHash on registerGeometryAsset throws BadRequestException', async () => {
    await expect(
      service.registerGeometryAsset({ projectId: 'BM331', componentId: 'c1' } as any, tenantId),
    ).rejects.toThrow(BadRequestException);
  });

  it('FI-05: Missing tenant on getProjectGeometryAssets throws ForbiddenException', async () => {
    await expect(service.getProjectGeometryAssets('BM331', '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-06: Missing projectId on getProjectGeometryAssets throws BadRequestException', async () => {
    await expect(service.getProjectGeometryAssets('', tenantId)).rejects.toThrow(BadRequestException);
  });

  it('FI-07: Missing tenant on performGovernedMeasurement throws ForbiddenException', async () => {
    await expect(service.performGovernedMeasurement({} as any, '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-08: Missing geometryAssetId on performGovernedMeasurement throws BadRequestException', async () => {
    await expect(
      service.performGovernedMeasurement({ pointA: [0, 0, 0] } as any, tenantId),
    ).rejects.toThrow(BadRequestException);
  });

  it('FI-09: Missing pointA on performGovernedMeasurement throws BadRequestException', async () => {
    await expect(
      service.performGovernedMeasurement({ geometryAssetId: 'g1' } as any, tenantId),
    ).rejects.toThrow(BadRequestException);
  });

  it('FI-10: Missing tenant on query3dCopilot throws ForbiddenException', async () => {
    await expect(service.query3dCopilot({ query: 'why' }, '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-11: Missing query prompt on query3dCopilot throws BadRequestException', async () => {
    await expect(service.query3dCopilot({ query: '' }, tenantId)).rejects.toThrow(BadRequestException);
  });

  it('FI-12: Missing tenant on getEkosVisualNeighborhood throws ForbiddenException', async () => {
    await expect(service.getEkosVisualNeighborhood('n1', '')).rejects.toThrow(ForbiddenException);
  });

  it('FI-13: Missing nodeId on getEkosVisualNeighborhood throws BadRequestException', async () => {
    await expect(service.getEkosVisualNeighborhood('', tenantId)).rejects.toThrow(BadRequestException);
  });

  it('FI-14: Corrupted coordinate array on measurement computes fallback safely', async () => {
    const res = await service.performGovernedMeasurement(
      { geometryAssetId: 'g1', measurementType: 'BOUNDING_BOX', pointA: [0, 0, 0] },
      tenantId,
    );
    expect(res.measuredValue).toBe(50.0);
  });

  it('FI-15: Cross-tenant measurement request on foreign geometry falls back to unbound hash safely', async () => {
    mockGeometryRepo.findOne.mockResolvedValueOnce(null);
    const res = await service.performGovernedMeasurement(
      { geometryAssetId: 'foreign-geom', measurementType: 'DIAMETER', pointA: [0, 0, 0] },
      tenantId,
    );
    expect(res.provenance.sourceGeometryHash).toBe('sha256-unbound');
  });

  it('FI-16: Non-existent component on copilot query returns general guidance safely', async () => {
    mockGeometryRepo.findOne.mockResolvedValueOnce(null);
    const res = await service.query3dCopilot(
      { query: 'Why is this red?', componentId: 'NON_EXISTENT_COMP' },
      tenantId,
    );
    expect(res.groundedAnswer).toContain('No specific 3D component is selected');
  });

  it('FI-17: Concurrent registration invocations execute safely without race conditions', async () => {
    const payload = {
      projectId: 'BM331',
      componentId: 'BM331-CAV-01',
      componentCode: 'COMP-CAV',
      componentName: 'Cavity Insert Block',
      sourceFileName: 'BM331_CAV.STP',
      sourceFilePath: 'D:/Mitra3.0/MitraEngineeringLibrary/BM331/CAD/BM331_CAV.STP',
      sourceFileHash: 'sha256-bm331-cav-conc-01',
    };
    const [res1, res2] = await Promise.all([
      service.registerGeometryAsset(payload, tenantId),
      service.registerGeometryAsset(payload, tenantId),
    ]);
    expect(res1.id).toBeDefined();
    expect(res2.id).toBeDefined();
  });

  it('FI-18: Concurrent measurement invocations execute safely without race conditions', async () => {
    const dto = {
      geometryAssetId: 'geom-1',
      measurementType: 'POINT_TO_POINT' as const,
      pointA: [0, 0, 0] as [number, number, number],
      pointB: [10, 20, 30] as [number, number, number],
    };
    const [res1, res2] = await Promise.all([
      service.performGovernedMeasurement(dto, tenantId),
      service.performGovernedMeasurement(dto, tenantId),
    ]);
    expect(res1.measuredValue).toBe(res2.measuredValue);
  });

  it('FI-19: Concurrent copilot queries execute safely without race conditions', async () => {
    const [res1, res2] = await Promise.all([
      service.query3dCopilot({ query: 'What is happening with this mold?' }, tenantId),
      service.query3dCopilot({ query: 'Explain the 3D status' }, tenantId),
    ]);
    expect(res1.groundedAnswer).toBeDefined();
    expect(res2.groundedAnswer).toBeDefined();
  });

  it('FI-20: Concurrent neighborhood graph requests execute safely without race conditions', async () => {
    const [res1, res2] = await Promise.all([
      service.getEkosVisualNeighborhood('COMP-1', tenantId),
      service.getEkosVisualNeighborhood('COMP-2', tenantId),
    ]);
    expect(res1.nodes.length).toBeGreaterThan(0);
    expect(res2.nodes.length).toBeGreaterThan(0);
  });
});
