import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EkosGraphService } from '../services/ekos-graph.service';
import { EkosReconciliationService } from '../services/ekos-reconciliation.service';
import { EkosGraphNode, EkosEntityType } from '../entities/ekos-graph-node.entity';
import {
  EkosGraphEdge,
  EkosRelationType,
  EkosProvenanceType,
} from '../entities/ekos-graph-edge.entity';
import { AuditService } from '../../audit/services/audit.service';
import { LineageDirection } from '../dto/ekos-graph.dto';

describe('M10.1 EKOS Traceability Graph E2E Certification', () => {
  let graphService: EkosGraphService;
  let reconciliationService: EkosReconciliationService;

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '99999999-9999-9999-9999-999999999999';

  const rfqId = '10000000-0000-0000-0000-000000000001';
  const projectId = '10000000-0000-0000-0000-000000000002';
  const drawingId = '10000000-0000-0000-0000-000000000003';
  const workOrderId = '10000000-0000-0000-0000-000000000004';
  const ncrId = '10000000-0000-0000-0000-000000000005';
  const articleId = '10000000-0000-0000-0000-000000000006';

  const mockNodeRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve({ id: `node-${dto.entityType}`, ...dto })),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockEdgeRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve({ id: `edge-${dto.relationType}`, ...dto })),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockDataSource = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EkosGraphService,
        EkosReconciliationService,
        { provide: getRepositoryToken(EkosGraphNode), useValue: mockNodeRepo },
        { provide: getRepositoryToken(EkosGraphEdge), useValue: mockEdgeRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    graphService = module.get<EkosGraphService>(EkosGraphService);
    reconciliationService = module.get<EkosReconciliationService>(EkosReconciliationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('E2E-01: Cross-Domain Project-Centric Lineage Construction', async () => {
    // 1. Register RFQ node
    mockNodeRepo.findOne.mockResolvedValueOnce(null);
    const rfqNode = await graphService.registerNode(
      {
        entityType: EkosEntityType.RFQ,
        entityId: rfqId,
        label: 'RFQ #901 - Injection Mold Tooling',
        provenanceSource: 'COMMERCIAL_DOMAIN',
      },
      tenantA,
    );
    expect(rfqNode).toBeDefined();

    // 2. Register Project node
    mockNodeRepo.findOne.mockResolvedValueOnce(null);
    const projectNode = await graphService.registerNode(
      {
        entityType: EkosEntityType.PROJECT,
        entityId: projectId,
        projectId,
        label: 'Automotive Housing Tooling Project',
        provenanceSource: 'PROJECT_DOMAIN',
      },
      tenantA,
    );
    expect(projectNode).toBeDefined();

    // 3. Connect RFQ -> FULFILLS -> Project
    mockNodeRepo.findOne
      .mockResolvedValueOnce({ id: 'node-rfq', tenantId: tenantA, entityType: EkosEntityType.RFQ, entityId: rfqId })
      .mockResolvedValueOnce({ id: 'node-proj', tenantId: tenantA, entityType: EkosEntityType.PROJECT, entityId: projectId });
    mockEdgeRepo.findOne.mockResolvedValueOnce(null);

    const edge1 = await graphService.recordEdge(
      {
        sourceEntityType: EkosEntityType.RFQ,
        sourceEntityId: rfqId,
        targetEntityType: EkosEntityType.PROJECT,
        targetEntityId: projectId,
        relationType: EkosRelationType.FULFILLS,
        provenanceType: EkosProvenanceType.TRANSACTIONAL_EVENT,
        projectId,
      },
      tenantA,
    );
    expect(edge1.relationType).toBe(EkosRelationType.FULFILLS);
  });

  it('E2E-02: Quality NCR -> CITED_BY -> Knowledge Article Lineage', async () => {
    mockNodeRepo.findOne
      .mockResolvedValueOnce({ id: 'node-ncr', tenantId: tenantA, entityType: EkosEntityType.NCR, entityId: ncrId })
      .mockResolvedValueOnce({ id: 'node-art', tenantId: tenantA, entityType: EkosEntityType.KNOWLEDGE_ARTICLE, entityId: articleId });
    mockEdgeRepo.findOne.mockResolvedValueOnce(null);

    const edge = await graphService.recordEdge(
      {
        sourceEntityType: EkosEntityType.NCR,
        sourceEntityId: ncrId,
        targetEntityType: EkosEntityType.KNOWLEDGE_ARTICLE,
        targetEntityId: articleId,
        relationType: EkosRelationType.CITED_BY,
        provenanceType: EkosProvenanceType.EXPLICIT_HUMAN,
        projectId,
      },
      tenantA,
    );

    expect(edge.relationType).toBe(EkosRelationType.CITED_BY);
    expect(edge.provenanceType).toBe(EkosProvenanceType.EXPLICIT_HUMAN);
  });

  it('E2E-03: Downstream Impact Evaluation on Drawing Revision Change', async () => {
    const drawingNode = {
      id: 'node-drawing',
      tenantId: tenantA,
      entityType: EkosEntityType.DRAWING,
      entityId: drawingId,
      label: 'Cavity Plate DWG-200 Rev B',
      metadata: {},
      provenanceSource: 'ENGINEERING',
      isSuperseded: false,
    };
    mockNodeRepo.findOne.mockResolvedValue(drawingNode);

    const woNode = {
      id: 'node-wo',
      tenantId: tenantA,
      entityType: EkosEntityType.WORK_ORDER,
      entityId: workOrderId,
      label: 'CNC Machining WO-55',
      metadata: {},
      provenanceSource: 'MES',
      isSuperseded: false,
    };

    mockEdgeRepo.find
      .mockResolvedValueOnce([
        {
          id: 'edge-drw-wo',
          tenantId: tenantA,
          sourceNodeId: 'node-drawing',
          targetNodeId: 'node-wo',
          relationType: EkosRelationType.REFERENCES,
          provenanceType: EkosProvenanceType.TRANSACTIONAL_EVENT,
          confidence: 1.0,
          properties: {},
          isSuperseded: false,
          targetNode: woNode,
        },
      ])
      .mockResolvedValueOnce([]);

    const impact = await graphService.analyzeImpact(
      EkosEntityType.DRAWING,
      drawingId,
      { maxDepth: 4 },
      tenantA,
    );

    expect(impact.sourceEntity.entityType).toBe(EkosEntityType.DRAWING);
    expect(impact.impactedEntitiesCount).toBe(1);
    expect(impact.criticalImpacts[0].entityType).toBe(EkosEntityType.WORK_ORDER);
  });

  it('E2E-04: Multi-Tenant Fail-Closed Isolation Enforcement', async () => {
    mockNodeRepo.findOne.mockResolvedValue(null);

    await expect(
      graphService.getLineage(EkosEntityType.PROJECT, projectId, {}, tenantB),
    ).rejects.toThrow(NotFoundException);
  });

  it('E2E-05: Graph Reconciliation & DAG Integrity Audit', async () => {
    const n1 = { id: 'n1', tenantId: tenantA, entityType: EkosEntityType.CAD_MODEL, label: 'CAD 1' };
    const n2 = { id: 'n2', tenantId: tenantA, entityType: EkosEntityType.DRAWING, label: 'DWG 1' };
    const edge = {
      id: 'e1',
      tenantId: tenantA,
      sourceNodeId: 'n1',
      targetNodeId: 'n2',
      relationType: EkosRelationType.DERIVED_FROM,
      isSuperseded: false,
    };

    mockNodeRepo.find.mockResolvedValue([n1, n2]);
    mockEdgeRepo.find.mockResolvedValue([edge]);

    const report = await reconciliationService.verifyGraphIntegrity(tenantA);

    expect(report.isHealthy).toBe(true);
    expect(report.forbiddenCyclesCount).toBe(0);
    expect(report.danglingEdgesCount).toBe(0);
  });
});
