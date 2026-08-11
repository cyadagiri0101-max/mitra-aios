import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value == null ? value : Number(value)),
};

export enum CreditNoteStatus {
  OPEN = 'OPEN',
  APPLIED = 'APPLIED',
  CANCELLED = 'CANCELLED',
}

@Entity('credit_notes')
@Index(['creditNoteNumber', 'deletedAt'])
export class CreditNote extends IndustrialBaseEntity {
  @Column({ name: 'credit_note_number', type: 'varchar', length: 30, unique: true })
  creditNoteNumber: string;

  @Column({ name: 'invoice_id', type: 'uuid', nullable: true })
  @Index()
  invoiceId: string | null;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  @Index()
  customerId: string | null;

  @Column({ name: 'sales_order_id', type: 'uuid', nullable: true })
  @Index()
  salesOrderId: string | null;

  @Column({ name: 'credit_date', type: 'date' })
  creditDate: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: decimalTransformer })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: CreditNoteStatus, default: CreditNoteStatus.OPEN })
  status: CreditNoteStatus;

  @Column({ name: 'applied_at', type: 'timestamptz', nullable: true })
  appliedAt: Date | null;

  @Column({ name: 'applied_by', type: 'uuid', nullable: true })
  appliedBy: string | null;

  @Column({ name: 'cancelled_reason', type: 'text', nullable: true })
  cancelledReason: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
