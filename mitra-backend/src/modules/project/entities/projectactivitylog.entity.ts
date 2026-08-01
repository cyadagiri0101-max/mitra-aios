import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

/**
 * Activity timeline entry for a project. Every meaningful action on the
 * project (creation, transitions, milestone completions, risk updates,
 * document releases) appends an entry — full traceability without
 * coupling to the global audit store.
 */
@Entity('project_activity_logs')
@Index(['projectId', 'occurredAt'])
export class ProjectActivityLog extends IndustrialBaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'activity_type', type: 'varchar', length: 50 })
  activityType: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ name: 'actor_name', type: 'varchar', length: 200, nullable: true })
  actorName: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ name: 'occurred_at', type: 'timestamptz', default: () => 'now()' })
  occurredAt: Date;
}
