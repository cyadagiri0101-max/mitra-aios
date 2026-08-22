import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum OperationalRecommendationType {
  INVESTIGATE_DEGRADATION = 'INVESTIGATE_DEGRADATION',
  REVIEW_WORK_CENTER_LOAD = 'REVIEW_WORK_CENTER_LOAD',
  INSPECT_TOOL_WEAR = 'INSPECT_TOOL_WEAR',
  PROCESS_VARIANCE_CHECK = 'PROCESS_VARIANCE_CHECK',
  REVIEW_TRIAL_ANOMALY = 'REVIEW_TRIAL_ANOMALY',
}

export enum OperationalRecommendationStatus {
  REVIEW = 'REVIEW',
  ACCEPTED = 'ACCEPTED',
  MODIFIED = 'MODIFIED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  APPLIED = 'APPLIED',
}

@Entity('operational_recommendations')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'machineId'])
@Index(['tenantId', 'workOrderId'])
export class OperationalRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'recommendation_type',
    default: OperationalRecommendationType.INVESTIGATE_DEGRADATION,
  })
  recommendationType: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: OperationalRecommendationStatus.REVIEW,
  })
  status: string;

  @Column({ type: 'uuid', name: 'machine_id', nullable: true })
  machineId: string | null;

  @Column({ type: 'uuid', name: 'work_order_id', nullable: true })
  workOrderId: string | null;

  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 4, default: 0.85 })
  confidence: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  reasoning: string;

  @Column({ type: 'jsonb', name: 'evidence_context', default: {} })
  evidenceContext: Record<string, any>;

  @Column({ type: 'uuid', name: 'human_reviewer_id', nullable: true })
  humanReviewerId: string | null;

  @Column({ type: 'timestamptz', name: 'reviewed_at', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', name: 'decision_notes', nullable: true })
  decisionNotes: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
