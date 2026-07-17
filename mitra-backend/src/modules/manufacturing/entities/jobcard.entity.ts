import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum JobCardStatus { OPEN='OPEN', IN_PROGRESS='IN_PROGRESS', COMPLETED='COMPLETED', CANCELLED='CANCELLED' }

@Entity('job_cards')
@Index(['jobCardNumber', 'deletedAt'])
@Index(['workOrderId', 'deletedAt'])
export class JobCard extends IndustrialBaseEntity {
  @Column({ name: 'job_card_number', type: 'varchar', length: 30, unique: true })
  jobCardNumber: string;

  @Column({ name: 'work_order_id', type: 'uuid' })
  @Index()
  workOrderId: string;

  @Column({ name: 'operation_id', type: 'uuid', nullable: true })
  @Index()
  operationId: string | null;

  @Column({ name: 'machine_id', type: 'uuid', nullable: true })
  @Index()
  machineId: string | null;

  @Column({ name: 'operator_id', type: 'uuid', nullable: true })
  @Index()
  operatorId: string | null;

  @Column({ name: 'planned_date', type: 'date', nullable: true })
  plannedDate: Date | null;

  @Column({ name: 'planned_hours', type: 'decimal', precision: 6, scale: 2, nullable: true })
  plannedHours: number | null;

  @Column({ name: 'actual_hours', type: 'decimal', precision: 6, scale: 2, nullable: true })
  actualHours: number | null;

  @Column({ name: 'qty_planned', type: 'decimal', precision: 10, scale: 3, default: 1 })
  qtyPlanned: number;

  @Column({ name: 'qty_completed', type: 'decimal', precision: 10, scale: 3, default: 0 })
  qtyCompleted: number;

  @Column({ type: 'enum', enum: JobCardStatus, default: JobCardStatus.OPEN })
  status: JobCardStatus;

  @Column({ name: 'instructions', type: 'text', nullable: true })
  instructions: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}