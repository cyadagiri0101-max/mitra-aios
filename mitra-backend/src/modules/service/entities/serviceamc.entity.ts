import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ServiceAmcStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  RENEWAL_PENDING = 'RENEWAL_PENDING',
  CANCELLED = 'CANCELLED',
}

@Entity('service_amc_contracts')
@Index(['contractNumber', 'deletedAt'])
@Index(['projectId', 'deletedAt'])
export class ServiceAmcContract extends IndustrialBaseEntity {
  @Column({ name: 'contract_number', type: 'varchar', length: 30, unique: true })
  contractNumber: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  @Index()
  customerId: string | null;

  @Column({ name: 'coverage_type', type: 'varchar', length: 50, nullable: true })
  coverageType: string | null;

  @Column({ name: 'contract_value', type: 'decimal', precision: 12, scale: 2, nullable: true })
  contractValue: number | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  @Column({ name: 'renewal_date', type: 'date', nullable: true })
  renewalDate: Date | null;

  @Column({ name: 'billing_schedule', type: 'jsonb', nullable: true })
  billingSchedule: Record<string, unknown>[] | null;

  @Column({ name: 'visit_schedule', type: 'jsonb', nullable: true })
  visitSchedule: Record<string, unknown>[] | null;

  @Column({ type: 'enum', enum: ServiceAmcStatus, default: ServiceAmcStatus.ACTIVE })
  status: ServiceAmcStatus;
}
