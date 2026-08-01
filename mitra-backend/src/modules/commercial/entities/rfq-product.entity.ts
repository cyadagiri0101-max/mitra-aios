import { Entity, Column, VersionColumn, Index, ManyToOne, JoinColumn  } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { Rfq } from './rfq.entity';

@Entity('rfq_products')
@Index(['rfqId', 'deletedAt'])
export class RfqProduct extends IndustrialBaseEntity {
  @Column({ name: 'rfq_id', type: 'uuid' })
  @Index()
  rfqId: string;

  @Column({ name: 'line_number', type: 'int' })
  lineNumber: number;

  @Column({ name: 'product_name', type: 'varchar', length: 200 })
  productName: string;

  @Column({ name: 'product_code', type: 'varchar', length: 50, nullable: true })
  productCode: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 1 })
  quantity: number;

  @Column({ type: 'varchar', length: 20, default: 'NOS' })
  unit: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  material: string | null;

  @Column({ name: 'target_price', type: 'decimal', precision: 18, scale: 2, nullable: true })
  targetPrice: number | null;

  @Column({ name: 'delivery_weeks', type: 'int', nullable: true })
  deliveryWeeks: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @VersionColumn()
  version: number;

  @ManyToOne(() => Rfq, (rfq) => rfq.products)
  @JoinColumn({ name: 'rfq_id' })
  rfq: Rfq;
}
