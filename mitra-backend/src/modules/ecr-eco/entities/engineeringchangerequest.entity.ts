import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ECRStatus { DRAFT='DRAFT', SUBMITTED='SUBMITTED', UNDER_REVIEW='UNDER_REVIEW', APPROVED='APPROVED', REJECTED='REJECTED', IMPLEMENTED='IMPLEMENTED', CLOSED='CLOSED' }
export enum ECRPriority { LOW='LOW', MEDIUM='MEDIUM', HIGH='HIGH', CRITICAL='CRITICAL' }
export enum ChangeType { DESIGN='DESIGN', PROCESS='PROCESS', MATERIAL='MATERIAL', SUPPLIER='SUPPLIER', SPECIFICATION='SPECIFICATION', TOOLING='TOOLING' }

@Entity('engineering_change_requests')
@Index(['ecrNumber', 'deletedAt'])
@Index(['projectId', 'status', 'deletedAt'])
export class EngineeringChangeRequest extends IndustrialBaseEntity {
  @Column({ name: 'ecr_number', type: 'varchar', length: 30, unique: true })
  ecrNumber: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'part_id', type: 'uuid', nullable: true })
  @Index()
  partId: string | null;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ name: 'change_description', type: 'text' })
  changeDescription: string;

  @Column({ name: 'change_reason', type: 'text' })
  changeReason: string;

  @Column({ name: 'change_type', type: 'enum', enum: ChangeType, default: ChangeType.DESIGN })
  changeType: ChangeType;

  @Column({ type: 'enum', enum: ECRPriority, default: ECRPriority.MEDIUM })
  priority: ECRPriority;

  @Column({ name: 'impact_assessment', type: 'text', nullable: true })
  impactAssessment: string | null;

  @Column({ name: 'cost_impact', type: 'decimal', precision: 18, scale: 2, nullable: true })
  costImpact: number | null;

  @Column({ name: 'schedule_impact_days', type: 'int', nullable: true })
  scheduleImpactDays: number | null;

  @Column({ name: 'requested_by', type: 'uuid', nullable: true })
  requestedBy: string | null;

  @Column({ name: 'requested_date', type: 'date' })
  requestedDate: Date;

  @Column({ name: 'required_by_date', type: 'date', nullable: true })
  requiredByDate: Date | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'enum', enum: ECRStatus, default: ECRStatus.DRAFT })
  status: ECRStatus;

  // ── Sprint 2.3: Engineering Domain — DB-driven workflow + traceability ──

  /** Instance of the `engineering_change` DB-driven workflow. */
  @Column({ name: 'workflow_instance_id', type: 'uuid', nullable: true })
  workflowInstanceId: string | null;

  @Column({ name: 'drawing_id', type: 'uuid', nullable: true })
  @Index()
  drawingId: string | null;

  @Column({ name: 'bom_id', type: 'uuid', nullable: true })
  @Index()
  bomId: string | null;

  @Column({ name: 'work_order_id', type: 'uuid', nullable: true })
  @Index()
  workOrderId: string | null;

  @Column({ name: 'routing_id', type: 'uuid', nullable: true })
  @Index()
  routingId: string | null;
}