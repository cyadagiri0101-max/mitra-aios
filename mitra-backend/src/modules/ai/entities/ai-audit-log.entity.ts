import {
  Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn,
} from 'typeorm';

/**
 * Immutable AI audit trail record (Sprint 2.8.2 Phase 6).
 * Matches the ai_audit_logs table created in Migration 0033.
 * Append-only: no updates, no soft delete — every orchestrated AI
 * request is accountable.
 */
@Entity('ai_audit_logs')
export class AiAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt: Date;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  @Index()
  tenantId: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'user_role', type: 'varchar', length: 50, nullable: true })
  userRole: string | null;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  domain: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  task: string | null;

  @Column({ name: 'prompt_template', type: 'varchar', length: 150, nullable: true })
  promptTemplate: string | null;

  @Column({ name: 'prompt_version', type: 'varchar', length: 20, nullable: true })
  promptVersion: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string | null;

  @Column({ name: 'tools_executed', type: 'jsonb', default: () => `'[]'` })
  toolsExecuted: string[];

  @Column({ name: 'citation_count', type: 'int', default: 0 })
  citationCount: number;

  @Column({ type: 'numeric', precision: 5, scale: 4, nullable: true })
  confidence: number | null;

  @Column({ name: 'input_hash', type: 'varchar', length: 64, nullable: true })
  inputHash: string | null;

  @Column({ name: 'injection_flagged', type: 'boolean', default: false })
  injectionFlagged: boolean;

  @Column({ name: 'processing_ms', type: 'int', nullable: true })
  processingMs: number | null;

  @Column({ type: 'varchar', length: 20, default: 'SUCCESS' })
  status: string;

  @Column({ type: 'text', nullable: true })
  error: string | null;
}
