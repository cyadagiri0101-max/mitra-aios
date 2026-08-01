import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * A project task. Subtasks are modelled via `parentTaskId`.
 * Start/due dates plus dependencies make the model Gantt-ready.
 */
@Entity('project_tasks')
@Index(['projectId', 'deletedAt'])
@Index(['assigneeId', 'deletedAt'])
@Index(['status', 'deletedAt'])
export class ProjectTask extends IndustrialBaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'parent_task_id', type: 'uuid', nullable: true })
  @Index()
  parentTaskId: string | null;

  @Column({ name: 'milestone_id', type: 'uuid', nullable: true })
  milestoneId: string | null;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, default: TaskStatus.TODO })
  status: TaskStatus;

  @Column({ type: 'varchar', length: 10, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId: string | null;

  @Column({ name: 'assignee_name', type: 'varchar', length: 200, nullable: true })
  assigneeName: string | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({ name: 'estimated_hours', type: 'decimal', precision: 10, scale: 2, default: 0 })
  estimatedHours: number;

  @Column({ name: 'actual_hours', type: 'decimal', precision: 10, scale: 2, default: 0 })
  actualHours: number;

  @Column({ name: 'progress_pct', type: 'int', default: 0 })
  progressPct: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
