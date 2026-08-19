import { Entity, Column, Index, OneToMany } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { DesignLoadStandardStage } from './design-load-standard-stage.entity';

export enum DesignStandardStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum ComplexityLevel {
  STANDARD = 'STANDARD',
  MEDIUM = 'MEDIUM',
  COMPLEX = 'COMPLEX',
}

export enum ProvenanceSource {
  MANUAL = 'MANUAL',
  HISTORICAL_DATA = 'HISTORICAL_DATA',
  MEKB = 'MEKB',
  ENGINEERING_ANALYSIS = 'ENGINEERING_ANALYSIS',
}

@Entity('design_load_standards')
@Index(['code', 'tenantId', 'deletedAt'])
@Index(['status', 'tenantId', 'deletedAt'])
export class DesignLoadStandard extends IndustrialBaseEntity {
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'project_type', type: 'varchar', length: 50, nullable: true })
  projectType: string | null;

  @Column({ name: 'mold_type', type: 'varchar', length: 50, nullable: true })
  moldType: string | null;

  @Column({
    name: 'complexity_level',
    type: 'varchar',
    length: 30,
    default: ComplexityLevel.STANDARD,
  })
  complexityLevel: ComplexityLevel;

  @Column({
    name: 'total_standard_duration_days',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 10.0,
  })
  totalStandardDurationDays: number;

  @Column({
    name: 'total_standard_hours',
    type: 'numeric',
    precision: 7,
    scale: 2,
    default: 80.0,
  })
  totalStandardHours: number;

  @Column({
    type: 'varchar',
    length: 30,
    default: DesignStandardStatus.ACTIVE,
  })
  status: DesignStandardStatus;

  @Column({
    name: 'provenance_source',
    type: 'varchar',
    length: 50,
    default: ProvenanceSource.MANUAL,
  })
  provenanceSource: ProvenanceSource;

  @Column({ name: 'provenance_details', type: 'text', nullable: true })
  provenanceDetails: string | null;

  @OneToMany(() => DesignLoadStandardStage, (stage) => stage.standard, { cascade: true })
  stages: DesignLoadStandardStage[];
}
