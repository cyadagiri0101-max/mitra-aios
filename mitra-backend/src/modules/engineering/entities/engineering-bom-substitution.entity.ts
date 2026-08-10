import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum SubstitutionType {
  SUBSTITUTE = 'SUBSTITUTE',
  ALTERNATE = 'ALTERNATE',
}

export enum SubstitutionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
}

/**
 * BOM item substitution (G-3). A primary BOM item may have one or more
 * substitutes/alternates with effectivity windows, priority and approval.
 */
@Entity('engineering_bom_substitutions')
@Index(['bomId', 'deletedAt'])
@Index(['bomItemId', 'status', 'deletedAt'])
export class EngineeringBomSubstitution extends IndustrialBaseEntity {
  @Column({ name: 'bom_id', type: 'uuid' })
  @Index()
  bomId: string;

  /** Primary BOM line item. */
  @Column({ name: 'bom_item_id', type: 'uuid' })
  @Index()
  bomItemId: string;

  /** Substitute BOM line item. */
  @Column({ name: 'substitute_item_id', type: 'uuid' })
  @Index()
  substituteItemId: string;

  @Column({ name: 'substitution_type', type: 'varchar', length: 20, default: SubstitutionType.SUBSTITUTE })
  substitutionType: SubstitutionType;

  /** 1 = first choice substitute, 2 = second choice, … */
  @Column({ type: 'int', default: 1 })
  priority: number;

  @Column({ name: 'effective_from', type: 'date', nullable: true })
  effectiveFrom: Date | null;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo: Date | null;

  @Column({ type: 'varchar', length: 30, default: SubstitutionStatus.ACTIVE })
  status: SubstitutionStatus;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'restriction_notes', type: 'text', nullable: true })
  restrictionNotes: string | null;
}
