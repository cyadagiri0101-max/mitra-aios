import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum DesignPartStatus { ACTIVE='ACTIVE', OBSOLETE='OBSOLETE', IN_REVISION='IN_REVISION', RELEASED='RELEASED' }

@Entity('design_parts')
@Index(['partNumber', 'deletedAt'])
@Index(['projectId', 'deletedAt'])
export class DesignPart extends IndustrialBaseEntity {
  @Column({ name: 'part_number', type: 'varchar', length: 50 })
  partNumber: string;

  @Column({ name: 'part_name', type: 'varchar', length: 200 })
  partName: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'current_revision', type: 'varchar', length: 10, default: 'A' })
  currentRevision: string;

  @Column({ name: 'part_category', type: 'varchar', length: 50, nullable: true })
  partCategory: string | null;

  @Column({ name: 'material_grade', type: 'varchar', length: 50, nullable: true })
  materialGrade: string | null;

  @Column({ name: 'heat_treatment', type: 'varchar', length: 100, nullable: true })
  heatTreatment: string | null;

  @Column({ name: 'surface_finish', type: 'varchar', length: 100, nullable: true })
  surfaceFinish: string | null;

  @Column({ name: 'weight_kg', type: 'decimal', precision: 10, scale: 3, nullable: true })
  weightKg: number | null;

  @Column({ name: 'dim_length_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  dimLengthMm: number | null;

  @Column({ name: 'dim_width_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  dimWidthMm: number | null;

  @Column({ name: 'dim_height_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  dimHeightMm: number | null;

  @Column({ name: 'designed_by', type: 'uuid', nullable: true })
  designedBy: string | null;

  @Column({ name: 'design_start_date', type: 'date', nullable: true })
  designStartDate: Date | null;

  @Column({ name: 'design_release_date', type: 'date', nullable: true })
  designReleaseDate: Date | null;

  @Column({ type: 'enum', enum: DesignPartStatus, default: DesignPartStatus.ACTIVE })
  status: DesignPartStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}