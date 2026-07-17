import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('service_schedules')
@Index(['serviceRequestId', 'deletedAt'])
export class ServiceSchedule extends IndustrialBaseEntity {
  @Column({ name: 'service_request_id', type: 'uuid' })
  serviceRequestId: string;

  @Column({ name: 'scheduled_date', type: 'date' })
  scheduledDate: Date;

  @Column({ name: 'scheduled_start_time', type: 'timestamptz', nullable: true })
  scheduledStartTime: Date | null;

  @Column({ name: 'estimated_duration_hours', type: 'decimal', precision: 5, scale: 2, nullable: true })
  estimatedDurationHours: number | null;

  @Column({ name: 'technician_id', type: 'uuid', nullable: true })
  @Index()
  technicianId: string | null;

  @Column({ name: 'location', type: 'varchar', length: 100, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 20, default: 'SCHEDULED' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}