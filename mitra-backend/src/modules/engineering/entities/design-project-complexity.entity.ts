import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('design_project_complexities')
@Index('IDX_DESIGN_COMPLEXITY_TENANT_PROJ', ['tenantId', 'projectId'])
export class DesignProjectComplexity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'project_id', type: 'varchar', length: 100 })
  projectId: string;

  @Column({ name: 'mold_type', type: 'varchar', length: 100 })
  moldType: string;

  @Column({ name: 'cavity_count', type: 'int', default: 1 })
  cavityCount: number;

  @Column({ name: 'mold_size_class', type: 'varchar', length: 50, default: 'MEDIUM' })
  moldSizeClass: string;

  @Column({ name: 'slider_count', type: 'int', default: 0 })
  sliderCount: number;

  @Column({ name: 'lifter_count', type: 'int', default: 0 })
  lifterCount: number;

  @Column({ name: 'insert_count', type: 'int', default: 0 })
  insertCount: number;

  @Column({ name: 'cooling_complexity_level', type: 'varchar', length: 50, default: 'STANDARD' })
  coolingComplexityLevel: string;

  @Column({ name: 'gating_complexity_level', type: 'varchar', length: 50, default: 'STANDARD' })
  gatingComplexityLevel: string;

  @Column({ name: 'tolerance_class', type: 'varchar', length: 50, default: 'STANDARD' })
  toleranceClass: string;

  @Column({ name: 'surface_finish_class', type: 'varchar', length: 50, default: 'COMMERCIAL' })
  surfaceFinishClass: string;

  @Column({ name: 'special_material_factors', type: 'jsonb', default: {} })
  specialMaterialFactors: Record<string, any>;

  @Column({ name: 'calculated_complexity_score', type: 'decimal', precision: 6, scale: 2, default: '1.00' })
  calculatedComplexityScore: number;

  @Column({ name: 'workload_multiplier', type: 'decimal', precision: 6, scale: 2, default: '1.00' })
  workloadMultiplier: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
