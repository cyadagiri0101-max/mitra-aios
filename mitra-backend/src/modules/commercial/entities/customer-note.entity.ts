import { Entity, Column, VersionColumn, Index, ManyToOne, JoinColumn  } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { Customer } from './customer.entity';

@Entity('customer_notes')
@Index(['customerId', 'deletedAt'])
export class CustomerNote extends IndustrialBaseEntity {
  @Column({ name: 'customer_id', type: 'uuid' })
  @Index()
  customerId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string | null;

  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned: boolean;

  @VersionColumn()
  version: number;

  @ManyToOne(() => Customer, (customer) => customer.notes)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
