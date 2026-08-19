import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum DesignSystemStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  OFFLINE = 'OFFLINE',
}

export enum DesignSystemType {
  CAD_WORKSTATION = 'CAD_WORKSTATION',
  CAM_WORKSTATION = 'CAM_WORKSTATION',
  SIMULATION_WORKSTATION = 'SIMULATION_WORKSTATION',
  GENERAL_DESIGN = 'GENERAL_DESIGN',
}

@Entity('design_systems')
@Index(['systemCode', 'tenantId', 'deletedAt'])
@Index(['status', 'tenantId', 'deletedAt'])
export class DesignSystem extends IndustrialBaseEntity {
  @Column({ name: 'system_code', type: 'varchar', length: 30 })
  systemCode: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    name: 'system_type',
    type: 'varchar',
    length: 50,
    default: DesignSystemType.CAD_WORKSTATION,
  })
  systemType: DesignSystemType;

  @Column({ type: 'text', nullable: true })
  specifications: string | null;

  @Column({ name: 'software_licenses', type: 'varchar', length: 255, nullable: true })
  softwareLicenses: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: DesignSystemStatus.ACTIVE,
  })
  status: DesignSystemStatus;

  @Column({ name: 'total_shifts_supported', type: 'int', default: 3 })
  totalShiftsSupported: number;

  @Column({ name: 'shift_1_available', type: 'boolean', default: true })
  shift1Available: boolean;

  @Column({ name: 'shift_2_available', type: 'boolean', default: true })
  shift2Available: boolean;

  @Column({ name: 'shift_3_available', type: 'boolean', default: true })
  shift3Available: boolean;

  @Column({
    name: 'daily_capacity_hours',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 24.0,
  })
  dailyCapacityHours: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
