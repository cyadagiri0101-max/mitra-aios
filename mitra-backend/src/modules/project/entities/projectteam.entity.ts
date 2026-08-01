import { Entity, Column, Index, OneToMany } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { ProjectTeamMember } from './projectteammember.entity';

@Entity('project_teams')
@Index(['projectId', 'deletedAt'])
export class ProjectTeam extends IndustrialBaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'team_name', type: 'varchar', length: 200 })
  teamName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'lead_user_id', type: 'uuid', nullable: true })
  leadUserId: string | null;

  @Column({ name: 'lead_user_name', type: 'varchar', length: 200, nullable: true })
  leadUserName: string | null;

  @OneToMany(() => ProjectTeamMember, (m) => m.team)
  members: ProjectTeamMember[];
}
