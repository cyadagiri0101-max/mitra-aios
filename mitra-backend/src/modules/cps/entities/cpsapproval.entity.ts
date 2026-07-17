import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum CPSApprovalResult { APPROVED='APPROVED', REJECTED='REJECTED', CONDITIONAL='CONDITIONAL', PENDING='PENDING' }

@Entity('cps_approvals')
@Index(['reviewId', 'deletedAt'])
export class CPSApproval extends IndustrialBaseEntity {
  @Column({ name: 'review_id', type: 'uuid' })
  reviewId: string;

  @Column({ name: 'approver_id', type: 'uuid' })
  @Index()
  approverId: string;

  @Column({ name: 'approver_name', type: 'varchar', length: 100 })
  approverName: string;

  @Column({ name: 'approver_role', type: 'varchar', length: 50 })
  approverRole: string;

  @Column({ name: 'approval_sequence', type: 'int', default: 1 })
  approvalSequence: number;

  @Column({ type: 'enum', enum: CPSApprovalResult, default: CPSApprovalResult.PENDING })
  result: CPSApprovalResult;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  comments: string | null;

  @Column({ name: 'conditions', type: 'text', nullable: true })
  conditions: string | null;

  @Column({ name: 'is_required', type: 'boolean', default: true })
  isRequired: boolean;
}