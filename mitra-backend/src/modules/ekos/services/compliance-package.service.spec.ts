import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CompliancePackageService } from './compliance-package.service';
import {
  CompliancePackage,
  ComplianceFramework,
  PackageCompletenessStatus,
} from '../entities/compliance-package.entity';
import { EkosGraphNode, EkosEntityType } from '../entities/ekos-graph-node.entity';
import { EkosGraphEdge } from '../entities/ekos-graph-edge.entity';
import { EkosGraphService } from './ekos-graph.service';
import { AuditService } from '../../audit/services/audit.service';

describe('CompliancePackageService', () => {
  let service: CompliancePackageService;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockProjectId = '22222222-2222-2222-2222-222222222222';
  const mockPackageId = '33333333-3333-3333-3333-333333333333';

  const mockPackageRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve({ id: mockPackageId, ...dto })),
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a complete compliance package with SHA-256 hash', async () => {
    mockGraphService.getLineage.mockResolvedValue({
      nodes: [
        { entityType: EkosEntityType.PROJECT, entityId: mockProjectId, label: 'Mold Project' },
        { entityType: EkosEntityType.DRAWING, entityId: 'drw-1', label: 'DWG-100' },
        { entityType: EkosEntityType.WORK_ORDER, entityId: 'wo-1', label: 'WO-100' },
      ],
      edges: [
        {
          sourceNode: { entityType: EkosEntityType.PROJECT, entityId: mockProjectId },
          targetNode: { entityType: EkosEntityType.DRAWING, entityId: 'drw-1' },
          relationType: 'REFERENCES',
          provenanceType: 'TRANSACTIONAL_EVENT',
          confidence: 1.0,
        },
      ],
    });

    mockPackageRepo.findOne.mockResolvedValue(null);

    const pkg = await service.generatePackage(
      { projectId: mockProjectId, framework: ComplianceFramework.ISO_9001 },
      mockTenantId,
      { id: 'user-1' },
    );

    expect(pkg.completenessStatus).toBe(PackageCompletenessStatus.COMPLETE);
    expect(pkg.packageHash).toBeDefined();
    expect(pkg.version).toBe(1);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'COMPLIANCE_PACKAGE_GENERATED' }),
    );
  });

  it('should verify cryptographic zero-tampering integrity', async () => {
    const canonicalPayload = JSON.stringify({
      tenantId: mockTenantId,
      projectId: mockProjectId,
      framework: ComplianceFramework.ISO_9001,
      evidence: [],
      lineage: [],
    });
    const hash = require('crypto').createHash('sha256').update(canonicalPayload).digest('hex');

    mockPackageRepo.findOne.mockResolvedValue({
      id: mockPackageId,
      tenantId: mockTenantId,
      projectId: mockProjectId,
      framework: ComplianceFramework.ISO_9001,
      packageHash: hash,
      evidenceManifest: [],
      lineageManifest: [],
      gapsAndWarnings: [],
      auditManifest: [],
    });

    const res = await service.verifyPackageIntegrity(mockPackageId, mockTenantId);

    expect(res.isTamperFree).toBe(true);
    expect(res.packageHash).toBe(hash);
  });
});
