import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum WorkCenterType {
  MACHINING = 'MACHINING',
  EDM = 'EDM',
  GRINDING = 'GRINDING',
  ASSEMBLY = 'ASSEMBLY',
  INSPECTION = 'INSPECTION',
  HEAT_TREATMENT = 'HEAT_TREATMENT',
  WELDING = 'WELDING',
  POLISHING = 'POLISHING',
  PAINTING = 'PAINTING',
  OTHER = 'OTHER',
}

/**
 * Work Center master (Process Planning). Groups machines with shared
 * cost/capacity characteristics. Tenant-scoped master data.
 */
@Entity('engineering_work_centers')
@Index(['code', 'deletedAt'])
export class EngineeringWorkCenter extends IndustrialBaseEntity {
  @Column({ type: 'varchar', length: 50 })
  @Index()
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string | null;

  @Column({ name: 'work_center_type', type: 'varchar', length: 30, default: WorkCenterType.MACHINING })
  workCenterType: WorkCenterType;

  @Column({ name: 'cost_per_hour', type: 'decimal', precision: 10, scale: 2, nullable: true })
  costPerHour: number | null;

  @Column({ name: 'capacity_hours_per_day', type: 'decimal', precision: 8, scale: 2, default: 8 })
  capacityHoursPerDay: number;

  /** machine_masters ids grouped under this work center. */
  @Column({ name: 'machine_ids', type: 'jsonb', nullable: true })
  machineIds: string[] | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
