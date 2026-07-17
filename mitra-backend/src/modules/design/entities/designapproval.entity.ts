import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ApprovalResult { APPROVED='APPROVED', REJECTED='REJECTED', CONDITIONAL='CONDITIONAL', PENDING='PENDING' }

@Entity('design_approvals')
@Index(['partId', 'revisionId', 'deletedAt'])
export class DesignApproval extends IndustrialBaseEntity {
  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @Column({ name: 'revision_id', type: 'uuid', nullable: true })
  @Index()
  revisionId: string | null;

  @Column({ name: 'approval_stage', type: 'varchar', length: 50 })
  approvalStage: string;

  @Column({ name: 'approver_id', type: 'uuid', nullable: true })
  @Index()
  approverId: string | null;

  @Column({ name: 'approver_name', type: 'varchar', length: 100, nullable: true })
  approverName: string | null;

  @Column({ name: 'approver_role', type: 'varchar', length: 50, nullable: true })
  approverRole: string | null;

  @Column({ type: 'enum', enum: ApprovalResult, default: ApprovalResult.PENDING })
  result: ApprovalResult;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  comments: string | null;

  @Column({ name: 'conditions', type: 'text', nullable: true })
  conditions: string | null;
}