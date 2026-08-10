import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ReviewEntityType {
  DRAWING = 'DRAWING',
  BOM = 'BOM',
  ROUTING = 'ROUTING',
  CHANGE = 'CHANGE',
  DOCUMENT = 'DOCUMENT',
}

export enum ReviewType {
  PEER = 'PEER',
  LEAD = 'LEAD',
  DESIGN_RULE = 'DESIGN_RULE',
  CUSTOMER = 'CUSTOMER',
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  CHANGES_REQUIRED = 'CHANGES_REQUIRED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum ReviewDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  CHANGES_REQUIRED = 'CHANGES_REQUIRED',
  CONCURRED = 'CONCURRED',
}

/**
 * Engineering Review Request — reviewer assignment, approval, comments,
 * markups and decisions for drawings, BOMs, routings, changes and documents.
 */
@Entity('engineering_review_requests')
@Index(['reviewNumber', 'deletedAt'])
@Index(['projectId', 'deletedAt'])
@Index(['entityType', 'entityId', 'deletedAt'])
@Index(['reviewerId', 'status', 'deletedAt'])
export class EngineeringReviewRequest extends IndustrialBaseEntity {
  @Column({ name: 'review_number', type: 'varchar', length: 30 })
  @Index()
  reviewNumber: string;

  /** Every engineering artifact belongs to a Project — enforced at entity level. */
  @Column({ name: 'project_id', type: 'uuid' })
  @Index()
  projectId: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 30 })
  entityType: ReviewEntityType;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'review_type', type: 'varchar', length: 30, default: ReviewType.PEER })
  reviewType: ReviewType;

  @Column({ name: 'requested_by', type: 'uuid', nullable: true })
  requestedBy: string | null;

  @Column({ name: 'requested_by_name', type: 'varchar', length: 200, nullable: true })
  requestedByName: string | null;

  @Column({ name: 'reviewer_id', type: 'uuid', nullable: true })
  @Index()
  reviewerId: string | null;

  @Column({ name: 'reviewer_name', type: 'varchar', length: 200, nullable: true })
  reviewerName: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'varchar', length: 30, default: ReviewStatus.PENDING })
  status: ReviewStatus;

  @Column({ type: 'varchar', length: 30, nullable: true })
  decision: ReviewDecision | null;

  @Column({ name: 'decision_comments', type: 'text', nullable: true })
  decisionComments: string | null;

  /** Markups: [ { id, type, x, y, page, comment, authorId, createdBy } ]. */
  @Column({ type: 'jsonb', nullable: true })
  markups: Record<string, any>[] | null;

  @Column({ type: 'jsonb', nullable: true })
  attachments: Record<string, any>[] | null;
}
