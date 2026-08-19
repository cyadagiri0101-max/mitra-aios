import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { ProjectDesignLoad } from './project-design-load.entity';
import { ProficiencyLevel } from '../../people/entities/employee-skill.entity';

export enum ProjectStageStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
  CANCELLED = 'CANCELLED',
}

@Entity('project_design_load_stages')
@Index(['designLoadId', 'sequence'])
@Index(['stageCode', 'tenantId', 'deletedAt'])
export class ProjectDesignLoadStage extends IndustrialBaseEntity {
  @Column({ name: 'design_load_id', type: 'uuid' })
  designLoadId: string;

  @ManyToOne(() => ProjectDesignLoad, (load) => load.stages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_load_id' })
  designLoad: ProjectDesignLoad;

  @Column({ name: 'stage_code', type: 'varchar', length: 50 })
  stageCode: string;

  @Column({ name: 'stage_name', type: 'varchar', length: 100 })
  stageName: string;

  @Column({ type: 'int', default: 1 })
  sequence: number;

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

  @Column({
    type: 'varchar',
    length: 30,
    default: ProjectStageStatus.NOT_STARTED,
  })
  status: ProjectStageStatus;

  @Column({ name: 'required_skill_id', type: 'uuid', nullable: true })
  requiredSkillId: string | null;

  @Column({
    name: 'minimum_proficiency',
    type: 'varchar',
    length: 30,
    default: ProficiencyLevel.INTERMEDIATE,
  })
  minimumProficiency: ProficiencyLevel;

  @Column({ name: 'assigned_employee_id', type: 'uuid', nullable: true })
  assignedEmployeeId: string | null;

  @Column({ name: 'assigned_design_system_id', type: 'uuid', nullable: true })
  assignedDesignSystemId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
