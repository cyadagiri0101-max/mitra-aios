import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ProjectResourceRole { PROJECT_MANAGER='PROJECT_MANAGER', DESIGN_LEAD='DESIGN_LEAD', DESIGN_ENGINEER='DESIGN_ENGINEER', PLANNING_ENGINEER='PLANNING_ENGINEER', MACHINIST='MACHINIST', QUALITY_ENGINEER='QUALITY_ENGINEER', TOOLMAKER='TOOLMAKER', OTHER='OTHER' }

@Entity('project_resources')
@Index(['projectId', 'userId', 'deletedAt'])
export class ProjectResource extends IndustrialBaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'user_name', type: 'varchar', length: 100 })
  userName: string;

  @Column({ type: 'enum', enum: ProjectResourceRole, default: ProjectResourceRole.OTHER })
  role: ProjectResourceRole;

  @Column({ name: 'allocation_pct', type: 'int', default: 100 })
  allocationPct: number;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}