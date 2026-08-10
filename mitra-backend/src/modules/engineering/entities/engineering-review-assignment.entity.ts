import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { ReviewDecision } from './engineering-review-request.entity';

export enum AssignmentRole {
  REVIEWER = 'REVIEWER',
  APPROVER = 'APPROVER',
  OBSERVER = 'OBSERVER',
}

export enum AssignmentStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  CHANGES_REQUIRED = 'CHANGES_REQUIRED',
  REJECTED = 'REJECTED',
}

/**
 * Multi-reviewer assignment (G-5). A review request can carry several
 * independent assignments; the review is complete when all required
 * assignments reach a terminal decision.
 */
@Entity('engineering_review_assignments')
@Index(['reviewRequestId', 'deletedAt'])
@Index(['assigneeId', 'status', 'deletedAt'])
export class EngineeringReviewAssignment extends IndustrialBaseEntity {
  @Column({ name: 'review_request_id', type: 'uuid' })
  @Index()
  reviewRequestId: string;

  @Column({ name: 'assignee_id', type: 'uuid' })
  @Index()
  assigneeId: string;

  @Column({ name: 'assignee_name', type: 'varchar', length: 200, nullable: true })
  assigneeName: string | null;

  @Column({ name: 'review_role', type: 'varchar', length: 30, default: AssignmentRole.REVIEWER })
  reviewRole: AssignmentRole;

  @Column({ type: 'varchar', length: 30, default: AssignmentStatus.PENDING })
  status: AssignmentStatus;

  @Column({ type: 'varchar', length: 30, nullable: true })
  decision: ReviewDecision | null;

  @Column({ name: 'decision_comments', type: 'text', nullable: true })
  decisionComments: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date | null;
}
