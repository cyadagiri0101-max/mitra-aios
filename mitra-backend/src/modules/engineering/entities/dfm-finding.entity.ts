import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DfmSeverity {
  INFO = 'INFO',
  ADVISORY = 'ADVISORY',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum DfmFindingStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  ACCEPTED = 'ACCEPTED',
  MODIFIED = 'MODIFIED',
  REJECTED = 'REJECTED',
  RESOLVED = 'RESOLVED',
  SUPERSEDED = 'SUPERSEDED',
}

@Entity('dfm_findings')
@Index(['tenantId', 'drawingId', 'drawingRevision'])
@Index(['tenantId', 'status'])
export class DfmFinding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'uuid', name: 'drawing_id' })
  drawingId: string;

  @Column({ type: 'varchar', length: 50, name: 'drawing_revision', default: 'Rev A' })
  drawingRevision: string;

  @Column({ type: 'uuid', name: 'feature_id', nullable: true })
  featureId: string | null;

  @Column({ type: 'varchar', length: 50, name: 'rule_id' })
  ruleId: string;

  @Column({ type: 'varchar', length: 20, name: 'rule_version', default: '1.0' })
  ruleVersion: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: DfmSeverity.WARNING,
  })
  severity: DfmSeverity;

  @Column({
    type: 'varchar',
    length: 30,
    default: DfmFindingStatus.OPEN,
  })
  status: DfmFindingStatus;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 4,
    name: 'observed_value',
  })
  observedValue: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 4,
    name: 'expected_threshold',
  })
  expectedThreshold: number;

  @Column({ type: 'varchar', length: 20, default: 'mm' })
  unit: string;

  @Column({ type: 'text' })
  explanation: string;

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
