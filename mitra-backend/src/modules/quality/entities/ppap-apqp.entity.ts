import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum PpapApqpType { PPAP='PPAP', APQP='APQP' }
export enum PpapApqpStatus { PLANNED='PLANNED', IN_PROGRESS='IN_PROGRESS', APPROVED='APPROVED', HOLD='HOLD' }

@Entity('quality_ppap_apqp')
@Index(['recordNumber', 'deletedAt'])
@Index(['projectId', 'status', 'deletedAt'])
export class PpapApqpRecord extends IndustrialBaseEntity {
  @Column({ name: 'record_number', type: 'varchar', length: 40, unique: true })
  recordNumber: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;


  @Column({ name: 'drawing_id', type: 'uuid', nullable: true })
  @Index()
  drawingId: string | null;

  @Column({ name: 'bom_id', type: 'uuid', nullable: true })
  @Index()
  bomId: string | null;

  @Column({ name: 'routing_id', type: 'uuid', nullable: true })
  @Index()
  routingId: string | null;

  @Column({ name: 'work_order_id', type: 'uuid', nullable: true })
  @Index()
  workOrderId: string | null;

  @Column({ name: 'job_card_id', type: 'uuid', nullable: true })
  @Index()
  jobCardId: string | null;

  @Column({ name: 'machine_id', type: 'uuid', nullable: true })
  @Index()
  machineId: string | null;

  @Column({ name: 'operator_id', type: 'uuid', nullable: true })
  @Index()
  operatorId: string | null;

  @Column({ name: 'inspection_plan_id', type: 'uuid', nullable: true })
  @Index()
  inspectionPlanId: string | null;

  @Column({ name: 'material_lot', type: 'varchar', length: 80, nullable: true })
  materialLot: string | null;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  @Index()
  supplierId: string | null;

  @Column({ name: 'record_type', type: 'varchar', length: 20, default: PpapApqpType.PPAP })
  recordType: PpapApqpType;

  @Column({ type: 'varchar', length: 50, default: PpapApqpStatus.PLANNED })
  status: PpapApqpStatus;

  @Column({ type: 'text', nullable: true })
  deliverables: string | null;

  @Column({ type: 'text', nullable: true })
  milestones: string | null;

  @Column({ name: 'readiness_review', type: 'text', nullable: true })
  readinessReview: string | null;

  @Column({ name: 'submission_level', type: 'varchar', length: 20, nullable: true })
  submissionLevel: string | null;

  @Column({ type: 'text', nullable: true })
  documentation: string | null;
}
