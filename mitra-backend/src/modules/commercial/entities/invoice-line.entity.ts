import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value == null ? value : Number(value)),
};

@Entity('invoice_lines')
@Index(['invoiceId', 'deletedAt'])
export class InvoiceLine extends IndustrialBaseEntity {
  @Column({ name: 'invoice_id', type: 'uuid' })
  invoiceId: string;

  @Column({ name: 'sales_order_line_id', type: 'uuid', nullable: true })
  salesOrderLineId: string | null;

  @Column({ name: 'line_number', type: 'int' })
  lineNumber: number;

  @Column({ name: 'item_code', type: 'varchar', length: 50, nullable: true })
  itemCode: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'item_category', type: 'varchar', length: 50, nullable: true })
  itemCategory: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 1, transformer: decimalTransformer })
  quantity: number;

  @Column({ type: 'varchar', length: 20, default: 'NOS' })
  unit: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 18, scale: 2, transformer: decimalTransformer })
  unitPrice: number;

  @Column({ name: 'tax_pct', type: 'decimal', precision: 5, scale: 2, default: 0, transformer: decimalTransformer })
  taxPct: number;

  @Column({ name: 'line_total', type: 'decimal', precision: 18, scale: 2, transformer: decimalTransformer })
  lineTotal: number;
}
