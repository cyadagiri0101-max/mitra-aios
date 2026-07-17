import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ProcessPlanStatus { DRAFT='DRAFT', UNDER_REVIEW='UNDER_REVIEW', APPROVED='APPROVED', RELEASED='RELEASED', OBSOLETE='OBSOLETE' }

@Entity('process_plans')
@Index(['planNumber', 'deletedAt'])
@Index(['projectId', 'status', 'deletedAt'])
export class ProcessPlan extends IndustrialBaseEntity {
  @Column({ name: 'plan_number', type: 'varchar', length: 30, unique: true })
  planNumber: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'part_id', type: 'uuid', nullable: true })
  @Index()
  partId: string | null;

  @Column({ name: 'plan_version', type: 'int', default: 1 })
  planVersion: number;

  @Column({ name: 'plan_date', type: 'date', nullable: true })
  planDate: Date | null;

  @Column({ name: 'total_estimated_hours', type: 'decimal', precision: 8, scale: 2, nullable: true })
  totalEstimatedHours: number | null;

  @Column({ name: 'total_estimated_cost', type: 'decimal', precision: 18, scale: 2, nullable: true })
  totalEstimatedCost: number | null;

  @Column({ name: 'prepared_by', type: 'uuid', nullable: true })
  preparedBy: string | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'enum', enum: ProcessPlanStatus, default: ProcessPlanStatus.DRAFT })
  status: ProcessPlanStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}