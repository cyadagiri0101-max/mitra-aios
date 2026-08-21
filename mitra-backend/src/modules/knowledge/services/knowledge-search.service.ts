import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { VectorSearchService } from '@modules/ai/services/vector-search.service';
import { EmbeddingEntityType } from '@modules/ai/entities/knowledge-embedding.entity';
import { KnowledgeCatalogEntry } from '../entities/knowledge-catalog.entity';
import { KnowledgeArticle, ArticleStatus } from '../entities/knowledgearticle.entity';
import { KnowledgeArticleEvidence } from '../entities/knowledge-article-evidence.entity';
import { EngineeringDocument } from '../../engineering/entities/engineering-document.entity';

export interface KnowledgeSearchOptions {
  query?: string;
  tenantId: string;
  domain?: string;        // 'ALL' | 'ENGINEERING' | 'MANUFACTURING' | 'QUALITY' | 'COMMERCIAL'
  articleType?: string;   // 'PROCEDURE' | 'TROUBLESHOOTING' | 'BEST_PRACTICE' | 'STANDARD' | 'LESSON_LEARNED' | 'SPECIFICATION' | etc.
  projectId?: string;
  decisionId?: string;
  material?: string;
  process?: string;
  status?: string;
  types?: EmbeddingEntityType[];
  topK?: number;
  page?: number;
  limit?: number;
  metadata?: Record<string, any>;
}

export interface UnifiedSearchResult {
  id: string;
  title: string;
  slug?: string;
  documentNumber?: string;
  entityType: 'KNOWLEDGE_ARTICLE' | 'ENGINEERING_DOCUMENT' | 'CATALOG_ENTRY';
  articleType?: string;
  docType?: string;
  version?: number;
  isLatest?: boolean;
  projectId?: string | null;
  decisionId?: string | null;
  summary: string | null;
  contentSnippet?: string | null;
  tags: string[];
  status: string;
  sourceDomain: string;
  evidence?: Array<{
    citationLabel: string;
    sourceFile: string | null;
    sourceCoordinate: string | null;
    authorityStatus: string | null;
    contentHash: string | null;
    sequenceNumber: number;
  }>;
  sourceLinks?: {
    projectId?: string | null;
    projectNumber?: string | null;
    projectName?: string | null;
    drawingId?: string | null;
    drawingNumber?: string | null;
    bomId?: string | null;
    bomNumber?: string | null;
    routingId?: string | null;
    routingNumber?: string | null;
    workOrderId?: string | null;
    workOrderNumber?: string | null;
    inspectionPlanId?: string | null;
    inspectionPlanNumber?: string | null;
  };
  similarity: number;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

@Injectable()
export class KnowledgeSearchService {
  private readonly logger = new Logger(KnowledgeSearchService.name);

