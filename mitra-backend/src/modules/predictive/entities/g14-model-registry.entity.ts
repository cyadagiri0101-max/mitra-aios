import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export enum ModelCapability {
  DELAY_PREDICTION = 'DELAY_PREDICTION',
  CAPACITY_FORECAST = 'CAPACITY_FORECAST',
  BOTTLENECK_FORECAST = 'BOTTLENECK_FORECAST',
}

export enum ModelLifecycleStatus {
  TRAINED = 'TRAINED',
  EVALUATED = 'EVALUATED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  RETIRED = 'RETIRED',
  ROLLED_BACK = 'ROLLED_BACK',
  REJECTED = 'REJECTED',
}

@Entity('g14_model_registry')
@Index(['tenantId', 'modelVersion'])
@Index(['tenantId', 'capability', 'status'])
export class G14ModelRegistry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'model_family',
    default: 'G14_PREDICTIVE',
  })
  modelFamily: string;

  @Column({
    type: 'enum',
    enum: ModelCapability,
    name: 'capability',
  })
  capability: ModelCapability;

  @Column({ type: 'varchar', length: 100, name: 'model_version' })
  modelVersion: string;

  @Column({ type: 'varchar', length: 50, name: 'feature_version' })
  featureVersion: string;

  @Column({ type: 'varchar', length: 50, name: 'model_type' })
  modelType: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'algorithm',
    default: 'RIDGE_REGRESSION',
  })
  algorithm: string;

  @Column({ type: 'jsonb' })
  weights: number[];

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 4,
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => Number(v),
    },
  })
  intercept: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 4,
    name: 'residual_std_dev',
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => Number(v),
    },
  })
  residualStdDev: number;

  @Column({ type: 'jsonb', name: 'hyperparameters', nullable: true })
  hyperparameters: Record<string, any> | null;

  @Column({ type: 'jsonb', name: 'evaluation_metrics' })
  evaluationMetrics: Record<string, any>;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'uncertainty_method',
    default: 'RESIDUAL_PREDICTION_INTERVAL',
  })
  uncertaintyMethod: string;

  @Column({
    type: 'enum',
    enum: ModelLifecycleStatus,
    name: 'status',
    default: ModelLifecycleStatus.TRAINED,
  })
  status: ModelLifecycleStatus;

  @Column({ type: 'varchar', length: 64, name: 'provenance_hash' })
  provenanceHash: string;

  @Column({ type: 'varchar', length: 64, name: 'training_dataset_hash', nullable: true })
  trainingDatasetHash: string | null;

  @Column({ type: 'varchar', length: 64, name: 'artifact_hash' })
  artifactHash: string;

  @Column({ type: 'int', name: 'training_sample_count', default: 0 })
  trainingSampleCount: number;

  @Column({ type: 'int', name: 'validation_sample_count', default: 0 })
  validationSampleCount: number;

  @Column({ type: 'int', name: 'test_sample_count', default: 0 })
  testSampleCount: number;

  @Column({
    type: 'timestamptz',
    name: 'training_window_start',
    nullable: true,
  })
  trainingWindowStart: Date | null;

  @Column({
    type: 'timestamptz',
    name: 'training_window_end',
    nullable: true,
  })
  trainingWindowEnd: Date | null;

  @Column({ type: 'varchar', length: 100, name: 'approved_by', nullable: true })
  approvedBy: string | null;

  @Column({ type: 'text', name: 'approval_notes', nullable: true })
  approvalNotes: string | null;

  @Column({ type: 'timestamptz', name: 'activated_at', nullable: true })
  activatedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'retired_at', nullable: true })
  retiredAt: Date | null;

  @Column({ type: 'timestamptz', name: 'rolled_back_at', nullable: true })
  rolledBackAt: Date | null;

  @Column({ type: 'text', name: 'rollback_reason', nullable: true })
  rollbackReason: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'varchar', length: 100, name: 'created_by', nullable: true })
  createdBy: string | null;

  @Column({ type: 'varchar', length: 100, name: 'updated_by', nullable: true })
  updatedBy: string | null;
}
