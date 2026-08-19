import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { ScheduleBaseline } from './schedule-baseline.entity';

export enum BaselineItemType {
  MILESTONE = 'MILESTONE',
  TASK = 'TASK',
  DESIGN_STAGE = 'DESIGN_STAGE',
}

@Entity('schedule_baseline_items')
@Index(['baselineId', 'sequence'])
@Index(['projectId', 'itemType'])
export class ScheduleBaselineItem extends IndustrialBaseEntity {
  @Column({ name: 'baseline_id', type: 'uuid' })
  baselineId: string;

  @ManyToOne(() => ScheduleBaseline, (b) => b.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'baseline_id' })
  baseline?: ScheduleBaseline;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({
    name: 'item_type',
    type: 'varchar',
    length: 30,
    default: BaselineItemType.TASK,
  })
  itemType: BaselineItemType;

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId: string | null;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ name: 'stage_code', type: 'varchar', length: 50, nullable: true })
  stageCode: string | null;

  @Column({ type: 'int', default: 1 })
  sequence: number;

  @Column({ name: 'planned_start_date', type: 'date', nullable: true })
  plannedStartDate: Date | null;

  @Column({ name: 'planned_finish_date', type: 'date', nullable: true })
  plannedFinishDate: Date | null;

  @Column({
    name: 'duration_days',
    type: 'numeric',
    precision: 6,
    scale: 2,
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v == null ? 0 : Number(v)),
    },
  })
  durationDays: number;

  @Column({
    name: 'planned_hours',
    type: 'numeric',
    precision: 8,
    scale: 2,
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => (v == null ? 0 : Number(v)),
    },
  })
  plannedHours: number;

  @Column({ name: 'assigned_resource_id', type: 'uuid', nullable: true })
  assignedResourceId: string | null;

  @Column({ name: 'assigned_resource_name', type: 'varchar', length: 200, nullable: true })
  assignedResourceName: string | null;

  @Column({ name: 'is_critical_path', type: 'boolean', default: false })
  isCriticalPath: boolean;

  @Column({ type: 'jsonb', nullable: true })
  dependencies: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;
}
