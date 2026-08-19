import { Entity, Column, Index, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { ScheduleBaselineItem } from './schedule-baseline-item.entity';
import { Project } from './project.entity';

export enum BaselineStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  SUPERSEDED = 'SUPERSEDED',
  CANCELLED = 'CANCELLED',
}

@Entity('schedule_baselines')
@Index(['projectId', 'deletedAt'])
@Index(['tenantId', 'baselineNumber'])
export class ScheduleBaseline extends IndustrialBaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @Column({ name: 'baseline_number', type: 'varchar', length: 50 })
  baselineNumber: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({
    type: 'varchar',
    length: 30,
    default: BaselineStatus.DRAFT,
  })
  status: BaselineStatus;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: Date | null;

  @Column({
    name: 'total_planned_duration_days',
    type: 'numeric',
    precision: 6,
    scale: 2,
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v == null ? 0 : Number(v)),
    },
  })
  totalPlannedDurationDays: number;

  @Column({
    name: 'total_planned_hours',
    type: 'numeric',
    precision: 8,
    scale: 2,
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v == null ? 0 : Number(v)),
    },
  })
  totalPlannedHours: number;

  @Column({ name: 'planned_start_date', type: 'date', nullable: true })
  plannedStartDate: Date | null;

  @Column({ name: 'planned_finish_date', type: 'date', nullable: true })
  plannedFinishDate: Date | null;

  @Column({ name: 'is_locked', type: 'boolean', default: false })
  isLocked: boolean;

  @Column({ name: 'activated_at', type: 'timestamptz', nullable: true })
  activatedAt: Date | null;

  @Column({ name: 'activated_by', type: 'uuid', nullable: true })
  activatedBy: string | null;

  @OneToMany(() => ScheduleBaselineItem, (item) => item.baseline, { cascade: true })
  items: ScheduleBaselineItem[];
}
