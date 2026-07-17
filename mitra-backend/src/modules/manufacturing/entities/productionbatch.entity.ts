import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('production_batches')
@Index(['batchNumber', 'deletedAt'])
export class ProductionBatch extends IndustrialBaseEntity {
  @Column({ name: 'batch_number', type: 'varchar', length: 30, unique: true })
  batchNumber: string;

  @Column({ name: 'work_order_id', type: 'uuid', nullable: true })
  @Index()
  workOrderId: string | null;

  @Column({ name: 'material_id', type: 'uuid', nullable: true })
  @Index()
  materialId: string | null;

  @Column({ name: 'material_description', type: 'varchar', length: 200, nullable: true })
  materialDescription: string | null;

  @Column({ name: 'batch_qty', type: 'decimal', precision: 10, scale: 3 })
  batchQty: number;

  @Column({ type: 'varchar', length: 20, default: 'KG' })
  unit: string;

  @Column({ name: 'production_date', type: 'date', nullable: true })
  productionDate: Date | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'supplier_batch', type: 'varchar', length: 50, nullable: true })
  supplierBatch: string | null;

  @Column({ name: 'inspection_result', type: 'varchar', length: 20, nullable: true })
  inspectionResult: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}