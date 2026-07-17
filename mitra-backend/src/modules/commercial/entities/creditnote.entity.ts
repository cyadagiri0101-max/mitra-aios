import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

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

  @Column({ name: 'credit_date', type: 'date' })
  creditDate: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', length: 20, default: 'OPEN' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}