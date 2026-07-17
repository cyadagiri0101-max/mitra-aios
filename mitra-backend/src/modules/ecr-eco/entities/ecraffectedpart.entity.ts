import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('ecr_affected_parts')
@Index(['ecrId', 'deletedAt'])
export class EcrAffectedPart extends IndustrialBaseEntity {
  @Column({ name: 'ecr_id', type: 'uuid' })
  ecrId: string;

  @Column({ name: 'part_id', type: 'uuid', nullable: true })
  @Index()
  partId: string | null;

  @Column({ name: 'part_number', type: 'varchar', length: 50 })
  partNumber: string;

  @Column({ name: 'part_name', type: 'varchar', length: 200 })
  partName: string;

  @Column({ name: 'current_revision', type: 'varchar', length: 10, nullable: true })
  currentRevision: string | null;

  @Column({ name: 'new_revision', type: 'varchar', length: 10, nullable: true })
  newRevision: string | null;

  @Column({ name: 'change_description', type: 'text' })
  changeDescription: string;

  @Column({ name: 'disposition', type: 'varchar', length: 50, nullable: true })
  disposition: string | null;

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: Date | null;

  @Column({ name: 'is_critical', type: 'boolean', default: false })
  isCritical: boolean;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}