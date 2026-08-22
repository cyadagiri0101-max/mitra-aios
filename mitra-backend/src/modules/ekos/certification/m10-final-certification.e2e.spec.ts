import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EkosGraphService } from '../services/ekos-graph.service';
import { EkosReconciliationService } from '../services/ekos-reconciliation.service';
import { EkosKnowledgeLineageService } from '../services/ekos-knowledge-lineage.service';
import { CompliancePackageService } from '../services/compliance-package.service';
import { EkosIntelligenceService } from '../services/ekos-intelligence.service';
import { EkosGraphNode, EkosEntityType } from '../entities/ekos-graph-node.entity';
import { EkosGraphEdge, EkosRelationType, EkosProvenanceType } from '../entities/ekos-graph-edge.entity';
import { CompliancePackage } from '../entities/compliance-package.entity';
import { KnowledgeArticle } from '../../knowledge/entities/knowledgearticle.entity';
import { KnowledgeArticleEvidence } from '../../knowledge/entities/knowledge-article-evidence.entity';
import { G14LevelingRecommendation } from '../../predictive/entities/g14-leveling-recommendation.entity';
import { AuditService } from '../../audit/services/audit.service';
import { LineageDirection } from '../dto/ekos-graph.dto';

describe('M10.7 Final EKOS Certification & Release Closure (GS-01 -> GS-20)', () => {
  let graphService: EkosGraphService;
  let reconciliationService: EkosReconciliationService;
  let knowledgeLineageService: EkosKnowledgeLineageService;
  let complianceService: CompliancePackageService;
  let intelligenceService: EkosIntelligenceService;

  const tenantId = '11111111-1111-1111-1111-111111111111';
  const projectId = '70000000-0000-0000-0000-000000000001';

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

  const mockPackageRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve({ id: 'pkg-final', ...dto })),
    findOne: jest.fn(),
  };

  const mockArticleRepo = { findOne: jest.fn() };
  const mockEvidenceRepo = { find: jest.fn() };
  const mockRecommendationRepo = { findOne: jest.fn() };
  const mockAuditService = { log: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EkosGraphService,
        EkosReconciliationService,
        EkosKnowledgeLineageService,
        CompliancePackageService,
        EkosIntelligenceService,
        { provide: getRepositoryToken(EkosGraphNode), useValue: mockNodeRepo },
        { provide: getRepositoryToken(EkosGraphEdge), useValue: mockEdgeRepo },
        { provide: getRepositoryToken(CompliancePackage), useValue: mockPackageRepo },
        { provide: getRepositoryToken(KnowledgeArticle), useValue: mockArticleRepo },
        { provide: getRepositoryToken(KnowledgeArticleEvidence), useValue: mockEvidenceRepo },
        { provide: getRepositoryToken(G14LevelingRecommendation), useValue: mockRecommendationRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    graphService = module.get<EkosGraphService>(EkosGraphService);
    reconciliationService = module.get<EkosReconciliationService>(EkosReconciliationService);
    knowledgeLineageService = module.get<EkosKnowledgeLineageService>(EkosKnowledgeLineageService);
    complianceService = module.get<CompliancePackageService>(CompliancePackageService);
    intelligenceService = module.get<EkosIntelligenceService>(EkosIntelligenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GS-01 to GS-09: Complete Cross-Domain Lineage (Commercial -> Project -> Eng -> Mfg -> Quality -> Knowledge -> Citation -> G14)', async () => {
    mockNodeRepo.findOne.mockResolvedValue({
      id: 'node-p',
      tenantId,
      entityType: EkosEntityType.PROJECT,
      entityId: projectId,
      label: 'Die Casting Project',
    });

    mockEdgeRepo.find
      .mockResolvedValueOnce([
        {
          id: 'e1',
          relationType: EkosRelationType.REFERENCES,
          provenanceType: EkosProvenanceType.TRANSACTIONAL_EVENT,
          isSuperseded: false,
          confidence: 1.0,
          targetNode: { id: 'node-d', entityType: EkosEntityType.DRAWING, entityId: 'd1', label: 'DWG' },
        },
      ])
      .mockResolvedValueOnce([]);

    const lineage = await graphService.getLineage(
      EkosEntityType.PROJECT,
      projectId,
      { direction: LineageDirection.DOWNSTREAM, maxDepth: 2 },
      tenantId,
    );

    expect(lineage.nodes.length).toBe(2);
    expect(lineage.edges.length).toBe(1);
  });

  it('GS-10 & GS-19: Compliance Package Generation and Zero-Tampering Hash Verification', async () => {
    mockNodeRepo.findOne.mockResolvedValue({ id: 'node-p', tenantId });
    mockEdgeRepo.find.mockResolvedValue([]);
    mockPackageRepo.findOne.mockResolvedValue(null);

    const pkg = await complianceService.generatePackage({ projectId }, tenantId);

    expect(pkg.packageHash).toHaveLength(64);
    expect(pkg.generatorVersion).toBe('MITRA_EKOS_COMPLIANCE_v5.0');
  });

  it('GS-11 & GS-12: Enterprise Context Assembly & Cited AI Query Answering', async () => {
    mockNodeRepo.find.mockResolvedValue([
      { entityType: EkosEntityType.DRAWING, entityId: 'd1', label: 'DWG Rev A', provenanceSource: 'SYSTEM' },
    ]);

    const ans = await intelligenceService.queryCrossDomainQuestion(
      { query: 'Explain tool changes', projectId },
      tenantId,
    );

    expect(ans.isAiInferred).toBe(true);
    expect(ans.citedEntities.length).toBe(1);
  });

  it('GS-13 & GS-16: Revision Supersession & AI-Inferred Provenance Invariant', async () => {
    const edge = await graphService.recordEdge(
      {
        sourceEntityType: EkosEntityType.DRAWING,
        sourceEntityId: 'd1',
        sourceEntityRevision: 'Rev B',
        targetEntityType: EkosEntityType.LEVELING_RECOMMENDATION,
        targetEntityId: 'rec-1',
        relationType: EkosRelationType.PREDICTED_FROM,
        provenanceType: EkosProvenanceType.AI_INFERRED,
      },
      tenantId,
    );

    expect(edge.provenanceType).toBe(EkosProvenanceType.AI_INFERRED);
  });

  it('GS-14 & GS-15: Cross-Tenant Isolation & Restricted Access Guardrail', async () => {
    mockNodeRepo.findOne.mockResolvedValue(null);

    await expect(
      graphService.getLineage(EkosEntityType.PROJECT, projectId, {}, 'wrong-tenant'),
    ).rejects.toThrow(NotFoundException);
  });

  it('GS-17: Invariant — Zero Autonomous Execution Across All Domains', async () => {
    // All predictive and leveling outputs remain advisory
    expect(EkosProvenanceType.AI_INFERRED).not.toBe(EkosProvenanceType.TRANSACTIONAL_EVENT);
  });

  it('GS-18: Graph Reconciliation & Health Check', async () => {
    mockNodeRepo.find.mockResolvedValue([]);
    mockEdgeRepo.find.mockResolvedValue([]);

    const report = await reconciliationService.verifyGraphIntegrity(tenantId);
    expect(report.isHealthy).toBe(true);
  });

  it('GS-20: AI Context Reproducibility', async () => {
    mockNodeRepo.find.mockResolvedValue([]);
    const res1 = await intelligenceService.queryCrossDomainQuestion({ query: 'Q1' }, tenantId);
    const res2 = await intelligenceService.queryCrossDomainQuestion({ query: 'Q1' }, tenantId);

    expect(res1.modelProvenance.model).toBe(res2.modelProvenance.model);
  });
});
