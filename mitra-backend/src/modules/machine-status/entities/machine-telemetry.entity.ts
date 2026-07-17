import {
  Entity, Column, Index,
} from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum MachineStatusEnum {
  RUNNING = 'RUNNING',
  IDLE = 'IDLE',
  ALARM = 'ALARM',
  SETUP = 'SETUP',
  OFFLINE = 'OFFLINE',
}

@Entity('machine_telemetry')
@Index(['machineId', 'recordedAt'])
export class MachineTelemetry extends IndustrialBaseEntity {
  @Column({ name: 'machine_id', type: 'varchar', length: 50 })
  machineId: string;

  @Column({ name: 'machine_name', type: 'varchar', length: 100 })
  machineName: string;

  @Column({ type: 'enum', enum: MachineStatusEnum })
  status: MachineStatusEnum;

  @Column({ name: 'spindle_load', type: 'decimal', precision: 5, scale: 2, nullable: true })
  spindleLoad: number | null;

  @Column({ name: 'feed_rate', type: 'decimal', precision: 8, scale: 2, nullable: true })
  feedRate: number | null;

  @Column({ name: 'coolant_temp', type: 'decimal', precision: 5, scale: 2, nullable: true })
  coolantTemp: number | null;

  @Column({ name: 'alarm_code', type: 'varchar', length: 50, nullable: true })
  alarmCode: string | null;

  @Column({ name: 'cycle_count', type: 'int', nullable: true })
  cycleCount: number | null;

  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;

  @Column({ name: 'utilization_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  utilizationPercent: number | null;
}
