import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum RevisionStatus { DRAFT='DRAFT', IN_REVIEW='IN_REVIEW', APPROVED='APPROVED', RELEASED='RELEASED', SUPERSEDED='SUPERSEDED' }

@Entity('design_revisions')
@Index(['partId', 'revisionCode', 'deletedAt'])
export class DesignRevision extends IndustrialBaseEntity {
  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @Column({ name: 'revision_code', type: 'varchar', length: 10 })
  revisionCode: string;

  @Column({ name: 'revision_number', type: 'int', default: 1 })
  revisionNumber: number;

  @Column({ name: 'change_description', type: 'text' })
  changeDescription: string;

  @Column({ name: 'change_reason', type: 'varchar', length: 50, nullable: true })
  changeReason: string | null;

  @Column({ name: 'ecr_number', type: 'varchar', length: 30, nullable: true })
  ecrNumber: string | null;

  @Column({ name: 'revision_date', type: 'date' })
  revisionDate: Date;

  @Column({ name: 'revised_by', type: 'uuid', nullable: true })
  revisedBy: string | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'enum', enum: RevisionStatus, default: RevisionStatus.DRAFT })
  status: RevisionStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}