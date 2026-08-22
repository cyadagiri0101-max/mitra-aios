import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ObservationType {
  OPERATOR_NOTE = 'OPERATOR_NOTE',
  TRIAL_ANOMALY = 'TRIAL_ANOMALY',
  PARAMETER_DRIFT = 'PARAMETER_DRIFT',
  DOWNTIME_EVENT = 'DOWNTIME_EVENT',
  TOOL_WEAR = 'TOOL_WEAR',
}

export enum ObservationSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('manufacturing_observations')
@Index(['tenantId', 'machineId'])
@Index(['tenantId', 'workOrderId'])
@Index(['tenantId', 'trialId'])
export class ManufacturingObservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'observation_type',
    default: ObservationType.OPERATOR_NOTE,
  })
  observationType: string;

  @Column({ type: 'varchar', length: 50, default: 'OPERATOR' })
  source: string;

  @Column({ type: 'uuid', name: 'machine_id', nullable: true })
  machineId: string | null;

  @Column({ type: 'uuid', name: 'work_order_id', nullable: true })
  workOrderId: string | null;

  @Column({ type: 'uuid', name: 'operation_id', nullable: true })
  operationId: string | null;

  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId: string | null;

  @Column({ type: 'uuid', name: 'trial_id', nullable: true })
  trialId: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: ObservationSeverity.MEDIUM,
  })
  severity: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', default: {} })
  metrics: Record<string, any>;

  @Column({ type: 'boolean', name: 'is_quarantined', default: false })
  isQuarantined: boolean;

  @Column({ type: 'uuid', name: 'created_by_user_id', nullable: true })
  createdByUserId: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