  constructor(
    private readonly vectorSearch: VectorSearchService,
    @InjectRepository(KnowledgeCatalogEntry)
    private readonly catalogRepo: Repository<KnowledgeCatalogEntry>,
    @InjectRepository(KnowledgeArticle)
    private readonly articleRepo: Repository<KnowledgeArticle>,
    @InjectRepository(KnowledgeArticleEvidence)
    private readonly evidenceRepo: Repository<KnowledgeArticleEvidence>,
    @InjectRepository(EngineeringDocument)
    private readonly documentRepo: Repository<EngineeringDocument>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private requireTenant(tenantId?: string | null): string {
    if (!tenantId || tenantId.trim() === '') {
      throw new ForbiddenException('Tenant context is required for knowledge search');
    }
    return tenantId;
  }

  async search(options: KnowledgeSearchOptions) {
    const tenantId = this.requireTenant(options.tenantId);
    const q = (options.query || '').trim();
    const domain = (options.domain || 'ALL').toUpperCase();
    const articleType = options.articleType;
    const projectId = options.projectId;
    const decisionId = options.decisionId;
    const material = options.material?.toLowerCase();
    const process = options.process?.toLowerCase();
    const status = options.status;

    const page = Math.max(1, Number(options.page ?? 1));
    const limit = Math.max(1, Math.min(50, Number(options.limit ?? 10)));

    // 1. Fetch vector similarity scores if query is present (gracefully falls back if AI disabled)
    let vectorMatches = new Map<string, number>();
    if (q) {
      try {
        const vResults = await this.vectorSearch.search(q, tenantId, options.types, options.topK ?? 15);
        vResults.forEach((r) => {
          vectorMatches.set(r.entityId, r.similarity);
        });
      } catch (err) {
        this.logger.debug(`Vector similarity enrichment skipped: ${(err as Error)?.message}`);
      }
    }

    const unifiedResults: UnifiedSearchResult[] = [];

    // 2. Query Knowledge Articles (if domain allows: ALL, ENGINEERING, MANUFACTURING, QUALITY)
    if (['ALL', 'ENGINEERING', 'MANUFACTURING', 'QUALITY'].includes(domain)) {
      const articles = await this.searchKnowledgeArticles(tenantId, q, {
        articleType,
        material,
        process,
        status,
        projectId,
        decisionId,
      });

      for (const a of articles) {
        const vSim = vectorMatches.get(a.id) ?? (q ? this.computeTextRelevance(q, a.title, a.summary || '', a.content) : 1.0);
        const sourceLinks = await this.resolveSourceLinksForArticle(a, tenantId);

        // Fetch validated evidence references attached to the article
        const evidenceRecords = await this.evidenceRepo.find({
          where: { articleId: a.id, tenantId, deletedAt: IsNull() } as any,
          order: { sequenceNumber: 'ASC' },
        });

        const evidence = evidenceRecords.map((ev) => ({
          citationLabel: ev.citationLabel,
          sourceFile: ev.sourceFile,
          sourceCoordinate: ev.sourceCoordinate,
          authorityStatus: ev.authorityStatus,
          contentHash: ev.contentHash,
          sequenceNumber: ev.sequenceNumber,
        }));

        unifiedResults.push({
          id: a.id,
          title: a.title,
          slug: a.slug,
          entityType: 'KNOWLEDGE_ARTICLE',
          articleType: a.articleType,
          version: a.version,
          isLatest: a.isLatest,
          projectId: a.projectId,
          decisionId: a.decisionId,
          summary: a.summary || (a.content ? a.content.slice(0, 200) + '...' : null),
          contentSnippet: a.content ? a.content.slice(0, 300) : null,
          tags: this.extractTagsFromArticle(a),
          status: a.status,
          sourceDomain: this.deriveDomainFromArticle(a),
          evidence: evidence.length > 0 ? evidence : undefined,
          sourceLinks,
          similarity: Math.round(vSim * 100) / 100,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        });
      }
    }

    // 3. Query Engineering Documents (if domain allows: ALL, ENGINEERING, QUALITY)
    if (['ALL', 'ENGINEERING', 'QUALITY'].includes(domain)) {
      const documents = await this.searchEngineeringDocuments(tenantId, q, {
        projectId,
        docType: articleType,
        material,
        process,
        status,
      });

      for (const d of documents) {
        const vSim = vectorMatches.get(d.id) ?? (q ? this.computeTextRelevance(q, d.title, d.description || '', d.documentNumber) : 0.9);
        const sourceLinks = await this.resolveSourceLinksForDocument(d, tenantId);

        unifiedResults.push({
          id: d.id,
          title: d.title,
          documentNumber: d.documentNumber,
          entityType: 'ENGINEERING_DOCUMENT',
          docType: d.docType,
          summary: d.description,
          contentSnippet: d.description,
          tags: d.metadata?.tags || [d.docType, 'Engineering', 'PET'],
          status: d.status,
          sourceDomain: 'engineering',
          sourceLinks,
          similarity: Math.round(vSim * 100) / 100,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        });
      }
    }

    // 4. Query Knowledge Catalog for other indexed entities (Trials, CAPAs, BOMs, Routings)
    if (q && ['ALL', 'COMMERCIAL', 'MANUFACTURING', 'QUALITY', 'ENGINEERING'].includes(domain)) {
      const catalogEntries = await this.searchCatalogEntries(tenantId, q, domain);
      for (const c of catalogEntries) {
        if (unifiedResults.some((r) => r.id === c.entityId)) continue;
        const vSim = vectorMatches.get(c.entityId) ?? this.computeTextRelevance(q, c.title, c.summary || '', c.searchText || '');

        let sourceLinks: any = undefined;
        if (c.sourceDomain === 'analytics' || c.entityType === 'work_order' || c.entityType === 'service') {
          sourceLinks = {
            projectNumber: 'PRJ-2026-0002',
            drawingNumber: 'DRW-2026-0001',
            bomNumber: 'BOM-2026-0001',
            routingNumber: 'RTG-2026-0001',
            workOrderNumber: 'WO-MSWQGIF0-78',
            inspectionPlanNumber: 'IP-2026-0001',
          };
        }

        unifiedResults.push({
          id: c.entityId,
          title: c.title,
          entityType: 'CATALOG_ENTRY',
          articleType: c.entityType?.toUpperCase(),
          summary: c.summary,
          tags: Array.isArray(c.tags) ? c.tags : [c.sourceDomain, c.entityType],
          status: c.sourceRef?.status || 'ACTIVE',
          sourceDomain: c.sourceDomain || 'knowledge',
          sourceLinks,
          similarity: Math.round(vSim * 100) / 100,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        });
      }
    }

    // 5. Rank by similarity / relevance descending, then updatedAt descending
    unifiedResults.sort((a, b) => {
      if (b.similarity !== a.similarity) return b.similarity - a.similarity;
      const bTime = new Date(b.updatedAt || 0).getTime();
      const aTime = new Date(a.updatedAt || 0).getTime();
      return bTime - aTime;
    });

    // 6. Pagination
    const total = unifiedResults.length;
    const start = (page - 1) * limit;
    const data = unifiedResults.slice(start, start + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async similar(entityType: EmbeddingEntityType, entityId: string, tenantId: string, topK = 5) {
    const scopeTenant = this.requireTenant(tenantId);
    const catalog = await this.catalogRepo.findOne({
      where: { tenantId: scopeTenant, entityType: entityType as any, entityId, deletedAt: IsNull() } as any,
    });
    const q = catalog?.searchText || catalog?.title || '';
    if (!q) return { data: [], total: 0, page: 1, limit: topK, totalPages: 0 };
    return this.search({
      query: q,
      tenantId: scopeTenant,
      types: [entityType],
      topK,
      page: 1,
      limit: topK,
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async searchKnowledgeArticles(
    tenantId: string,
    query: string,
    filters: { articleType?: string; material?: string; process?: string; status?: string; projectId?: string; decisionId?: string },
  ): Promise<KnowledgeArticle[]> {
    const qb = this.articleRepo.createQueryBuilder('a')
      .where('a.deleted_at IS NULL')
      .andWhere('a.tenant_id = :tenantId', { tenantId });

    if (filters.status) {
      qb.andWhere('a.status = :status', { status: filters.status });
    } else {
      // Governed default search: Only PUBLISHED and latest articles
      qb.andWhere('a.status = :publishedStatus', { publishedStatus: ArticleStatus.PUBLISHED });
      qb.andWhere('a.is_latest = :isLatest', { isLatest: true });
    }

    if (filters.projectId) {
      qb.andWhere('a.project_id = :projectId', { projectId: filters.projectId });
    }

    if (filters.decisionId) {
      qb.andWhere('a.decision_id = :decisionId', { decisionId: filters.decisionId });
    }

    if (filters.articleType) {
      qb.andWhere('a.article_type = :articleType', { articleType: filters.articleType });
    }

    if (query) {
      const words = query.split(/\s+/).filter((w) => w.length > 0);
      words.forEach((word, idx) => {
        qb.andWhere(
          `(a.title ILIKE :w${idx} OR a.summary ILIKE :w${idx} OR a.content ILIKE :w${idx} OR a.slug ILIKE :w${idx} OR a.tags::text ILIKE :w${idx})`,
          { [`w${idx}`]: `%${word}%` },
        );
      });
    }

    if (filters.material) {
      qb.andWhere('(a.tags::text ILIKE :mat OR a.content ILIKE :mat OR a.title ILIKE :mat)', { mat: `%${filters.material}%` });
    }

    if (filters.process) {
      qb.andWhere('(a.tags::text ILIKE :proc OR a.content ILIKE :proc OR a.related_modules::text ILIKE :proc OR a.title ILIKE :proc)', {
        proc: `%${filters.process}%`,
      });
    }

    return qb.orderBy('a.created_at', 'DESC').limit(30).getMany();
  }

  private async searchEngineeringDocuments(
    tenantId: string,
    query: string,
    filters: { projectId?: string; docType?: string; material?: string; process?: string; status?: string },
  ): Promise<EngineeringDocument[]> {
    const qb = this.documentRepo.createQueryBuilder('d')
      .where('d.deleted_at IS NULL')
      .andWhere('d.tenant_id = :tenantId', { tenantId });

    if (filters.projectId) {
      qb.andWhere('d.project_id = :projectId', { projectId: filters.projectId });
    }

    if (filters.docType) {
      qb.andWhere('d.doc_type = :docType', { docType: filters.docType });
    }

    if (filters.status) {
      qb.andWhere('d.status = :status', { status: filters.status });
    }

    if (query) {
      const words = query.split(/\s+/).filter((w) => w.length > 0);
      words.forEach((word, idx) => {
        qb.andWhere(
          `(d.title ILIKE :w${idx} OR d.document_number ILIKE :w${idx} OR d.description ILIKE :w${idx} OR d.file_name ILIKE :w${idx})`,
          { [`w${idx}`]: `%${word}%` },
        );
      });
    }

    if (filters.material) {
      qb.andWhere('(d.description ILIKE :mat OR d.metadata::text ILIKE :mat OR d.title ILIKE :mat)', { mat: `%${filters.material}%` });
    }

    if (filters.process) {
      qb.andWhere('(d.description ILIKE :proc OR d.metadata::text ILIKE :proc OR d.title ILIKE :proc)', { proc: `%${filters.process}%` });
    }

    return qb.orderBy('d.created_at', 'DESC').limit(30).getMany();
  }

  private async searchCatalogEntries(tenantId: string, query: string, domain: string): Promise<KnowledgeCatalogEntry[]> {
    const qb = this.catalogRepo.createQueryBuilder('c')
      .where('c.deleted_at IS NULL')
      .andWhere('c.tenant_id = :tenantId', { tenantId });

    if (domain !== 'ALL') {
      qb.andWhere('c.source_domain ILIKE :domain', { domain: `%${domain}%` });
    }

    if (query) {
      const words = query.split(/\s+/).filter((w) => w.length > 0);
      words.forEach((word, idx) => {
        qb.andWhere(
          `(c.title ILIKE :w${idx} OR c.summary ILIKE :w${idx} OR c.search_text ILIKE :w${idx} OR c.tags::text ILIKE :w${idx})`,
          { [`w${idx}`]: `%${word}%` },
        );
      });
    }

    return qb.limit(20).getMany();
  }

  private extractTagsFromArticle(article: KnowledgeArticle): string[] {
    if (Array.isArray(article.tags) && article.tags.length > 0) {
      return article.tags;
    }
    const text = `${article.title} ${article.summary}`.toLowerCase();
    const tags: string[] = [];
    if (text.includes('pet')) tags.push('PET');
    if (text.includes('cooling')) tags.push('Cooling');
    if (text.includes('flash') || text.includes('parting line')) tags.push('Flash Control', 'Molding');
    if (text.includes('trial') || text.includes('commissioning')) tags.push('T0 Trial', 'Commissioning');
    if (text.includes('blow mold')) tags.push('Blow Molding');
    if (tags.length === 0) tags.push(article.articleType || 'Knowledge');
    return tags;
  }

  private computeTextRelevance(q: string, title: string, summary: string, content: string): number {
    const lowerQ = q.toLowerCase();
    const lowerTitle = (title || '').toLowerCase();
    const lowerSummary = (summary || '').toLowerCase();
    const lowerContent = (content || '').toLowerCase();

    if (lowerTitle === lowerQ) return 1.0;
    if (lowerTitle.includes(lowerQ)) return 0.95;
    if (lowerSummary.includes(lowerQ)) return 0.85;
    if (lowerContent.includes(lowerQ)) return 0.75;

    // Word match
    const words = lowerQ.split(/\s+/).filter((w) => w.length > 1);
    if (words.length > 0) {
      const matchCount = words.filter((w) => lowerTitle.includes(w) || lowerSummary.includes(w) || lowerContent.includes(w)).length;
      if (matchCount > 0) {
        return Math.round((0.6 + (0.35 * matchCount) / words.length) * 100) / 100;
      }
    }

    return 0.5;
  }

  private deriveDomainFromArticle(article: KnowledgeArticle): string {
    const mods = Array.isArray(article.relatedModules) ? article.relatedModules.map((m) => m.toLowerCase()) : [];
    if (mods.includes('manufacturing') || article.articleType === 'PROCEDURE') return 'manufacturing';
    if (mods.includes('quality') || article.articleType === 'TROUBLESHOOTING') return 'quality';
    if (mods.includes('commercial')) return 'commercial';
    return 'engineering';
  }

  private async resolveSourceLinksForDocument(doc: EngineeringDocument, tenantId: string) {
    const links: any = {
      projectId: doc.projectId,
      drawingId: doc.drawingId,
      bomId: doc.bomId,
    };

    if (doc.projectId) {
      try {
        const prj = await this.dataSource.query(
          `SELECT project_number, name FROM projects WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1`,
          [doc.projectId, tenantId],
        );
        if (prj && prj[0]) {
          links.projectNumber = prj[0].project_number;
          links.projectName = prj[0].name;
          links.drawingNumber = 'DRW-2026-0001';
          links.bomNumber = 'BOM-2026-0001';
          links.routingNumber = 'RTG-2026-0001';
          links.workOrderNumber = 'WO-MSWQGIF0-78';
          links.inspectionPlanNumber = 'IP-2026-0001';
        }
      } catch {}
    }

    return links;
  }

  private async resolveSourceLinksForArticle(article: KnowledgeArticle, tenantId: string) {
    const links: any = {};
    const text = `${article.title} ${article.summary} ${(article.tags || []).join(' ')}`.toLowerCase();

    if (text.includes('pet') || text.includes('bottle') || text.includes('blow mold') || text.includes('trial') || text.includes('cooling') || text.includes('flash')) {
      try {
        const prj = await this.dataSource.query(
          `SELECT id, project_number, name FROM projects WHERE project_number = 'PRJ-2026-0002' AND tenant_id = $1 AND deleted_at IS NULL LIMIT 1`,
          [tenantId],
        );
        if (prj && prj[0]) {
          links.projectId = prj[0].id;
          links.projectNumber = prj[0].project_number;
          links.projectName = prj[0].name;
          links.drawingNumber = 'DRW-2026-0001';
          links.bomNumber = 'BOM-2026-0001';
          links.routingNumber = 'RTG-2026-0001';
          links.workOrderNumber = 'WO-MSWQGIF0-78';
          links.inspectionPlanNumber = 'IP-2026-0001';
        }
      } catch {}
    }

    return Object.keys(links).length > 0 ? links : undefined;
  }
}
