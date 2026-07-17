import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum EnquiryStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
  CANCELLED = 'CANCELLED',
}

export enum EnquirySource {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  WALK_IN = 'WALK_IN',
  REFERRAL = 'REFERRAL',
  WEBSITE = 'WEBSITE',
  EXHIBITION = 'EXHIBITION',
}

@Entity('enquiries')
@Index(['enquiryNumber', 'deletedAt'])
@Index(['customerId', 'status', 'deletedAt'])
export class Enquiry extends IndustrialBaseEntity {
  @Column({ name: 'enquiry_number', type: 'varchar', length: 30, unique: true })
  enquiryNumber: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  @Index()
  customerId: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 200 })
  customerName: string;

  @Column({ name: 'customer_contact', type: 'varchar', length: 100, nullable: true })
  customerContact: string | null;

  @Column({ name: 'customer_email', type: 'varchar', length: 200, nullable: true })
  customerEmail: string | null;

  @Column({ name: 'customer_phone', type: 'varchar', length: 30, nullable: true })
  customerPhone: string | null;

  @Column({ name: 'product_name', type: 'varchar', length: 200 })
  productName: string;

  @Column({ name: 'product_description', type: 'text', nullable: true })
  productDescription: string | null;

  @Column({ name: 'mold_type', type: 'varchar', length: 50, nullable: true })
  moldType: string | null;

  @Column({ type: 'int', default: 1 })
  cavitation: number;

  @Column({ name: 'annual_volume', type: 'int', nullable: true })
  annualVolume: number | null;

  @Column({ name: 'material_type', type: 'varchar', length: 100, nullable: true })
  materialType: string | null;

  @Column({ name: 'part_weight_grams', type: 'decimal', precision: 10, scale: 3, nullable: true })
  partWeightGrams: number | null;

  @Column({ name: 'target_price', type: 'decimal', precision: 18, scale: 2, nullable: true })
  targetPrice: number | null;

  @Column({ name: 'target_delivery_weeks', type: 'int', nullable: true })
  targetDeliveryWeeks: number | null;

  @Column({ name: 'enquiry_date', type: 'date' })
  enquiryDate: Date;

  @Column({ name: 'rfq_reference', type: 'varchar', length: 50, nullable: true })
  rfqReference: string | null;

  @Column({ type: 'enum', enum: EnquiryStatus, default: EnquiryStatus.DRAFT })
  status: EnquiryStatus;

  @Column({ type: 'enum', enum: EnquirySource, default: EnquirySource.EMAIL })
  source: EnquirySource;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo: string | null;

  @Column({ name: 'follow_up_date', type: 'date', nullable: true })
  followUpDate: Date | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column({ name: 'lost_reason', type: 'text', nullable: true })
  lostReason: string | null;
}