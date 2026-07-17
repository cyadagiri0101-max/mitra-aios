import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum DispatchStatus {
  PLANNING  = 'PLANNING',
  PACKED    = 'PACKED',
  SHIPPED   = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

@Entity('dispatch_plans')
@Index(['tenantId', 'deletedAt'])
@Index(['projectId', 'deletedAt'])
export class DispatchPlan extends IndustrialBaseEntity {
  @Column({ name: 'dispatch_number', type: 'varchar', length: 30, unique: true })
  dispatchNumber: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 200 })
  customerName: string;

  @Column({ type: 'varchar', length: 20, default: DispatchStatus.PLANNING })
  status: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  carrier: string | null;

  @Column({ name: 'tracking_number', type: 'varchar', length: 100, nullable: true })
  trackingNumber: string | null;

  @Column({ name: 'planned_date', type: 'date', nullable: true })
  plannedDate: Date | null;

  @Column({ name: 'shipped_date', type: 'date', nullable: true })
  shippedDate: Date | null;

  @Column({ name: 'delivered_date', type: 'date', nullable: true })
  deliveredDate: Date | null;

  @Column({ name: 'packing_list', type: 'jsonb', nullable: true })
  packingList: Record<string, unknown>[] | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
