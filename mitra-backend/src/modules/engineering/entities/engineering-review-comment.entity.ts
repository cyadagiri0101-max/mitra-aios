import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

/**
 * Comment / markup thread entry attached to an Engineering Review Request.
 */
@Entity('engineering_review_comments')
@Index(['reviewRequestId', 'deletedAt'])
export class EngineeringReviewComment extends IndustrialBaseEntity {
  @Column({ name: 'review_request_id', type: 'uuid' })
  @Index()
  reviewRequestId: string;

  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  authorId: string | null;

  @Column({ name: 'author_name', type: 'varchar', length: 200, nullable: true })
  authorName: string | null;

  @Column({ type: 'text' })
  body: string;

  /** Attached markup (shape, position, page). */
  @Column({ name: 'markup_data', type: 'jsonb', nullable: true })
  markupData: Record<string, any> | null;

  @Column({ name: 'is_resolved', type: 'boolean', default: false })
  isResolved: boolean;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;
}
