import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Expose } from 'class-transformer';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { ProjectTeam } from './projectteam.entity';

/**
 * A member of a project team. `capacityPct` is the committed allocation
 * (100 = full time). Availability is computed from capacity minus
 * concurrent allocations across the project's teams.
 */
@Entity('project_team_members')
@Index(['teamId', 'deletedAt'])
@Index(['projectId', 'deletedAt'])
@Index(['userId', 'deletedAt'])
export class ProjectTeamMember extends IndustrialBaseEntity {
  @Column({ name: 'team_id', type: 'uuid' })
  teamId: string;

  @ManyToOne(() => ProjectTeam, (t) => t.members)
  @JoinColumn({ name: 'team_id' })
  team: ProjectTeam;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'user_name', type: 'varchar', length: 200 })
  userName: string;

  @Column({ type: 'varchar', length: 50, default: 'MEMBER' })
  role: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  department: string | null;

  @Column({ name: 'department_name', type: 'varchar', length: 200, nullable: true })
  departmentName: string | null;

  @Column({ type: 'jsonb', nullable: true })
  skills: string[] | null;

  @Expose()
  get name(): string {
    return this.userName;
  }

  @Column({ name: 'capacity_pct', type: 'int', default: 100 })
  capacityPct: number;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  @Column({ name: 'is_lead', type: 'boolean', default: false })
  isLead: boolean;
}
