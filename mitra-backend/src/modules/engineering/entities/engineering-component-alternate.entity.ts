import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

/**
 * Alternate / substitute component relationship. SUBSTITUTE = interchangeable
 * drop-in; ALTERNATE = acceptable with approval.
 */
@Entity('engineering_component_alternates')
@Index(['componentId', 'deletedAt'])
export class EngineeringComponentAlternate extends IndustrialBaseEntity {
  @Column({ name: 'component_id', type: 'uuid' })
  @Index()
  componentId: string;

  @Column({ name: 'alternate_component_id', type: 'uuid' })
  @Index()
  alternateComponentId: string;

  @Column({ name: 'relation_type', type: 'varchar', length: 20, default: 'SUBSTITUTE' })
  relationType: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
