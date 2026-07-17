import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum QuotationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REVISED = 'REVISED',
  WON = 'WON',
  LOST = 'LOST',
}

@Entity('quotations')
@Index(['quotationNumber', 'deletedAt'])
@Index(['enquiryId', 'status', 'deletedAt'])
export class Quotation extends IndustrialBaseEntity {
  @Column({ name: 'quotation_number', type: 'varchar', length: 30, unique: true })
  quotationNumber: string;

  @Column({ name: 'enquiry_id', type: 'uuid', nullable: true })
  @Index()
  enquiryId: string | null;

  @Column({ name: 'revision_number', type: 'int', default: 1 })
  revisionNumber: number;

  @Column({ name: 'quotation_date', type: 'date' })
  quotationDate: Date;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil: Date | null;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  @Index()
  customerId: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 200 })
  customerName: string;

  @Column({ name: 'subtotal', type: 'decimal', precision: 18, scale: 2, default: 0 })
  subtotal: number;

  @Column({ name: 'discount_pct', type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPct: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'tax_pct', type: 'decimal', precision: 5, scale: 2, default: 18 })
  taxPct: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ name: 'delivery_weeks', type: 'int', nullable: true })
  deliveryWeeks: number | null;

  @Column({ name: 'payment_terms', type: 'text', nullable: true })
  paymentTerms: string | null;

  @Column({ name: 'warranty_months', type: 'int', default: 12 })
  warrantyMonths: number;

  @Column({ type: 'enum', enum: QuotationStatus, default: QuotationStatus.DRAFT })
  status: QuotationStatus;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'terms_and_conditions', type: 'text', nullable: true })
  termsAndConditions: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}