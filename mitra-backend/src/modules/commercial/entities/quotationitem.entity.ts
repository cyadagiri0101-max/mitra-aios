import { Entity, Column, VersionColumn, Index  } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('quotation_items')
@Index(['quotationId', 'deletedAt'])
export class QuotationItem extends IndustrialBaseEntity {
  @Column({ name: 'quotation_id', type: 'uuid' })
  quotationId: string;

  @Column({ name: 'line_number', type: 'int' })
  lineNumber: number;

  @Column({ name: 'item_code', type: 'varchar', length: 50, nullable: true })
  itemCode: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'item_category', type: 'varchar', length: 50, nullable: true })
  itemCategory: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 1 })
  quantity: number;

  @Column({ type: 'varchar', length: 20, default: 'NOS' })
  unit: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 18, scale: 2 })
  unitPrice: number;

  @Column({ name: 'estimated_cost', type: 'decimal', precision: 18, scale: 2, default: 0 })
  estimatedCost: number;

  @Column({ name: 'selling_price', type: 'decimal', precision: 18, scale: 2, default: 0 })
  sellingPrice: number;

  @Column({ name: 'margin_amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  marginAmount: number;

  @Column({ name: 'margin_pct', type: 'decimal', precision: 5, scale: 2, default: 0 })
  marginPct: number;

  @Column({ name: 'discount_pct', type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPct: number;

  @Column({ name: 'line_total', type: 'decimal', precision: 18, scale: 2 })
  lineTotal: number;

  @Column({ name: 'lead_time_weeks', type: 'int', nullable: true })
  leadTimeWeeks: number | null;

  @Column({ name: 'hsn_code', type: 'varchar', length: 20, nullable: true })
  hsnCode: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @VersionColumn()
  version: number;
}