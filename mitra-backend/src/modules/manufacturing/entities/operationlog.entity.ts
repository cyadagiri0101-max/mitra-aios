import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('operation_logs')
@Index(['workOrderId', 'deletedAt'])
export class OperationLog extends IndustrialBaseEntity {
  @Column({ name: 'work_order_id', type: 'uuid' })
  workOrderId: string;

  /** Sprint 2.4 MES: job-card + routing-operation links (Phase 8 traceability). */
  @Column({ name: 'job_card_id', type: 'uuid', nullable: true })
  @Index()
  jobCardId: string | null;

  @Column({ name: 'operation_id', type: 'uuid', nullable: true })
  @Index()
  operationId: string | null;

  @Column({ name: 'operator_id', type: 'uuid', nullable: true })
  @Index()
  operatorId: string | null;

  @Column({ name: 'machine_id', type: 'uuid', nullable: true })
  @Index()
  machineId: string | null;

  @Column({ name: 'shift', type: 'varchar', length: 20, nullable: true })
  shift: string | null;

  @Column({ name: 'log_date', type: 'date' })
  logDate: Date;

  @Column({ name: 'start_time', type: 'timestamptz', nullable: true })
  startTime: Date | null;

  @Column({ name: 'end_time', type: 'timestamptz', nullable: true })
  endTime: Date | null;

  @Column({ name: 'duration_minutes', type: 'decimal', precision: 8, scale: 2, nullable: true })
  durationMinutes: number | null;

  @Column({ name: 'qty_produced', type: 'decimal', precision: 10, scale: 3, default: 0 })
  qtyProduced: number;

  @Column({ name: 'qty_rejected', type: 'decimal', precision: 10, scale: 3, default: 0 })
  qtyRejected: number;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'machine_downtime_minutes', type: 'int', default: 0 })
  machineDowntimeMinutes: number;

  @Column({ name: 'downtime_reason', type: 'text', nullable: true })
  downtimeReason: string | null;

  /** Sprint 2.4 MES: rework/scrap/setup capture (Phase 5). */
  @Column({ name: 'rework_qty', type: 'decimal', precision: 10, scale: 3, default: 0 })
  reworkQty: number;

  @Column({ name: 'scrap_qty', type: 'decimal', precision: 10, scale: 3, default: 0 })
  scrapQty: number;

  @Column({ name: 'setup_time_minutes', type: 'int', default: 0 })
  setupTimeMinutes: number;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}