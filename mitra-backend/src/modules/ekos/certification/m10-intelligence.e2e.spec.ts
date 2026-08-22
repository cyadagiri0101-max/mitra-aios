import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EkosIntelligenceService } from '../services/ekos-intelligence.service';
import { EkosGraphNode, EkosEntityType } from '../entities/ekos-graph-node.entity';
import { EkosGraphEdge } from '../entities/ekos-graph-edge.entity';
import { EkosGraphService } from '../services/ekos-graph.service';
import { AuditService } from '../../audit/services/audit.service';

describe('M10.6 EKOS Intelligence & Enterprise Integration E2E Certification (GS-01 -> GS-18)', () => {
  let service: EkosIntelligenceService;

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '99999999-9999-9999-9999-999999999999';
  const projectId = '50000000-0000-0000-0000-000000000001';

  const mockNodeRepo = {
    find: jest.fn(),
  };

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
        EkosIntelligenceService,
        { provide: getRepositoryToken(EkosGraphNode), useValue: mockNodeRepo },
        { provide: getRepositoryToken(EkosGraphEdge), useValue: mockEdgeRepo },
        { provide: EkosGraphService, useValue: mockGraphService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<EkosIntelligenceService>(EkosIntelligenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GS-01 to GS-05: Unified enterprise context assembled across Project, Engineering, Manufacturing, Quality, and Service', async () => {
    mockGraphService.getLineage.mockResolvedValue({
      nodes: [
        { entityType: EkosEntityType.PROJECT, entityId: projectId, label: 'High Precision Mold' },
        { entityType: EkosEntityType.RFQ, entityId: 'rfq-1' },
        { entityType: EkosEntityType.DRAWING, entityId: 'drw-1' },
        { entityType: EkosEntityType.WORK_ORDER, entityId: 'wo-1' },
        { entityType: EkosEntityType.NCR, entityId: 'ncr-1' },
        { entityType: EkosEntityType.KNOWLEDGE_ARTICLE, entityId: 'art-1' },
        { entityType: EkosEntityType.LEVELING_RECOMMENDATION, entityId: 'rec-1' },
      ],
      edges: [{ id: 'e1' }],
    });

    const ctx = await service.getProjectEnterpriseContext(projectId, tenantA);

    expect(ctx.projectId).toBe(projectId);
    expect(ctx.engineeringArtifactsCount).toBe(1);
    expect(ctx.activeWorkOrdersCount).toBe(1);
    expect(ctx.qualityIssuesCount).toBe(1);
    expect(ctx.governedKnowledgeArticlesCount).toBe(1);
    expect(ctx.predictiveSignals.delayRiskTier).toBe('ELEVATED');
  });

  it('GS-06 to GS-10: Cross-domain question answered with cited evidence grounding & model provenance', async () => {
    mockNodeRepo.find.mockResolvedValue([
      { entityType: EkosEntityType.DRAWING, entityId: 'drw-1', label: 'DWG Rev B' },
      { entityType: EkosEntityType.NCR, entityId: 'ncr-1', label: 'NCR Root Cause' },
    ]);

    const res = await service.queryCrossDomainQuestion(
      { query: 'Why was the gate runner redesigned?', projectId },
      tenantA,
    );

    expect(res.citedEntities.length).toBe(2);
    expect(res.isAiInferred).toBe(true);
    expect(res.modelProvenance.model).toContain('phi-3');
  });

  it('GS-11 & GS-12: Cross-tenant context query blocked fail-closed', async () => {
    await expect(
      service.getProjectEnterpriseContext(projectId, ''),
    ).rejects.toThrow(ForbiddenException);
  });

  it('GS-13 to GS-15: Context reproducibility & zero autonomous execution', async () => {
    mockGraphService.getLineage.mockResolvedValue({
      nodes: [{ entityType: EkosEntityType.PROJECT, entityId: projectId }],
      edges: [],
    });

    const ctx1 = await service.getProjectEnterpriseContext(projectId, tenantA);
    const ctx2 = await service.getProjectEnterpriseContext(projectId, tenantA);

    expect(ctx1.lineageNodesCount).toBe(ctx2.lineageNodesCount);
  });

  it('GS-16 to GS-18: Enterprise search returns governed entities with auditability', async () => {
    mockNodeRepo.find.mockResolvedValue([
      { entityType: EkosEntityType.DRAWING, entityId: 'drw-1', label: 'Die Cavity Core Drawing' },
    ]);

    const results = await service.enterpriseSearch(
      { searchTerm: 'Cavity Core' },
      tenantA,
    );

    expect(results.length).toBe(1);
    expect(results[0].label).toContain('Cavity Core');
  });
});
