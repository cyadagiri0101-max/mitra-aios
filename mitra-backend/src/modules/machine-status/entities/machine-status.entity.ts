import {
  PrimaryGeneratedColumn, Entity, Column, Index,
} from 'typeorm';
import { MachineStatusEnum } from './machine-telemetry.entity';

@Entity('machine_status')
@Index(['machineId'])
export class MachineStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'machine_id', type: 'varchar', length: 50, unique: true })
  machineId: string;

  @Column({ name: 'current_status', type: 'enum', enum: MachineStatusEnum })
  currentStatus: MachineStatusEnum;

  @Column({ name: 'last_telemetry_at', type: 'timestamptz', nullable: true })
  lastTelemetryAt: Date | null;

  @Column({ name: 'total_runtime_today', type: 'decimal', precision: 8, scale: 2, nullable: true })
  totalRuntimeToday: number | null;

  @Column({ name: 'utilization_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  utilizationPercent: number | null;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
