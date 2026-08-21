import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { KnowledgeIngestionBatch } from './knowledge-ingestion-batch.entity';

export enum IngestionItemStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED',
}

@Entity('knowledge_ingestion_items')
@Index(['tenantId', 'batchId', 'status'])
@Index(['tenantId', 'sourceIdentifier'])
export class KnowledgeIngestionItem extends IndustrialBaseEntity {
  @Column({ name: 'batch_id', type: 'uuid' })
  @Index()
  batchId: string;

  @ManyToOne(() => KnowledgeIngestionBatch, (b) => b.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch: KnowledgeIngestionBatch;

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  @Index()
  sourceId: string | null;

  @Column({ name: 'source_identifier', type: 'varchar', length: 300 })
  sourceIdentifier: string;

  @Column({ name: 'source_type', type: 'varchar', length: 50, default: 'DATABASE_TABLE' })
  sourceType: string;

  @Column({ type: 'varchar', length: 50, default: IngestionItemStatus.QUEUED })
  status: IngestionItemStatus;

  @Column({ name: 'attempt_count', type: 'int', default: 1 })
  attemptCount: number;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'records_created', type: 'int', default: 0 })
  recordsCreated: number;

  @Column({ name: 'records_updated', type: 'int', default: 0 })
  recordsUpdated: number;

  @Column({ name: 'records_skipped', type: 'int', default: 0 })
  recordsSkipped: number;

  @Column({ name: 'error_code', type: 'varchar', length: 100, nullable: true })
  errorCode: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
