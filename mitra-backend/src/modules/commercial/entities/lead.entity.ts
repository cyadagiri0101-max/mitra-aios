import { Entity, Column, VersionColumn, Index  } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum LeadSource {
  WEBSITE = 'WEBSITE',
  REFERRAL = 'REFERRAL',
  COLD_CALL = 'COLD_CALL',
  EXHIBITION = 'EXHIBITION',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  WALK_IN = 'WALK_IN',
  OTHER = 'OTHER',
}

export enum LeadStatus {
  NEW = 'NEW',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL = 'PROPOSAL',
  CONVERTED = 'CONVERTED',
  WON = 'WON',
  LOST = 'LOST',
  DISQUALIFIED = 'DISQUALIFIED',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('leads')
@Index(['leadNumber', 'deletedAt'])
@Index(['leadStatus', 'deletedAt'])
@Index(['ownerId', 'deletedAt'])
@Index(['customerId', 'deletedAt'])
export class Lead extends IndustrialBaseEntity {
  @Column({ name: 'lead_number', type: 'varchar', length: 30, unique: true })
  leadNumber: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  @Index()
  customerId: string | null;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 200, nullable: true })
  customerName: string | null;

  @Column({ name: 'lead_source', type: 'varchar', length: 50, default: LeadSource.OTHER })
  leadSource: LeadSource;

  @Column({ name: 'lead_status', type: 'varchar', length: 30, default: LeadStatus.NEW })
  leadStatus: LeadStatus;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId: string | null;

  @Column({ name: 'expected_revenue', type: 'decimal', precision: 18, scale: 2, nullable: true })
  expectedRevenue: number | null;

  @Column({ name: 'expected_date', type: 'date', nullable: true })
  expectedDate: Date | null;

  @Column({ type: 'varchar', length: 20, default: Priority.MEDIUM })
  priority: Priority;

  @Column({ type: 'int', default: 10 })
  probability: number;

  @Column({ name: 'converted_customer_id', type: 'uuid', nullable: true })
  convertedCustomerId: string | null;

  @Column({ name: 'converted_at', type: 'timestamptz', nullable: true })
  convertedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @VersionColumn()
  version: number;
}
