import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ComponentType {
  STANDARD = 'STANDARD',
  PURCHASED = 'PURCHASED',
  MANUFACTURED = 'MANUFACTURED',
}

/**
 * Component Library entry — standard, purchased or manufactured components
 * with vendor mapping and alternate component relationships.
 */
@Entity('engineering_components')
@Index(['componentCode', 'deletedAt'])
@Index(['componentType', 'deletedAt'])
export class EngineeringComponent extends IndustrialBaseEntity {
  @Column({ name: 'component_code', type: 'varchar', length: 50 })
  @Index()
  componentCode: string;

  @Column({ name: 'component_name', type: 'varchar', length: 200 })
  componentName: string;

  @Column({ name: 'component_type', type: 'varchar', length: 20, default: ComponentType.STANDARD })
  componentType: ComponentType;

  /** e.g. "screws", "ejector pins", "springs", "bushings". */
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  manufacturer: string | null;

  @Column({ name: 'model_number', type: 'varchar', length: 100, nullable: true })
  modelNumber: string | null;

  @Column({ name: 'unit_of_measure', type: 'varchar', length: 20, default: 'EA' })
  unitOfMeasure: string;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 18, scale: 4, nullable: true })
  unitCost: number | null;

  @Column({ name: 'cost_currency', type: 'varchar', length: 10, nullable: true })
  costCurrency: string | null;

  /** Vendor mapping: [ { supplierId, supplierName, partNumber, unitPrice, leadTimeDays, preferred } ]. */
  @Column({ name: 'vendor_mapping', type: 'jsonb', nullable: true })
  vendorMapping: Record<string, any>[] | null;

  /** Linked engineering drawing ids. */
  @Column({ name: 'drawing_ids', type: 'jsonb', nullable: true })
  drawingIds: string[] | null;

  @Column({ type: 'text', nullable: true })
  specification: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
