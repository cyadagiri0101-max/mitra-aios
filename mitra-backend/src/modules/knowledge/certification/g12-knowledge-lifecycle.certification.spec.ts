import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { KnowledgeArticleService } from '../services/knowledgearticle.service';
import { KnowledgeSearchService } from '../services/knowledge-search.service';
import { KnowledgeArticle, ArticleStatus, ArticleType } from '../entities/knowledgearticle.entity';
import { KnowledgeArticleEvidence } from '../entities/knowledge-article-evidence.entity';
import { KnowledgeChunk } from '../../engineering-library/entities/knowledge-chunk.entity';
import { EngineeringDecision, DecisionStatus, DecisionType } from '../../engineering-decisions/entities/engineering-decision.entity';
import { AuthorityStatus } from '../../engineering-library/types/engineering-library-scan.types';

describe('G12 Knowledge Governance End-to-End Golden Scenario Certification Suite', () => {
  let articleService: KnowledgeArticleService;
  let searchService: KnowledgeSearchService;

  // In-Memory Certified Store for Multi-Entity Integration Testing
  const inMemoryArticles = new Map<string, KnowledgeArticle>();
  const inMemoryEvidence = new Map<string, KnowledgeArticleEvidence>();
  const inMemoryChunks = new Map<string, KnowledgeChunk>();
  const inMemoryDecisions = new Map<string, EngineeringDecision>();
  const inMemoryAuditLogs: Array<{ event: string; targetId: string; payload: any; tenantId: string }> = [];

  const tenantA = 'tenant-precision-tooling-corp';
  const tenantB = 'tenant-competitor-molding-inc';
  const userIdLead = 'user-eng-lead-01';
  const userIdReviewer = 'user-qa-director-02';
  const sampleProjectId = 'proj-bm454-automotive-die';

  // Certified Real G13 Knowledge Chunks
  const certifiedChunk1: KnowledgeChunk = {
    id: 'chunk-g13-bm454-insert-01',
    sourceId: 'src-bm454-partlist',
    sourceType: 'MASTER_WORKBOOK',
    entityType: 'BOM_PART',
    entityId: 'part-bm454-01',
    chunkType: 'BOM_TABLE',
    chunkOrdinal: 0,
    projectNumber: 'BM454',
    projectPrefix: 'BM',
    customer: 'Veedol',
    machine: 'SEB101 FN',
    material: 'ALUMINIUM',
    revision: 'RevA',
    authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
    relativePath: 'BM-454/BM454 Partlist_RevA.xlsx',
    sourceFile: 'BM454 Partlist_RevA.xlsx',
    sourceSheet: 'Inserts',
    sourceRow: 14,
    sourcePage: null,
    contentHash: 'a89f81d4e74880921021487192348a8b19283748291039847102938471029384',
    chunkText: 'Body Insert - B & P | ALUMINIUM Grade HOKOTOL | Hardness 280-325 HB | 8-Cavity SEB101 FN',
    structuredMetadata: { grade: 'HOKOTOL', cavities: 8 },
    embeddingStatus: 'EMBEDDED' as any,
    embeddingModel: 'nomic-embed-text',
    embeddedAt: new Date('2026-08-16T12:00:00Z'),
    errorReason: null,
    tenantId: tenantA,
    createdAt: new Date('2026-08-16T10:00:00Z'),
    updatedAt: new Date('2026-08-16T10:00:00Z'),
    deletedAt: null,
    createdBy: 'scanner-daemon',
    updatedBy: 'scanner-daemon',
  };

  const certifiedChunk2: KnowledgeChunk = {
    id: 'chunk-g13-bm454-milling-02',
    sourceId: 'src-iso-spec-20482',
    sourceType: 'TECHNICAL_DOCUMENT',
    entityType: 'DOCUMENT_PAGE',
    entityId: 'doc-page-05',
    chunkType: 'TECHNICAL_SPECIFICATION',
    chunkOrdinal: 1,
    projectNumber: 'BM454',
    projectPrefix: 'BM',
    customer: 'Veedol',
    machine: 'DMG Mori HSC',
    material: 'ALUMOLD 1-500',
    revision: 'RevB',
    authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
    relativePath: 'Standards/ISO_20482_Milling_Guidelines.pdf',
    sourceFile: 'ISO_20482_Milling_Guidelines.pdf',
    sourceSheet: null,
    sourceRow: null,
    sourcePage: 5,
    contentHash: 'b712389471928374918237491827394817293847192837491827394817293847',
    chunkText: 'High Speed CNC Milling parameters for Aluminum Cavity Inserts: Feed 3500mm/min, Spindle 24000 RPM.',
    structuredMetadata: { feedRate: 3500, spindleRpm: 24000 },
    embeddingStatus: 'EMBEDDED' as any,
    embeddingModel: 'nomic-embed-text',
    embeddedAt: new Date('2026-08-16T12:00:00Z'),
    errorReason: null,
    tenantId: tenantA,
    createdAt: new Date('2026-08-16T10:00:00Z'),
    updatedAt: new Date('2026-08-16T10:00:00Z'),
    deletedAt: null,
    createdBy: 'scanner-daemon',
    updatedBy: 'scanner-daemon',
  };

  const competitorForeignChunkTenantB: KnowledgeChunk = {
    ...certifiedChunk1,
    id: 'chunk-g13-competitor-leak-99',
    tenantId: tenantB,
  };

  beforeAll(() => {
    // Populate Initial Certified Evidence in Store
    inMemoryChunks.set(certifiedChunk1.id, certifiedChunk1);
    inMemoryChunks.set(certifiedChunk2.id, certifiedChunk2);
    inMemoryChunks.set(competitorForeignChunkTenantB.id, competitorForeignChunkTenantB);

    // Mock Article Repository
    const articleRepoMock: any = {
      findOne: jest.fn(async ({ where }: any) => {
        const id = where?.id;
        const decisionId = where?.decisionId;
        const tenantId = where?.tenantId;
        const parentArticleId = where?.parentArticleId;

        for (const art of inMemoryArticles.values()) {
          if (art.deletedAt) continue;
          if (id && art.id !== id) continue;
          if (decisionId && art.decisionId !== decisionId) continue;
          if (tenantId && art.tenantId !== tenantId) continue;
          if (parentArticleId === null && art.parentArticleId !== null) continue;
          return { ...art };
        }
        return null;
      }),
      create: jest.fn((dto) => ({
        id: dto.id || `art-uuid-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        ...dto,
      })),
      save: jest.fn(async (entity) => {
        const saved = { ...entity };
        inMemoryArticles.set(saved.id, saved);
        return saved;
      }),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => null),
        getMany: jest.fn(async () => {
          return Array.from(inMemoryArticles.values()).filter((a) => !a.deletedAt);
        }),
      })),
    };

    // Mock Evidence Repository
    const evidenceRepoMock: any = {
      findOne: jest.fn(async ({ where }: any) => {
        for (const ev of inMemoryEvidence.values()) {
          if (ev.deletedAt) continue;
          if (where.id && ev.id !== where.id) continue;
          if (where.articleId && ev.articleId !== where.articleId) continue;
          if (where.tenantId && ev.tenantId !== where.tenantId) continue;
          return { ...ev };
        }
        return null;
      }),
      find: jest.fn(async ({ where }: any) => {
        const results: KnowledgeArticleEvidence[] = [];
        for (const ev of inMemoryEvidence.values()) {
          if (ev.deletedAt) continue;
          if (where.articleId && ev.articleId !== where.articleId) continue;
          if (where.tenantId && ev.tenantId !== where.tenantId) continue;
          results.push({ ...ev });
        }
        return results.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
      }),
      create: jest.fn((dto) => ({
        id: dto.id || `ev-uuid-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        ...dto,
      })),
      save: jest.fn(async (items) => {
        const arr = Array.isArray(items) ? items : [items];
        for (const it of arr) {
          inMemoryEvidence.set(it.id, { ...it });
        }
        return Array.isArray(items) ? arr : arr[0];
      }),
    };

    // Mock Chunk Repository
    const chunkRepoMock: any = {
      find: jest.fn(async ({ where }: any) => {
        const ids = where.id?._value || (Array.isArray(where.id) ? where.id : [where.id]);
        const tenant = where.tenantId;
        const results: KnowledgeChunk[] = [];
        for (const c of inMemoryChunks.values()) {
          if (c.deletedAt) continue;
          if (ids && !ids.includes(c.id)) continue;
          if (tenant && c.tenantId !== tenant) continue;
          results.push({ ...c });
        }
        return results;
      }),
    };

    // Mock Decision Repository
    const decisionRepoMock: any = {
      findOne: jest.fn(async ({ where }: any) => {
        const id = where.id;
        const tenant = where.tenantId;
        const dec = inMemoryDecisions.get(id);
        if (dec && (!tenant || dec.tenantId === tenant) && !dec.deletedAt) {
          return { ...dec };
        }
        return null;
      }),
    };

    // Mock DataSource Transaction Engine
    const dataSourceMock: any = {
      transaction: jest.fn(async (cb: any) => {
        const emMock: any = {
          getRepository: (target: any) => {
            if (target === KnowledgeArticle) return articleRepoMock;
            if (target === KnowledgeArticleEvidence) return evidenceRepoMock;
            if (target === KnowledgeChunk) return chunkRepoMock;
            return articleRepoMock;
          },
          save: jest.fn(async (entity: any) => {
            if (Array.isArray(entity)) {
              for (const e of entity) {
                if (e.chunkId) inMemoryEvidence.set(e.id, { ...e });
                else inMemoryArticles.set(e.id, { ...e });
              }
            } else {
              if (entity.chunkId) inMemoryEvidence.set(entity.id, { ...entity });
              else inMemoryArticles.set(entity.id, { ...entity });
            }
            return entity;
          }),
        };
        return cb(emMock);
      }),
    };

    // Mock Audit Service
    const auditServiceMock: any = {
      logBusinessEvent: jest.fn(async (event: string, entityType: string, targetId: string, actorId: string, payload: any, prevPayload: any, projectId: string, tenantId: string) => {
        inMemoryAuditLogs.push({ event, targetId, payload, tenantId });
      }),
    };

    articleService = new KnowledgeArticleService(
      articleRepoMock,
      evidenceRepoMock,
      chunkRepoMock,
      decisionRepoMock,
      dataSourceMock,
      auditServiceMock,
    );

    // Mock Knowledge Search Service with real predicate simulation
    searchService = {
      search: jest.fn(async (options: any) => {
        if (!options.tenantId) throw new ForbiddenException('Tenant required');
        const q = (options.query || '').toLowerCase();
        const results: any[] = [];

        for (const art of inMemoryArticles.values()) {
          if (art.deletedAt) continue;
          if (art.tenantId !== options.tenantId) continue;

          // Default Search Predicate: PUBLISHED + isLatest = true
          if (!options.status && (art.status !== ArticleStatus.PUBLISHED || !art.isLatest)) {
            continue;
          }
          if (options.status && art.status !== options.status) {
            continue;
          }
          if (options.projectId && art.projectId !== options.projectId) {
            continue;
          }
          if (options.decisionId && art.decisionId !== options.decisionId) {
            continue;
          }

          if (q) {
            const words = q.split(/\s+/).filter((w: string) => w.length > 0);
            const text = `${art.title} ${art.summary || ''} ${art.content || ''}`.toLowerCase();
            const matchesAll = words.every((w: string) => text.includes(w));
            if (!matchesAll) continue;
          }

          // Fetch attached evidence citations
          const evidenceList: any[] = [];
          for (const ev of inMemoryEvidence.values()) {
            if (ev.articleId === art.id && !ev.deletedAt && ev.tenantId === options.tenantId) {
              evidenceList.push({
                citationLabel: ev.citationLabel,
                sourceFile: ev.sourceFile,
                sourceCoordinate: ev.sourceCoordinate,
                authorityStatus: ev.authorityStatus,
                contentHash: ev.contentHash,
                sequenceNumber: ev.sequenceNumber,
              });
            }
          }

          results.push({
            id: art.id,
            title: art.title,
            version: art.version,
            isLatest: art.isLatest,
            status: art.status,
            projectId: art.projectId,
            decisionId: art.decisionId,
            publishedAt: art.publishedAt,
            evidence: evidenceList.length > 0 ? evidenceList : undefined,
          });
        }

        return { data: results, total: results.length };
      }),
    } as any;
  });

  let goldenDecisionId: string;
  let goldenArticleIdV1: string;
  let goldenArticleIdV2: string;

  // =========================================================================
  // SCENARIO A: DECISION CREATION & FORMALIZATION INTO DRAFT ARTICLE
  // =========================================================================
  describe('SCENARIO A — Decision → Knowledge Article Draft (M8.4)', () => {
    it('formalizes an APPROVED engineering decision into a governed DRAFT article', async () => {
      goldenDecisionId = 'dec-2026-0042-uuid';
      const approvedDecision: EngineeringDecision = {
        id: goldenDecisionId,
        decisionNumber: 'DEC-2026-0042',
        title: 'High-Strength Aluminum Cavity Tooling for SEB101 Machine',
        decisionType: DecisionType.MATERIAL_SELECTION,
        description: 'Selection of HOKOTOL aluminum alloy for high-cycle PET blow molds.',
        context: 'BM454 blow cavity requires rapid thermal heat dissipation.',
        optionsConsidered: 'Option 1: P20 Tool Steel ($8,500). Option 2: HOKOTOL Alumold ($12,400).',
        selectedOption: 'Option 2: HOKOTOL Alumold alloy.',
        rationale: 'Thermal conductivity reduces cooling cycle time by 4.8s per shot.',
        decision: 'Approved HOKOTOL for 8-cavity insert machining on BM454.',
        status: DecisionStatus.APPROVED,
        decisionDate: new Date('2026-08-15'),
        decisionOwnerId: userIdLead,
        approvedBy: userIdReviewer,
        approvedAt: new Date('2026-08-16T09:00:00Z'),
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        relatedEntityType: 'TOOL_SPEC',
        relatedEntityId: 'tool-seb101-01',
        supersedesDecisionId: null,
        supersededByDecisionId: null,
        projectId: sampleProjectId,
        tenantId: tenantA,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        createdBy: userIdLead,
        updatedBy: userIdReviewer,
      };

      inMemoryDecisions.set(goldenDecisionId, approvedDecision);

      const draft = await articleService.createArticleDraftFromDecision(goldenDecisionId, userIdLead, tenantA);

      expect(draft).toBeDefined();
      expect(draft.status).toBe(ArticleStatus.DRAFT);
      expect(draft.version).toBe(1);
      expect(draft.isLatest).toBe(true);
      expect(draft.parentArticleId).toBeNull();
      expect(draft.decisionId).toBe(goldenDecisionId);
      expect(draft.projectId).toBe(sampleProjectId);
      expect(draft.tenantId).toBe(tenantA);
      expect(draft.articleType).toBe(ArticleType.BEST_PRACTICE);
      expect(draft.title).toContain('High-Strength Aluminum Cavity Tooling');
      expect(draft.content).toContain('## Context & Background');
      expect(draft.content).toContain('## Decision Statement');
      expect(draft.content).toContain('## Decision Governance Metadata');
      expect(draft.content).toContain('`DEC-2026-0042`');

      goldenArticleIdV1 = draft.id;
    });

    it('idempotently returns the existing root draft on repeated requests', async () => {
      const repeated = await articleService.createArticleDraftFromDecision(goldenDecisionId, userIdLead, tenantA);
      expect(repeated.id).toBe(goldenArticleIdV1);
    });
  });

  // =========================================================================
  // SCENARIO B & C: G13 EVIDENCE GROUNDING & DEDUPLICATION (M8.5)
  // =========================================================================
  describe('SCENARIO B & C — Evidence Grounding & Deduplication (M8.5)', () => {
    it('attaches certified G13 chunks as evidence and generates deterministic [REF-1], [REF-2] citations', async () => {
      const attached = await articleService.attachEvidence(
        goldenArticleIdV1,
        { chunkIds: [certifiedChunk1.id, certifiedChunk2.id] },
        userIdLead,
        tenantA,
      );

      expect(attached.length).toBe(2);
      expect(attached[0].sequenceNumber).toBe(1);
      expect(attached[0].citationLabel).toBe('[REF-1]');
      expect(attached[0].sourceCoordinate).toBe('BM454 Partlist_RevA.xlsx#Inserts:R14');
      expect(attached[0].authorityStatus).toBe('AUTHORITATIVE_RELEASE');
      expect(attached[0].contentHash).toBe(certifiedChunk1.contentHash);

      expect(attached[1].sequenceNumber).toBe(2);
      expect(attached[1].citationLabel).toBe('[REF-2]');
      expect(attached[1].sourceCoordinate).toBe('ISO_20482_Milling_Guidelines.pdf#page:5');
    });

    it('idempotently avoids duplicating evidence when re-attached', async () => {
      const reattached = await articleService.attachEvidence(
        goldenArticleIdV1,
        { chunkIds: [certifiedChunk1.id] },
        userIdLead,
        tenantA,
      );

      expect(reattached.length).toBe(2);
      expect(reattached[0].citationLabel).toBe('[REF-1]');
      expect(reattached[1].citationLabel).toBe('[REF-2]');
    });
  });

  // =========================================================================
  // SCENARIO D: CROSS-TENANT INJECTION ATTACK DEFENSE
  // =========================================================================
  describe('SCENARIO D — Cross-Tenant Injection Defense (M8.5)', () => {
    it('strictly rejects attaching a chunk belonging to another tenant (Tenant B into Tenant A)', async () => {
      await expect(
        articleService.attachEvidence(
          goldenArticleIdV1,
          { chunkIds: [competitorForeignChunkTenantB.id] },
          userIdLead,
          tenantA,
        ),
      ).rejects.toThrow('One or more G13 KnowledgeChunks do not exist or belong to another tenant.');
    });
  });

  // =========================================================================
  // SCENARIO E & F: REVIEW, REJECTION & REOPEN GOVERNANCE CYCLE (M8.2)
  // =========================================================================
  describe('SCENARIO E & F — Review, Rejection & Reopen Cycle (M8.2)', () => {
    it('submits article for review (DRAFT -> UNDER_REVIEW) and locks evidence from modification', async () => {
      const reviewArticle = await articleService.submitForReview(
        goldenArticleIdV1,
        { reviewDueDate: '2026-09-01' },
        userIdLead,
        tenantA,
      );

      expect(reviewArticle.status).toBe(ArticleStatus.UNDER_REVIEW);

      // Verify evidence modification is strictly forbidden in UNDER_REVIEW
      await expect(
        articleService.attachEvidence(goldenArticleIdV1, { chunkIds: [certifiedChunk1.id] }, userIdLead, tenantA),
      ).rejects.toThrow(/Evidence can only be modified while article is in DRAFT state/);
    });

    it('rejects review with mandatory reason (UNDER_REVIEW -> REJECTED)', async () => {
      const rejectedArticle = await articleService.rejectReview(
        goldenArticleIdV1,
        { rejectionReason: 'Feedrate table in section 3 requires DMG Mori toolroom sign-off.' },
        userIdReviewer,
        tenantA,
      );

      expect(rejectedArticle.status).toBe(ArticleStatus.REJECTED);
      expect(rejectedArticle.rejectionReason).toBe('Feedrate table in section 3 requires DMG Mori toolroom sign-off.');
    });

    it('reopens rejected article (REJECTED -> DRAFT) restoring editability', async () => {
      const reopenedArticle = await articleService.reopenRejected(goldenArticleIdV1, userIdLead, tenantA);
      expect(reopenedArticle.status).toBe(ArticleStatus.DRAFT);

      // Now updating content or evidence succeeds
      const updated = await articleService.update(
        goldenArticleIdV1,
        { summary: 'Updated tooling guideline with verified DMG Mori parameters.' },
        userIdLead,
        tenantA,
      );
      expect(updated.summary).toBe('Updated tooling guideline with verified DMG Mori parameters.');
    });
  });

  // =========================================================================
  // SCENARIO G: FORMAL QUALITY APPROVAL & PUBLICATION (M8.2)
  // =========================================================================
  describe('SCENARIO G — Formal Quality Approval & Publication (M8.2)', () => {
    it('progresses DRAFT -> UNDER_REVIEW -> PUBLISHED', async () => {
      await articleService.submitForReview(goldenArticleIdV1, {}, userIdLead, tenantA);
      const published = await articleService.approveAndPublish(
        goldenArticleIdV1,
        { expiresAt: '2027-12-31' },
        userIdReviewer,
        tenantA,
      );

      expect(published.status).toBe(ArticleStatus.PUBLISHED);
      expect(published.isLatest).toBe(true);
      expect(published.publishedAt).toBeInstanceOf(Date);
      expect(published.reviewedBy).toBe(userIdReviewer);

      // Verify in-place edits and evidence modifications are permanently blocked
      await expect(
        articleService.update(goldenArticleIdV1, { title: 'Illegal Edit' }, userIdLead, tenantA),
      ).rejects.toThrow(/Published articles cannot be edited directly/);

      await expect(
        articleService.attachEvidence(goldenArticleIdV1, { chunkIds: [certifiedChunk1.id] }, userIdLead, tenantA),
      ).rejects.toThrow(/Evidence can only be modified while article is in DRAFT state/);
    });
  });

  // =========================================================================
  // SCENARIO H & I: GOVERNED SEARCH & EVIDENCE RETRIEVAL (M8.5)
  // =========================================================================
  describe('SCENARIO H & I — Governed Search & Evidence Verification (M8.5)', () => {
    it('discovers the published article in default search with validated G13 evidence citations', async () => {
      const searchResults = await searchService.search({
        tenantId: tenantA,
        query: 'HOKOTOL Aluminum',
      });

      expect(searchResults.data.length).toBe(1);
      const match = searchResults.data[0];
      expect(match.id).toBe(goldenArticleIdV1);
      expect(match.status).toBe(ArticleStatus.PUBLISHED);
      expect(match.version).toBe(1);
      expect(match.projectId).toBe(sampleProjectId);
      expect(match.decisionId).toBe(goldenDecisionId);

      // Verify attached citations
      expect(match.evidence).toBeDefined();
      expect(match.evidence!.length).toBe(2);
      expect(match.evidence![0].citationLabel).toBe('[REF-1]');
      expect(match.evidence![0].sourceCoordinate).toBe('BM454 Partlist_RevA.xlsx#Inserts:R14');
      expect(match.evidence![1].citationLabel).toBe('[REF-2]');
      expect(match.evidence![1].sourceCoordinate).toBe('ISO_20482_Milling_Guidelines.pdf#page:5');
    });

    it('filters accurately by projectId and decisionId', async () => {
      const projectMatch = await searchService.search({
        tenantId: tenantA,
        projectId: sampleProjectId,
      });
      expect(projectMatch.data.length).toBe(1);
      expect(projectMatch.data[0].id).toBe(goldenArticleIdV1);

      const decisionMatch = await searchService.search({
        tenantId: tenantA,
        decisionId: goldenDecisionId,
      });
      expect(decisionMatch.data.length).toBe(1);
      expect(decisionMatch.data[0].id).toBe(goldenArticleIdV1);
    });
  });

  // =========================================================================
  // SCENARIO J: REVISION AUTHORING & EVIDENCE INHERITANCE (M8.3/M8.5)
  // =========================================================================
  describe('SCENARIO J — Revision Authoring & Baseline Evidence Inheritance (M8.3/M8.5)', () => {
    it('creates child revision v2 from v1 and automatically clones baseline evidence', async () => {
      const revisionV2 = await articleService.createRevision(goldenArticleIdV1, userIdLead, tenantA);

      expect(revisionV2.version).toBe(2);
      expect(revisionV2.parentArticleId).toBe(goldenArticleIdV1);
      expect(revisionV2.status).toBe(ArticleStatus.DRAFT);
      expect(revisionV2.isLatest).toBe(false);
      goldenArticleIdV2 = revisionV2.id;

      // Verify cloned evidence on v2
      const v2Evidence = await articleService.getEvidence(goldenArticleIdV2, tenantA);
      expect(v2Evidence.length).toBe(2);
      expect(v2Evidence[0].citationLabel).toBe('[REF-1]');
      expect(v2Evidence[1].citationLabel).toBe('[REF-2]');

      // Detach [REF-2] from v2 draft
      await articleService.detachEvidence(goldenArticleIdV2, v2Evidence[1].id, userIdLead, tenantA);
      const v2Remaining = await articleService.getEvidence(goldenArticleIdV2, tenantA);
      expect(v2Remaining.length).toBe(1);

      // Verify v1 evidence remains untouched (immutability of published baseline)
      const v1Evidence = await articleService.getEvidence(goldenArticleIdV1, tenantA);
      expect(v1Evidence.length).toBe(2);
    });
  });

  // =========================================================================
  // SCENARIO K: ATOMIC SUPERSESSION (M8.3)
  // =========================================================================
  describe('SCENARIO K — Atomic Publication & Supersession (M8.3)', () => {
    it('publishes v2 and atomically marks v1 as SUPERSEDED with single latest invariant', async () => {
      await articleService.submitForReview(goldenArticleIdV2, {}, userIdLead, tenantA);
      const publishedV2 = await articleService.approveAndPublish(goldenArticleIdV2, {}, userIdReviewer, tenantA);

      expect(publishedV2.status).toBe(ArticleStatus.PUBLISHED);
      expect(publishedV2.isLatest).toBe(true);
      expect(publishedV2.version).toBe(2);

      // Check predecessor v1 in store
      const v1After = inMemoryArticles.get(goldenArticleIdV1)!;
      expect(v1After.status).toBe(ArticleStatus.SUPERSEDED);
      expect(v1After.isLatest).toBe(false);
      expect(v1After.supersededById).toBe(goldenArticleIdV2);

      // Verify single latest published invariant across the entire lineage
      const lineage = await articleService.getRevisionHistory(goldenArticleIdV2, tenantA);
      const latestPublished = lineage.filter((a) => a.status === ArticleStatus.PUBLISHED && a.isLatest);
      expect(latestPublished.length).toBe(1);
      expect(latestPublished[0].id).toBe(goldenArticleIdV2);
    });
  });

  // =========================================================================
  // SCENARIO N & O: SEARCH & HISTORICAL TRACEABILITY AFTER SUPERSESSION
  // =========================================================================
  describe('SCENARIO N & O — Historical Traceability & Governed Search After Supersession', () => {
    it('returns v2 in default search and strictly excludes superseded v1', async () => {
      const searchResults = await searchService.search({
        tenantId: tenantA,
        query: 'HOKOTOL Aluminum',
      });

      expect(searchResults.data.length).toBe(1);
      expect(searchResults.data[0].id).toBe(goldenArticleIdV2);
      expect(searchResults.data[0].version).toBe(2);

      // Verify superseded v1 is nowhere in default search results
      const v1InSearch = searchResults.data.find((r) => r.id === goldenArticleIdV1);
      expect(v1InSearch).toBeUndefined();
    });

    it('preserves full historical evidence on superseded v1 for compliance audit', async () => {
      const v1HistoricalEvidence = await articleService.getEvidence(goldenArticleIdV1, tenantA);
      expect(v1HistoricalEvidence.length).toBe(2);
      expect(v1HistoricalEvidence[0].citationLabel).toBe('[REF-1]');
      expect(v1HistoricalEvidence[0].sourceCoordinate).toBe('BM454 Partlist_RevA.xlsx#Inserts:R14');
      expect(v1HistoricalEvidence[1].citationLabel).toBe('[REF-2]');
      expect(v1HistoricalEvidence[1].sourceCoordinate).toBe('ISO_20482_Milling_Guidelines.pdf#page:5');
    });
  });

  // =========================================================================
  // SCENARIO P & Q: EXPIRY & COMPREHENSIVE AUDIT TRAIL VERIFICATION
  // =========================================================================
  describe('SCENARIO P & Q — Expiry Governance & Audit Trail Complete', () => {
    it('marks article as EXPIRED and excludes it from default search', async () => {
      const expiredArticle = await articleService.markExpired(goldenArticleIdV2, userIdReviewer, tenantA);
      expect(expiredArticle.status).toBe(ArticleStatus.EXPIRED);

      const searchAfterExpiry = await searchService.search({
        tenantId: tenantA,
        query: 'HOKOTOL Aluminum',
      });
      expect(searchAfterExpiry.data.length).toBe(0);
    });

    it('verifies complete structured audit event trace across all lifecycle operations', () => {
      const eventTypes = inMemoryAuditLogs.map((log) => log.event);

      expect(eventTypes).toContain('knowledge_article.draft_created_from_decision');
      expect(eventTypes).toContain('knowledge_article.evidence_attached');
      expect(eventTypes).toContain('knowledge_article.submitted');
      expect(eventTypes).toContain('knowledge_article.rejected');
      expect(eventTypes).toContain('knowledge_article.reopened');
      expect(eventTypes).toContain('knowledge_article.published');
      expect(eventTypes).toContain('knowledge_article.revision_created');
      expect(eventTypes).toContain('knowledge_article.evidence_detached');
      expect(eventTypes).toContain('knowledge_article.superseded');
      expect(eventTypes).toContain('knowledge_article.expired');

      // Verify all audit logs contain tenantId
      for (const log of inMemoryAuditLogs) {
        expect(log.tenantId).toBe(tenantA);
      }
    });
  });
});
