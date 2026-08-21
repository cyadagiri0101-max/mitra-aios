import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, IsNull, In } from 'typeorm';
import { KnowledgeArticle, ArticleStatus, ArticleType } from '../entities/knowledgearticle.entity';
import { KnowledgeArticleEvidence } from '../entities/knowledge-article-evidence.entity';
import { KnowledgeChunk } from '../../engineering-library/entities/knowledge-chunk.entity';
import { EngineeringDecision, DecisionStatus, DecisionType } from '../../engineering-decisions/entities/engineering-decision.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { AuditService } from '../../audit/services/audit.service';
import {
  CreateKnowledgeArticleDto,
  UpdateKnowledgeArticleDto,
  SubmitArticleDto,
  ApproveArticleDto,
  RejectArticleDto,
  AttachEvidenceDto,
} from '../dto/knowledge.dto';

export const ALLOWED_ARTICLE_TRANSITIONS: Record<ArticleStatus, ArticleStatus[]> = {
  [ArticleStatus.DRAFT]: [ArticleStatus.UNDER_REVIEW, ArticleStatus.ARCHIVED],
  [ArticleStatus.UNDER_REVIEW]: [ArticleStatus.PUBLISHED, ArticleStatus.REJECTED],
  [ArticleStatus.REJECTED]: [ArticleStatus.DRAFT],
  [ArticleStatus.PUBLISHED]: [ArticleStatus.SUPERSEDED, ArticleStatus.EXPIRED, ArticleStatus.ARCHIVED],
  [ArticleStatus.SUPERSEDED]: [],
  [ArticleStatus.EXPIRED]: [],
  [ArticleStatus.ARCHIVED]: [],
};

@Injectable()
export class KnowledgeArticleService extends TenantAwareService<KnowledgeArticle> {
  private readonly logger = new Logger(KnowledgeArticleService.name);

