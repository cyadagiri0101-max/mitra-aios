import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('products')
@Index(['productCode', 'deletedAt'])
@Index(['tenantId', 'deletedAt'])
export class Product extends IndustrialBaseEntity {
  @Column({ name: 'product_code', type: 'varchar', length: 30, unique: true })
  productCode: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  @Index()
  supplierId: string | null;

  @Column({ name: 'supplier_name', type: 'varchar', length: 200, nullable: true })
  supplierName: string | null;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.ACTIVE })
  status: ProductStatus;

  @Column({ name: 'unit_price', type: 'decimal', precision: 18, scale: 2, nullable: true })
  unitPrice: number | null;
}
