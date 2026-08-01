import { Entity, Column, VersionColumn, Index, ManyToOne, JoinColumn  } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { Customer } from './customer.entity';

export enum AddressType {
  BILLING = 'BILLING',
  SHIPPING = 'SHIPPING',
  REGISTERED = 'REGISTERED',
}

@Entity('customer_addresses')
@Index(['customerId', 'deletedAt'])
@Index(['addressType', 'deletedAt'])
export class CustomerAddress extends IndustrialBaseEntity {
  @Column({ name: 'customer_id', type: 'uuid' })
  @Index()
  customerId: string;

  @Column({ name: 'address_type', type: 'varchar', length: 20, default: AddressType.BILLING })
  addressType: AddressType;

  @Column({ type: 'varchar', length: 200 })
  line1: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  line2: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  line3: string | null;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 100 })
  state: string;

  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
  postalCode: string | null;

  @Column({ type: 'varchar', length: 100, default: 'India' })
  country: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @VersionColumn()
  version: number;

  @ManyToOne(() => Customer, (customer) => customer.addresses)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
