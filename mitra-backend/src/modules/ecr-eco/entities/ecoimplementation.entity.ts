import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('eco_implementations')
@Index(['ecoId', 'deletedAt'])
export class EcoImplementation extends IndustrialBaseEntity {
  @Column({ name: 'eco_id', type: 'uuid' })
  ecoId: string;

  @Column({ name: 'task_description', type: 'text' })
  taskDescription: string;

  @Column({ name: 'task_type', type: 'varchar', length: 50 })
  taskType: string;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'verification_required', type: 'boolean', default: false })
  verificationRequired: boolean;

  @Column({ name: 'verification_status', type: 'varchar', length: 20, default: 'PENDING' })
  verificationStatus: string;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @Column({ name: 'evidence_notes', type: 'text', nullable: true })
  evidenceNotes: string | null;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: string;
}