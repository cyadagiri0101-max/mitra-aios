import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { WorkflowState } from './workflow-state.entity';

@Entity('workflow_transitions')
@Index(['fromStateId', 'deletedAt'])
export class WorkflowTransition extends IndustrialBaseEntity {
  @Column({ name: 'from_state_id', type: 'uuid' })
  fromStateId: string;

  @ManyToOne(() => WorkflowState, (s) => s.outgoingTransitions)
  @JoinColumn({ name: 'from_state_id' })
  fromState: WorkflowState;

  @Column({ name: 'to_state_id', type: 'uuid' })
  @Index()
  toStateId: string;

  @ManyToOne(() => WorkflowState, (s) => s.incomingTransitions)
  @JoinColumn({ name: 'to_state_id' })
  toState: WorkflowState;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'workflow_type', type: 'varchar', length: 50 })
  workflowType: string;

  @Column({ name: 'required_roles', type: 'text', array: true, nullable: true })
  requiredRoles: string[] | null;

  @Column({ name: 'required_permissions', type: 'text', array: true, nullable: true })
  requiredPermissions: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  conditions: { field: string; operator: string; value: any }[] | null;

  @Column({ name: 'requires_approval', type: 'boolean', default: false })
  requiresApproval: boolean;

  @Column({ name: 'approval_roles', type: 'text', array: true, nullable: true })
  approvalRoles: string[] | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}