import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

/**
 * Process Routing header (Process Planning). Defines the manufacturing
 * route for a part/drawing: an ordered set of operations executed at work
 * centers/machines. DB-driven workflow: engineering_routing.
 */
@Entity('engineering_routings')
@Index(['routingNumber', 'deletedAt'])
@Index(['projectId', 'deletedAt'])
export class EngineeringRouting extends IndustrialBaseEntity {
  @Column({ name: 'routing_number', type: 'varchar', length: 30 })
  @Index()
  routingNumber: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  /** Every engineering artifact belongs to a Project — enforced at entity level. */
  @Column({ name: 'project_id', type: 'uuid' })
  @Index()
  projectId: string;

  @Column({ name: 'part_id', type: 'uuid', nullable: true })
  partId: string | null;

  @Column({ name: 'drawing_id', type: 'uuid', nullable: true })
  drawingId: string | null;

  @Column({ name: 'bom_id', type: 'uuid', nullable: true })
  bomId: string | null;

  @Column({ type: 'int', default: 1 })
  version: number;

  /** Workflow-driven status — mirrors the engineering_routing workflow state. */
  @Column({ type: 'varchar', length: 50, default: 'DRAFT' })
  status: string;

  @Column({ name: 'workflow_instance_id', type: 'uuid', nullable: true })
  workflowInstanceId: string | null;

  @Column({ name: 'total_setup_hours', type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalSetupHours: number | null;

  @Column({ name: 'total_cycle_hours', type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalCycleHours: number | null;

  @Column({ name: 'total_standard_hours', type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalStandardHours: number | null;

  @Column({ name: 'total_cost', type: 'decimal', precision: 18, scale: 2, nullable: true })
  totalCost: number | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'released_by', type: 'uuid', nullable: true })
  releasedBy: string | null;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
