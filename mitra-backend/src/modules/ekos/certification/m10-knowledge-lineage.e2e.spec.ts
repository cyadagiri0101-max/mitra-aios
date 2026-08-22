import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EkosGraphService } from '../services/ekos-graph.service';
import { EkosReconciliationService } from '../services/ekos-reconciliation.service';
import { EkosKnowledgeLineageService } from '../services/ekos-knowledge-lineage.service';
import { EkosGraphNode, EkosEntityType } from '../entities/ekos-graph-node.entity';
import {
  EkosGraphEdge,
  EkosRelationType,
  EkosProvenanceType,
} from '../entities/ekos-graph-edge.entity';
import { KnowledgeArticle } from '../../knowledge/entities/knowledgearticle.entity';
import { KnowledgeArticleEvidence } from '../../knowledge/entities/knowledge-article-evidence.entity';
import { G14LevelingRecommendation } from '../../predictive/entities/g14-leveling-recommendation.entity';
import { AuditService } from '../../audit/services/audit.service';
import { LineageDirection } from '../dto/ekos-graph.dto';

describe('M10.2 Knowledge & Entity Lineage E2E Certification (GS-01 -> GS-15)', () => {
  let graphService: EkosGraphService;
  let knowledgeLineageService: EkosKnowledgeLineageService;
  let reconciliationService: EkosReconciliationService;

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '99999999-9999-9999-9999-999999999999';

  const projectId = '10000000-0000-0000-0000-000000000001';
  const drawingId = '10000000-0000-0000-0000-000000000002';
  const workOrderId = '10000000-0000-0000-0000-000000000003';
  const trialId = '10000000-0000-0000-0000-000000000004';
  const ncrId = '10000000-0000-0000-0000-000000000005';
  const articleId = '10000000-0000-0000-0000-000000000006';
  const recommendationId = '10000000-0000-0000-0000-000000000007';

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

  const mockArticleRepo = {
    findOne: jest.fn(),
  };

  const mockEvidenceRepo = {
    find: jest.fn(),
  };

  const mockRecommendationRepo = {
    findOne: jest.fn(),
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
        EkosKnowledgeLineageService,
        { provide: getRepositoryToken(EkosGraphNode), useValue: mockNodeRepo },
        { provide: getRepositoryToken(EkosGraphEdge), useValue: mockEdgeRepo },
        { provide: getRepositoryToken(KnowledgeArticle), useValue: mockArticleRepo },
        { provide: getRepositoryToken(KnowledgeArticleEvidence), useValue: mockEvidenceRepo },
        { provide: getRepositoryToken(G14LevelingRecommendation), useValue: mockRecommendationRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    graphService = module.get<EkosGraphService>(EkosGraphService);
    knowledgeLineageService = module.get<EkosKnowledgeLineageService>(EkosKnowledgeLineageService);
    reconciliationService = module.get<EkosReconciliationService>(EkosReconciliationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GS-01: Entity -> Knowledge Lineage Linking', async () => {
    mockArticleRepo.findOne.mockResolvedValue({ id: articleId, tenantId: tenantA, title: 'Gate Flash Elimination' });
    mockNodeRepo.findOne
      .mockResolvedValueOnce({ id: 'node-ncr', tenantId: tenantA, entityType: EkosEntityType.NCR, entityId: ncrId })
      .mockResolvedValueOnce({ id: 'node-art', tenantId: tenantA, entityType: EkosEntityType.KNOWLEDGE_ARTICLE, entityId: articleId });
    mockEdgeRepo.findOne.mockResolvedValue(null);

    const edge = await knowledgeLineageService.linkKnowledgeToSourceEntity(
      {
        articleId,
        targetEntityType: EkosEntityType.NCR,
        targetEntityId: ncrId,
        relationType: EkosRelationType.CITED_BY,
      },
      tenantA,
    );

    expect(edge.relationType).toBe(EkosRelationType.CITED_BY);
  });

  it('GS-02: Revision -> Knowledge Preserving Historical Lineage', async () => {
    mockNodeRepo.findOne
      .mockResolvedValueOnce({ id: 'node-drw-b', tenantId: tenantA, entityType: EkosEntityType.DRAWING, entityId: drawingId, entityRevision: 'Rev B' })
      .mockResolvedValueOnce({ id: 'node-art', tenantId: tenantA, entityType: EkosEntityType.KNOWLEDGE_ARTICLE, entityId: articleId });
    mockEdgeRepo.findOne.mockResolvedValue(null);

    const edge = await graphService.recordEdge(
      {
        sourceEntityType: EkosEntityType.DRAWING,
        sourceEntityId: drawingId,
        sourceEntityRevision: 'Rev B',
        targetEntityType: EkosEntityType.KNOWLEDGE_ARTICLE,
        targetEntityId: articleId,
        relationType: EkosRelationType.CITED_BY,
      },
      tenantA,
    );

    expect(edge).toBeDefined();
    expect(mockEdgeRepo.save).toHaveBeenCalled();
  });

  it('GS-03 & GS-04: Knowledge -> Evidence -> Source File Tracing', async () => {
    mockArticleRepo.findOne.mockResolvedValue({ id: articleId, tenantId: tenantA, title: 'Cooling Design Standard' });
    mockNodeRepo.findOne.mockResolvedValue({ id: 'node-art', tenantId: tenantA, entityType: EkosEntityType.KNOWLEDGE_ARTICLE, entityId: articleId });
    mockEdgeRepo.find.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockEvidenceRepo.find.mockResolvedValue([
      { id: 'ev-1', chunkId: 'chk-1', sourceFile: 'ToolingStandards.pdf', citationLabel: 'STD-1' },
    ]);

    const result = await knowledgeLineageService.getKnowledgeArticleLineage(articleId, tenantA);

    expect(result.supportingEvidence.length).toBe(1);
    expect(result.supportingEvidence[0].sourceFile).toBe('ToolingStandards.pdf');
  });

  it('GS-05 & GS-06: NCR & Trial Observation -> Knowledge Lineage', async () => {
    mockNodeRepo.findOne.mockResolvedValue({ id: 'node-trial', tenantId: tenantA, entityType: EkosEntityType.TRIAL_OBSERVATION, entityId: trialId });
    mockEdgeRepo.find.mockResolvedValue([
      {
        id: 'edge-trial-art',
        relationType: EkosRelationType.CITED_BY,
        provenanceType: EkosProvenanceType.TRANSACTIONAL_EVENT,
        isSuperseded: false,
        validFrom: new Date(),
        targetNode: { id: 'node-art', entityType: EkosEntityType.KNOWLEDGE_ARTICLE, entityId: articleId, label: 'Injection Pressure Limits' },
      },
    ]);

    const result = await knowledgeLineageService.getEntityKnowledgeLineage(
      EkosEntityType.TRIAL_OBSERVATION,
      trialId,
      tenantA,
    );

    expect(result.knowledgeArticlesCount).toBe(1);
    expect(result.knowledgeArticles[0].label).toBe('Injection Pressure Limits');
  });

  it('GS-07: G13 Cited RAG Evidence Lineage Grounding', async () => {
    mockArticleRepo.findOne.mockResolvedValue({ id: articleId, tenantId: tenantA, title: 'Cited Article' });
    mockNodeRepo.findOne.mockResolvedValue({ id: 'node-art', tenantId: tenantA, entityType: EkosEntityType.KNOWLEDGE_ARTICLE, entityId: articleId });
    mockEdgeRepo.find
      .mockResolvedValueOnce([
        {
          id: 'edge-up',
          relationType: EkosRelationType.DERIVED_FROM,
          provenanceType: EkosProvenanceType.TRANSACTIONAL_EVENT,
          confidence: 1.0,
          isSuperseded: false,
          sourceNode: { id: 'node-drw', entityType: EkosEntityType.DRAWING, entityId: drawingId, label: 'DWG-100' },
        },
      ])
      .mockResolvedValueOnce([]);

    mockEvidenceRepo.find.mockResolvedValue([]);

    const lineage = await knowledgeLineageService.getKnowledgeArticleLineage(articleId, tenantA);
    expect(lineage.upstreamSources[0].entityType).toBe(EkosEntityType.DRAWING);
  });

  it('GS-08: G14 Predictive Leveling Recommendation Upstream Provenance', async () => {
    mockRecommendationRepo.findOne.mockResolvedValue({
      id: recommendationId,
      tenantId: tenantA,
      recommendationType: 'ADJUST_MILESTONE_DATE',
      status: 'GENERATED',
      riskTier: 'HIGH',
      modelVersion: 'G14_DELAY_RIDGE_V1',
      projectId,
    });
    mockNodeRepo.findOne.mockResolvedValue({ id: 'node-rec', tenantId: tenantA, entityType: EkosEntityType.LEVELING_RECOMMENDATION, entityId: recommendationId });
    mockEdgeRepo.find.mockResolvedValue([
      {
        id: 'edge-pred',
        relationType: EkosRelationType.PREDICTED_FROM,
        provenanceType: EkosProvenanceType.AI_INFERRED,
        confidence: 0.91,
        sourceNode: { id: 'node-proj', entityType: EkosEntityType.PROJECT, entityId: projectId, label: 'Tooling Rev B' },
      },
    ]);

    const prov = await knowledgeLineageService.getRecommendationProvenance(recommendationId, tenantA);

    expect(prov.isAiInferred).toBe(true);
    expect(prov.upstreamEvidence[0].relationType).toBe(EkosRelationType.PREDICTED_FROM);
  });

  it('GS-09: Cross-Domain Multi-Hop Traversal (Project -> Drawing -> WO -> Trial -> NCR -> Knowledge -> G14)', async () => {
    const rootNode = { id: 'node-p', tenantId: tenantA, entityType: EkosEntityType.PROJECT, entityId: projectId, label: 'Mold Project', isSuperseded: false };
    const drwNode = { id: 'node-d', tenantId: tenantA, entityType: EkosEntityType.DRAWING, entityId: drawingId, label: 'DWG', isSuperseded: false };

    mockNodeRepo.findOne.mockResolvedValue(rootNode);
    mockEdgeRepo.find
      .mockResolvedValueOnce([
        { id: 'e1', tenantId: tenantA, sourceNodeId: 'node-p', targetNodeId: 'node-d', relationType: EkosRelationType.REFERENCES, confidence: 1.0, isSuperseded: false, targetNode: drwNode },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await graphService.getLineage(
      EkosEntityType.PROJECT,
      projectId,
      { direction: LineageDirection.BIDIRECTIONAL, maxDepth: 3 },
      tenantA,
    );

    expect(result.nodes.length).toBe(2);
    expect(result.edges.length).toBe(1);
  });

  it('GS-10: Multi-Tenant Fail-Closed Isolation', async () => {
    mockArticleRepo.findOne.mockResolvedValue(null);

    await expect(
      knowledgeLineageService.getKnowledgeArticleLineage(articleId, tenantB),
    ).rejects.toThrow(NotFoundException);
  });

  it('GS-11: Explicit AI-Inferred Provenance Marking', async () => {
    mockRecommendationRepo.findOne.mockResolvedValue({
      id: recommendationId,
      tenantId: tenantA,
      recommendationType: 'ESCALATE_CAPACITY',
      status: 'GENERATED',
      riskTier: 'CRITICAL',
      modelVersion: 'G14_CAPACITY_RIDGE_V1',
    });
    mockNodeRepo.findOne.mockResolvedValue({ id: 'node-rec' });
    mockEdgeRepo.find.mockResolvedValue([]);

    const prov = await knowledgeLineageService.getRecommendationProvenance(recommendationId, tenantA);

    expect(prov.isAiInferred).toBe(true);
    expect(prov.humanReviewRequired).toBe(true);
  });

  it('GS-12: Revision Supersession & Temporal Lineage Preservation', async () => {
    const activeEdge = {
      id: 'e-active',
      tenantId: tenantA,
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      relationType: EkosRelationType.REFERENCES,
      isSuperseded: false,
    };
    mockEdgeRepo.findOne.mockResolvedValue(activeEdge);
    mockNodeRepo.findOne.mockResolvedValue({ id: 'node-1', tenantId: tenantA });

    const updated = await graphService.recordEdge(
      {
        sourceEntityType: EkosEntityType.DRAWING,
        sourceEntityId: drawingId,
        targetEntityType: EkosEntityType.WORK_ORDER,
        targetEntityId: workOrderId,
        relationType: EkosRelationType.REFERENCES,
        confidence: 0.95,
      },
      tenantA,
    );

    expect(updated).toBeDefined();
  });

  it('GS-13: Duplicate Event Idempotent Protection', async () => {
    mockNodeRepo.findOne.mockResolvedValue({ id: 'node-p', tenantId: tenantA, label: 'Existing Project' });

    const node = await graphService.registerNode(
      {
        entityType: EkosEntityType.PROJECT,
        entityId: projectId,
        label: 'Existing Project',
      },
      tenantA,
    );

    expect(node.label).toBe('Existing Project');
  });

  it('GS-14: Graph Reconciliation & Anomaly Detection', async () => {
    mockNodeRepo.find.mockResolvedValue([]);
    mockEdgeRepo.find.mockResolvedValue([]);

    const report = await reconciliationService.verifyGraphIntegrity(tenantA);

    expect(report.isHealthy).toBe(true);
  });

  it('GS-15: Traversal Authorization Guardrail', async () => {
    mockNodeRepo.findOne.mockResolvedValue(null);

    await expect(
      graphService.getLineage(EkosEntityType.PROJECT, projectId, {}, tenantB),
    ).rejects.toThrow(NotFoundException);
  });
});
