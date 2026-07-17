import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum CPSReviewStatus { DRAFT='DRAFT', IN_REVIEW='IN_REVIEW', APPROVED='APPROVED', REJECTED='REJECTED', REVISED='REVISED' }

@Entity('cps_reviews')
@Index(['reviewNumber', 'deletedAt'])
@Index(['projectId', 'status', 'deletedAt'])
export class CPSReview extends IndustrialBaseEntity {
  @Column({ name: 'review_number', type: 'varchar', length: 30, unique: true })
  reviewNumber: string;

  @Column({ name: 'project_id', type: 'uuid' })
  @Index()
  projectId: string;

  @Column({ name: 'review_version', type: 'int', default: 1 })
  reviewVersion: number;

  @Column({ name: 'review_date', type: 'date' })
  reviewDate: Date;

  @Column({ name: 'design_stage', type: 'varchar', length: 50, nullable: true })
  designStage: string | null;

  @Column({ name: 'product_name', type: 'varchar', length: 200 })
  productName: string;

  @Column({ name: 'part_number', type: 'varchar', length: 50, nullable: true })
  partNumber: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 200, nullable: true })
  customerName: string | null;

  @Column({ name: 'mold_type', type: 'varchar', length: 50, nullable: true })
  moldType: string | null;

  @Column({ name: 'cavitation', type: 'int', default: 1 })
  cavitation: number;

  @Column({ name: 'material_type', type: 'varchar', length: 100, nullable: true })
  materialType: string | null;

  @Column({ name: 'total_items', type: 'int', default: 0 })
  totalItems: number;

  @Column({ name: 'passed_items', type: 'int', default: 0 })
  passedItems: number;

  @Column({ name: 'failed_items', type: 'int', default: 0 })
  failedItems: number;

  @Column({ name: 'na_items', type: 'int', default: 0 })
  naItems: number;

  @Column({ name: 'conducted_by', type: 'uuid', nullable: true })
  conductedBy: string | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'overall_comments', type: 'text', nullable: true })
  overallComments: string | null;

  @Column({ type: 'enum', enum: CPSReviewStatus, default: CPSReviewStatus.DRAFT })
  status: CPSReviewStatus;
}