import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ECOStatus { DRAFT='DRAFT', APPROVED='APPROVED', IN_IMPLEMENTATION='IN_IMPLEMENTATION', COMPLETED='COMPLETED', CANCELLED='CANCELLED' }

@Entity('engineering_change_orders')
@Index(['ecoNumber', 'deletedAt'])
@Index(['ecrId', 'deletedAt'])
export class EngineeringChangeOrder extends IndustrialBaseEntity {
  @Column({ name: 'eco_number', type: 'varchar', length: 30, unique: true })
  ecoNumber: string;

  @Column({ name: 'ecr_id', type: 'uuid' })
  @Index()
  ecrId: string;

  @Column({ name: 'implementation_plan', type: 'text' })
  implementationPlan: string;

  @Column({ name: 'implementation_start_date', type: 'date', nullable: true })
  implementationStartDate: Date | null;

  @Column({ name: 'implementation_end_date', type: 'date', nullable: true })
  implementationEndDate: Date | null;

  @Column({ name: 'actual_completion_date', type: 'date', nullable: true })
  actualCompletionDate: Date | null;

  @Column({ name: 'responsible_person_id', type: 'uuid', nullable: true })
  @Index()
  responsiblePersonId: string | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'verification_status', type: 'varchar', length: 20, default: 'PENDING' })
  verificationStatus: string;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @Column({ type: 'enum', enum: ECOStatus, default: ECOStatus.DRAFT })
  status: ECOStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // ── Sprint 2.3: Engineering Domain — DB-driven workflow + traceability ──

  /** Instance of the `engineering_change` DB-driven workflow. */
  @Column({ name: 'workflow_instance_id', type: 'uuid', nullable: true })
  workflowInstanceId: string | null;

  /** Every engineering artifact belongs to a Project — enforced at entity level. */
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'drawing_id', type: 'uuid', nullable: true })
  @Index()
  drawingId: string | null;

  @Column({ name: 'bom_id', type: 'uuid', nullable: true })
  @Index()
  bomId: string | null;
}