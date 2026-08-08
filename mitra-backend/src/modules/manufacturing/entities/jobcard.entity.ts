import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum JobCardStatus { OPEN='OPEN', IN_PROGRESS='IN_PROGRESS', PAUSED='PAUSED', ON_HOLD='ON_HOLD', REWORK='REWORK', COMPLETED='COMPLETED', CANCELLED='CANCELLED', SCRAPPED='SCRAPPED' }

/** Sprint 2.4 MES shop-floor execution package (Phase 3/5). */
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

  @Column({ name: 'operation_number', type: 'int', nullable: true })
  operationNumber: number | null;

  @Column({ name: 'operation_code', type: 'varchar', length: 20, nullable: true })
  operationCode: string | null;

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

  @Column({ name: 'produced_qty', type: 'decimal', precision: 10, scale: 3, default: 0 })
  producedQty: number;

  @Column({ name: 'rejected_qty', type: 'decimal', precision: 10, scale: 3, default: 0 })
  rejectedQty: number;

  @Column({ name: 'rework_qty', type: 'decimal', precision: 10, scale: 3, default: 0 })
  reworkQty: number;

  @Column({ name: 'scrap_qty', type: 'decimal', precision: 10, scale: 3, default: 0 })
  scrapQty: number;

  @Column({ name: 'setup_time_minutes', type: 'int', default: 0 })
  setupTimeMinutes: number;

  @Column({ name: 'downtime_minutes', type: 'int', default: 0 })
  downtimeMinutes: number;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'hold_reason', type: 'text', nullable: true })
  holdReason: string | null;

  @Column({ type: 'enum', enum: JobCardStatus, default: JobCardStatus.OPEN })
  status: JobCardStatus;

  @Column({ name: 'instructions', type: 'text', nullable: true })
  instructions: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}
