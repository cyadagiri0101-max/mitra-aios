import { Entity, Column, Index, OneToMany } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { KnowledgeIngestionItem } from './knowledge-ingestion-item.entity';

export enum IngestionBatchStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('knowledge_ingestion_batches')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'startedAt'])
export class KnowledgeIngestionBatch extends IndustrialBaseEntity {
  @Column({ name: 'scan_batch_id', type: 'varchar', length: 100, nullable: true })
  scanBatchId: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'varchar', length: 50, default: IngestionBatchStatus.QUEUED })
  status: IngestionBatchStatus;

  @Column({ name: 'total_candidates', type: 'int', default: 0 })
  totalCandidates: number;

  @Column({ name: 'processed', type: 'int', default: 0 })
  processed: number;

  @Column({ name: 'succeeded', type: 'int', default: 0 })
  succeeded: number;

  @Column({ name: 'failed', type: 'int', default: 0 })
  failed: number;

  @Column({ name: 'skipped', type: 'int', default: 0 })
  skipped: number;

  @Column({ name: 'records_created', type: 'int', default: 0 })
  recordsCreated: number;

  @Column({ name: 'records_updated', type: 'int', default: 0 })
  recordsUpdated: number;

  @Column({ name: 'error_summary', type: 'text', nullable: true })
  errorSummary: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @OneToMany(() => KnowledgeIngestionItem, (item) => item.batch)
  items: KnowledgeIngestionItem[];
}
