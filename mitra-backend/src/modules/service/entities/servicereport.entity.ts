import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('service_reports')
@Index(['reportNumber', 'deletedAt'])
@Index(['serviceRequestId', 'deletedAt'])
export class ServiceReport extends IndustrialBaseEntity {
  @Column({ name: 'report_number', type: 'varchar', length: 30, unique: true })
  reportNumber: string;

  @Column({ name: 'service_request_id', type: 'uuid' })
  @Index()
  serviceRequestId: string;

  @Column({ name: 'service_date', type: 'date' })
  serviceDate: Date;

  @Column({ name: 'technician_id', type: 'uuid', nullable: true })
  @Index()
  technicianId: string | null;

  @Column({ name: 'work_performed', type: 'text' })
  workPerformed: string;

  @Column({ name: 'parts_replaced', type: 'jsonb', nullable: true })
  partsReplaced: Array<{ partId: string; partName: string; qty: number }> | null;

  @Column({ name: 'root_cause_found', type: 'text', nullable: true })
  rootCauseFound: string | null;

  @Column({ name: 'time_spent_hours', type: 'decimal', precision: 6, scale: 2, nullable: true })
  timeSpentHours: number | null;

  @Column({ name: 'labour_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  labourCost: number | null;

  @Column({ name: 'parts_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  partsCost: number | null;

  @Column({ name: 'total_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalCost: number | null;

  @Column({ name: 'mold_condition_after', type: 'varchar', length: 50, nullable: true })
  moldConditionAfter: string | null;

  @Column({ name: 'recommendations', type: 'text', nullable: true })
  recommendations: string | null;

  @Column({ name: 'customer_sign_off', type: 'boolean', default: false })
  customerSignOff: boolean;

  @Column({ name: 'customer_signed_by', type: 'varchar', length: 100, nullable: true })
  customerSignedBy: string | null;

  @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
  status: string;
}