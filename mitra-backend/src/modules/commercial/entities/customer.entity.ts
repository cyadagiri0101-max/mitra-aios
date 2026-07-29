import { Entity, Column, Index, OneToMany } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { Contact } from './contact.entity';

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('customers')
@Index(['name', 'deletedAt'])
@Index(['status', 'deletedAt'])
export class Customer extends IndustrialBaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  industry: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: CustomerStatus;

  @Column({ type: 'jsonb', nullable: true })
  attributes: Record<string, unknown> | null;

  @OneToMany(() => Contact, (contact) => contact.customer, { cascade: true })
  contacts: Contact[];
}
