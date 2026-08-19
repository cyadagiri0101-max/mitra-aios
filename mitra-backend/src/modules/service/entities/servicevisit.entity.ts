import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ServiceVisitStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('service_visits')
@Index(['visitNumber', 'deletedAt'])
@Index(['serviceRequestId', 'deletedAt'])
export class ServiceVisit extends IndustrialBaseEntity {
  @Column({ name: 'visit_number', type: 'varchar', length: 30, unique: true })
  visitNumber: string;

  @Column({ name: 'service_request_id', type: 'uuid', nullable: true })
  @Index()
  serviceRequestId: string | null;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  @Index()
  customerId: string | null;

  @Column({ name: 'visit_date', type: 'date', nullable: true })
  visitDate: Date | null;

  @Column({ name: 'technician_id', type: 'uuid', nullable: true })
  @Index()
  technicianId: string | null;

  @Column({ name: 'service_type', type: 'varchar', length: 50, nullable: true })
  serviceType: string | null;

  @Column({ name: 'work_performed', type: 'text', nullable: true })
  workPerformed: string | null;

  @Column({ name: 'parts_used', type: 'jsonb', nullable: true })
  partsUsed: Array<{ partCode: string; partName: string; qty: number }> | null;

  @Column({ name: 'travel_hours', type: 'double precision', nullable: true })
  travelHours: number | null;

  @Column({ name: 'service_hours', type: 'double precision', nullable: true })
  serviceHours: number | null;

  @Column({ type: 'enum', enum: ServiceVisitStatus, default: ServiceVisitStatus.SCHEDULED })
  status: ServiceVisitStatus;
}
