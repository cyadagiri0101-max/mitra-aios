import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum CustomerApprovalResult { APPROVED='APPROVED', REJECTED='REJECTED', CONDITIONAL='CONDITIONAL', PENDING='PENDING' }
export enum CustomerApprovalType { DESIGN='DESIGN', SAMPLE='SAMPLE', TRIAL='TRIAL', FINAL='FINAL', PPAP='PPAP' }

@Entity('customer_approvals')
@Index(['approvalNumber', 'deletedAt'])
@Index(['projectId', 'result', 'deletedAt'])
export class CustomerApproval extends IndustrialBaseEntity {
  @Column({ name: 'approval_number', type: 'varchar', length: 30, unique: true })
  approvalNumber: string;

  @Column({ name: 'project_id', type: 'uuid' })
  @Index()
  projectId: string;

  @Column({ name: 'trial_id', type: 'uuid', nullable: true })
  @Index()
  trialId: string | null;

  @Column({ name: 'approval_type', type: 'enum', enum: CustomerApprovalType, default: CustomerApprovalType.TRIAL })
  approvalType: CustomerApprovalType;

  @Column({ name: 'approval_date', type: 'date', nullable: true })
  approvalDate: Date | null;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  @Index()
  customerId: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 200 })
  customerName: string;

  @Column({ name: 'customer_contact', type: 'varchar', length: 100, nullable: true })
  customerContact: string | null;

  @Column({ name: 'customer_designation', type: 'varchar', length: 100, nullable: true })
  customerDesignation: string | null;

  @Column({ name: 'approved_samples', type: 'int', nullable: true })
  approvedSamples: number | null;

  @Column({ name: 'rejected_samples', type: 'int', nullable: true })
  rejectedSamples: number | null;

  @Column({ name: 'approval_conditions', type: 'text', nullable: true })
  approvalConditions: string | null;

  @Column({ name: 'pending_actions', type: 'jsonb', nullable: true })
  pendingActions: string[] | null;

  @Column({ name: 'next_review_date', type: 'date', nullable: true })
  nextReviewDate: Date | null;

  @Column({ type: 'enum', enum: CustomerApprovalResult, default: CustomerApprovalResult.PENDING })
  result: CustomerApprovalResult;

  @Column({ name: 'internal_notes', type: 'text', nullable: true })
  internalNotes: string | null;

  @Column({ name: 'customer_feedback', type: 'text', nullable: true })
  customerFeedback: string | null;

  @Column({ name: 'signed_off_at', type: 'timestamptz', nullable: true })
  signedOffAt: Date | null;
}