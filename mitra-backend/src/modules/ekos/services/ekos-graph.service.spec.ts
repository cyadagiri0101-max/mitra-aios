import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EkosGraphService } from './ekos-graph.service';
import { EkosGraphNode, EkosEntityType } from '../entities/ekos-graph-node.entity';
import {
  EkosGraphEdge,
  EkosRelationType,
  EkosProvenanceType,
} from '../entities/ekos-graph-edge.entity';
import { AuditService } from '../../audit/services/audit.service';
import { LineageDirection } from '../dto/ekos-graph.dto';

describe('EkosGraphService', () => {
  let service: EkosGraphService;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockForeignTenantId = '99999999-9999-9999-9999-999999999999';
  const mockProjectId = '22222222-2222-2222-2222-222222222222';
  const mockDrawingId = '33333333-3333-3333-3333-333333333333';
  const mockWorkOrderId = '44444444-4444-4444-4444-444444444444';

  const mockNodeRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve({ id: 'node-1', ...dto })),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockEdgeRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve({ id: 'edge-1', ...dto })),
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
        { provide: getRepositoryToken(EkosGraphNode), useValue: mockNodeRepo },
        { provide: getRepositoryToken(EkosGraphEdge), useValue: mockEdgeRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<EkosGraphService>(EkosGraphService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ForbiddenException if tenantId is missing', async () => {
    await expect(
      service.registerNode(
        {
          entityType: EkosEntityType.PROJECT,
          entityId: mockProjectId,
          label: 'Test Project',
        },
        '',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should register or idempotently update an entity node and log audit event', async () => {
    mockNodeRepo.findOne.mockResolvedValue(null);

    const node = await service.registerNode(
      {
        entityType: EkosEntityType.PROJECT,
        entityId: mockProjectId,
        label: 'Die Casting Project Rev 2',
        projectId: mockProjectId,
        provenanceSource: 'PROJECT_DOMAIN',
      },
      mockTenantId,
      { id: 'user-1' },
    );

    expect(node).toBeDefined();
    expect(mockNodeRepo.save).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EKOS_LINEAGE_NODE_REGISTERED' }),
    );
  });

  it('should record a semantic edge between source and target nodes', async () => {
    mockNodeRepo.findOne
      .mockResolvedValueOnce({
        id: 'node-drawing',
        tenantId: mockTenantId,
        entityType: EkosEntityType.DRAWING,
        entityId: mockDrawingId,
      })
      .mockResolvedValueOnce({
        id: 'node-wo',
        tenantId: mockTenantId,
        entityType: EkosEntityType.WORK_ORDER,
        entityId: mockWorkOrderId,
      });

    mockEdgeRepo.findOne.mockResolvedValue(null);

    const edge = await service.recordEdge(
      {
        sourceEntityType: EkosEntityType.DRAWING,
        sourceEntityId: mockDrawingId,
        targetEntityType: EkosEntityType.WORK_ORDER,
        targetEntityId: mockWorkOrderId,
        relationType: EkosRelationType.REFERENCES,
        provenanceType: EkosProvenanceType.TRANSACTIONAL_EVENT,
        projectId: mockProjectId,
      },
      mockTenantId,
      { id: 'user-1' },
    );

    expect(edge).toBeDefined();
    expect(mockEdgeRepo.save).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EKOS_LINEAGE_EDGE_RECORDED' }),
    );
  });

  it('should prevent cross-tenant edge linkage fail-closed', async () => {
    mockNodeRepo.findOne
      .mockResolvedValueOnce({
        id: 'node-drawing',
        tenantId: mockTenantId,
        entityType: EkosEntityType.DRAWING,
        entityId: mockDrawingId,
      })
      .mockResolvedValueOnce({
        id: 'node-foreign',
        tenantId: mockForeignTenantId,
        entityType: EkosEntityType.PROJECT,
        entityId: mockProjectId,
      });

    await expect(
      service.recordEdge(
        {
          sourceEntityType: EkosEntityType.DRAWING,
          sourceEntityId: mockDrawingId,
          targetEntityType: EkosEntityType.PROJECT,
          targetEntityId: mockProjectId,
          relationType: EkosRelationType.DERIVED_FROM,
        },
        mockTenantId,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should traverse downstream and upstream lineage graph with depth bounding', async () => {
    const rootNode = {
      id: 'node-root',
      tenantId: mockTenantId,
      entityType: EkosEntityType.PROJECT,
      entityId: mockProjectId,
      label: 'Main Mold Project',
      metadata: {},
      provenanceSource: 'SYSTEM',
      isSuperseded: false,
    };
    mockNodeRepo.findOne.mockResolvedValue(rootNode);

    const targetNode = {
      id: 'node-drawing',
      tenantId: mockTenantId,
      entityType: EkosEntityType.DRAWING,
      entityId: mockDrawingId,
      label: 'Core Cavity Drawing',
      metadata: {},
      provenanceSource: 'SYSTEM',
      isSuperseded: false,
    };

    mockEdgeRepo.find
      .mockResolvedValueOnce([
        {
          id: 'edge-1',
          tenantId: mockTenantId,
          sourceNodeId: 'node-root',
          targetNodeId: 'node-drawing',
          relationType: EkosRelationType.REFERENCES,
          provenanceType: EkosProvenanceType.TRANSACTIONAL_EVENT,
          confidence: 1.0,
          properties: {},
          isSuperseded: false,
          targetNode,
        },
      ])
      .mockResolvedValueOnce([]) // Incoming for level 0
      .mockResolvedValueOnce([]) // Outgoing for level 1
      .mockResolvedValueOnce([]); // Incoming for level 1

    const result = await service.getLineage(
      EkosEntityType.PROJECT,
      mockProjectId,
      { direction: LineageDirection.BIDIRECTIONAL, maxDepth: 2 },
      mockTenantId,
    );

    expect(result.rootNodeId).toBe('node-root');
    expect(result.nodes.length).toBe(2);
    expect(result.edges.length).toBe(1);
    expect(result.metrics.depthReached).toBeGreaterThanOrEqual(1);
  });

  it('should evaluate blast-radius impact analysis for downstream dependencies', async () => {
    const rootNode = {
      id: 'node-root',
      tenantId: mockTenantId,
      entityType: EkosEntityType.DRAWING,
      entityId: mockDrawingId,
      label: 'Drawing Rev A',
      metadata: {},
      provenanceSource: 'SYSTEM',
      isSuperseded: false,
    };
    mockNodeRepo.findOne.mockResolvedValue(rootNode);

    const impactedNode = {
      id: 'node-wo',
      tenantId: mockTenantId,
      entityType: EkosEntityType.WORK_ORDER,
      entityId: mockWorkOrderId,
      label: 'Machining Cavity WO-101',
      metadata: {},
      provenanceSource: 'SYSTEM',
      isSuperseded: false,
    };

    mockEdgeRepo.find
      .mockResolvedValueOnce([
        {
          id: 'edge-1',
          tenantId: mockTenantId,
          sourceNodeId: 'node-root',
          targetNodeId: 'node-wo',
          relationType: EkosRelationType.REFERENCES,
          provenanceType: EkosProvenanceType.TRANSACTIONAL_EVENT,
          confidence: 1.0,
          properties: {},
          isSuperseded: false,
          targetNode: impactedNode,
        },
      ])
      .mockResolvedValueOnce([]);

    const impact = await service.analyzeImpact(
      EkosEntityType.DRAWING,
      mockDrawingId,
      { maxDepth: 3 },
      mockTenantId,
    );

    expect(impact.sourceEntity.entityType).toBe(EkosEntityType.DRAWING);
    expect(impact.impactedEntitiesCount).toBe(1);
    expect(impact.criticalImpacts.length).toBe(1);
    expect(impact.blastRadiusScore).toBeGreaterThan(0);
  });
});
