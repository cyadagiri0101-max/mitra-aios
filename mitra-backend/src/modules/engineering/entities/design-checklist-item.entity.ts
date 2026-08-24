import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DesignChecklist } from './design-checklist.entity';

@Entity('design_checklist_items')
@Index('IDX_CHECKLIST_ITEM_TENANT_CHK', ['tenantId', 'checklistId'])
export class DesignChecklistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'checklist_id', type: 'uuid' })
  checklistId: string;

  @ManyToOne(() => DesignChecklist, (chk) => chk.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'checklist_id' })
  checklist: DesignChecklist;

  @Column({ name: 'item_code', type: 'varchar', length: 100 })
  itemCode: string;

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'is_mandatory', type: 'boolean', default: true })
  isMandatory: boolean;

  @Column({ name: 'owner_id', type: 'varchar', length: 100, nullable: true })
  ownerId: string;

  @Column({ name: 'owner_role', type: 'varchar', length: 100, default: 'ENGINEER' })
  ownerRole: string;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'PENDING' })
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'WAIVED' | 'FAILED';

  @Column({ name: 'completion_timestamp', type: 'timestamptz', nullable: true })
  completionTimestamp: Date;

  @Column({ name: 'evidence_reference', type: 'varchar', length: 255, nullable: true })
  evidenceReference: string;

  @Column({ name: 'reviewer_id', type: 'varchar', length: 100, nullable: true })
  reviewerId: string;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
