import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('retrial_results')
@Index(['retrialId', 'deletedAt'])
export class RetrialResult extends IndustrialBaseEntity {
  @Column({ name: 'retrial_id', type: 'uuid' })
  retrialId: string;

  @Column({ name: 'trial_observation_id', type: 'uuid', nullable: true })
  @Index()
  trialObservationId: string | null;

  @Column({ type: 'varchar', length: 20 })
  result: string;

  @Column({ name: 'summary', type: 'text', nullable: true })
  summary: string | null;

  @Column({ name: 'issues_resolved', type: 'jsonb', nullable: true })
  issuesResolved: string[] | null;

  @Column({ name: 'pending_issues', type: 'jsonb', nullable: true })
  pendingIssues: string[] | null;

  @Column({ name: 'approved_for_dispatch', type: 'boolean', default: false })
  approvedForDispatch: boolean;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}