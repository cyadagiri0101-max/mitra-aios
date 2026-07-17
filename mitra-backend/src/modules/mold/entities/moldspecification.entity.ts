import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('mold_specifications')
@Index(['moldId', 'specCategory', 'deletedAt'])
export class MoldSpecification extends IndustrialBaseEntity {
  @Column({ name: 'mold_id', type: 'uuid' })
  moldId: string;

  @Column({ name: 'spec_category', type: 'varchar', length: 50 })
  specCategory: string;

  @Column({ name: 'spec_name', type: 'varchar', length: 200 })
  specName: string;

  @Column({ name: 'spec_value', type: 'varchar', length: 200 })
  specValue: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  unit: string | null;

  @Column({ name: 'nominal_value', type: 'decimal', precision: 12, scale: 4, nullable: true })
  nominalValue: number | null;

  @Column({ name: 'upper_limit', type: 'decimal', precision: 12, scale: 4, nullable: true })
  upperLimit: number | null;

  @Column({ name: 'lower_limit', type: 'decimal', precision: 12, scale: 4, nullable: true })
  lowerLimit: number | null;

  @Column({ name: 'is_critical', type: 'boolean', default: false })
  isCritical: boolean;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}