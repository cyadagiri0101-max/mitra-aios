import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export enum RecommendationType {
  SHIFT_OPERATION = 'SHIFT_OPERATION',
  REALLOCATE_MACHINE = 'REALLOCATE_MACHINE',
  ADJUST_MILESTONE_DATE = 'ADJUST_MILESTONE_DATE',
  SPLIT_BATCH = 'SPLIT_BATCH',
  ESCALATE_CAPACITY = 'ESCALATE_CAPACITY',
}

export enum RecommendationStatus {
  GENERATED = 'GENERATED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACCEPTED = 'ACCEPTED',
  MODIFIED = 'MODIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  APPLIED = 'APPLIED',
  CANCELLED = 'CANCELLED',
}

export enum LevelingRiskTier {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('g14_leveling_recommendations')
@Index(['tenantId', 'projectId'])
@Index(['tenantId', 'machineId'])
@Index(['tenantId', 'status'])
export class G14LevelingRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({
    type: 'enum',
    enum: RecommendationType,
    name: 'recommendation_type',
  })
  recommendationType: RecommendationType;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'capability',
    default: 'TIMELINE_LEVELING',
  })
  capability: string;

  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId: string | null;

  @Column({ type: 'uuid', name: 'milestone_id', nullable: true })
  milestoneId: string | null;

  @Column({ type: 'uuid', name: 'task_id', nullable: true })
  taskId: string | null;

  @Column({ type: 'uuid', name: 'work_order_id', nullable: true })
  workOrderId: string | null;

  @Column({ type: 'uuid', name: 'machine_id', nullable: true })
  machineId: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'source_prediction_id',
    nullable: true,
  })
  sourcePredictionId: string | null;

  @Column({ type: 'uuid', name: 'model_id', nullable: true })
  modelId: string | null;

  @Column({ type: 'varchar', length: 100, name: 'model_version' })
  modelVersion: string;

  @Column({
    type: 'enum',
    enum: LevelingRiskTier,
    name: 'risk_tier',
    default: LevelingRiskTier.MEDIUM,
  })
  riskTier: LevelingRiskTier;

  @Column({ type: 'jsonb', name: 'current_state' })
  currentState: Record<string, any>;

  @Column({ type: 'jsonb', name: 'proposed_state' })
  proposedState: Record<string, any>;

  @Column({ type: 'varchar', length: 255, name: 'expected_benefit' })
  expectedBenefit: string;

  @Column({ type: 'jsonb', name: 'predicted_risk_before' })
  predictedRiskBefore: Record<string, any>;

  @Column({ type: 'jsonb', name: 'predicted_risk_after' })
  predictedRiskAfter: Record<string, any>;

  @Column({
    type: 'numeric',
    precision: 6,
    scale: 4,
    default: 0.85,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => Number(v),
    },
  })
  confidence: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 4,
    name: 'uncertainty_lower',
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => Number(v),
    },
  })
  uncertaintyLower: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 4,
    name: 'uncertainty_upper',
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => Number(v),
    },
  })
  uncertaintyUpper: number;

  @Column({ type: 'jsonb', name: 'explanation' })
  explanation: Record<string, any>;

  @Column({
    type: 'enum',
    enum: RecommendationStatus,
    name: 'status',
    default: RecommendationStatus.GENERATED,
  })
  status: RecommendationStatus;

  @Column({ type: 'timestamptz', name: 'generated_at', default: () => 'CURRENT_TIMESTAMP' })
  generatedAt: Date;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'varchar', length: 100, name: 'reviewed_by', nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'timestamptz', name: 'reviewed_at', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'varchar', length: 100, name: 'applied_by', nullable: true })
  appliedBy: string | null;

  @Column({ type: 'timestamptz', name: 'applied_at', nullable: true })
  appliedAt: Date | null;

  @Column({ type: 'text', name: 'rejection_reason', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'text', name: 'modification_reason', nullable: true })
  modificationReason: string | null;

  @Column({ type: 'text', name: 'cancellation_reason', nullable: true })
  cancellationReason: string | null;

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
