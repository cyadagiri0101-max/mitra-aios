import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('knowledge_graph_edges')
@Index(['tenantId', 'sourceType', 'sourceId', 'targetType', 'targetId'])
@Index(['relationshipType', 'deletedAt'])
export class KnowledgeGraphEdge extends IndustrialBaseEntity {
  @Column({ name: 'source_type', type: 'varchar', length: 80 })
  sourceType: string;

  @Column({ name: 'source_id', type: 'uuid' })
  @Index()
  sourceId: string;

  @Column({ name: 'target_type', type: 'varchar', length: 80 })
  targetType: string;

  @Column({ name: 'target_id', type: 'uuid' })
  @Index()
  targetId: string;

  @Column({ name: 'relationship_type', type: 'varchar', length: 80 })
  relationshipType: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
