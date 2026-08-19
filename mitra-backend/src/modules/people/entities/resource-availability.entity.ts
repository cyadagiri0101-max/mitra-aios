import { Entity, Column, Index, Unique } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum AvailabilityType {
  AVAILABLE = 'AVAILABLE',
  PLANNED = 'PLANNED',
  UNAVAILABLE = 'UNAVAILABLE',
}

/**
 * Resource availability foundation (M1 Sprint 1).
 *
 * Minimum data foundation for future capacity planning: per-employee,
 * per-date availability state with optional available hours. The future
 * Capacity Engine consumes these rows — no scheduling logic lives here.
 */
@Entity('resource_availability')
@Unique(['employeeId', 'workDate', 'tenantId'])
@Index(['employeeId', 'workDate', 'tenantId'])
@Index(['availabilityType', 'workDate', 'tenantId'])
export class ResourceAvailability extends IndustrialBaseEntity {
  @Column({ name: 'employee_id', type: 'uuid' })
  @Index()
  employeeId: string;

  @Column({ name: 'work_date', type: 'date' })
  workDate: Date;

  @Column({
    name: 'availability_type',
    type: 'enum',
    enum: AvailabilityType,
    default: AvailabilityType.AVAILABLE,
  })
  availabilityType: AvailabilityType;

  @Column({ name: 'available_hours', type: 'numeric', precision: 5, scale: 2, nullable: true })
  availableHours: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}