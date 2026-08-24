import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { DesignComponentRevision } from './design-component-revision.entity';
import { DesignComponentDeliverable } from './design-component-deliverable.entity';

@Entity('design_components')
@Index('IDX_DESIGN_COMPONENT_TENANT_PROJ_CODE', ['tenantId', 'projectId', 'componentCode'])
export class DesignComponent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'project_id', type: 'varchar', length: 100 })
  projectId: string;

  @Column({ name: 'package_id', type: 'uuid', nullable: true })
  packageId: string;

  @Column({ name: 'component_code', type: 'varchar', length: 100 })
  componentCode: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'component_type', type: 'varchar', length: 100 })
  componentType: 'CORE_INSERT' | 'CAVITY_INSERT' | 'SLIDER' | 'LIFTER' | 'STRIPPER_PLATE' | 'MANIFOLD' | 'CAVITY_PLATE' | 'CORE_PLATE' | 'EJECTOR_GRID' | 'SPECIAL_INSERT';

  @Column({ name: 'variant_bp_code', type: 'varchar', length: 50, nullable: true })
  variantBpCode: string;

  @Column({ name: 'active_revision', type: 'varchar', length: 50, default: 'Rev 0' })
  activeRevision: string;

  @Column({ name: 'responsible_engineer_id', type: 'varchar', length: 100, nullable: true })
  responsibleEngineerId: string;

  @Column({ name: 'reviewer_id', type: 'varchar', length: 100, nullable: true })
  reviewerId: string;

  @Column({ type: 'varchar', length: 50, default: 'IN_DESIGN' })
  status: 'NOT_STARTED' | 'IN_DESIGN' | 'UNDER_REVIEW' | 'APPROVED' | 'RELEASED_FOR_MFG' | 'REWORK_REQUIRED';

  @Column({ name: 'planned_workload_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  plannedWorkloadUnits: number;

  @Column({ name: 'actual_workload_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  actualWorkloadUnits: number;

  @Column({ name: 'rework_workload_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  reworkWorkloadUnits: number;

  @Column({ name: 'completion_percentage', type: 'decimal', precision: 6, scale: 2, default: '0.00' })
  completionPercentage: number;

  @OneToMany(() => DesignComponentRevision, (rev) => rev.component, { cascade: true })
  revisions: DesignComponentRevision[];

  @OneToMany(() => DesignComponentDeliverable, (deliv) => deliv.component, { cascade: true })
  deliverables: DesignComponentDeliverable[];

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
