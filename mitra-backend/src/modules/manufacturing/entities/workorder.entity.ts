import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum WorkOrderStatus { DRAFT='DRAFT', RELEASED='RELEASED', IN_PROGRESS='IN_PROGRESS', PAUSED='PAUSED', ON_HOLD='ON_HOLD', REWORK='REWORK', COMPLETED='COMPLETED', CANCELLED='CANCELLED', SCRAPPED='SCRAPPED' }
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

  /** Sprint 2.3.1 G-1: artifact traceability links (UUID + index, no relations). */
  @Column({ name: 'drawing_id', type: 'uuid', nullable: true })
  @Index()
  drawingId: string | null;

  @Column({ name: 'bom_id', type: 'uuid', nullable: true })
  @Index()
  bomId: string | null;

  @Column({ name: 'bom_item_id', type: 'uuid', nullable: true })
  @Index()
  bomItemId: string | null;

  @Column({ name: 'routing_id', type: 'uuid', nullable: true })
  @Index()
  routingId: string | null;

  @Column({ name: 'process_plan_id', type: 'uuid', nullable: true })
  @Index()
  processPlanId: string | null;

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

  /** Sprint 2.4 MES: rework / scrap quantity tracking (Phase 5). */
  @Column({ name: 'rework_qty', type: 'decimal', precision: 10, scale: 3, default: 0 })
  reworkQty: number;

  @Column({ name: 'scrap_qty', type: 'decimal', precision: 10, scale: 3, default: 0 })
  scrapQty: number;

  /** Sprint 2.4 MES: immutable release snapshot (drawing/BOM/routing/process-plan revisions + cost baseline). */
  @Column({ type: 'jsonb', nullable: true })
  snapshot: Record<string, any> | null;

  @Column({ name: 'cost_baseline', type: 'decimal', precision: 18, scale: 2, nullable: true })
  costBaseline: number | null;

  @Column({ name: 'released_by', type: 'uuid', nullable: true })
  releasedBy: string | null;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt: Date | null;

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