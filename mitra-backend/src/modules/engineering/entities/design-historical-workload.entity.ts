import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('design_historical_workloads')
@Index('IDX_HIST_WORKLOAD_TENANT_MOLD_STAGE', ['tenantId', 'moldType', 'stage'])
export class DesignHistoricalWorkload {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'project_id', type: 'varchar', length: 100 })
  projectId: string;

  @Column({ name: 'mold_type', type: 'varchar', length: 100 })
  moldType: string;

  @Column({ name: 'stage', type: 'varchar', length: 100 })
  stage: string;

  @Column({ name: 'template_code', type: 'varchar', length: 100 })
  templateCode: string;

  @Column({ name: 'engineer_id', type: 'uuid', nullable: true })
  engineerId: string;

  @Column({ name: 'required_skill', type: 'varchar', length: 100 })
  requiredSkill: string;

  @Column({ name: 'planned_duration_days', type: 'decimal', precision: 6, scale: 2, default: '0.00' })
  plannedDurationDays: number;

  @Column({ name: 'actual_duration_days', type: 'decimal', precision: 6, scale: 2, default: '0.00' })
  actualDurationDays: number;

  @Column({ name: 'planned_workload_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  plannedWorkloadUnits: number;

  @Column({ name: 'actual_workload_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  actualWorkloadUnits: number;

  @Column({ name: 'variance_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  varianceUnits: number;

  @Column({ name: 'variance_percentage', type: 'decimal', precision: 6, scale: 2, default: '0.00' })
  variancePercentage: number;

  @Column({ name: 'root_cause_category', type: 'varchar', length: 100, nullable: true })
  rootCauseCategory: string;

  @Column({ name: 'metadata', type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
