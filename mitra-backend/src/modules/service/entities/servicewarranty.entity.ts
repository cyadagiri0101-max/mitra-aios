import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ServiceWarrantyStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CLAIMED = 'CLAIMED',
  EXTENDED = 'EXTENDED',
}

@Entity('service_warranties')
@Index(['warrantyNumber', 'deletedAt'])
@Index(['projectId', 'deletedAt'])
export class ServiceWarranty extends IndustrialBaseEntity {
  @Column({ name: 'warranty_number', type: 'varchar', length: 30, unique: true })
  warrantyNumber: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  @Index()
  customerId: string | null;

  @Column({ name: 'mold_id', type: 'uuid', nullable: true })
  @Index()
  moldId: string | null;

  @Column({ name: 'dispatch_id', type: 'uuid', nullable: true })
  @Index()
  dispatchId: string | null;

  @Column({ name: 'work_order_id', type: 'uuid', nullable: true })
  @Index()
  workOrderId: string | null;

  @Column({ name: 'warranty_start_date', type: 'date', nullable: true })
  warrantyStartDate: Date | null;

  @Column({ name: 'warranty_end_date', type: 'date', nullable: true })
  warrantyEndDate: Date | null;

  @Column({ name: 'coverage_months', type: 'int', nullable: true })
  coverageMonths: number | null;

  @Column({ name: 'coverage_terms', type: 'text', nullable: true })
  coverageTerms: string | null;

  @Column({ name: 'eligibility_rule', type: 'text', nullable: true })
  eligibilityRule: string | null;

  @Column({ type: 'enum', enum: ServiceWarrantyStatus, default: ServiceWarrantyStatus.ACTIVE })
  status: ServiceWarrantyStatus;

  @Column({ name: 'claim_limit', type: 'decimal', precision: 12, scale: 2, nullable: true })
  claimLimit: number | null;

  @Column({ name: 'extension_notes', type: 'text', nullable: true })
  extensionNotes: string | null;
}
