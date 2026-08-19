import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { DesignLoadStandard } from './design-load-standard.entity';
import { ProficiencyLevel } from '../../people/entities/employee-skill.entity';

export enum StandardStageStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum DesignStageCode {
  MOLD_DEVELOPMENT = 'MOLD_DEVELOPMENT',
  DESIGNING = 'DESIGNING',
  DETAILING = 'DETAILING',
  FILE_SUBMISSION = 'FILE_SUBMISSION',
  DESIGN_COMPLETE = 'DESIGN_COMPLETE',
}

@Entity('design_load_standard_stages')
@Index(['standardId', 'sequence'])
@Index(['stageCode', 'tenantId', 'deletedAt'])
export class DesignLoadStandardStage extends IndustrialBaseEntity {
  @Column({ name: 'standard_id', type: 'uuid' })
  standardId: string;

  @ManyToOne(() => DesignLoadStandard, (standard) => standard.stages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'standard_id' })
  standard: DesignLoadStandard;

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
    default: 1.0,
  })
  standardDurationDays: number;

  @Column({
    name: 'standard_hours',
    type: 'numeric',
    precision: 7,
    scale: 2,
    default: 8.0,
  })
  standardHours: number;

  @Column({ name: 'required_skill_id', type: 'uuid', nullable: true })
  requiredSkillId: string | null;

  @Column({
    name: 'minimum_proficiency',
    type: 'varchar',
    length: 30,
    default: ProficiencyLevel.INTERMEDIATE,
  })
  minimumProficiency: ProficiencyLevel;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: StandardStageStatus.ACTIVE,
  })
  status: StandardStageStatus;
}
