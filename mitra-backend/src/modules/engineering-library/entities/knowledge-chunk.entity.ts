import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { AuthorityStatus } from '../types/engineering-library-scan.types';

export enum ChunkEmbeddingStatus {
  PENDING = 'PENDING',
  EMBEDDED = 'EMBEDDED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

@Entity('knowledge_chunks')
@Index(['tenantId', 'contentHash'], { unique: true })
@Index(['tenantId', 'entityId', 'chunkType', 'chunkOrdinal'], { unique: true })
@Index(['tenantId', 'projectNumber'])
@Index(['tenantId', 'entityType'])
@Index(['tenantId', 'embeddingStatus'])
export class KnowledgeChunk extends IndustrialBaseEntity {
  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  @Index()
  sourceId: string | null;

  @Column({ name: 'source_type', type: 'varchar', length: 50, default: 'DATABASE_RECORD' })
  sourceType: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 100 })
  @Index()
  entityId: string;

  @Column({ name: 'chunk_type', type: 'varchar', length: 50 })
  chunkType: string;

  @Column({ name: 'chunk_ordinal', type: 'int', default: 0 })
  chunkOrdinal: number;

  @Column({ name: 'project_number', type: 'varchar', length: 50, nullable: true })
  projectNumber: string | null;

  @Column({ name: 'project_prefix', type: 'varchar', length: 20, nullable: true })
  projectPrefix: string | null;

  @Column({ name: 'customer', type: 'varchar', length: 200, nullable: true })
  customer: string | null;

  @Column({ name: 'machine', type: 'varchar', length: 100, nullable: true })
  machine: string | null;

  @Column({ name: 'material', type: 'varchar', length: 100, nullable: true })
  material: string | null;

  @Column({ name: 'revision', type: 'varchar', length: 30, nullable: true })
  revision: string | null;

  @Column({ name: 'authority_status', type: 'varchar', length: 50, default: AuthorityStatus.AUTHORITATIVE_RELEASE })
  authorityStatus: AuthorityStatus;

  @Column({ name: 'relative_path', type: 'varchar', length: 500, nullable: true })
  relativePath: string | null;

  @Column({ name: 'source_file', type: 'varchar', length: 300, nullable: true })
  sourceFile: string | null;

  @Column({ name: 'source_sheet', type: 'varchar', length: 100, nullable: true })
  sourceSheet: string | null;

  @Column({ name: 'source_row', type: 'int', nullable: true })
  sourceRow: number | null;

  @Column({ name: 'source_page', type: 'int', nullable: true })
  sourcePage: number | null;

  @Column({ name: 'content_hash', type: 'varchar', length: 64 })
  contentHash: string;

  @Column({ name: 'chunk_text', type: 'text' })
  chunkText: string;

  @Column({ name: 'structured_metadata', type: 'jsonb', nullable: true })
  structuredMetadata: Record<string, any> | null;

  @Column({ name: 'embedding_status', type: 'varchar', length: 50, default: ChunkEmbeddingStatus.PENDING })
  embeddingStatus: ChunkEmbeddingStatus;

  @Column({ name: 'embedding_model', type: 'varchar', length: 100, default: 'nomic-embed-text' })
  embeddingModel: string;

  @Column({ name: 'embedded_at', type: 'timestamptz', nullable: true })
  embeddedAt: Date | null;

  @Column({ name: 'error_reason', type: 'text', nullable: true })
  errorReason: string | null;
}
