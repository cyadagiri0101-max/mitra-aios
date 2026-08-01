import { Entity, Column, VersionColumn, Index, ManyToOne, JoinColumn  } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { Customer } from './customer.entity';

@Entity('contacts')
@Index(['customerId', 'deletedAt'])
@Index(['email', 'deletedAt'])
export class Contact extends IndustrialBaseEntity {
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  mobile: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  role: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  designation: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string | null;

  @Column({ name: 'communication_preferences', type: 'jsonb', nullable: true })
  communicationPreferences: Record<string, boolean> | null;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @VersionColumn()
  version: number;

  @ManyToOne(() => Customer, (customer) => customer.contacts)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
