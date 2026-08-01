import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum MilestoneStatus { PENDING='PENDING', IN_PROGRESS='IN_PROGRESS', COMPLETED='COMPLETED', DELAYED='DELAYED', CANCELLED='CANCELLED' }

@Entity('project_milestones')
@Index(['projectId', 'deletedAt'])
export class ProjectMilestone extends IndustrialBaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'milestone_name', type: 'varchar', length: 200 })
  milestoneName: string;

  @Column({ name: 'milestone_stage', type: 'varchar', length: 50 })
  milestoneStage: string;

  @Column({ name: 'sequence_number', type: 'int', default: 1 })
  sequenceNumber: number;

  @Column({ name: 'planned_date', type: 'date', nullable: true })
  plannedDate: Date | null;

  @Column({ name: 'actual_date', type: 'date', nullable: true })
  actualDate: Date | null;

  @Column({ name: 'revised_date', type: 'date', nullable: true })
  revisedDate: Date | null;

  @Column({ name: 'days_variance', type: 'int', default: 0 })
  daysVariance: number;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  @Index()
  ownerId: string | null;

  @Column({ name: 'completion_pct', type: 'int', default: 0 })
  completionPct: number;

  @Column({ type: 'enum', enum: MilestoneStatus, default: MilestoneStatus.PENDING })
  status: MilestoneStatus;

  @Column({ name: 'delay_reason', type: 'text', nullable: true })
  delayReason: string | null;

  @Column({ name: 'is_critical_path', type: 'boolean', default: false })
  isCriticalPath: boolean;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  // ── Sprint 2.2: template + dependency + approval support ───────────────

  @Column({ name: 'template_item_id', type: 'uuid', nullable: true })
  templateItemId: string | null;

  @Column({ name: 'depends_on_milestone_id', type: 'uuid', nullable: true })
  @Index()
  dependsOnMilestoneId: string | null;

  @Column({ name: 'requires_approval', type: 'boolean', default: false })
  requiresApproval: boolean;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'delay_days', type: 'int', default: 0 })
  delayDays: number;
}