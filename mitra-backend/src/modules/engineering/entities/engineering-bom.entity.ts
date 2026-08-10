import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

/**
 * Engineering BOM header. Supports multi-level structure (via
 * engineering_bom_items.parent_item_id), BOM revision + version, effective
 * dates and a DB-driven workflow (engineering_bom).
 */
@Entity('engineering_boms')
@Index(['bomNumber', 'deletedAt'])
@Index(['projectId', 'deletedAt'])
@Index(['projectId', 'status', 'deletedAt'])
export class EngineeringBom extends IndustrialBaseEntity {
  @Column({ name: 'bom_number', type: 'varchar', length: 30 })
  @Index()
  bomNumber: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  /** Every engineering artifact belongs to a Project — enforced at entity level. */
  @Column({ name: 'project_id', type: 'uuid' })
  @Index()
  projectId: string;

  /** Source drawing this BOM was created from. */
  @Column({ name: 'drawing_id', type: 'uuid', nullable: true })
  @Index()
  drawingId: string | null;

  @Column({ type: 'varchar', length: 10, default: 'A' })
  revision: string;

  @Column({ name: 'version_number', type: 'int', default: 1 })
  versionNumber: number;

  /** Workflow-driven status — mirrors the engineering_bom workflow state. */
  @Column({ type: 'varchar', length: 50, default: 'DRAFT' })
  status: string;

  @Column({ name: 'workflow_instance_id', type: 'uuid', nullable: true })
  workflowInstanceId: string | null;

  @Column({ name: 'effective_from', type: 'date', nullable: true })
  effectiveFrom: Date | null;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo: Date | null;

  /** Rolled-up material cost (computed by cost roll-up). */
  @Column({ name: 'total_cost', type: 'decimal', precision: 18, scale: 2, nullable: true })
  totalCost: number | null;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ name: 'is_current', type: 'boolean', default: true })
  isCurrent: boolean;

  @Column({ name: 'released_by', type: 'uuid', nullable: true })
  releasedBy: string | null;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