  constructor(
    @InjectRepository(KnowledgeArticle)
    repo: Repository<KnowledgeArticle>,
    @InjectRepository(KnowledgeArticleEvidence)
    private readonly evidenceRepo: Repository<KnowledgeArticleEvidence>,
    @InjectRepository(KnowledgeChunk)
    private readonly chunkRepo: Repository<KnowledgeChunk>,
    @InjectRepository(EngineeringDecision)
    private readonly decisionRepo: Repository<EngineeringDecision>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {
    super(repo, 'KnowledgeArticle');
  }

  /**
   * Create a new root KnowledgeArticle in DRAFT state.
   */
  async create(
    dto: CreateKnowledgeArticleDto | Record<string, unknown>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<KnowledgeArticle> {
    const scopeTenant = this.requireTenant(tenantId);
    const data = dto as any;

    if (!data.title || data.title.trim().length < 3) {
      throw new BadRequestException('Article title must be at least 3 characters long');
    }
    if (!data.content || data.content.trim().length === 0) {
      throw new BadRequestException('Article content cannot be empty');
    }

    const slug = await this.generateUniqueSlug(data.title, scopeTenant, 1);

    const article = this.repo.create({
      title: data.title.trim(),
      slug,
      content: data.content,
      summary: data.summary?.trim() ?? null,
      categoryId: data.categoryId ?? null,
      articleType: data.articleType ?? undefined,
      tags: data.tags ?? null,
      relatedModules: data.relatedModules ?? null,
      projectId: data.projectId ?? null,
      decisionId: data.decisionId ?? null,
      reviewDueDate: data.reviewDueDate ? new Date(data.reviewDueDate) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      status: ArticleStatus.DRAFT,
      version: 1,
      isLatest: true,
      parentArticleId: null,
      supersededById: null,
      authorId: userId ?? null,
      tenantId: scopeTenant,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    } as unknown as KnowledgeArticle);

    const saved = await this.repo.save(article);

    await this.auditService.logBusinessEvent(
      'knowledge_article.created',
      'KnowledgeArticle',
      saved.id,
      userId ?? 'system',
      {
        title: saved.title,
        status: saved.status,
        version: saved.version,
        tenantId: scopeTenant,
        projectId: saved.projectId ?? undefined,
      },
      undefined,
      saved.projectId ?? undefined,
      scopeTenant,
    );

    return saved;
  }

  /**
   * Formalize an APPROVED EngineeringDecision into a governed KnowledgeArticle in DRAFT state.
   * Idempotency invariant: Exactly one active root KnowledgeArticle may represent a decision.
   */
  async createArticleDraftFromDecision(
    decisionId: string,
    userId?: string,
    tenantId?: string | null,
  ): Promise<KnowledgeArticle> {
    const scopeTenant = this.requireTenant(tenantId);

    const decision = await this.decisionRepo.findOne({
      where: { id: decisionId, tenantId: scopeTenant, deletedAt: IsNull() } as any,
    });

    if (!decision) {
      throw new NotFoundException(`EngineeringDecision ${decisionId} not found in tenant ${scopeTenant}`);
    }

    if (decision.status !== DecisionStatus.APPROVED) {
      throw new BadRequestException(
        `Knowledge article drafts can only be generated from APPROVED engineering decisions. Current decision status is '${decision.status}'.`,
      );
    }

    // Idempotency: return existing active root article if already drafted
    const existingRoot = await this.repo.findOne({
      where: {
        decisionId: decision.id,
        parentArticleId: IsNull(),
        tenantId: scopeTenant,
        deletedAt: IsNull(),
      } as any,
    });

    if (existingRoot) {
      return existingRoot;
    }

    // Map DecisionType to appropriate ArticleType
    let articleType = ArticleType.PROCEDURE;
    if (
      decision.decisionType === DecisionType.DESIGN ||
      decision.decisionType === DecisionType.PROCESS ||
      decision.decisionType === DecisionType.MATERIAL_SELECTION
    ) {
      articleType = ArticleType.BEST_PRACTICE;
    } else if (
      decision.decisionType === DecisionType.QUALITY ||
      decision.decisionType === DecisionType.TRIAL
    ) {
      articleType = ArticleType.LESSON_LEARNED;
    } else if (
      decision.decisionType === DecisionType.RELEASE ||
      decision.decisionType === DecisionType.ENGINEERING_CHANGE
    ) {
      articleType = ArticleType.STANDARD;
    }

    const title = `Engineering Decision: ${decision.title}`;
    const slug = await this.generateUniqueSlug(title, scopeTenant, 1);
    const summary = decision.rationale || decision.description || null;

    const content = [
      `# Engineering Decision: ${decision.title} (${decision.decisionNumber || 'UNASSIGNED'})`,
      '',
      '## Context & Background',
      decision.context || decision.description || 'No additional context provided.',
      '',
      '## Decision Statement',
      decision.decision || 'Decision details documented in engineering decision log.',
      '',
      '## Options Considered',
      decision.optionsConsidered || 'Options evaluated by engineering team.',
      '',
      '## Selected Option & Rationale',
      `- **Selected Option:** ${decision.selectedOption || 'N/A'}`,
      `- **Engineering Rationale:** ${decision.rationale || 'N/A'}`,
      '',
      '## Decision Governance Metadata',
      `- **Decision Number:** \`${decision.decisionNumber || 'N/A'}\``,
      `- **Decision Type:** \`${decision.decisionType || 'OTHER'}\``,
      `- **Approval Status:** \`${decision.status}\``,
      `- **Approved At:** \`${decision.approvedAt ? decision.approvedAt.toISOString() : 'N/A'}\``,
      `- **Approved By:** \`${decision.approvedBy || 'N/A'}\``,
    ].join('\n');

    const draftArticle = this.repo.create({
      title,
      slug,
      content,
      summary,
      articleType,
      tags: ['engineering-decision', (decision.decisionType || 'other').toLowerCase()],
      status: ArticleStatus.DRAFT,
      version: 1,
      isLatest: true,
      parentArticleId: null,
      supersededById: null,
      projectId: decision.projectId,
      decisionId: decision.id,
      publishedAt: null,
      reviewedBy: null,
      rejectionReason: null,
      authorId: userId ?? decision.decisionOwnerId ?? null,
      tenantId: scopeTenant,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    } as unknown as KnowledgeArticle);

    const saved = await this.repo.save(draftArticle);

    await this.auditService.logBusinessEvent(
      'knowledge_article.draft_created_from_decision',
      'KnowledgeArticle',
      saved.id,
      userId ?? 'system',
      {
        decisionId: decision.id,
        decisionNumber: decision.decisionNumber,
        projectId: decision.projectId,
        articleId: saved.id,
        status: saved.status,
        tenantId: scopeTenant,
      },
      undefined,
      decision.projectId ?? undefined,
      scopeTenant,
    );

    return saved;
  }

  /**
   * Attach validated G13 KnowledgeChunks as grounded evidence to a DRAFT article.
   * Atomic and idempotent.
   */
  async attachEvidence(
    articleId: string,
    dto: AttachEvidenceDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<KnowledgeArticleEvidence[]> {
    const scopeTenant = this.requireTenant(tenantId);
    const article = await this.findOne(articleId, scopeTenant);

    if (article.status !== ArticleStatus.DRAFT) {
      throw new BadRequestException(
        `Evidence can only be modified while article is in DRAFT state. Current status: '${article.status}'.`,
      );
    }

    if (!dto.chunkIds || dto.chunkIds.length === 0) {
      throw new BadRequestException('At least one chunkId is required.');
    }

    const uniqueChunkIds = Array.from(new Set(dto.chunkIds));

    // Validate that all chunks exist and belong to the same tenant
    const chunks = await this.chunkRepo.find({
      where: { id: In(uniqueChunkIds), tenantId: scopeTenant, deletedAt: IsNull() } as any,
    });

    if (chunks.length !== uniqueChunkIds.length) {
      throw new BadRequestException('One or more G13 KnowledgeChunks do not exist or belong to another tenant.');
    }

    const chunkMap = new Map(chunks.map((c) => [c.id, c]));

    // Transactional atomic attachment and deduplication
    const result = await this.dataSource.transaction(async (em: EntityManager) => {
      const evidenceRepo = em.getRepository(KnowledgeArticleEvidence);

      const existing = await evidenceRepo.find({
        where: { articleId: article.id, tenantId: scopeTenant, deletedAt: IsNull() } as any,
        order: { sequenceNumber: 'ASC' },
      });

      const existingChunkIds = new Set(existing.map((e) => e.chunkId));
      let currentSeq = existing.length > 0 ? Math.max(...existing.map((e) => e.sequenceNumber)) + 1 : 1;

      const toInsert: KnowledgeArticleEvidence[] = [];

      for (const chunkId of uniqueChunkIds) {
        if (existingChunkIds.has(chunkId)) continue; // Idempotent skip if already attached

        const chunk = chunkMap.get(chunkId)!;
        const seq = currentSeq++;
        const citationLabel = `[REF-${seq}]`;

        let sourceCoordinate = chunk.sourceFile || 'source';
        if (chunk.sourceSheet) {
          sourceCoordinate = `${chunk.sourceFile || 'file'}#${chunk.sourceSheet}:R${chunk.sourceRow || 1}`;
        } else if (chunk.sourcePage) {
          sourceCoordinate = `${chunk.sourceFile || 'file'}#page:${chunk.sourcePage}`;
        }

        const ev = evidenceRepo.create({
          tenantId: scopeTenant,
          articleId: article.id,
          chunkId: chunk.id,
          sequenceNumber: seq,
          citationLabel,
          sourceFile: chunk.sourceFile || chunk.relativePath || null,
          sourceSheet: chunk.sourceSheet || null,
          sourceRow: chunk.sourceRow || null,
          sourcePage: chunk.sourcePage || null,
          sourceCoordinate,
          authorityStatus: chunk.authorityStatus || 'AUTHORITATIVE_RELEASE',
          entityType: chunk.entityType || null,
          projectNumber: chunk.projectNumber || null,
          contentHash: chunk.contentHash || null,
          createdBy: userId ?? null,
          updatedBy: userId ?? null,
        } as unknown as KnowledgeArticleEvidence);

        toInsert.push(ev);
      }

      if (toInsert.length > 0) {
        await evidenceRepo.save(toInsert);
      }

      return evidenceRepo.find({
        where: { articleId: article.id, tenantId: scopeTenant, deletedAt: IsNull() } as any,
        order: { sequenceNumber: 'ASC' },
      });
    });

    await this.auditService.logBusinessEvent(
      'knowledge_article.evidence_attached',
      'KnowledgeArticle',
      article.id,
      userId ?? 'system',
      {
        articleId: article.id,
        evidenceCount: result.length,
        chunkIds: uniqueChunkIds,
        tenantId: scopeTenant,
      },
      undefined,
      article.projectId ?? undefined,
      scopeTenant,
    );

    return result;
  }

  /**
   * Get all validated evidence links for an article.
   */
  async getEvidence(
    articleId: string,
    tenantId?: string | null,
  ): Promise<KnowledgeArticleEvidence[]> {
    const scopeTenant = this.requireTenant(tenantId);
    await this.findOne(articleId, scopeTenant);

    return this.evidenceRepo.find({
      where: { articleId, tenantId: scopeTenant, deletedAt: IsNull() } as any,
      order: { sequenceNumber: 'ASC' },
    });
  }

  /**
   * Detach evidence link from a DRAFT article and re-sequence citations.
   */
  async detachEvidence(
    articleId: string,
    evidenceId: string,
    userId?: string,
    tenantId?: string | null,
  ): Promise<void> {
    const scopeTenant = this.requireTenant(tenantId);
    const article = await this.findOne(articleId, scopeTenant);

    if (article.status !== ArticleStatus.DRAFT) {
      throw new BadRequestException(
        `Evidence can only be modified while article is in DRAFT state. Current status: '${article.status}'.`,
      );
    }

    const evidence = await this.evidenceRepo.findOne({
      where: { id: evidenceId, articleId: article.id, tenantId: scopeTenant, deletedAt: IsNull() } as any,
    });

    if (!evidence) {
      throw new NotFoundException(`Evidence record ${evidenceId} not found on article ${article.id}`);
    }

    await this.dataSource.transaction(async (em: EntityManager) => {
      const evidenceRepo = em.getRepository(KnowledgeArticleEvidence);

      evidence.deletedAt = new Date();
      evidence.updatedBy = userId ?? null;
      await evidenceRepo.save(evidence);

      // Re-sequence remaining evidence
      const remaining = await evidenceRepo.find({
        where: { articleId: article.id, tenantId: scopeTenant, deletedAt: IsNull() } as any,
        order: { sequenceNumber: 'ASC' },
      });

      for (let i = 0; i < remaining.length; i++) {
        remaining[i].sequenceNumber = i + 1;
        remaining[i].citationLabel = `[REF-${i + 1}]`;
        remaining[i].updatedBy = userId ?? null;
      }

      if (remaining.length > 0) {
        await evidenceRepo.save(remaining);
      }
    });

    await this.auditService.logBusinessEvent(
      'knowledge_article.evidence_detached',
      'KnowledgeArticle',
      article.id,
      userId ?? 'system',
      {
        articleId: article.id,
        detachedEvidenceId: evidenceId,
        tenantId: scopeTenant,
      },
      undefined,
      article.projectId ?? undefined,
      scopeTenant,
    );
  }

  /**
   * Create a new draft revision (vN+1) from an existing PUBLISHED article.
   * Clones content and inherited baseline evidence to the new draft.
   */
  async createRevision(
    articleId: string,
    userId?: string,
    tenantId?: string | null,
  ): Promise<KnowledgeArticle> {
    const scopeTenant = this.requireTenant(tenantId);
    const source = await this.findOne(articleId, scopeTenant);

    if (source.status !== ArticleStatus.PUBLISHED) {
      throw new BadRequestException(
        `Revisions can only be created from PUBLISHED articles. Current article status is '${source.status}'.`,
      );
    }

    const nextVersion = source.version + 1;
    const revisionSlug = await this.generateUniqueSlug(source.title, scopeTenant, nextVersion);

    const draftRevision = this.repo.create({
      title: source.title,
      slug: revisionSlug,
      content: source.content,
      summary: source.summary,
      categoryId: source.categoryId,
      articleType: source.articleType,
      tags: source.tags,
      relatedModules: source.relatedModules,
      projectId: source.projectId,
      decisionId: source.decisionId,
      accessRoles: source.accessRoles,
      seoKeywords: source.seoKeywords,
      version: nextVersion,
      isLatest: false,
      status: ArticleStatus.DRAFT,
      parentArticleId: source.id,
      supersededById: null,
      publishedAt: null,
      reviewedBy: null,
      rejectionReason: null,
      authorId: userId ?? source.authorId,
      tenantId: scopeTenant,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    } as unknown as KnowledgeArticle);

    const saved = await this.repo.save(draftRevision);

    // Baseline Evidence Inheritance: Clone source evidence to new revision draft
    const sourceEvidences = await this.evidenceRepo.find({
      where: { articleId: source.id, tenantId: scopeTenant, deletedAt: IsNull() } as any,
      order: { sequenceNumber: 'ASC' },
    });

    if (sourceEvidences.length > 0) {
      const clonedEvidences = sourceEvidences.map((ev) =>
        this.evidenceRepo.create({
          tenantId: scopeTenant,
          articleId: saved.id,
          chunkId: ev.chunkId,
          sequenceNumber: ev.sequenceNumber,
          citationLabel: ev.citationLabel,
          sourceFile: ev.sourceFile,
          sourceSheet: ev.sourceSheet,
          sourceRow: ev.sourceRow,
          sourcePage: ev.sourcePage,
          sourceCoordinate: ev.sourceCoordinate,
          authorityStatus: ev.authorityStatus,
          entityType: ev.entityType,
          projectNumber: ev.projectNumber,
          contentHash: ev.contentHash,
          createdBy: userId ?? null,
          updatedBy: userId ?? null,
        } as unknown as KnowledgeArticleEvidence),
      );
      await this.evidenceRepo.save(clonedEvidences);
    }

    await this.auditService.logBusinessEvent(
      'knowledge_article.revision_created',
      'KnowledgeArticle',
      saved.id,
      userId ?? 'system',
      {
        sourceArticleId: source.id,
        sourceVersion: source.version,
        revisionId: saved.id,
        newVersion: saved.version,
        title: saved.title,
        clonedEvidenceCount: sourceEvidences.length,
        tenantId: scopeTenant,
      },
      undefined,
      saved.projectId ?? undefined,
      scopeTenant,
    );

    return saved;
  }

  /**
   * Retrieve the complete lineage / revision history of an article family.
   */
  async getRevisionHistory(
    articleId: string,
    tenantId?: string | null,
  ): Promise<KnowledgeArticle[]> {
    const scopeTenant = this.requireTenant(tenantId);
    const target = await this.findOne(articleId, scopeTenant);

    // Find the root ancestor by traversing backwards
    let rootId = target.id;
    let current = target;
    while (current.parentArticleId) {
      const parent = await this.repo.findOne({
        where: { id: current.parentArticleId, tenantId: scopeTenant, deletedAt: IsNull() } as any,
      });
      if (!parent || parent.id === current.id) break;
      rootId = parent.id;
      current = parent;
    }

    // Find all revisions belonging to this lineage
    const family = await this.repo
      .createQueryBuilder('a')
      .where('a.tenant_id = :tenantId', { tenantId: scopeTenant })
      .andWhere('a.deleted_at IS NULL')
      .andWhere('(a.id = :rootId OR a.parent_article_id = :rootId OR a.parent_article_id IS NOT NULL)', { rootId })
      .orderBy('a.version', 'ASC')
      .getMany();

    return family;
  }

  /**
   * Generic article content update - permitted ONLY while article is in DRAFT state.
   * Direct status mutation is strictly forbidden through this method.
   */
  async update(
    id: string,
    dto: UpdateKnowledgeArticleDto | Record<string, unknown>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<KnowledgeArticle> {
    const scopeTenant = this.requireTenant(tenantId);
    const article = await this.findOne(id, scopeTenant);

    if (article.status === ArticleStatus.PUBLISHED) {
      throw new BadRequestException('Published articles cannot be edited directly. A formal revision workflow is required.');
    }
    if (article.status === ArticleStatus.UNDER_REVIEW) {
      throw new BadRequestException('Article is currently under review and cannot be edited until rejected or returned to draft.');
    }
    if (article.status === ArticleStatus.SUPERSEDED || article.status === ArticleStatus.EXPIRED || article.status === ArticleStatus.ARCHIVED) {
      throw new BadRequestException(`Cannot edit article in ${article.status} state.`);
    }

    const data = dto as any;
    if (data.status && data.status !== article.status) {
      throw new BadRequestException('Article status cannot be updated directly via generic update. Use dedicated lifecycle endpoints.');
    }

    if (data.title && data.title.trim() !== article.title) {
      article.title = data.title.trim();
      article.slug = await this.generateUniqueSlug(article.title, scopeTenant, article.version, article.id);
    }
    if (data.content !== undefined) article.content = data.content;
    if (data.summary !== undefined) article.summary = data.summary?.trim() ?? null;
    if (data.categoryId !== undefined) article.categoryId = data.categoryId ?? null;
    if (data.tags !== undefined) article.tags = data.tags ?? null;
    if (data.projectId !== undefined) article.projectId = data.projectId ?? null;
    if (data.decisionId !== undefined) article.decisionId = data.decisionId ?? null;
    if (data.reviewDueDate !== undefined) article.reviewDueDate = data.reviewDueDate ? new Date(data.reviewDueDate) : null;
    if (data.expiresAt !== undefined) article.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

    article.updatedBy = userId ?? null;

    return this.repo.save(article);
  }

  /**
   * Transition: DRAFT -> UNDER_REVIEW
   */
  async submitForReview(
    id: string,
    dto?: SubmitArticleDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<KnowledgeArticle> {
    const scopeTenant = this.requireTenant(tenantId);
    const article = await this.findOne(id, scopeTenant);

    this.validateTransition(article.status, ArticleStatus.UNDER_REVIEW);

    if (!article.content || article.content.trim().length === 0) {
      throw new BadRequestException('Cannot submit article with empty content for review.');
    }

    const previousStatus = article.status;
    article.status = ArticleStatus.UNDER_REVIEW;
    if (dto?.reviewDueDate) {
      article.reviewDueDate = new Date(dto.reviewDueDate);
    }
    article.updatedBy = userId ?? null;

    const saved = await this.repo.save(article);

    await this.auditService.logBusinessEvent(
      'knowledge_article.submitted',
      'KnowledgeArticle',
      saved.id,
      userId ?? 'system',
      {
        previousStatus,
        newStatus: saved.status,
        title: saved.title,
        version: saved.version,
        tenantId: scopeTenant,
      },
      undefined,
      saved.projectId ?? undefined,
      scopeTenant,
    );

    return saved;
  }

  /**
   * Transition: UNDER_REVIEW -> PUBLISHED with Atomic Supersession of Predecessor Revision.
   * Both records are committed within a single database transaction.
   */
  async approveAndPublish(
    id: string,
    dto?: ApproveArticleDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<KnowledgeArticle> {
    const scopeTenant = this.requireTenant(tenantId);

    // Execute atomic publication + supersession in one transaction
    const { publishedArticle, predecessorArticle } = await this.dataSource.transaction(
      async (em: EntityManager) => {
        const articleRepo = em.getRepository(KnowledgeArticle);

        const article = await articleRepo.findOne({
          where: { id, tenantId: scopeTenant, deletedAt: IsNull() } as any,
        });

        if (!article) {
          throw new NotFoundException(`KnowledgeArticle ${id} not found in tenant ${scopeTenant}`);
        }

        this.validateTransition(article.status, ArticleStatus.PUBLISHED);

        let predecessor: KnowledgeArticle | null = null;

        if (article.parentArticleId) {
          predecessor = await articleRepo.findOne({
            where: { id: article.parentArticleId, tenantId: scopeTenant, deletedAt: IsNull() } as any,
          });

          if (!predecessor) {
            throw new NotFoundException(`Predecessor article ${article.parentArticleId} not found`);
          }

          if (predecessor.status === ArticleStatus.SUPERSEDED) {
            throw new BadRequestException(
              `Predecessor article [${predecessor.id}] is already SUPERSEDED by [${predecessor.supersededById}]. Revision must be re-based on the latest published article.`,
            );
          }

          if (predecessor.status !== ArticleStatus.PUBLISHED) {
            throw new BadRequestException(
              `Predecessor article must be in PUBLISHED state to be superseded. Current status: '${predecessor.status}'.`,
            );
          }

          if (article.version !== predecessor.version + 1) {
            throw new BadRequestException(
              `Version mismatch: Child version (${article.version}) must be exactly predecessor version (${predecessor.version}) + 1.`,
            );
          }

          // Atomically supersede predecessor
          predecessor.status = ArticleStatus.SUPERSEDED;
          predecessor.isLatest = false;
          predecessor.supersededById = article.id;
          predecessor.updatedBy = userId ?? null;
          await articleRepo.save(predecessor);
        }

        // Publish child revision
        article.status = ArticleStatus.PUBLISHED;
        article.isLatest = true;
        article.publishedAt = new Date();
        article.reviewedBy = userId ?? null;
        article.lastReviewedAt = new Date();
        if (dto?.expiresAt) {
          article.expiresAt = new Date(dto.expiresAt);
        }
        article.updatedBy = userId ?? null;

        const savedArticle = await articleRepo.save(article);

        return { publishedArticle: savedArticle, predecessorArticle: predecessor };
      },
    );

    // Post-commit structured audit logging (Zero false events on rollback)
    await this.auditService.logBusinessEvent(
      'knowledge_article.published',
      'KnowledgeArticle',
      publishedArticle.id,
      userId ?? 'system',
      {
        previousStatus: ArticleStatus.UNDER_REVIEW,
        newStatus: ArticleStatus.PUBLISHED,
        title: publishedArticle.title,
        version: publishedArticle.version,
        isLatest: publishedArticle.isLatest,
        publishedAt: publishedArticle.publishedAt,
        reviewedBy: publishedArticle.reviewedBy,
        parentArticleId: publishedArticle.parentArticleId,
        tenantId: scopeTenant,
      },
      undefined,
      publishedArticle.projectId ?? undefined,
      scopeTenant,
    );

    if (predecessorArticle) {
      await this.auditService.logBusinessEvent(
        'knowledge_article.superseded',
        'KnowledgeArticle',
        predecessorArticle.id,
        userId ?? 'system',
        {
          previousStatus: ArticleStatus.PUBLISHED,
          newStatus: ArticleStatus.SUPERSEDED,
          title: predecessorArticle.title,
          version: predecessorArticle.version,
          isLatest: predecessorArticle.isLatest,
          supersededById: publishedArticle.id,
          tenantId: scopeTenant,
        },
        undefined,
        predecessorArticle.projectId ?? undefined,
        scopeTenant,
      );
    }

    return publishedArticle;
  }

  /**
   * Transition: UNDER_REVIEW -> REJECTED
   */
  async rejectReview(
    id: string,
    dto: RejectArticleDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<KnowledgeArticle> {
    const scopeTenant = this.requireTenant(tenantId);
    const article = await this.findOne(id, scopeTenant);

    this.validateTransition(article.status, ArticleStatus.REJECTED);

    if (!dto.rejectionReason || dto.rejectionReason.trim().length < 5) {
      throw new BadRequestException('Rejection reason must be at least 5 characters long.');
    }

    const previousStatus = article.status;
    article.status = ArticleStatus.REJECTED;
    article.rejectionReason = dto.rejectionReason.trim();
    article.reviewedBy = userId ?? null;
    article.lastReviewedAt = new Date();
    article.updatedBy = userId ?? null;

    const saved = await this.repo.save(article);

    await this.auditService.logBusinessEvent(
      'knowledge_article.rejected',
      'KnowledgeArticle',
      saved.id,
      userId ?? 'system',
      {
        previousStatus,
        newStatus: saved.status,
        title: saved.title,
        rejectionReason: saved.rejectionReason,
        tenantId: scopeTenant,
      },
      undefined,
      saved.projectId ?? undefined,
      scopeTenant,
    );

    return saved;
  }

  /**
   * Transition: REJECTED -> DRAFT (Reopen for editing)
   */
  async reopenRejected(
    id: string,
    userId?: string,
    tenantId?: string | null,
  ): Promise<KnowledgeArticle> {
    const scopeTenant = this.requireTenant(tenantId);
    const article = await this.findOne(id, scopeTenant);

    this.validateTransition(article.status, ArticleStatus.DRAFT);

    const previousStatus = article.status;
    article.status = ArticleStatus.DRAFT;
    article.updatedBy = userId ?? null;

    const saved = await this.repo.save(article);

    await this.auditService.logBusinessEvent(
      'knowledge_article.reopened',
      'KnowledgeArticle',
      saved.id,
      userId ?? 'system',
      {
        previousStatus,
        newStatus: saved.status,
        title: saved.title,
        version: saved.version,
        tenantId: scopeTenant,
      },
      undefined,
      saved.projectId ?? undefined,
      scopeTenant,
    );

    return saved;
  }

  /**
   * Administrative/Manual supersession guard.
   */
  async markSuperseded(
    id: string,
    userId?: string,
    tenantId?: string | null,
    supersededById?: string,
  ): Promise<KnowledgeArticle> {
    const scopeTenant = this.requireTenant(tenantId);
    const article = await this.findOne(id, scopeTenant);

    this.validateTransition(article.status, ArticleStatus.SUPERSEDED);

    const previousStatus = article.status;
    article.status = ArticleStatus.SUPERSEDED;
    article.isLatest = false;
    if (supersededById) {
      article.supersededById = supersededById;
    }
    article.updatedBy = userId ?? null;

    const saved = await this.repo.save(article);

    await this.auditService.logBusinessEvent(
      'knowledge_article.superseded',
      'KnowledgeArticle',
      saved.id,
      userId ?? 'system',
      {
        previousStatus,
        newStatus: saved.status,
        title: saved.title,
        version: saved.version,
        supersededById: saved.supersededById,
        tenantId: scopeTenant,
      },
      undefined,
      saved.projectId ?? undefined,
      scopeTenant,
    );

    return saved;
  }

  /**
   * Transition: PUBLISHED -> EXPIRED
   */
  async markExpired(
    id: string,
    userId?: string,
    tenantId?: string | null,
  ): Promise<KnowledgeArticle> {
    const scopeTenant = this.requireTenant(tenantId);
    const article = await this.findOne(id, scopeTenant);

    this.validateTransition(article.status, ArticleStatus.EXPIRED);

    const previousStatus = article.status;
    article.status = ArticleStatus.EXPIRED;
    article.updatedBy = userId ?? null;

    const saved = await this.repo.save(article);

    await this.auditService.logBusinessEvent(
      'knowledge_article.expired',
      'KnowledgeArticle',
      saved.id,
      userId ?? 'system',
      {
        previousStatus,
        newStatus: saved.status,
        title: saved.title,
        version: saved.version,
        tenantId: scopeTenant,
      },
      undefined,
      saved.projectId ?? undefined,
      scopeTenant,
    );

    return saved;
  }

  /**
   * Validate state transition against the formal transition matrix.
   */
  private validateTransition(currentStatus: ArticleStatus, targetStatus: ArticleStatus): void {
    const allowed = ALLOWED_ARTICLE_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Invalid state transition: Cannot transition KnowledgeArticle from '${currentStatus}' to '${targetStatus}'. Allowed target states: [${allowed.join(', ')}]`,
      );
    }
  }

  /**
   * Deterministically generate a URL-safe slug with unique collision resolution and revision suffixing.
   */
  private async generateUniqueSlug(
    title: string,
    tenantId: string,
    version = 1,
    excludeId?: string,
  ): Promise<string> {
    const cleanTitle = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 240) || 'article';

    const baseSlug = version > 1 ? `${cleanTitle}-v${version}` : cleanTitle;
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const qb = this.repo
        .createQueryBuilder('a')
        .where('a.slug = :slug', { slug })
        .andWhere('a.tenant_id = :tenantId', { tenantId })
        .andWhere('a.deleted_at IS NULL');

      if (excludeId) {
        qb.andWhere('a.id != :excludeId', { excludeId });
      }

      const existing = await qb.getOne();
      if (!existing) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
}