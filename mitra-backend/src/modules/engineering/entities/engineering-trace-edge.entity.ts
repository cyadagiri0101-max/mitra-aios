import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

/**
 * Generic cross-artifact traceability edge (G-1). Connects any two
 * engineering/manufacturing/quality artifacts (drawing → BOM item → work
 * order → inspection report …) with an explicit relation type, enabling the
 * traceability graph and impact queries.
 */
@Entity('engineering_trace_edges')
@Index(['sourceEntityType', 'sourceEntityId', 'deletedAt'])
@Index(['targetEntityType', 'targetEntityId', 'deletedAt'])
@Index(['projectId', 'deletedAt'])
export class EngineeringTraceEdge extends IndustrialBaseEntity {
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ name: 'source_entity_type', type: 'varchar', length: 50 })
  sourceEntityType: string;

  @Column({ name: 'source_entity_id', type: 'uuid' })
  sourceEntityId: string;

  @Column({ name: 'target_entity_type', type: 'varchar', length: 50 })
  targetEntityType: string;

  @Column({ name: 'target_entity_id', type: 'uuid' })
  targetEntityId: string;

  /** e.g. DERIVES_FROM, MANUFACTURES, VERIFIED_BY, SUBSTITUTES … */
  @Column({ name: 'relation_type', type: 'varchar', length: 30 })
  relationType: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
