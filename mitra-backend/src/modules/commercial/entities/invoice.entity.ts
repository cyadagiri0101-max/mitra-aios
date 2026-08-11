import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum InvoiceStatus { DRAFT='DRAFT', ISSUED='ISSUED', PARTIALLY_PAID='PARTIALLY_PAID', PAID='PAID', OVERDUE='OVERDUE', CANCELLED='CANCELLED' }

@Entity('invoices')
@Index(['invoiceNumber', 'deletedAt'])
export class Invoice extends IndustrialBaseEntity {
  @Column({ name: 'invoice_number', type: 'varchar', length: 30, unique: true })
  invoiceNumber: string;

  @Column({ name: 'quotation_id', type: 'uuid', nullable: true })
  @Index()
  quotationId: string | null;

  @Column({ name: 'sales_order_id', type: 'uuid', nullable: true })
  @Index()
  salesOrderId: string | null;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  @Index()
  customerId: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 200 })
  customerName: string;

  @Column({ name: 'invoice_date', type: 'date' })
  invoiceDate: Date;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({ name: 'subtotal', type: 'decimal', precision: 18, scale: 2, default: 0 })
  subtotal: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ name: 'balance_amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  balanceAmount: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Column({ name: 'payment_terms', type: 'text', nullable: true })
  paymentTerms: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}