import { Entity, Column, VersionColumn, Index  } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

/**
 * AI-readiness store for the Commercial Domain.
 *
 * No inference is performed here. This table holds document metadata,
 * an embeddings placeholder, knowledge references, customer context and
 * project references so future AI integrations (recommendations, RFQ
 * summarization, quotation margin guidance, customer 360 insights) have
 * a stable, indexed read model without touching transactional tables.
 */
@Entity('ai_document_metadata')
@Index(['entityType', 'entityId', 'deletedAt'])
export class AiDocumentMetadata extends IndustrialBaseEntity {
  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  @Index()
  entityId: string;

  @Column({ name: 'document_metadata', type: 'jsonb', nullable: true })
  documentMetadata: Record<string, unknown> | null;

  @Column({ name: 'embedding_placeholder', type: 'jsonb', nullable: true })
  embeddingPlaceholder: Record<string, unknown> | null;

  @Column({ name: 'knowledge_refs', type: 'jsonb', nullable: true })
  knowledgeRefs: Record<string, unknown>[] | null;

  @Column({ name: 'customer_context', type: 'jsonb', nullable: true })
  customerContext: Record<string, unknown> | null;

  @Column({ name: 'project_refs', type: 'jsonb', nullable: true })
  projectRefs: Record<string, unknown>[] | null;

  @Column({ name: 'synced_at', type: 'timestamptz', default: () => 'now()' })
  syncedAt: Date;

  @VersionColumn()
  version: number;
}
