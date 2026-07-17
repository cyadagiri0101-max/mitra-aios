import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum BookingStatus { REQUESTED='REQUESTED', CONFIRMED='CONFIRMED', IN_USE='IN_USE', COMPLETED='COMPLETED', CANCELLED='CANCELLED' }

@Entity('machine_bookings')
@Index(['machineId', 'startDatetime', 'deletedAt'])
@Index(['projectId', 'status', 'deletedAt'])
export class MachineBooking extends IndustrialBaseEntity {
  @Column({ name: 'booking_number', type: 'varchar', length: 30, unique: true })
  bookingNumber: string;

  @Column({ name: 'machine_id', type: 'uuid' })
  @Index()
  machineId: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'work_order_id', type: 'uuid', nullable: true })
  @Index()
  workOrderId: string | null;

  @Column({ name: 'start_datetime', type: 'timestamptz' })
  startDatetime: Date;

  @Column({ name: 'end_datetime', type: 'timestamptz' })
  endDatetime: Date;

  @Column({ name: 'booked_hours', type: 'decimal', precision: 6, scale: 2, nullable: true })
  bookedHours: number | null;

  @Column({ name: 'shift', type: 'varchar', length: 20, nullable: true })
  shift: string | null;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.REQUESTED })
  status: BookingStatus;

  @Column({ name: 'booked_by', type: 'uuid', nullable: true })
  bookedBy: string | null;

  @Column({ type: 'text', nullable: true })
  purpose: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}