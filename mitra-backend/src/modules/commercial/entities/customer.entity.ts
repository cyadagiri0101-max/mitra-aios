import { Entity, Column, VersionColumn, Index, OneToMany  } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { Contact } from './contact.entity';
import { CustomerAddress } from './customer-address.entity';
import { CustomerNote } from './customer-note.entity';
import { CustomerAttachment } from './customer-attachment.entity';
import { CustomerActivity } from './customer-activity.entity';

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum CustomerSource {
  MANUAL = 'MANUAL',
  LEAD_CONVERSION = 'LEAD_CONVERSION',
  IMPORT = 'IMPORT',
  REFERRAL = 'REFERRAL',
  WEBSITE = 'WEBSITE',
}

@Entity('customers')
@Index(['name', 'deletedAt'])
@Index(['status', 'deletedAt'])
@Index(['customerTypeId', 'deletedAt'])
@Index(['categoryId', 'deletedAt'])
export class Customer extends IndustrialBaseEntity {
  @Column({ type: 'varchar', length: 30, nullable: true, unique: true })
  code: string | null;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  industry: string | null;

  @Column({ name: 'customer_type_id', type: 'uuid', nullable: true })
  customerTypeId: string | null;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ name: 'gst_number', type: 'varchar', length: 30, nullable: true })
  gstNumber: string | null;

  @Column({ name: 'tax_id', type: 'varchar', length: 50, nullable: true })
  taxId: string | null;

  @Column({ name: 'registration_number', type: 'varchar', length: 50, nullable: true })
  registrationNumber: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  website: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ name: 'credit_limit', type: 'decimal', precision: 18, scale: 2, nullable: true })
  creditLimit: number | null;

  @Column({ name: 'payment_terms', type: 'text', nullable: true })
  paymentTerms: string | null;

  @Column({ type: 'smallint', nullable: true })
  rating: number | null;

  @Column({ name: 'primary_contact_id', type: 'uuid', nullable: true })
  primaryContactId: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: CustomerStatus;

  @Column({ type: 'varchar', length: 30, default: CustomerSource.MANUAL })
  source: CustomerSource;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  @Column({ name: 'archived_by', type: 'uuid', nullable: true })
  archivedBy: string | null;

  @Column({ type: 'jsonb', nullable: true })
  attributes: Record<string, unknown> | null;

  @VersionColumn()
  version: number;

  @OneToMany(() => Contact, (contact) => contact.customer, { cascade: true })
  contacts: Contact[];

  @OneToMany(() => CustomerAddress, (address) => address.customer, { cascade: true })
  addresses: CustomerAddress[];

  @OneToMany(() => CustomerNote, (note) => note.customer, { cascade: true })
  notes: CustomerNote[];

  @OneToMany(() => CustomerAttachment, (attachment) => attachment.customer, { cascade: true })
  attachments: CustomerAttachment[];

  @OneToMany(() => CustomerActivity, (activity) => activity.customer, { cascade: true })
  activities: CustomerActivity[];
}
