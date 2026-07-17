import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('trial_measurements')
@Index(['trialId', 'deletedAt'])
export class TrialMeasurement extends IndustrialBaseEntity {
  @Column({ name: 'trial_id', type: 'uuid' })
  trialId: string;

  @Column({ name: 'parameter_name', type: 'varchar', length: 200 })
  parameterName: string;

  @Column({ name: 'parameter_category', type: 'varchar', length: 50, nullable: true })
  parameterCategory: string | null;

  @Column({ name: 'nominal_value', type: 'decimal', precision: 12, scale: 4, nullable: true })
  nominalValue: number | null;

  @Column({ name: 'upper_tolerance', type: 'decimal', precision: 12, scale: 4, nullable: true })
  upperTolerance: number | null;

  @Column({ name: 'lower_tolerance', type: 'decimal', precision: 12, scale: 4, nullable: true })
  lowerTolerance: number | null;

  @Column({ name: 'actual_value', type: 'decimal', precision: 12, scale: 4, nullable: true })
  actualValue: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  unit: string | null;

  @Column({ name: 'measuring_instrument', type: 'varchar', length: 100, nullable: true })
  measuringInstrument: string | null;

  @Column({ name: 'is_critical', type: 'boolean', default: false })
  isCritical: boolean;

  @Column({ name: 'pass_fail', type: 'varchar', length: 10, nullable: true })
  passFail: string | null;

  @Column({ name: 'measured_by', type: 'uuid', nullable: true })
  measuredBy: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}