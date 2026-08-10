import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum CheckpointStatus { PENDING='PENDING', PASS='PASS', FAIL='FAIL', SKIP='SKIP', NA='NA' }

/**
 * Sprint 2.4 MES — inspection checkpoint auto-generated at work order
 * release from the routing operation quality_checkpoints (Phase 9).
 */
@Entity('inspection_checkpoints')
@Index(['workOrderId', 'deletedAt'])
@Index(['status', 'deletedAt'])
@Index(['inspectionReportId', 'deletedAt'])
export class InspectionCheckpoint extends IndustrialBaseEntity {
  @Column({ name: 'checkpoint_number', type: 'varchar', length: 20 })
  checkpointNumber: string;

  @Column({ name: 'work_order_id', type: 'uuid' })
  @Index()
  workOrderId: string;

  @Column({ name: 'operation_id', type: 'uuid', nullable: true })
  operationId: string | null;

  @Column({ name: 'operation_number', type: 'int', nullable: true })
  operationNumber: number | null;

  @Column({ name: 'operation_code', type: 'varchar', length: 20, nullable: true })
  operationCode: string | null;

  @Column({ name: 'checkpoint_name', type: 'varchar', length: 200, nullable: true })
  checkpointName: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  dimension: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tolerance: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  instrument: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  method: string | null;

  @Column({ name: 'is_critical', type: 'boolean', default: false })
  isCritical: boolean;

  @Column({ type: 'enum', enum: CheckpointStatus, default: CheckpointStatus.PENDING })
  status: CheckpointStatus;

  @Column({ name: 'measured_value', type: 'varchar', length: 100, nullable: true })
  measuredValue: string | null;

  @Column({ name: 'inspected_by', type: 'uuid', nullable: true })
  inspectedBy: string | null;

  @Column({ name: 'inspected_at', type: 'timestamptz', nullable: true })
  inspectedAt: Date | null;

  @Column({ name: 'inspection_report_id', type: 'uuid', nullable: true })
  inspectionReportId: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}
