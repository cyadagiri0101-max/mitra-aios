import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum SupplierStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('suppliers')
@Index(['supplierCode', 'deletedAt'])
@Index(['tenantId', 'deletedAt'])
export class Supplier extends IndustrialBaseEntity {
  @Column({ name: 'supplier_code', type: 'varchar', length: 30, unique: true })
  supplierCode: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'contact_person', type: 'varchar', length: 100, nullable: true })
  contactPerson: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'int', default: 0 })
  rating: number;

  @Column({ type: 'enum', enum: SupplierStatus, default: SupplierStatus.ACTIVE })
  status: SupplierStatus;
}
