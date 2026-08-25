import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('cross_project_allocations')
@Index(['tenantId', 'projectId'])
@Index(['tenantId', 'engineerId'])
@Index(['tenantId', 'allocationStatus'])
export class CrossProjectAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'project_id', type: 'varchar', length: 100 })
  projectId: string;

  @Column({ name: 'work_package_id', type: 'varchar', length: 100, nullable: true })
  workPackageId?: string | null;

  @Column({ name: 'deliverable_id', type: 'varchar', length: 100, nullable: true })
  deliverableId?: string | null;

  @Column({ name: 'engineer_id', type: 'varchar', length: 100 })
  engineerId: string;

  @Column({ name: 'engineer_name', type: 'varchar', length: 255 })
  engineerName: string;

  @Column({ name: 'allocation_role', type: 'varchar', length: 100, default: 'TOOLING_ENGINEER' })
  allocationRole: string;

  @Column({ name: 'allocated_hours_per_week', type: 'decimal', precision: 6, scale: 2, default: 0.0 })
  allocatedHoursPerWeek: number;

  @Column({ name: 'allocated_workload_units', type: 'decimal', precision: 6, scale: 2, default: 0.0 })
  allocatedWorkloadUnits: number;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamptz' })
  endDate: Date;

  @Column({ name: 'allocation_status', type: 'varchar', length: 50, default: 'ACTIVE' })
  allocationStatus: 'ACTIVE' | 'PROPOSED' | 'RELEASED' | 'OVERRIDDEN';

  @Column({ name: 'skill_fit_score', type: 'decimal', precision: 5, scale: 2, default: 100.0 })
  skillFitScore: number;

  @Column({ name: 'source', type: 'varchar', length: 50, default: 'MANUAL_ASSIGNMENT' })
  source: 'MANUAL_ASSIGNMENT' | 'BALANCING_SCENARIO' | 'LEGACY_IMPORT';

  @Column({ name: 'reviewed_by', type: 'varchar', length: 100, nullable: true })
  reviewedBy?: string | null;

  @Column({ name: 'review_rationale', type: 'text', nullable: true })
  reviewRationale?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
