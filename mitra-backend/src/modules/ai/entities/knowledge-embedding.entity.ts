import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum EmbeddingEntityType {
  TRIAL        = 'trial',
  CAPA         = 'capa',
  PROJECT      = 'project',
  KNOWLEDGE    = 'knowledge',
  SERVICE      = 'service',
  WORK_ORDER   = 'work_order',
  // Commercial domain (Sprint 3, P1-2): indexed from outbox events + full sync.
  CUSTOMER     = 'customer',
  ENQUIRY      = 'enquiry',
  QUOTATION    = 'quotation',
  SALES_ORDER  = 'sales_order',
  INVOICE      = 'invoice',
  PAYMENT      = 'payment',
  CREDIT_NOTE  = 'credit_note',
}

/**
 * Stores pgvector embeddings for MITRA entities.
 * Vector dimension: 768 (nomic-embed-text / mxbai-embed-large).
 * Used for semantic search, trial intelligence, and RAG context retrieval.
 */
@Entity('knowledge_embeddings')
@Index(['tenantId', 'entityType', 'entityId'])
@Index(['contentHash'])
export class KnowledgeEmbedding extends IndustrialBaseEntity {
  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: EmbeddingEntityType;

  @Column({ name: 'entity_id', type: 'uuid' })
  @Index()
  entityId: string;

  /** SHA-256 of content_text — skip re-embedding if hash unchanged */
  @Column({ name: 'content_hash', type: 'varchar', length: 64 })
  contentHash: string;

  /** The text that was embedded (for display / debug) */
  @Column({ name: 'content_text', type: 'text' })
  contentText: string;

  /**
   * The actual embedding vector.
   * TypeORM does not have a built-in vector type; we use 'simple-array' for
   * storage and cast to/from the pgvector type via raw SQL in VectorSearchService.
   * The column is marked nullable to allow the row to be inserted before the
   * async embedding call completes.
   */
  @Column({ type: 'text', nullable: true, select: false })
  embedding: string | null;

  @Column({ name: 'model_name', type: 'varchar', length: 100, default: 'nomic-embed-text' })
  modelName: string;

  /** Arbitrary metadata (e.g. project_number, trial_date, product_name) */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}