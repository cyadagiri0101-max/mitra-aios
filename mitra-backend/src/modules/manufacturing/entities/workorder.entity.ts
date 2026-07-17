import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum WorkOrderStatus { DRAFT='DRAFT', RELEASED='RELEASED', IN_PROGRESS='IN_PROGRESS', ON_HOLD='ON_HOLD', COMPLETED='COMPLETED', CANCELLED='CANCELLED' }
export enum WorkOrderPriority { LOW='LOW', NORMAL='NORMAL', HIGH='HIGH', URGENT='URGENT' }

@Entity('work_orders')
@Index(['woNumber', 'deletedAt'])
@Index(['projectId', 'status', 'deletedAt'])
export class WorkOrder extends IndustrialBaseEntity {
  @Column({ name: 'wo_number', type: 'varchar', length: 30, unique: true })
  woNumber: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'part_id', type: 'uuid', nullable: true })
  @Index()
  partId: string | null;

  @Column({ name: 'part_name', type: 'varchar', length: 200 })
  partName: string;

  @Column({ name: 'operation_type', type: 'varchar', length: 100 })
  operationType: string;

  @Column({ name: 'planned_start_date', type: 'date', nullable: true })
  plannedStartDate: Date | null;

  @Column({ name: 'planned_end_date', type: 'date', nullable: true })
  plannedEndDate: Date | null;

  @Column({ name: 'actual_start_date', type: 'date', nullable: true })
  actualStartDate: Date | null;

  @Column({ name: 'actual_end_date', type: 'date', nullable: true })
  actualEndDate: Date | null;

  @Column({ name: 'planned_qty', type: 'decimal', precision: 10, scale: 3, default: 1 })
  plannedQty: number;

  @Column({ name: 'completed_qty', type: 'decimal', precision: 10, scale: 3, default: 0 })
  completedQty: number;

  @Column({ name: 'rejected_qty', type: 'decimal', precision: 10, scale: 3, default: 0 })
  rejectedQty: number;

  @Column({ name: 'machine_id', type: 'uuid', nullable: true })
  @Index()
  machineId: string | null;

  @Column({ name: 'operator_id', type: 'uuid', nullable: true })
  @Index()
  operatorId: string | null;

  @Column({ name: 'supervisor_id', type: 'uuid', nullable: true })
  @Index()
  supervisorId: string | null;

  @Column({ name: 'estimated_hours', type: 'decimal', precision: 8, scale: 2, nullable: true })
  estimatedHours: number | null;

  @Column({ name: 'actual_hours', type: 'decimal', precision: 8, scale: 2, nullable: true })
  actualHours: number | null;

  @Column({ type: 'enum', enum: WorkOrderStatus, default: WorkOrderStatus.DRAFT })
  status: WorkOrderStatus;

  @Column({ type: 'enum', enum: WorkOrderPriority, default: WorkOrderPriority.NORMAL })
  priority: WorkOrderPriority;

  @Column({ name: 'drawing_revision', type: 'varchar', length: 10, nullable: true })
  drawingRevision: string | null;

  @Column({ type: 'text', nullable: true })
  instructions: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}