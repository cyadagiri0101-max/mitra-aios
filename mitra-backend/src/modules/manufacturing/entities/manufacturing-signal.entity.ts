import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ManufacturingSignalType {
  CYCLE_TIME = 'CYCLE_TIME',
  TEMPERATURE = 'TEMPERATURE',
  PRESSURE = 'PRESSURE',
  VIBRATION = 'VIBRATION',
  RPM = 'RPM',
  SPINDLE_LOAD = 'SPINDLE_LOAD',
  POWER_KW = 'POWER_KW',
  DEFECT_COUNT = 'DEFECT_COUNT',
}

export enum ManufacturingSignalSource {
  MACHINE_TELEMETRY = 'MACHINE_TELEMETRY',
  OPERATOR_OBSERVATION = 'OPERATOR_OBSERVATION',
  PRODUCTION_TRANSACTION = 'PRODUCTION_TRANSACTION',
  TRIAL_OBSERVATION = 'TRIAL_OBSERVATION',
  QUALITY_MEASUREMENT = 'QUALITY_MEASUREMENT',
  IMPORTED_TELEMETRY = 'IMPORTED_TELEMETRY',
  DERIVED_METRIC = 'DERIVED_METRIC',
  AI_INFERENCE = 'AI_INFERENCE',
}

export enum SignalQualityStatus {
  VALID = 'VALID',
  INVALID = 'INVALID',
  OUT_OF_RANGE = 'OUT_OF_RANGE',
  DUPLICATE = 'DUPLICATE',
  LATE = 'LATE',
  UNCORRELATED = 'UNCORRELATED',
  QUARANTINED = 'QUARANTINED',
}

@Entity('manufacturing_signals')
@Index(['tenantId', 'machineId', 'eventTimestamp'])
@Index(['tenantId', 'workOrderId'])
@Index(['tenantId', 'status'])
export class ManufacturingSignal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ type: 'varchar', length: 100, name: 'source_id' })
  sourceId: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'source_type',
    default: ManufacturingSignalSource.MACHINE_TELEMETRY,
  })
  sourceType: string;

  @Column({ type: 'varchar', length: 100, name: 'signal_type' })
  signalType: string;

  @Column({ type: 'numeric', precision: 14, scale: 4 })
  value: number;

  @Column({ type: 'varchar', length: 50 })
  unit: string;

  @Column({ type: 'uuid', name: 'machine_id', nullable: true })
  machineId: string | null;

  @Column({ type: 'uuid', name: 'work_order_id', nullable: true })
  workOrderId: string | null;

  @Column({ type: 'uuid', name: 'operation_id', nullable: true })
  operationId: string | null;

  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    default: SignalQualityStatus.VALID,
  })
  status: string;

  @Column({ type: 'timestamptz', name: 'event_timestamp' })
  eventTimestamp: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'ingested_at' })
  ingestedAt: Date;

  @Column({ type: 'varchar', length: 100, name: 'correlation_id', nullable: true })
  correlationId: string | null;

  @Column({ type: 'jsonb', name: 'raw_payload', default: {} })
  rawPayload: Record<string, any>;
}
