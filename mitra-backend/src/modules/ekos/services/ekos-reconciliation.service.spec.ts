import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { EkosReconciliationService } from './ekos-reconciliation.service';
import { EkosGraphNode, EkosEntityType } from '../entities/ekos-graph-node.entity';
import { EkosGraphEdge, EkosRelationType } from '../entities/ekos-graph-edge.entity';
import { AuditService } from '../../audit/services/audit.service';

describe('EkosReconciliationService', () => {
  let service: EkosReconciliationService;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';

  const mockNodeRepo = {
    find: jest.fn(),
  };

  const mockEdgeRepo = {
    find: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EkosReconciliationService,
        { provide: getRepositoryToken(EkosGraphNode), useValue: mockNodeRepo },
        { provide: getRepositoryToken(EkosGraphEdge), useValue: mockEdgeRepo },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<EkosReconciliationService>(EkosReconciliationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ForbiddenException if tenantId is missing', async () => {
    await expect(service.verifyGraphIntegrity('')).rejects.toThrow(ForbiddenException);
  });

  it('should verify a clean and healthy graph state', async () => {
    const node1 = { id: 'n1', tenantId: mockTenantId, entityType: EkosEntityType.PROJECT, label: 'Proj 1' };
    const node2 = { id: 'n2', tenantId: mockTenantId, entityType: EkosEntityType.DRAWING, label: 'Drw 1' };
    const edge1 = {
      id: 'e1',
      tenantId: mockTenantId,
      sourceNodeId: 'n1',
      targetNodeId: 'n2',
      relationType: EkosRelationType.REFERENCES,
      isSuperseded: false,
    };

    mockNodeRepo.find.mockResolvedValue([node1, node2]);
    mockEdgeRepo.find.mockResolvedValue([edge1]);

    const report = await service.verifyGraphIntegrity(mockTenantId);

    expect(report.isHealthy).toBe(true);
    expect(report.danglingEdgesCount).toBe(0);
    expect(report.crossTenantViolationsCount).toBe(0);
    expect(report.duplicateEdgesCount).toBe(0);
    expect(report.orphanNodesCount).toBe(0);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EKOS_INTEGRITY_CHECKED' }),
    );
  });

  it('should detect dangling edges, duplicate edges, and orphan nodes', async () => {
    const node1 = { id: 'n1', tenantId: mockTenantId, entityType: EkosEntityType.PROJECT, label: 'Proj 1' };
    const nodeOrphan = { id: 'n-orphan', tenantId: mockTenantId, entityType: EkosEntityType.TASK, label: 'Task 1' };
    const danglingEdge = {
      id: 'e-dangle',
      tenantId: mockTenantId,
      sourceNodeId: 'n1',
      targetNodeId: 'n-missing',
      relationType: EkosRelationType.REFERENCES,
      isSuperseded: false,
    };
    const duplicateEdge = {
      id: 'e-dup',
      tenantId: mockTenantId,
      sourceNodeId: 'n1',
      targetNodeId: 'n-missing',
      relationType: EkosRelationType.REFERENCES,
      isSuperseded: false,
    };

    mockNodeRepo.find.mockResolvedValue([node1, nodeOrphan]);
    mockEdgeRepo.find.mockResolvedValue([danglingEdge, duplicateEdge]);

    const report = await service.verifyGraphIntegrity(mockTenantId);

    expect(report.isHealthy).toBe(false);
    expect(report.danglingEdgesCount).toBe(2);
    expect(report.duplicateEdgesCount).toBe(1);
    expect(report.orphanNodesCount).toBe(1);
  });

  it('should detect forbidden cyclic loops in DERIVED_FROM relationships', async () => {
    const node1 = { id: 'n1', tenantId: mockTenantId, entityType: EkosEntityType.DRAWING, label: 'Rev A' };
    const node2 = { id: 'n2', tenantId: mockTenantId, entityType: EkosEntityType.DRAWING, label: 'Rev B' };
    const node3 = { id: 'n3', tenantId: mockTenantId, entityType: EkosEntityType.DRAWING, label: 'Rev C' };

    // Create cyclic loop: n1 -> n2 -> n3 -> n1
    const edge1 = {
      id: 'e1',
      tenantId: mockTenantId,
      sourceNodeId: 'n1',
      targetNodeId: 'n2',
      relationType: EkosRelationType.DERIVED_FROM,
      isSuperseded: false,
    };
    const edge2 = {
      id: 'e2',
      tenantId: mockTenantId,
      sourceNodeId: 'n2',
      targetNodeId: 'n3',
      relationType: EkosRelationType.DERIVED_FROM,
      isSuperseded: false,
    };
    const edge3 = {
      id: 'e3',
      tenantId: mockTenantId,
      sourceNodeId: 'n3',
      targetNodeId: 'n1',
      relationType: EkosRelationType.DERIVED_FROM,
      isSuperseded: false,
    };

    mockNodeRepo.find.mockResolvedValue([node1, node2, node3]);
    mockEdgeRepo.find.mockResolvedValue([edge1, edge2, edge3]);

    const report = await service.verifyGraphIntegrity(mockTenantId);

    expect(report.isHealthy).toBe(false);
    expect(report.forbiddenCyclesCount).toBeGreaterThan(0);
  });
});
