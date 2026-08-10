import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export type AiPromptStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

/**
 * DB-backed prompt registry record (Sprint 2.8.2 Phase 2).
 * Matches the ai_prompt_templates table created in Migration 0033.
 * Unique per (key, version, locale); lifecycle DRAFT → PUBLISHED → ARCHIVED.
 */
@Entity('ai_prompt_templates')
@Index(['category', 'status', 'deletedAt'])
export class AiPromptTemplate extends IndustrialBaseEntity {
  @Column({ type: 'varchar', length: 150 })
  key: string;

  @Column({ type: 'varchar', length: 20, default: 'v1' })
  version: string;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  locale: string;

  @Column({ type: 'varchar', length: 50, default: 'general' })
  category: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  task: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text' })
  template: string;

  @Column({ type: 'jsonb', default: () => `'[]'` })
  variables: string[];

  @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
  status: AiPromptStatus;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
