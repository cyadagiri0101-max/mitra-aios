import { Entity, Column, Index, Unique } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ProficiencyLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

export enum EmployeeSkillStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/**
 * Employee–skill relationship (M1 Sprint 1).
 *
 * Answers "what skills does this engineer have?" and "which engineers have
 * the skill required for this work?" — the foundation for future capacity
 * planning. The proficiency model (BEGINNER…EXPERT) is intentionally simple
 * and extensible.
 */
@Entity('employee_skills')
@Unique(['employeeId', 'skillId', 'tenantId'])
@Index(['skillId', 'tenantId', 'deletedAt'])
@Index(['status', 'tenantId', 'deletedAt'])
export class EmployeeSkill extends IndustrialBaseEntity {
  @Column({ name: 'employee_id', type: 'uuid' })
  @Index()
  employeeId: string;

  @Column({ name: 'skill_id', type: 'uuid' })
  skillId: string;

  @Column({
    name: 'proficiency_level',
    type: 'enum',
    enum: ProficiencyLevel,
    default: ProficiencyLevel.BEGINNER,
  })
  proficiencyLevel: ProficiencyLevel;

  @Column({ type: 'varchar', length: 255, nullable: true })
  certification: string | null;

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: Date | null;

  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'enum', enum: EmployeeSkillStatus, default: EmployeeSkillStatus.ACTIVE })
  status: EmployeeSkillStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}