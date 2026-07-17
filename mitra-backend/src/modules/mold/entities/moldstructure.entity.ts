import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum MoldStatus { DESIGN='DESIGN', MANUFACTURING='MANUFACTURING', TRIAL='TRIAL', APPROVED='APPROVED', IN_PRODUCTION='IN_PRODUCTION', UNDER_MAINTENANCE='UNDER_MAINTENANCE', RETIRED='RETIRED' }

@Entity('mold_structures')
@Index(['moldNumber', 'deletedAt'])
@Index(['projectId', 'deletedAt'])
export class MoldStructure extends IndustrialBaseEntity {
  @Column({ name: 'mold_number', type: 'varchar', length: 30, unique: true })
  moldNumber: string;

  @Column({ name: 'mold_name', type: 'varchar', length: 200 })
  moldName: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'mold_type', type: 'varchar', length: 50, nullable: true })
  moldType: string | null;

  @Column({ name: 'no_of_cavities', type: 'int', default: 1 })
  noOfCavities: number;

  @Column({ name: 'no_of_cores', type: 'int', default: 1 })
  noOfCores: number;

  @Column({ name: 'mold_base_material', type: 'varchar', length: 100, nullable: true })
  moldBaseMaterial: string | null;

  @Column({ name: 'cavity_material', type: 'varchar', length: 100, nullable: true })
  cavityMaterial: string | null;

  @Column({ name: 'core_material', type: 'varchar', length: 100, nullable: true })
  coreMaterial: string | null;

  @Column({ name: 'mold_length_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  moldLengthMm: number | null;

  @Column({ name: 'mold_width_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  moldWidthMm: number | null;

  @Column({ name: 'mold_height_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  moldHeightMm: number | null;

  @Column({ name: 'mold_weight_kg', type: 'decimal', precision: 10, scale: 2, nullable: true })
  moldWeightKg: number | null;

  @Column({ name: 'runner_type', type: 'varchar', length: 50, nullable: true })
  runnerType: string | null;

  @Column({ name: 'gate_type', type: 'varchar', length: 50, nullable: true })
  gateType: string | null;

  @Column({ name: 'ejection_system', type: 'varchar', length: 50, nullable: true })
  ejectionSystem: string | null;

  @Column({ name: 'cooling_system', type: 'varchar', length: 100, nullable: true })
  coolingSystem: string | null;

  @Column({ name: 'design_life_shots', type: 'int', nullable: true })
  designLifeShots: number | null;

  @Column({ name: 'current_shots', type: 'int', default: 0 })
  currentShots: number;

  @Column({ type: 'enum', enum: MoldStatus, default: MoldStatus.DESIGN })
  status: MoldStatus;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}