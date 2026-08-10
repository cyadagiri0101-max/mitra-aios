import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum BomItemType {
  ASSEMBLY = 'ASSEMBLY',
  SUB_ASSEMBLY = 'SUB_ASSEMBLY',
  PART = 'PART',
  RAW_MATERIAL = 'RAW_MATERIAL',
  STANDARD_COMPONENT = 'STANDARD_COMPONENT',
  PURCHASED_COMPONENT = 'PURCHASED_COMPONENT',
  SUBSTITUTE = 'SUBSTITUTE',
  ALTERNATE = 'ALTERNATE',
  TOOLING = 'TOOLING',
  CONSUMABLE = 'CONSUMABLE',
}

export enum BomItemSourceType {
  MAKE = 'MAKE',
  BUY = 'BUY',
  SUB_CONTRACT = 'SUB_CONTRACT',
  RAW = 'RAW',
}

/**
 * Engineering BOM line item. Multi-level via parent_item_id (self
 * reference). Carries quantity, UoM + conversion, cost, alternate /
 * substitute links and traceability to drawings, materials, components
 * and suppliers.
 */
@Entity('engineering_bom_items')
@Index(['bomId', 'deletedAt'])
@Index(['parentItemId', 'deletedAt'])
@Index(['bomId', 'itemType', 'deletedAt'])
export class EngineeringBomItem extends IndustrialBaseEntity {
  @Column({ name: 'bom_id', type: 'uuid' })
  @Index()
  bomId: string;

  /** Parent line (multi-level BOM). NULL for top-level items. */
  @Column({ name: 'parent_item_id', type: 'uuid', nullable: true })
  parentItemId: string | null;

  /** Human-readable line reference: 1, 1.2, A3 … */
  @Column({ name: 'line_number', type: 'varchar', length: 20, nullable: true })
  lineNumber: string | null;

  @Column({ name: 'part_number', type: 'varchar', length: 50, nullable: true })
  partNumber: string | null;

  @Column({ name: 'part_name', type: 'varchar', length: 200 })
  partName: string;

  @Column({ name: 'item_type', type: 'varchar', length: 30, default: BomItemType.PART })
  itemType: BomItemType;

  @Column({ name: 'source_type', type: 'varchar', length: 20, default: BomItemSourceType.MAKE })
  sourceType: BomItemSourceType;

  /** Linked drawing (traceability: BOM → Drawing). */
  @Column({ name: 'drawing_id', type: 'uuid', nullable: true })
  @Index()
  drawingId: string | null;

  /** Linked material library entry. */
  @Column({ name: 'material_id', type: 'uuid', nullable: true })
  @Index()
  materialId: string | null;

  /** Linked component library entry. */
  @Column({ name: 'component_id', type: 'uuid', nullable: true })
  @Index()
  componentId: string | null;

  @Column({ name: 'quantity_per', type: 'decimal', precision: 12, scale: 4, default: 1 })
  quantityPer: number;

  /** Quantity in the BOM unit (defaults to quantity_per for top level). */
  @Column({ type: 'decimal', precision: 12, scale: 4, default: 1 })
  quantity: number;

  @Column({ type: 'varchar', length: 20, default: 'EA' })
  uom: string;

  @Column({ name: 'base_uom', type: 'varchar', length: 20, nullable: true })
  baseUom: string | null;

  /** Multiplier to convert `uom` quantities into `base_uom`. */
  @Column({ name: 'conversion_factor', type: 'decimal', precision: 12, scale: 4, default: 1 })
  conversionFactor: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 18, scale: 4, nullable: true })
  unitCost: number | null;

  @Column({ name: 'extended_cost', type: 'decimal', precision: 18, scale: 4, nullable: true })
  extendedCost: number | null;

  @Column({ name: 'cost_currency', type: 'varchar', length: 10, nullable: true })
  costCurrency: string | null;

  @Column({ name: 'lead_time_days', type: 'int', nullable: true })
  leadTimeDays: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  reference: string | null;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  supplierId: string | null;

  @Column({ name: 'supplier_name', type: 'varchar', length: 200, nullable: true })
  supplierName: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  /** Item-level effectivity (Sprint 2.3.1 G-2) — window in which the line is usable. */
  @Column({ name: 'effective_from', type: 'date', nullable: true })
  effectiveFrom: Date | null;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo: Date | null;

  @Column({ name: 'make_or_buy_notes', type: 'text', nullable: true })
  makeOrBuyNotes: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
