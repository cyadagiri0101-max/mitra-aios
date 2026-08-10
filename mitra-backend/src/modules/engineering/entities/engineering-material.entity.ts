import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum MaterialCategory {
  STEEL = 'STEEL',
  ALUMINUM = 'ALUMINUM',
  COPPER = 'COPPER',
  BRASS = 'BRASS',
  TITANIUM = 'TITANIUM',
  PLASTIC = 'PLASTIC',
  RUBBER = 'RUBBER',
  CERAMIC = 'CERAMIC',
  COMPOSITE = 'COMPOSITE',
  OTHER = 'OTHER',
}

/**
 * Material Library entry — grades, standards, density, cost, suppliers and
 * mechanical/thermal properties. AI-ready: fields are JSONB so embeddings
 * and similarity search can be attached later without schema changes.
 */
@Entity('engineering_materials')
@Index(['materialCode', 'deletedAt'])
@Index(['category', 'deletedAt'])
export class EngineeringMaterial extends IndustrialBaseEntity {
  @Column({ name: 'material_code', type: 'varchar', length: 50 })
  @Index()
  materialCode: string;

  @Column({ name: 'material_name', type: 'varchar', length: 200 })
  materialName: string;

  @Column({ type: 'varchar', length: 50, default: MaterialCategory.STEEL })
  category: MaterialCategory;

  @Column({ type: 'varchar', length: 100, nullable: true })
  grade: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  standard: string | null;

  /** g/cm³ */
  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  density: number | null;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 18, scale: 4, nullable: true })
  unitCost: number | null;

  @Column({ name: 'cost_currency', type: 'varchar', length: 10, nullable: true })
  costCurrency: string | null;

  /** Supplier library ids. */
  @Column({ name: 'supplier_ids', type: 'jsonb', nullable: true })
  supplierIds: string[] | null;

  @Column({ name: 'preferred_supplier_id', type: 'uuid', nullable: true })
  preferredSupplierId: string | null;

  @Column({ name: 'preferred_supplier_name', type: 'varchar', length: 200, nullable: true })
  preferredSupplierName: string | null;

  /** { yieldStrengthMpa, tensileStrengthMpa, hardnessHrc, elongationPct, ... } */
  @Column({ name: 'mechanical_properties', type: 'jsonb', nullable: true })
  mechanicalProperties: Record<string, any> | null;

  /** { meltingPointC, thermalConductivityWmK, specificHeatJkgK, ... } */
  @Column({ name: 'thermal_properties', type: 'jsonb', nullable: true })
  thermalProperties: Record<string, any> | null;

  /** Available stock sizes: [ { w, h, d, uom } ] */
  @Column({ name: 'available_sizes', type: 'jsonb', nullable: true })
  availableSizes: Record<string, any>[] | null;

  @Column({ name: 'lead_time_days', type: 'int', nullable: true })
  leadTimeDays: number | null;

  @Column({ type: 'int', nullable: true })
  moq: number | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
