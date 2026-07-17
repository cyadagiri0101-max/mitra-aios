import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('machine_calendars')
@Index(['machineId', 'calendarDate', 'deletedAt'])
export class MachineCalendar extends IndustrialBaseEntity {
  @Column({ name: 'machine_id', type: 'uuid' })
  machineId: string;

  @Column({ name: 'calendar_date', type: 'date' })
  calendarDate: Date;

  @Column({ name: 'shift_1_available', type: 'boolean', default: true })
  shift1Available: boolean;

  @Column({ name: 'shift_2_available', type: 'boolean', default: false })
  shift2Available: boolean;

  @Column({ name: 'shift_3_available', type: 'boolean', default: false })
  shift3Available: boolean;

  @Column({ name: 'available_hours', type: 'decimal', precision: 5, scale: 2, default: 8 })
  availableHours: number;

  @Column({ name: 'is_holiday', type: 'boolean', default: false })
  isHoliday: boolean;

  @Column({ name: 'holiday_description', type: 'varchar', length: 100, nullable: true })
  holidayDescription: string | null;

  @Column({ name: 'planned_downtime_hours', type: 'decimal', precision: 5, scale: 2, default: 0 })
  plannedDowntimeHours: number;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}