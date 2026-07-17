import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum CheckItemStatus { PASS='PASS', FAIL='FAIL', NA='NA', PENDING='PENDING' }

@Entity('cps_review_items')
@Index(['reviewId', 'deletedAt'])
export class CPSReviewItem extends IndustrialBaseEntity {
  @Column({ name: 'review_id', type: 'uuid' })
  reviewId: string;

  @Column({ name: 'checklist_item_id', type: 'uuid', nullable: true })
  @Index()
  checklistItemId: string | null;

  @Column({ name: 'category', type: 'varchar', length: 50 })
  category: string;

  @Column({ name: 'item_code', type: 'varchar', length: 20 })
  itemCode: string;

  @Column({ name: 'item_description', type: 'text' })
  itemDescription: string;

  @Column({ name: 'is_mandatory', type: 'boolean', default: true })
  isMandatory: boolean;

  @Column({ name: 'compliance_status', type: 'enum', enum: CheckItemStatus, default: CheckItemStatus.PENDING })
  complianceStatus: CheckItemStatus;

  @Column({ name: 'actual_value', type: 'varchar', length: 200, nullable: true })
  actualValue: string | null;

  @Column({ name: 'expected_value', type: 'varchar', length: 200, nullable: true })
  expectedValue: string | null;

  @Column({ name: 'remarks', type: 'text', nullable: true })
  remarks: string | null;

  @Column({ name: 'evidence_file_id', type: 'uuid', nullable: true })
  @Index()
  evidenceFileId: string | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;
}