import { Entity, Column, Index, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { ProjectDesignLoadStage } from './project-design-load-stage.entity';
import { DesignLoadStandard } from './design-load-standard.entity';

export enum ProjectDesignLoadStatus {
  DRAFT = 'DRAFT',
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED',
}

@Entity('project_design_loads')
@Index(['loadNumber', 'tenantId'])
@Index(['projectId', 'status', 'deletedAt'])
@Index(['status', 'plannedStartDate', 'tenantId'])
export class ProjectDesignLoad extends IndustrialBaseEntity {
  @Column({ name: 'load_number', type: 'varchar', length: 30 })
  loadNumber: string;

  @Column({ name: 'project_id', type: 'uuid' })
  @Index()
  projectId: string;

  @Column({ name: 'standard_id', type: 'uuid', nullable: true })
  standardId: string | null;

  @ManyToOne(() => DesignLoadStandard, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'standard_id' })
  standard: DesignLoadStandard | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'project_type', type: 'varchar', length: 50, nullable: true })
  projectType: string | null;

  @Column({ name: 'mold_type', type: 'varchar', length: 50, nullable: true })
  moldType: string | null;

  @Column({
    name: 'complexity_factor',
    type: 'numeric',
    precision: 4,
    scale: 2,
    default: 1.0,
  })
  complexityFactor: number;

  @Column({
    name: 'standard_duration_days',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
  })
  standardDurationDays: number;

  @Column({
    name: 'standard_hours',
    type: 'numeric',
    precision: 7,
    scale: 2,
    default: 0,
  })
  standardHours: number;

  @Column({
    name: 'planned_duration_days',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
  })
  plannedDurationDays: number;

  @Column({
    name: 'planned_hours',
    type: 'numeric',
    precision: 7,
    scale: 2,
    default: 0,
  })
  plannedHours: number;

  @Column({
    name: 'actual_duration_days',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  actualDurationDays: number | null;

  @Column({
    name: 'actual_hours',
    type: 'numeric',
    precision: 7,
    scale: 2,
    nullable: true,
  })
  actualHours: number | null;

  @Column({ name: 'planned_start_date', type: 'date', nullable: true })
  plannedStartDate: Date | null;

  @Column({ name: 'planned_finish_date', type: 'date', nullable: true })
  plannedFinishDate: Date | null;

  @Column({ name: 'actual_start_date', type: 'date', nullable: true })
  actualStartDate: Date | null;

  @Column({ name: 'actual_finish_date', type: 'date', nullable: true })
  actualFinishDate: Date | null;

  @Column({ name: 'current_stage_code', type: 'varchar', length: 50, default: 'MOLD_DEVELOPMENT' })
  currentStageCode: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: ProjectDesignLoadStatus.DRAFT,
  })
  status: ProjectDesignLoadStatus;

  @Column({ type: 'text', nullable: true })
  explanation: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => ProjectDesignLoadStage, (stage) => stage.designLoad, { cascade: true })
  stages: ProjectDesignLoadStage[];
}
