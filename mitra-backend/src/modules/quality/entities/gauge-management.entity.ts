import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum GaugeStatus { ACTIVE='ACTIVE', CALIBRATION_DUE='CALIBRATION_DUE', OUT_OF_SERVICE='OUT_OF_SERVICE', EXPIRED='EXPIRED' }

@Entity('quality_gauges')
@Index(['gaugeNumber', 'deletedAt'])
@Index(['projectId', 'status', 'deletedAt'])
export class GaugeManagement extends IndustrialBaseEntity {
  @Column({ name: 'gauge_number', type: 'varchar', length: 40, unique: true })
  gaugeNumber: string;

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

  @Column({ type: 'varchar', length: 80, nullable: true })
  description: string | null;

  @Column({ name: 'gauge_type', type: 'varchar', length: 40, nullable: true })
  gaugeType: string | null;

  @Column({ type: 'varchar', length: 40, default: GaugeStatus.ACTIVE })
  status: GaugeStatus;

  @Column({ name: 'calibration_due_date', type: 'date', nullable: true })
  calibrationDueDate: Date | null;

  @Column({ name: 'last_calibration_date', type: 'date', nullable: true })
  lastCalibrationDate: Date | null;

  @Column({ name: 'calibration_schedule', type: 'varchar', length: 60, nullable: true })
  calibrationSchedule: string | null;

  @Column({ name: 'usage_count', type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'jsonb', nullable: true })
  history: Record<string, any> | null;
}
