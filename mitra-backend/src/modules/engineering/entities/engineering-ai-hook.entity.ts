import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

/**
 * AI-readiness hook registry. These rows define the extensible integration
 * points for future AI capabilities (similar drawing search, BOM
 * recommendations, material suggestions, design rule validation, knowledge
 * extraction, document indexing, embeddings, knowledge graph). No inference
 * is performed by the platform — hooks are prepared, configured and can be
 * toggled on by the AI layer.
 */
@Entity('engineering_ai_hooks')
@Index(['hookCode', 'deletedAt'])
export class EngineeringAiHook extends IndustrialBaseEntity {
  /** e.g. SIMILAR_DRAWING_SEARCH, BOM_RECOMMENDATION, MATERIAL_SUGGESTION … */
  @Column({ name: 'hook_code', type: 'varchar', length: 50 })
  @Index()
  hookCode: string;

  @Column({ name: 'hook_name', type: 'varchar', length: 200 })
  hookName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Domain event type that triggers this hook. */
  @Column({ name: 'event_type', type: 'varchar', length: 100, nullable: true })
  eventType: string | null;

  /** Prepared but not active by default — flipped by the AI layer. */
  @Column({ name: 'is_enabled', type: 'boolean', default: false })
  isEnabled: boolean;

  /** Placeholder configuration (model endpoint, embedding field, …). */
  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any> | null;

  @Column({ name: 'last_invoked_at', type: 'timestamptz', nullable: true })
  lastInvokedAt: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'invocation_count', type: 'int', default: 0 })
  invocationCount: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
