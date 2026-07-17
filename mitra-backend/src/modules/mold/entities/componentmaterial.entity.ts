import { Entity, Column, Index} from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('component_materials')
export class ComponentMaterial extends IndustrialBaseEntity {
  @Column({ name: 'material_code', type: 'varchar', length: 30, unique: true })
  materialCode: string;

  @Column({ name: 'material_name', type: 'varchar', length: 200 })
  materialName: string;

  @Column({ name: 'material_standard', type: 'varchar', length: 50, nullable: true })
  materialStandard: string | null;

  @Column({ name: 'din_equivalent', type: 'varchar', length: 30, nullable: true })
  dinEquivalent: string | null;

  @Column({ name: 'aisi_equivalent', type: 'varchar', length: 30, nullable: true })
  aisiEquivalent: string | null;

  @Column({ name: 'hardness_min_hrc', type: 'decimal', precision: 5, scale: 1, nullable: true })
  hardnessMinHrc: number | null;

  @Column({ name: 'hardness_max_hrc', type: 'decimal', precision: 5, scale: 1, nullable: true })
  hardnessMaxHrc: number | null;

  @Column({ name: 'tensile_strength_mpa', type: 'int', nullable: true })
  tensileStrengthMpa: number | null;

  @Column({ name: 'yield_strength_mpa', type: 'int', nullable: true })
  yieldStrengthMpa: number | null;

  @Column({ name: 'cost_per_kg', type: 'decimal', precision: 10, scale: 2, nullable: true })
  costPerKg: number | null;

  @Column({ name: 'preferred_supplier', type: 'varchar', length: 100, nullable: true })
  preferredSupplier: string | null;

  @Column({ name: 'typical_applications', type: 'jsonb', nullable: true })
  typicalApplications: string[] | null;

  @Column({ name: 'heat_treatment_notes', type: 'text', nullable: true })
  heatTreatmentNotes: string | null;
}