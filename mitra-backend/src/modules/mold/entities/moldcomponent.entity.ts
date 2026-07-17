import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('mold_components')
@Index(['moldId', 'componentCode', 'deletedAt'])
export class MoldComponent extends IndustrialBaseEntity {
  @Column({ name: 'mold_id', type: 'uuid' })
  moldId: string;

  @Column({ name: 'assembly_id', type: 'uuid', nullable: true })
  @Index()
  assemblyId: string | null;

  @Column({ name: 'component_code', type: 'varchar', length: 30 })
  componentCode: string;

  @Column({ name: 'component_name', type: 'varchar', length: 200 })
  componentName: string;

  @Column({ name: 'component_type', type: 'varchar', length: 50, nullable: true })
  componentType: string | null;

  @Column({ name: 'material_grade', type: 'varchar', length: 50, nullable: true })
  materialGrade: string | null;

  @Column({ name: 'heat_treatment', type: 'varchar', length: 100, nullable: true })
  heatTreatment: string | null;

  @Column({ name: 'hardness_hrc', type: 'decimal', precision: 5, scale: 1, nullable: true })
  hardnessHrc: number | null;

  @Column({ name: 'surface_finish_ra', type: 'decimal', precision: 5, scale: 2, nullable: true })
  surfaceFinishRa: number | null;

  @Column({ name: 'quantity', type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'weight_kg', type: 'decimal', precision: 8, scale: 3, nullable: true })
  weightKg: number | null;

  @Column({ name: 'drawing_number', type: 'varchar', length: 50, nullable: true })
  drawingNumber: string | null;

  @Column({ name: 'manufacture_type', type: 'varchar', length: 20, default: 'IN_HOUSE' })
  manufactureType: string;

  @Column({ name: 'vendor_id', type: 'uuid', nullable: true })
  @Index()
  vendorId: string | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}