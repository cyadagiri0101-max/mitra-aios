import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { KnowledgeArticleService } from './knowledgearticle.service';
import { KnowledgeArticle, ArticleStatus, ArticleType } from '../entities/knowledgearticle.entity';
import { KnowledgeArticleEvidence } from '../entities/knowledge-article-evidence.entity';
import { KnowledgeChunk } from '../../engineering-library/entities/knowledge-chunk.entity';
import { EngineeringDecision, DecisionStatus, DecisionType } from '../../engineering-decisions/entities/engineering-decision.entity';

describe('KnowledgeArticleService (M8.5 Evidence Linking & Search)', () => {
  let service: KnowledgeArticleService;
  let repo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let evidenceRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let chunkRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let decisionRepo: {
    findOne: jest.Mock;
  };
  let dataSource: {
    transaction: jest.Mock;
  };
  let auditService: {
    logBusinessEvent: jest.Mock;
  };

  const sampleTenantId = 'tenant-precision-uuid';
  const sampleUserId = 'user-eng-lead-uuid';
  const otherTenantId = 'tenant-other-corp-uuid';

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ id: 'art-uuid-1', ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: entity.id || 'art-uuid-1', ...entity })),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    evidenceRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((dto) => ({ id: 'ev-uuid-1', ...dto })),
      save: jest.fn((entity) => Promise.resolve(Array.isArray(entity) ? entity : { id: 'ev-uuid-1', ...entity })),
    };

    chunkRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };

    decisionRepo = {
      findOne: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(async (cb) => {
        const em = {
          getRepository: jest.fn((entity) => {
            if (entity === KnowledgeArticle) return repo;
            if (entity === KnowledgeArticleEvidence) return evidenceRepo;
            if (entity === KnowledgeChunk) return chunkRepo;
            return repo;
          }),
          save: jest.fn(async (e) => e),
        };
        return cb(em);
      }),
    };

    auditService = {
      logBusinessEvent: jest.fn().mockResolvedValue({}),
    };

    service = new KnowledgeArticleService(
      repo as any,
      evidenceRepo as any,
      chunkRepo as any,
      decisionRepo as any,
      dataSource as any,
      auditService as any,
    );
  });

  describe('Article Creation & Lifecycle Foundation', () => {
    it('creates root article in DRAFT state with version 1 and parentArticleId null', async () => {
      const created = await service.create(
        {
          title: 'EDM Electrode Tooling Standards',
          content: '# Guidelines\nCopper graphite electrode machining tolerances.',
          articleType: ArticleType.STANDARD,
          projectId: 'proj-bm454-uuid',
        },
        sampleUserId,
        sampleTenantId,
      );

      expect(created.status).toBe(ArticleStatus.DRAFT);
      expect(created.version).toBe(1);
      expect(created.isLatest).toBe(true);
      expect(created.parentArticleId).toBeNull();
      expect(created.tenantId).toBe(sampleTenantId);
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'knowledge_article.created',
        'KnowledgeArticle',
        'art-uuid-1',
        sampleUserId,
        expect.objectContaining({ status: ArticleStatus.DRAFT, version: 1 }),
        undefined,
        'proj-bm454-uuid',
        sampleTenantId,
      );
    });

    it('rejects creation with empty title or content', async () => {
      await expect(
        service.create({ title: '', content: 'Valid' }, sampleUserId, sampleTenantId),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create({ title: 'Valid Title', content: '' }, sampleUserId, sampleTenantId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('M8.5 G13 Grounded Evidence Linking', () => {
    const mockChunk1: Partial<KnowledgeChunk> = {
      id: 'chunk-uuid-1',
      tenantId: sampleTenantId,
      sourceFile: 'MOL-001_Design_Standard.xlsx',
      sourceSheet: 'ToolingParams',
      sourceRow: 14,
      sourcePage: null,
      authorityStatus: 'AUTHORITATIVE_RELEASE' as any,
      entityType: 'WORKBOOK_ROW',
      projectNumber: 'PRJ-2026-0042',
      contentHash: 'hash123456789',
    };

    const mockChunk2: Partial<KnowledgeChunk> = {
      id: 'chunk-uuid-2',
      tenantId: sampleTenantId,
      sourceFile: 'ISO_20482_Milling_Spec.pdf',
      sourceSheet: null,
      sourceRow: null,
      sourcePage: 5,
      authorityStatus: 'AUTHORITATIVE_RELEASE' as any,
      entityType: 'DOCUMENT_PAGE',
      projectNumber: 'PRJ-2026-0042',
      contentHash: 'hash987654321',
    };

    it('attaches validated G13 chunks as evidence to a DRAFT article', async () => {
      repo.findOne.mockResolvedValue({
        id: 'art-draft-1',
        status: ArticleStatus.DRAFT,
        tenantId: sampleTenantId,
        projectId: 'proj-123',
      });

      chunkRepo.find.mockResolvedValue([mockChunk1, mockChunk2]);
      evidenceRepo.find.mockResolvedValue([]); // No existing evidence

      const result = await service.attachEvidence(
        'art-draft-1',
        { chunkIds: ['chunk-uuid-1', 'chunk-uuid-2'] },
        sampleUserId,
        sampleTenantId,
      );

      expect(result).toBeDefined();
      expect(evidenceRepo.create).toHaveBeenCalledTimes(2);
      expect(evidenceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          articleId: 'art-draft-1',
          chunkId: 'chunk-uuid-1',
          sequenceNumber: 1,
          citationLabel: '[REF-1]',
          sourceFile: 'MOL-001_Design_Standard.xlsx',
          sourceCoordinate: 'MOL-001_Design_Standard.xlsx#ToolingParams:R14',
          authorityStatus: 'AUTHORITATIVE_RELEASE',
          tenantId: sampleTenantId,
        }),
      );

      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'knowledge_article.evidence_attached',
        'KnowledgeArticle',
        'art-draft-1',
        sampleUserId,
        expect.objectContaining({
          articleId: 'art-draft-1',
          chunkIds: ['chunk-uuid-1', 'chunk-uuid-2'],
          tenantId: sampleTenantId,
        }),
        undefined,
        'proj-123',
        sampleTenantId,
      );
    });

    it('forbids attaching evidence to a PUBLISHED article', async () => {
      repo.findOne.mockResolvedValue({
        id: 'art-pub-1',
        status: ArticleStatus.PUBLISHED,
        tenantId: sampleTenantId,
      });

      await expect(
        service.attachEvidence('art-pub-1', { chunkIds: ['chunk-uuid-1'] }, sampleUserId, sampleTenantId),
      ).rejects.toThrow(/Evidence can only be modified while article is in DRAFT state/);
    });

    it('forbids attaching evidence to an UNDER_REVIEW article', async () => {
      repo.findOne.mockResolvedValue({
        id: 'art-rev-1',
        status: ArticleStatus.UNDER_REVIEW,
        tenantId: sampleTenantId,
      });

      await expect(
        service.attachEvidence('art-rev-1', { chunkIds: ['chunk-uuid-1'] }, sampleUserId, sampleTenantId),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects attachment if one of the chunks does not exist or belongs to another tenant', async () => {
      repo.findOne.mockResolvedValue({
        id: 'art-draft-1',
        status: ArticleStatus.DRAFT,
        tenantId: sampleTenantId,
      });

      chunkRepo.find.mockResolvedValue([mockChunk1]); // Only 1 found instead of 2 requested

      await expect(
        service.attachEvidence(
          'art-draft-1',
          { chunkIds: ['chunk-uuid-1', 'chunk-foreign-tenant-uuid'] },
          sampleUserId,
          sampleTenantId,
        ),
      ).rejects.toThrow('One or more G13 KnowledgeChunks do not exist or belong to another tenant.');
    });

    it('detaches evidence from a DRAFT article and re-sequences citations', async () => {
      repo.findOne.mockResolvedValue({
        id: 'art-draft-1',
        status: ArticleStatus.DRAFT,
        tenantId: sampleTenantId,
        projectId: 'proj-123',
      });

      const ev1 = { id: 'ev-1', articleId: 'art-draft-1', chunkId: 'c1', sequenceNumber: 1, citationLabel: '[REF-1]', tenantId: sampleTenantId };
      const ev2 = { id: 'ev-2', articleId: 'art-draft-1', chunkId: 'c2', sequenceNumber: 2, citationLabel: '[REF-2]', tenantId: sampleTenantId };

      evidenceRepo.findOne.mockResolvedValue(ev1);
      evidenceRepo.find.mockResolvedValue([ev2]);

      await service.detachEvidence('art-draft-1', 'ev-1', sampleUserId, sampleTenantId);

      expect(evidenceRepo.save).toHaveBeenCalled();
      expect(ev2.sequenceNumber).toBe(1);
      expect(ev2.citationLabel).toBe('[REF-1]');

      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'knowledge_article.evidence_detached',
        'KnowledgeArticle',
        'art-draft-1',
        sampleUserId,
        expect.objectContaining({
          articleId: 'art-draft-1',
          detachedEvidenceId: 'ev-1',
          tenantId: sampleTenantId,
        }),
        undefined,
        'proj-123',
        sampleTenantId,
      );
    });

    it('clones baseline evidence when creating a new revision (v1 -> v2)', async () => {
      const v1Article = {
        id: 'v1-uuid',
        title: 'Tooling Standard',
        status: ArticleStatus.PUBLISHED,
        version: 1,
        authorId: 'author-1',
        tenantId: sampleTenantId,
      };

      const existingEvidence = [
        {
          id: 'ev-v1-1',
          chunkId: 'chunk-uuid-1',
          sequenceNumber: 1,
          citationLabel: '[REF-1]',
          sourceFile: 'MOL-001.xlsx',
          sourceCoordinate: 'MOL-001.xlsx#Sheet1:R10',
          authorityStatus: 'AUTHORITATIVE_RELEASE',
          contentHash: 'hash1',
        },
      ];

      repo.findOne.mockResolvedValue(v1Article);
      repo.create.mockReturnValue({ id: 'v2-uuid', version: 2, status: ArticleStatus.DRAFT, tenantId: sampleTenantId });
      repo.save.mockResolvedValue({ id: 'v2-uuid', version: 2, status: ArticleStatus.DRAFT, tenantId: sampleTenantId });
      evidenceRepo.find.mockResolvedValue(existingEvidence);

      const revision = await service.createRevision('v1-uuid', sampleUserId, sampleTenantId);

      expect(revision.id).toBe('v2-uuid');
      expect(evidenceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          articleId: 'v2-uuid',
          chunkId: 'chunk-uuid-1',
          citationLabel: '[REF-1]',
          sequenceNumber: 1,
          tenantId: sampleTenantId,
        }),
      );
    });
  });

  describe('M8.4 Decision Corpus Integration (createArticleDraftFromDecision)', () => {
    const mockApprovedDecision: EngineeringDecision = {
      id: 'dec-uuid-100',
      decisionNumber: 'DEC-2026-0042',
      title: 'Conformal Cooling Channel Layout for Core Insert',
      decisionType: DecisionType.DESIGN,
      description: 'Selection of 3D printed conformal cooling vs straight drilled lines.',
      context: 'Part geometry on BM454 has high thermal concentration at deep boss.',
      optionsConsidered: 'Option A: Straight drilled channels ($1,200). Option B: DMLS 1.2709 conformal channels ($4,800).',
      selectedOption: 'Option B: DMLS conformal cooling channels.',
      rationale: 'Cycle time reduction of 6.2s offsets tooling cost within 45,000 shots.',
      decision: 'Approved DMLS conformal cooling insert with 1.2709 tool steel.',
      status: DecisionStatus.APPROVED,
      decisionDate: new Date('2026-08-15'),
      decisionOwnerId: 'lead-engineer-uuid',
      approvedBy: 'plant-mgr-uuid',
      approvedAt: new Date('2026-08-16T10:00:00Z'),
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      relatedEntityType: 'TOOL_DESIGN',
      relatedEntityId: 'tool-bm454-uuid',
      supersedesDecisionId: null,
      supersededByDecisionId: null,
      projectId: 'proj-bm454-uuid',
      tenantId: sampleTenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      createdBy: 'lead-engineer-uuid',
      updatedBy: 'plant-mgr-uuid',
    };

    it('drafts a structured KnowledgeArticle from an APPROVED EngineeringDecision', async () => {
      decisionRepo.findOne.mockResolvedValue(mockApprovedDecision);
      repo.findOne.mockResolvedValue(null); // No existing root article

      const draft = await service.createArticleDraftFromDecision('dec-uuid-100', sampleUserId, sampleTenantId);

      expect(draft.status).toBe(ArticleStatus.DRAFT);
      expect(draft.version).toBe(1);
      expect(draft.isLatest).toBe(true);
      expect(draft.parentArticleId).toBeNull();
      expect(draft.decisionId).toBe('dec-uuid-100');
      expect(draft.projectId).toBe('proj-bm454-uuid');
      expect(draft.title).toBe('Engineering Decision: Conformal Cooling Channel Layout for Core Insert');
      expect(draft.articleType).toBe(ArticleType.BEST_PRACTICE);
      expect(draft.tags).toEqual(['engineering-decision', 'design']);
      expect(draft.summary).toBe('Cycle time reduction of 6.2s offsets tooling cost within 45,000 shots.');
      expect(draft.content).toContain('# Engineering Decision: Conformal Cooling Channel Layout for Core Insert (DEC-2026-0042)');

      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'knowledge_article.draft_created_from_decision',
        'KnowledgeArticle',
        'art-uuid-1',
        sampleUserId,
        expect.objectContaining({
          decisionId: 'dec-uuid-100',
          decisionNumber: 'DEC-2026-0042',
          projectId: 'proj-bm454-uuid',
          status: ArticleStatus.DRAFT,
          tenantId: sampleTenantId,
        }),
        undefined,
        'proj-bm454-uuid',
        sampleTenantId,
      );
    });

    it('idempotently returns existing root article if already drafted for decision', async () => {
      decisionRepo.findOne.mockResolvedValue(mockApprovedDecision);
      const existingRootArticle: Partial<KnowledgeArticle> = {
        id: 'existing-root-uuid',
        title: 'Engineering Decision: Conformal Cooling Channel Layout for Core Insert',
        status: ArticleStatus.DRAFT,
        version: 1,
        decisionId: 'dec-uuid-100',
        parentArticleId: null,
        tenantId: sampleTenantId,
      };

      repo.findOne.mockResolvedValue(existingRootArticle);

      const result = await service.createArticleDraftFromDecision('dec-uuid-100', sampleUserId, sampleTenantId);

      expect(result.id).toBe('existing-root-uuid');
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rejects drafting if EngineeringDecision is in DRAFT state', async () => {
      decisionRepo.findOne.mockResolvedValue({
        ...mockApprovedDecision,
        status: DecisionStatus.DRAFT,
      });

      await expect(
        service.createArticleDraftFromDecision('dec-uuid-100', sampleUserId, sampleTenantId),
      ).rejects.toThrow(/Knowledge article drafts can only be generated from APPROVED engineering decisions/);
    });
  });

  describe('Atomic Supersession & Revision Publication', () => {
    it('publishes root article (no parent) and sets isLatest true', async () => {
      const rootArticle: KnowledgeArticle = {
        id: 'root-uuid',
        title: 'Initial Tooling Guideline',
        status: ArticleStatus.UNDER_REVIEW,
        version: 1,
        isLatest: false,
        parentArticleId: null,
        tenantId: sampleTenantId,
      } as any;

      repo.findOne.mockResolvedValue(rootArticle);

      const published = await service.approveAndPublish('root-uuid', {}, sampleUserId, sampleTenantId);
      expect(published.status).toBe(ArticleStatus.PUBLISHED);
      expect(published.isLatest).toBe(true);
      expect(published.publishedAt).toBeInstanceOf(Date);
      expect(published.reviewedBy).toBe(sampleUserId);
    });

    it('atomically supersedes v1 when v2 is published inside database transaction', async () => {
      const v1Predecessor: KnowledgeArticle = {
        id: 'v1-uuid',
        title: 'Mold Cooling Design',
        content: 'Original cooling calculations',
        status: ArticleStatus.PUBLISHED,
        version: 1,
        isLatest: true,
        parentArticleId: null,
        supersededById: null,
        tenantId: sampleTenantId,
      } as any;

      const v2Child: KnowledgeArticle = {
        id: 'v2-uuid',
        title: 'Mold Cooling Design',
        content: 'Updated high-pressure conformal cooling calculations',
        status: ArticleStatus.UNDER_REVIEW,
        version: 2,
        isLatest: false,
        parentArticleId: 'v1-uuid',
        supersededById: null,
        tenantId: sampleTenantId,
      } as any;

      repo.findOne.mockImplementation(async ({ where }: any) => {
        if (where.id === 'v2-uuid') return v2Child;
        if (where.id === 'v1-uuid') return v1Predecessor;
        return null;
      });

      const publishedV2 = await service.approveAndPublish('v2-uuid', { expiresAt: '2027-12-31' }, sampleUserId, sampleTenantId);

      expect(publishedV2.status).toBe(ArticleStatus.PUBLISHED);
      expect(publishedV2.isLatest).toBe(true);
      expect(v1Predecessor.status).toBe(ArticleStatus.SUPERSEDED);
      expect(v1Predecessor.isLatest).toBe(false);
      expect(v1Predecessor.supersededById).toBe('v2-uuid');
    });
  });

  describe('Multi-Revision Chain Lineage (v1 -> v2 -> v3)', () => {
    it('retrieves full ordered lineage chain via getRevisionHistory', async () => {
      const v1 = { id: 'v1', version: 1, parentArticleId: null, status: ArticleStatus.SUPERSEDED, tenantId: sampleTenantId };
      const v2 = { id: 'v2', version: 2, parentArticleId: 'v1', status: ArticleStatus.SUPERSEDED, tenantId: sampleTenantId };
      const v3 = { id: 'v3', version: 3, parentArticleId: 'v2', status: ArticleStatus.PUBLISHED, tenantId: sampleTenantId };

      repo.findOne.mockImplementation(async ({ where }: any) => {
        if (where?.id === 'v3' || where?.id?._value === 'v3') return v3;
        if (where?.id === 'v2') return v2;
        if (where?.id === 'v1') return v1;
        return v3;
      });

      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([v1, v2, v3]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const history = await service.getRevisionHistory('v3', sampleTenantId);

      expect(history.length).toBe(3);
      expect(history[0].version).toBe(1);
      expect(history[1].version).toBe(2);
      expect(history[2].version).toBe(3);
    });
  });
});
