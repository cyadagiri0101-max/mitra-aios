import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum MachineStatus { ACTIVE='ACTIVE', UNDER_MAINTENANCE='UNDER_MAINTENANCE', IDLE='IDLE', DECOMMISSIONED='DECOMMISSIONED' }

@Entity('machine_masters')
@Index(['machineNumber', 'deletedAt'])
export class MachineMaster extends IndustrialBaseEntity {
  @Column({ name: 'machine_number', type: 'varchar', length: 30, unique: true })
  machineNumber: string;

  @Column({ name: 'machine_name', type: 'varchar', length: 200 })
  machineName: string;

  @Column({ name: 'machine_type_id', type: 'uuid', nullable: true })
  @Index()
  machineTypeId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  manufacturer: string | null;

  @Column({ name: 'model_number', type: 'varchar', length: 50, nullable: true })
  modelNumber: string | null;

  @Column({ name: 'serial_number', type: 'varchar', length: 50, nullable: true })
  serialNumber: string | null;

  @Column({ name: 'year_of_manufacture', type: 'int', nullable: true })
  yearOfManufacture: number | null;

  @Column({ name: 'purchase_date', type: 'date', nullable: true })
  purchaseDate: Date | null;

  @Column({ name: 'capacity_description', type: 'varchar', length: 200, nullable: true })
  capacityDescription: string | null;

  @Column({ name: 'max_table_size_mm', type: 'varchar', length: 50, nullable: true })
  maxTableSizeMm: string | null;

  @Column({ name: 'location', type: 'varchar', length: 50, nullable: true })
  location: string | null;

  @Column({ name: 'cost_per_hour', type: 'decimal', precision: 10, scale: 2, nullable: true })
  costPerHour: number | null;

  @Column({ name: 'last_maintenance_date', type: 'date', nullable: true })
  lastMaintenanceDate: Date | null;

  @Column({ name: 'next_maintenance_date', type: 'date', nullable: true })
  nextMaintenanceDate: Date | null;

  @Column({ type: 'enum', enum: MachineStatus, default: MachineStatus.ACTIVE })
  status: MachineStatus;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}