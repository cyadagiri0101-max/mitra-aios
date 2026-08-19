import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum SkillStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/**
 * Skill master (M1 Sprint 1). Examples of engineering skills: CAD,
 * Mold Design, Tool Design, CNC Programming, EDM, Quality Inspection,
 * Process Planning, Trial, Assembly, Project Planning. Skills are master
 * data — codes are tenant-unique.
 */
@Entity('skills')
@Index(['code', 'tenantId', 'deletedAt'])
@Index(['category', 'tenantId', 'deletedAt'])
export class Skill extends IndustrialBaseEntity {
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ type: 'enum', enum: SkillStatus, default: SkillStatus.ACTIVE })
  status: SkillStatus;
}