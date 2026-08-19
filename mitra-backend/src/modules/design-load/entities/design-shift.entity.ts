import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ShiftCode {
  SHIFT_1 = 'SHIFT_1',
  SHIFT_2 = 'SHIFT_2',
  SHIFT_3 = 'SHIFT_3',
}

@Entity('design_shifts')
@Index(['shiftCode', 'tenantId', 'deletedAt'])
export class DesignShift extends IndustrialBaseEntity {
  @Column({ name: 'shift_code', type: 'varchar', length: 30 })
  shiftCode: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ name: 'start_time', type: 'varchar', length: 10, default: '06:00' })
  startTime: string;

  @Column({ name: 'end_time', type: 'varchar', length: 10, default: '14:00' })
  endTime: string;

  @Column({
    name: 'duration_hours',
    type: 'numeric',
    precision: 4,
    scale: 2,
    default: 8.0,
  })
  durationHours: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
