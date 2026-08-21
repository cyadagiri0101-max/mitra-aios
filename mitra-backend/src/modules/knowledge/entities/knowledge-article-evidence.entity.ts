import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { KnowledgeArticle } from './knowledgearticle.entity';
import { KnowledgeChunk } from '../../engineering-library/entities/knowledge-chunk.entity';

@Entity('knowledge_article_evidence')
@Index(['tenantId', 'articleId', 'deletedAt'])
@Index(['tenantId', 'chunkId', 'deletedAt'])
@Index(['tenantId', 'articleId', 'chunkId'], { unique: true })
export class KnowledgeArticleEvidence extends IndustrialBaseEntity {
  @Column({ name: 'article_id', type: 'uuid' })
  @Index()
  articleId: string;

  @ManyToOne(() => KnowledgeArticle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article?: KnowledgeArticle;

  @Column({ name: 'chunk_id', type: 'uuid' })
  @Index()
  chunkId: string;

  @ManyToOne(() => KnowledgeChunk, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chunk_id' })
  chunk?: KnowledgeChunk;

  @Column({ name: 'sequence_number', type: 'int', default: 1 })
  sequenceNumber: number;

  @Column({ name: 'citation_label', type: 'varchar', length: 30 })
  citationLabel: string;

  @Column({ name: 'source_file', type: 'varchar', length: 300, nullable: true })
  sourceFile: string | null;

  @Column({ name: 'source_sheet', type: 'varchar', length: 100, nullable: true })
  sourceSheet: string | null;

  @Column({ name: 'source_row', type: 'int', nullable: true })
  sourceRow: number | null;

  @Column({ name: 'source_page', type: 'int', nullable: true })
  sourcePage: number | null;

  @Column({ name: 'source_coordinate', type: 'varchar', length: 200, nullable: true })
  sourceCoordinate: string | null;

  @Column({ name: 'authority_status', type: 'varchar', length: 50, nullable: true })
  authorityStatus: string | null;

  @Column({ name: 'entity_type', type: 'varchar', length: 50, nullable: true })
  entityType: string | null;

  @Column({ name: 'project_number', type: 'varchar', length: 50, nullable: true })
  projectNumber: string | null;

  @Column({ name: 'content_hash', type: 'varchar', length: 64, nullable: true })
  contentHash: string | null;
}
