import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ArticleStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  SUPERSEDED = 'SUPERSEDED',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED',
}

export enum ArticleType {
  PROCEDURE = 'PROCEDURE',
  TROUBLESHOOTING = 'TROUBLESHOOTING',
  BEST_PRACTICE = 'BEST_PRACTICE',
  STANDARD = 'STANDARD',
  LESSON_LEARNED = 'LESSON_LEARNED',
  FAQ = 'FAQ',
}

@Entity('knowledge_articles')
@Index(['slug', 'deletedAt'])
@Index(['categoryId', 'status', 'deletedAt'])
@Index(['tenantId', 'status', 'deletedAt'])
@Index(['tenantId', 'isLatest', 'deletedAt'])
@Index(['tenantId', 'projectId', 'deletedAt'])
@Index(['tenantId', 'decisionId', 'deletedAt'])
@Index(['parentArticleId'])
@Index(['supersededById'])
export class KnowledgeArticle extends IndustrialBaseEntity {
  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'varchar', length: 300, unique: true })
  slug: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  @Index()
  categoryId: string | null;

  @Column({ name: 'article_type', type: 'enum', enum: ArticleType, default: ArticleType.PROCEDURE })
  articleType: ArticleType;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'summary', type: 'text', nullable: true })
  summary: string | null;

  @Column({ name: 'tags', type: 'jsonb', nullable: true })
  tags: string[] | null;

  @Column({ name: 'related_modules', type: 'jsonb', nullable: true })
  relatedModules: string[] | null;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  @Column({ name: 'helpful_count', type: 'int', default: 0 })
  helpfulCount: number;

  @Column({ name: 'not_helpful_count', type: 'int', default: 0 })
  notHelpfulCount: number;

  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  @Index()
  authorId: string | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'last_reviewed_at', type: 'date', nullable: true })
  lastReviewedAt: Date | null;

  @Column({ name: 'review_due_date', type: 'date', nullable: true })
  reviewDueDate: Date | null;

  @Column({ type: 'enum', enum: ArticleStatus, default: ArticleStatus.DRAFT })
  status: ArticleStatus;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @Column({ name: 'is_latest', type: 'boolean', default: true })
  isLatest: boolean;

  @Column({ name: 'parent_article_id', type: 'uuid', nullable: true })
  parentArticleId: string | null;

  @ManyToOne(() => KnowledgeArticle, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_article_id' })
  parentArticle?: KnowledgeArticle | null;

  @Column({ name: 'superseded_by_id', type: 'uuid', nullable: true })
  supersededById: string | null;

  @ManyToOne(() => KnowledgeArticle, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'superseded_by_id' })
  supersededBy?: KnowledgeArticle | null;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ name: 'decision_id', type: 'uuid', nullable: true })
  decisionId: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'access_roles', type: 'jsonb', nullable: true })
  accessRoles: string[] | null;

  @Column({ name: 'seo_keywords', type: 'jsonb', nullable: true })
  seoKeywords: string[] | null;
}