import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('retrials')
@Index(['projectId', 'deletedAt'])
export class Retrial extends IndustrialBaseEntity {
  @Column({ name: 'retrial_number', type: 'varchar', length: 30, unique: true })
  retrialNumber: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  /** Sprint 2.3.1 G-1: artifact traceability links (UUID + index, no relations). */
  @Column({ name: 'part_id', type: 'uuid', nullable: true })
  @Index()
  partId: string | null;

  @Column({ name: 'drawing_id', type: 'uuid', nullable: true })
  @Index()
  drawingId: string | null;

  @Column({ name: 'bom_item_id', type: 'uuid', nullable: true })
  @Index()
  bomItemId: string | null;

  @Column({ name: 'routing_id', type: 'uuid', nullable: true })
  @Index()
  routingId: string | null;

  @Column({ name: 'original_trial_id', type: 'uuid', nullable: true })
  @Index()
  originalTrialId: string | null;

  @Column({ name: 'retrial_sequence', type: 'int', default: 1 })
  retrialSequence: number;

  @Column({ name: 'retrial_reason', type: 'text' })
  retrialReason: string;

  @Column({ name: 'changes_made', type: 'text', nullable: true })
  changesMade: string | null;

  @Column({ name: 'scheduled_date', type: 'date', nullable: true })
  scheduledDate: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'SCHEDULED' })
  status: string;

  @Column({ name: 'requested_by', type: 'uuid', nullable: true })
  requestedBy: string | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}