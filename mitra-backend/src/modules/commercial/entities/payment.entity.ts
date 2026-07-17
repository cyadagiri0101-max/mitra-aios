import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum PaymentMethod { BANK_TRANSFER='BANK_TRANSFER', CHEQUE='CHEQUE', CASH='CASH', UPI='UPI', NEFT='NEFT', RTGS='RTGS' }

@Entity('payments')
@Index(['invoiceId', 'deletedAt'])
export class Payment extends IndustrialBaseEntity {
  @Column({ name: 'payment_number', type: 'varchar', length: 30, unique: true })
  paymentNumber: string;

  @Column({ name: 'invoice_id', type: 'uuid', nullable: true })
  @Index()
  invoiceId: string | null;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  @Index()
  customerId: string | null;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.BANK_TRANSFER })
  method: PaymentMethod;

  @Column({ name: 'reference_number', type: 'varchar', length: 100, nullable: true })
  referenceNumber: string | null;

  @Column({ name: 'bank_name', type: 'varchar', length: 100, nullable: true })
  bankName: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;
}