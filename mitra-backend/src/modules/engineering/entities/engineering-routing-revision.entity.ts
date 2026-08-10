import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

/**
 * Immutable revision snapshot of a Process Routing (G-4). Every release /
 * version bump stores a full JSON snapshot of the routing + operations,
 * enabling compare, audit history and rollback.
 */
@Entity('engineering_routing_revisions')
@Index(['routingId', 'deletedAt'])
export class EngineeringRoutingRevision extends IndustrialBaseEntity {
  @Column({ name: 'routing_id', type: 'uuid' })
  @Index()
  routingId: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  /** Full snapshot: { routing: {...}, operations: [...] }. */
  @Column({ type: 'jsonb' })
  snapshot: Record<string, any>;

  @Column({ name: 'change_summary', type: 'text', nullable: true })
  changeSummary: string | null;

  @Column({ name: 'released_by', type: 'uuid', nullable: true })
  releasedBy: string | null;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt: Date | null;
}
