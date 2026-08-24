import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum EngineerSkillType {
  MOLD_DESIGN = 'MOLD_DESIGN',
  CAVITY_MODELING = 'CAVITY_MODELING',
  ELECTRODE_EXTRACTION = 'ELECTRODE_EXTRACTION',
  COOLING_ANALYSIS = 'COOLING_ANALYSIS',
  CNC_PROGRAMMING = 'CNC_PROGRAMMING',
  DFM_ANALYSIS = 'DFM_ANALYSIS',
  SHEET_METAL_DESIGN = 'SHEET_METAL_DESIGN',
  TOOL_PROVING_ENGINEERING = 'TOOL_PROVING_ENGINEERING',
}

export interface EngineerSkillProficiency {
  skill: EngineerSkillType;
  level: 'JUNIOR' | 'MID' | 'SENIOR' | 'PRINCIPAL';
  yearsExperience: number;
}

export interface ActiveProjectAssignment {
  projectId: string;
  packageId: string;
  stageName: string;
  allocatedWeeklyHours: number;
  startDate: string;
  endDate: string;
}

@Entity('design_engineer_profiles')
@Index(['tenantId', 'engineerCode'])
@Index(['tenantId', 'status'])
export class DesignEngineerProfile extends IndustrialBaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'engineer_code', type: 'varchar', length: 100 })
  engineerCode: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'proficiency_level', type: 'varchar', length: 50, default: 'MID' })
  proficiencyLevel: 'JUNIOR' | 'MID' | 'SENIOR' | 'PRINCIPAL';

  @Column({ name: 'primary_skills', type: 'jsonb', default: [] })
  primarySkills: EngineerSkillProficiency[];

  @Column({ name: 'weekly_capacity_hours', type: 'decimal', precision: 6, scale: 2, default: 40.0 })
  weeklyCapacityHours: number;

  @Column({ name: 'current_utilization_percentage', type: 'decimal', precision: 6, scale: 2, default: 0.0 })
  currentUtilizationPercentage: number;

  @Column({ type: 'varchar', length: 50, default: 'AVAILABLE' })
  status: 'AVAILABLE' | 'LOADED' | 'OVERLOADED' | 'ON_LEAVE' | 'INACTIVE';

  @Column({ name: 'active_assignments', type: 'jsonb', default: [] })
  activeAssignments: ActiveProjectAssignment[];

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
