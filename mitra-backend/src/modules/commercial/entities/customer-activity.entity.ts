import { Entity, Column, VersionColumn, Index, ManyToOne, JoinColumn  } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { Customer } from './customer.entity';

export enum CustomerActivityType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  CONTACT_ADDED = 'CONTACT_ADDED',
  CONTACT_UPDATED = 'CONTACT_UPDATED',
  NOTE_ADDED = 'NOTE_ADDED',
  ATTACHMENT_ADDED = 'ATTACHMENT_ADDED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  ARCHIVED = 'ARCHIVED',
  RESTORED = 'RESTORED',
  LEAD_LINKED = 'LEAD_LINKED',
  RFQ_LINKED = 'RFQ_LINKED',
  QUOTATION_LINKED = 'QUOTATION_LINKED',
  SYSTEM = 'SYSTEM',
}

@Entity('customer_activities')
@Index(['customerId', 'deletedAt'])
@Index(['activityType', 'deletedAt'])
export class CustomerActivity extends IndustrialBaseEntity {
  @Column({ name: 'customer_id', type: 'uuid' })
  @Index()
  customerId: string;

  @Column({ name: 'activity_type', type: 'varchar', length: 50 })
  activityType: CustomerActivityType;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType: string | null;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @VersionColumn()
  version: number;

  @ManyToOne(() => Customer, (customer) => customer.activities)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
