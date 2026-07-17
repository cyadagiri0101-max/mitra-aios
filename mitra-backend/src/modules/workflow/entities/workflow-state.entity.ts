import { Entity, Column, Index, OneToMany } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { WorkflowTransition } from './workflow-transition.entity';

@Entity('workflow_states')
@Index(['workflowType', 'isInitial', 'deletedAt'])
@Index(['stateCode', 'deletedAt'])
export class WorkflowState extends IndustrialBaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'state_code', type: 'varchar', length: 50 })
  stateCode: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string | null;

  @Column({ name: 'workflow_type', type: 'varchar', length: 50 })
  workflowType: string;

  @Column({ name: 'is_initial', type: 'boolean', default: false })
  isInitial: boolean;

  @Column({ name: 'is_final', type: 'boolean', default: false })
  isFinal: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string | null;

  @OneToMany(() => WorkflowTransition, (t) => t.fromState)
  outgoingTransitions: WorkflowTransition[];

  @OneToMany(() => WorkflowTransition, (t) => t.toState)
  incomingTransitions: WorkflowTransition[];
}