import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ArticleStatus { DRAFT='DRAFT', UNDER_REVIEW='UNDER_REVIEW', PUBLISHED='PUBLISHED', ARCHIVED='ARCHIVED' }
export enum ArticleType { PROCEDURE='PROCEDURE', TROUBLESHOOTING='TROUBLESHOOTING', BEST_PRACTICE='BEST_PRACTICE', STANDARD='STANDARD', LESSON_LEARNED='LESSON_LEARNED', FAQ='FAQ' }

@Entity('knowledge_articles')
@Index(['slug', 'deletedAt'])
@Index(['categoryId', 'status', 'deletedAt'])
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

  @Column({ name: 'access_roles', type: 'jsonb', nullable: true })
  accessRoles: string[] | null;

  @Column({ name: 'seo_keywords', type: 'jsonb', nullable: true })
  seoKeywords: string[] | null;
}