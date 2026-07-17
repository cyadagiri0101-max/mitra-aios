import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('material_issues')
@Index(['issueNumber', 'deletedAt'])
@Index(['workOrderId', 'deletedAt'])
export class MaterialIssue extends IndustrialBaseEntity {
  @Column({ name: 'issue_number', type: 'varchar', length: 30, unique: true })
  issueNumber: string;

  @Column({ name: 'work_order_id', type: 'uuid', nullable: true })
  @Index()
  workOrderId: string | null;

  @Column({ name: 'issued_to_id', type: 'uuid', nullable: true })
  @Index()
  issuedToId: string | null;

  @Column({ name: 'issued_by_id', type: 'uuid', nullable: true })
  @Index()
  issuedById: string | null;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: Date;

  @Column({ name: 'material_code', type: 'varchar', length: 50 })
  materialCode: string;

  @Column({ name: 'material_description', type: 'varchar', length: 200 })
  materialDescription: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  @Column({ type: 'varchar', length: 20, default: 'KG' })
  unit: string;

  @Column({ name: 'batch_id', type: 'uuid', nullable: true })
  @Index()
  batchId: string | null;

  @Column({ name: 'store_location', type: 'varchar', length: 50, nullable: true })
  storeLocation: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}