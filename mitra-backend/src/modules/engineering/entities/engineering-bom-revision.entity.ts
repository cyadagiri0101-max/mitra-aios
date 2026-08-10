import { Entity, Column, Index, PrimaryColumn } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

/**
 * Immutable revision snapshot of an Engineering BOM. Every release / revision
 * bump stores a full JSON snapshot of the BOM + items, enabling compare
 * revisions, audit history and rollback.
 */
@Entity('engineering_bom_revisions')
@Index(['bomId', 'deletedAt'])
export class EngineeringBomRevision extends IndustrialBaseEntity {
  @Column({ name: 'bom_id', type: 'uuid' })
  @Index()
  bomId: string;

  @Column({ type: 'varchar', length: 10 })
  revision: string;

  @Column({ name: 'version_number', type: 'int', default: 1 })
  versionNumber: number;

  /** Full snapshot: { bom: {...}, items: [...] }. */
  @Column({ type: 'jsonb' })
  snapshot: Record<string, any>;

  @Column({ name: 'total_cost', type: 'decimal', precision: 18, scale: 2, nullable: true })
  totalCost: number | null;

  @Column({ name: 'change_summary', type: 'text', nullable: true })
  changeSummary: string | null;

  @Column({ name: 'released_by', type: 'uuid', nullable: true })
  releasedBy: string | null;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt: Date | null;
}
