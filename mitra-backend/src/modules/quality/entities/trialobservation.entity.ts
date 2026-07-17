import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum TrialType { INTERNAL='INTERNAL', CUSTOMER='CUSTOMER', RETRIAL='RETRIAL' }
export enum TrialResult { PASS='PASS', FAIL='FAIL', CONDITIONAL='CONDITIONAL', PENDING='PENDING' }

@Entity('trial_observations')
@Index(['trialNumber', 'deletedAt'])
@Index(['projectId', 'trialType', 'deletedAt'])
export class TrialObservation extends IndustrialBaseEntity {
  @Column({ name: 'trial_number', type: 'varchar', length: 30, unique: true })
  trialNumber: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'trial_sequence', type: 'int', default: 1 })
  trialSequence: number;

  @Column({ name: 'trial_type', type: 'enum', enum: TrialType, default: TrialType.INTERNAL })
  trialType: TrialType;

  @Column({ name: 'trial_date', type: 'date' })
  trialDate: Date;

  @Column({ name: 'shift', type: 'varchar', length: 20, nullable: true })
  shift: string | null;

  @Column({ name: 'machine_id', type: 'uuid', nullable: true })
  @Index()
  machineId: string | null;

  @Column({ name: 'mold_temperature_c', type: 'decimal', precision: 6, scale: 1, nullable: true })
  moldTemperatureC: number | null;

  @Column({ name: 'material_temperature_c', type: 'decimal', precision: 6, scale: 1, nullable: true })
  materialTemperatureC: number | null;

  @Column({ name: 'injection_pressure_bar', type: 'decimal', precision: 8, scale: 2, nullable: true })
  injectionPressureBar: number | null;

  @Column({ name: 'cycle_time_seconds', type: 'decimal', precision: 6, scale: 2, nullable: true })
  cycleTimeSeconds: number | null;

  @Column({ name: 'shots_taken', type: 'int', default: 0 })
  shotsTaken: number;

  @Column({ name: 'good_parts', type: 'int', default: 0 })
  goodParts: number;

  @Column({ name: 'rejected_parts', type: 'int', default: 0 })
  rejectedParts: number;

  @Column({ name: 'observations', type: 'text', nullable: true })
  observations: string | null;

  @Column({ name: 'defects_observed', type: 'jsonb', nullable: true })
  defectsObserved: string[] | null;

  @Column({ name: 'corrective_actions', type: 'text', nullable: true })
  correctiveActions: string | null;

  @Column({ type: 'enum', enum: TrialResult, default: TrialResult.PENDING })
  result: TrialResult;

  @Column({ name: 'conducted_by', type: 'uuid', nullable: true })
  conductedBy: string | null;

  @Column({ name: 'witnessed_by', type: 'uuid', nullable: true })
  witnessedBy: string | null;

  @Column({ name: 'customer_representative', type: 'varchar', length: 100, nullable: true })
  customerRepresentative: string | null;

  @Column({ name: 'next_action', type: 'text', nullable: true })
  nextAction: string | null;
}