import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

/**
 * Operation within a Process Routing. Carries operation sequence, work
 * center, machine (reference to machine_masters), cycle/setup/standard
 * times, tool and material requirements.
 */
@Entity('engineering_operations')
@Index(['routingId', 'deletedAt'])
export class EngineeringOperation extends IndustrialBaseEntity {
  @Column({ name: 'routing_id', type: 'uuid' })
  @Index()
  routingId: string;

  /** Operation sequence (10, 20, 30 …). */
  @Column({ name: 'operation_number', type: 'int' })
  operationNumber: number;

  @Column({ name: 'operation_code', type: 'varchar', length: 20, nullable: true })
  operationCode: string | null;

  @Column({ type: 'varchar', length: 300 })
  description: string;

  @Column({ name: 'work_center_id', type: 'uuid', nullable: true })
  @Index()
  workCenterId: string | null;

  /** Reference to machine_masters (existing machine module). */
  @Column({ name: 'machine_id', type: 'uuid', nullable: true })
  @Index()
  machineId: string | null;

  @Column({ name: 'setup_time_minutes', type: 'decimal', precision: 8, scale: 2, default: 0 })
  setupTimeMinutes: number;

  @Column({ name: 'cycle_time_minutes', type: 'decimal', precision: 8, scale: 2, default: 0 })
  cycleTimeMinutes: number;

  @Column({ name: 'standard_time_minutes', type: 'decimal', precision: 8, scale: 2, default: 0 })
  standardTimeMinutes: number;

  @Column({ name: 'quantity_per_cycle', type: 'decimal', precision: 12, scale: 4, default: 1 })
  quantityPerCycle: number;

  @Column({ name: 'cost_per_hour', type: 'decimal', precision: 10, scale: 2, nullable: true })
  costPerHour: number | null;

  @Column({ name: 'operation_cost', type: 'decimal', precision: 18, scale: 2, nullable: true })
  operationCost: number | null;

  /** Tool requirements: [{ toolCode, name, qty, description }]. */
  @Column({ name: 'tool_requirements', type: 'jsonb', nullable: true })
  toolRequirements: Record<string, any>[] | null;

  /** Material requirements: [{ materialCode, name, qty, uom }]. */
  @Column({ name: 'material_requirements', type: 'jsonb', nullable: true })
  materialRequirements: Record<string, any>[] | null;

  @Column({ name: 'inspection_required', type: 'boolean', default: false })
  inspectionRequired: boolean;

  /** Quality checkpoints: [dimension, tolerance, instrument]. */
  @Column({ name: 'quality_checkpoints', type: 'jsonb', nullable: true })
  qualityCheckpoints: Record<string, any>[] | null;

  @Column({ name: 'predecessor_operation_id', type: 'uuid', nullable: true })
  predecessorOperationId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
