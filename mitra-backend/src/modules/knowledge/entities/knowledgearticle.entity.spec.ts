import { KnowledgeArticle, ArticleStatus, ArticleType } from './knowledgearticle.entity';
import { M8KnowledgeLifecycle1700000000044 } from '../../../database/migrations/1700000000044-M8KnowledgeLifecycle';

describe('KnowledgeArticle Entity & M8.1 Domain Model', () => {
  it('should instantiate entity with correct defaults and M8.1 lifecycle fields', () => {
    const article = new KnowledgeArticle();
    article.title = 'CNC Roughing Best Practices for 1.2085 Steel';
    article.slug = 'cnc-roughing-best-practices-12085-steel';
    article.content = '# Guidelines\nProper feeds and speeds for pre-hardened 1.2085 stainless mold bases.';
    article.articleType = ArticleType.BEST_PRACTICE;
    article.status = ArticleStatus.DRAFT;
    article.version = 1;
    article.isLatest = true;
    article.parentArticleId = null;
    article.supersededById = null;
    article.projectId = 'proj-bm454-uuid';
    article.decisionId = 'dec-2026-0042-uuid';
    article.rejectionReason = null;
    article.expiresAt = new Date('2027-12-31');
    article.reviewDueDate = new Date('2027-06-30');

    expect(article.title).toBe('CNC Roughing Best Practices for 1.2085 Steel');
    expect(article.status).toBe(ArticleStatus.DRAFT);
    expect(article.version).toBe(1);
    expect(article.isLatest).toBe(true);
    expect(article.parentArticleId).toBeNull();
    expect(article.supersededById).toBeNull();
    expect(article.projectId).toBe('proj-bm454-uuid');
    expect(article.decisionId).toBe('dec-2026-0042-uuid');
    expect(article.expiresAt).toEqual(new Date('2027-12-31'));
    expect(article.reviewDueDate).toEqual(new Date('2027-06-30'));
  });

  it('should support all M8 lifecycle states in ArticleStatus enum', () => {
    expect(ArticleStatus.DRAFT).toBe('DRAFT');
    expect(ArticleStatus.UNDER_REVIEW).toBe('UNDER_REVIEW');
    expect(ArticleStatus.PUBLISHED).toBe('PUBLISHED');
    expect(ArticleStatus.REJECTED).toBe('REJECTED');
    expect(ArticleStatus.SUPERSEDED).toBe('SUPERSEDED');
    expect(ArticleStatus.EXPIRED).toBe('EXPIRED');
    expect(ArticleStatus.ARCHIVED).toBe('ARCHIVED');
  });

  it('should support revision branching metadata model (v1 -> v2)', () => {
    const v1 = new KnowledgeArticle();
    v1.id = 'article-v1-uuid';
    v1.version = 1;
    v1.isLatest = false;
    v1.status = ArticleStatus.SUPERSEDED;
    v1.supersededById = 'article-v2-uuid';

    const v2 = new KnowledgeArticle();
    v2.id = 'article-v2-uuid';
    v2.version = 2;
    v2.isLatest = true;
    v2.status = ArticleStatus.PUBLISHED;
    v2.parentArticleId = 'article-v1-uuid';
    v2.parentArticle = v1;

    expect(v1.version).toBe(1);
    expect(v1.status).toBe(ArticleStatus.SUPERSEDED);
    expect(v1.supersededById).toBe('article-v2-uuid');

    expect(v2.version).toBe(2);
    expect(v2.status).toBe(ArticleStatus.PUBLISHED);
    expect(v2.parentArticleId).toBe('article-v1-uuid');
    expect(v2.parentArticle?.id).toBe('article-v1-uuid');
  });

  describe('Migration 1700000000044-M8KnowledgeLifecycle', () => {
    it('executes up queries for column additions, check constraints, FKs, and indexes', async () => {
      const migration = new M8KnowledgeLifecycle1700000000044();
      const queries: string[] = [];
      const mockQueryRunner: any = {
        query: jest.fn().mockImplementation(async (q: string) => {
          queries.push(q);
        }),
      };

      await migration.up(mockQueryRunner);

      expect(mockQueryRunner.query).toHaveBeenCalled();
      const combinedQueries = queries.join('\n');
      expect(combinedQueries).toContain('ALTER TABLE "knowledge_articles"');
      expect(combinedQueries).toContain('"version" INTEGER NOT NULL DEFAULT 1');
      expect(combinedQueries).toContain('"is_latest" BOOLEAN NOT NULL DEFAULT true');
      expect(combinedQueries).toContain('"parent_article_id" UUID NULL');
      expect(combinedQueries).toContain('"superseded_by_id" UUID NULL');
      expect(combinedQueries).toContain('"project_id" UUID NULL');
      expect(combinedQueries).toContain('"decision_id" UUID NULL');
      expect(combinedQueries).toContain('"rejection_reason" TEXT NULL');
      expect(combinedQueries).toContain('"expires_at" DATE NULL');
      expect(combinedQueries).toContain('REJECTED');
      expect(combinedQueries).toContain('SUPERSEDED');
      expect(combinedQueries).toContain('EXPIRED');
      expect(combinedQueries).toContain('FK_knowledge_articles_parent');
      expect(combinedQueries).toContain('FK_knowledge_articles_superseded_by');
      expect(combinedQueries).toContain('FK_knowledge_articles_project');
      expect(combinedQueries).toContain('FK_knowledge_articles_decision');
      expect(combinedQueries).toContain('IDX_knowledge_articles_tnt_status');
      expect(combinedQueries).toContain('IDX_knowledge_articles_tnt_is_latest');
    });

    it('executes down queries cleanly reverting indexes, FKs, constraints, and columns', async () => {
      const migration = new M8KnowledgeLifecycle1700000000044();
      const queries: string[] = [];
      const mockQueryRunner: any = {
        query: jest.fn().mockImplementation(async (q: string) => {
          queries.push(q);
        }),
      };

      await migration.down(mockQueryRunner);

      expect(mockQueryRunner.query).toHaveBeenCalled();
      const combinedQueries = queries.join('\n');
      expect(combinedQueries).toContain('DROP INDEX IF EXISTS "IDX_knowledge_articles_tnt_status"');
      expect(combinedQueries).toContain('DROP CONSTRAINT IF EXISTS "FK_knowledge_articles_parent"');
      expect(combinedQueries).toContain('DROP COLUMN IF EXISTS "version"');
      expect(combinedQueries).toContain('DROP COLUMN IF EXISTS "is_latest"');
    });
  });
});
