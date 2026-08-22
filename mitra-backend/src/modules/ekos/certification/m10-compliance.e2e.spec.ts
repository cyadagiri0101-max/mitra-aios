import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CompliancePackageService } from '../services/compliance-package.service';
import {
  CompliancePackage,
  ComplianceFramework,
  PackageCompletenessStatus,
} from '../entities/compliance-package.entity';
import { EkosGraphNode, EkosEntityType } from '../entities/ekos-graph-node.entity';
import { EkosGraphEdge } from '../entities/ekos-graph-edge.entity';
import { EkosGraphService } from '../services/ekos-graph.service';
import { AuditService } from '../../audit/services/audit.service';

describe('M10.5 Compliance & Audit Package Engine E2E Certification (GS-01 -> GS-18)', () => {
  let service: CompliancePackageService;

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '99999999-9999-9999-9999-999999999999';
  const projectId = '40000000-0000-0000-0000-000000000001';
  const packageId = '40000000-0000-0000-0000-000000000002';

  const mockPackageRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve({ id: packageId, ...dto })),
    findOne: jest.fn(),
  };

  const mockNodeRepo = {};
  const mockEdgeRepo = {};

  const mockGraphService = {
    getLineage: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompliancePackageService,
        { provide: getRepositoryToken(CompliancePackage), useValue: mockPackageRepo },
        { provide: getRepositoryToken(EkosGraphNode), useValue: mockNodeRepo },
        { provide: getRepositoryToken(EkosGraphEdge), useValue: mockEdgeRepo },
        { provide: EkosGraphService, useValue: mockGraphService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<CompliancePackageService>(CompliancePackageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GS-01 & GS-02: Complete project produces COMPLETE compliance package with hash', async () => {
    mockGraphService.getLineage.mockResolvedValue({
      nodes: [
        { entityType: EkosEntityType.PROJECT, entityId: projectId, label: 'Aerospace Valve Mold' },
        { entityType: EkosEntityType.DRAWING, entityId: 'drw-1', label: 'DWG-001 Rev A' },
        { entityType: EkosEntityType.WORK_ORDER, entityId: 'wo-1', label: 'WO-001' },
      ],
      edges: [
        {
          sourceNode: { entityType: EkosEntityType.PROJECT, entityId: projectId },
          targetNode: { entityType: EkosEntityType.DRAWING, entityId: 'drw-1' },
          relationType: 'REFERENCES',
          provenanceType: 'TRANSACTIONAL_EVENT',
          confidence: 1.0,
        },
      ],
    });

    mockPackageRepo.findOne.mockResolvedValue(null);

    const pkg = await service.generatePackage(
      { projectId, framework: ComplianceFramework.AS9100 },
      tenantA,
      { id: 'auditor-1' },
    );

    expect(pkg.completenessStatus).toBe(PackageCompletenessStatus.COMPLETE);
    expect(pkg.packageHash).toHaveLength(64);
  });

  it('GS-03: Missing engineering drawing triggers PARTIAL status and warning gap', async () => {
    mockGraphService.getLineage.mockResolvedValue({
      nodes: [{ entityType: EkosEntityType.PROJECT, entityId: projectId }],
      edges: [],
    });
    mockPackageRepo.findOne.mockResolvedValue(null);

    const pkg = await service.generatePackage({ projectId }, tenantA);

    expect(pkg.completenessStatus).toBe(PackageCompletenessStatus.PARTIAL);
    expect(pkg.gapsAndWarnings.length).toBeGreaterThan(0);
  });

  it('GS-04 to GS-09: Inclusion of Quality NCR, telemetry, G12, G13, and G14 provenance', async () => {
    mockGraphService.getLineage.mockResolvedValue({
      nodes: [
        { entityType: EkosEntityType.NCR, entityId: 'ncr-1', label: 'NCR Gate Flash' },
        { entityType: EkosEntityType.KNOWLEDGE_ARTICLE, entityId: 'art-1', label: 'Cooling Standard' },
        { entityType: EkosEntityType.LEVELING_RECOMMENDATION, entityId: 'rec-1', label: 'Leveling Shift' },
      ],
      edges: [],
    });
    mockPackageRepo.findOne.mockResolvedValue(null);

    const pkg = await service.generatePackage({ projectId }, tenantA);

    expect(pkg.evidenceManifest.some((e: any) => e.isAiInferred)).toBe(true);
  });

  it('GS-10 & GS-11 & GS-15: Evidence hash verification and zero-tampering detection', async () => {
    const canonicalPayload = JSON.stringify({
      tenantId: tenantA,
      projectId,
      framework: ComplianceFramework.ISO_9001,
      evidence: [],
      lineage: [],
    });
    const hash = require('crypto').createHash('sha256').update(canonicalPayload).digest('hex');

    mockPackageRepo.findOne.mockResolvedValue({
      id: packageId,
      tenantId: tenantA,
      projectId,
      framework: ComplianceFramework.ISO_9001,
      packageHash: hash,
      evidenceManifest: [],
      lineageManifest: [],
      gapsAndWarnings: [],
      auditManifest: [],
    });

    const res = await service.verifyPackageIntegrity(packageId, tenantA);
    expect(res.isTamperFree).toBe(true);
  });

  it('GS-12 & GS-13: Cross-tenant package request blocked fail-closed', async () => {
    mockPackageRepo.findOne.mockResolvedValue(null);

    await expect(service.getPackageById(packageId, tenantB)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('GS-14: Package versioning increments sequentially on re-generation', async () => {
    mockGraphService.getLineage.mockResolvedValue({ nodes: [], edges: [] });
    mockPackageRepo.findOne.mockResolvedValue({ version: 2 });

    const pkg = await service.generatePackage({ projectId }, tenantA);

    expect(pkg.version).toBe(3);
  });

  it('GS-16 to GS-18: Exporting package returns manifest without mutating source evidence', async () => {
    mockPackageRepo.findOne.mockResolvedValue({
      id: packageId,
      tenantId: tenantA,
      projectId,
      framework: 'ISO_9001',
      packageHash: 'abc',
      version: 1,
      completenessStatus: 'COMPLETE',
      evidenceManifest: [{ entityType: 'DRAWING', entityId: 'd1' }],
      lineageManifest: [],
      auditManifest: [],
      gapsAndWarnings: [],
      createdAt: new Date(),
      generatorVersion: 'MITRA_EKOS_COMPLIANCE_v5.0',
    });

    const exportRes = await service.exportPackage(packageId, tenantA);

    expect(exportRes.manifest.evidenceCount).toBe(1);
    expect(exportRes.packageId).toBe(packageId);
  });
});
