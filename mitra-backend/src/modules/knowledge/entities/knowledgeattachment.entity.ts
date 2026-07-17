import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('knowledge_attachments')
@Index(['articleId', 'deletedAt'])
export class KnowledgeAttachment extends IndustrialBaseEntity {
  @Column({ name: 'article_id', type: 'uuid' })
  articleId: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes: number | null;

  @Column({ name: 'minio_bucket', type: 'varchar', length: 100 })
  minioBucket: string;

  @Column({ name: 'minio_key', type: 'varchar', length: 500 })
  minioKey: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_inline', type: 'boolean', default: false })
  isInline: boolean;
}