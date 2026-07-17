import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { WorkflowState } from './workflow-state.entity';

export interface WorkflowHistoryEntry {
  fromState: string;
  toState: string;
  transitionId: string;
  performedBy: string;
  performedAt: Date;
  comments: string;
  attachments: string[];
}

@Entity('workflow_instances')
@Index(['entityType', 'entityId', 'deletedAt'])
export class WorkflowInstance extends IndustrialBaseEntity {
  @Column({ name: 'workflow_type', type: 'varchar', length: 50 })
  workflowType: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 100 })
  @Index()
  entityId: string;

  @Column({ name: 'current_state_id', type: 'uuid' })
  @Index()
  currentStateId: string;

  @ManyToOne(() => WorkflowState)
  @JoinColumn({ name: 'current_state_id' })
  currentState: WorkflowState;

  @Column({ name: 'state_entered_at', type: 'timestamptz', nullable: true })
  stateEnteredAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  history: WorkflowHistoryEntry[] | null;

  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, any> | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;
}