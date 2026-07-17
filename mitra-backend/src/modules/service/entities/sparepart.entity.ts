import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('spare_parts')
@Index(['partCode', 'deletedAt'])
export class SparePart extends IndustrialBaseEntity {
  @Column({ name: 'part_code', type: 'varchar', length: 30, unique: true })
  partCode: string;

  @Column({ name: 'part_name', type: 'varchar', length: 200 })
  partName: string;

  @Column({ name: 'part_category', type: 'varchar', length: 50, nullable: true })
  partCategory: string | null;

  @Column({ name: 'compatible_mold_types', type: 'jsonb', nullable: true })
  compatibleMoldTypes: string[] | null;

  @Column({ name: 'unit_of_measure', type: 'varchar', length: 20, default: 'NOS' })
  unitOfMeasure: string;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitCost: number | null;

  @Column({ name: 'stock_qty', type: 'decimal', precision: 10, scale: 3, default: 0 })
  stockQty: number;

  @Column({ name: 'min_stock_qty', type: 'decimal', precision: 10, scale: 3, default: 0 })
  minStockQty: number;

  @Column({ name: 'reorder_qty', type: 'decimal', precision: 10, scale: 3, nullable: true })
  reorderQty: number | null;

  @Column({ name: 'lead_time_days', type: 'int', nullable: true })
  leadTimeDays: number | null;

  @Column({ name: 'preferred_supplier', type: 'varchar', length: 100, nullable: true })
  preferredSupplier: string | null;

  @Column({ name: 'store_location', type: 'varchar', length: 50, nullable: true })
  storeLocation: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}