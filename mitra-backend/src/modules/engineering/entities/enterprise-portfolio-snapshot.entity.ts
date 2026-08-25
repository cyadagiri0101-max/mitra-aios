import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('engineering_portfolio_snapshots')
@Index(['tenantId', 'snapshotType'])
@Index(['tenantId', 'createdAt'])
export class EnterprisePortfolioSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'snapshot_name', type: 'varchar', length: 255 })
  snapshotName: string;

  @Column({ name: 'snapshot_type', type: 'varchar', length: 50, default: 'SCHEDULED' })
  snapshotType: 'SCHEDULED' | 'AD_HOC' | 'WHAT_IF_SCENARIO';

  @Column({ name: 'included_project_ids', type: 'jsonb' })
  includedProjectIds: string[];

  @Column({ name: 'demand_summary', type: 'jsonb' })
  demandSummary: {
    totalDemandHours: number;
    totalDeliverablesCount: number;
    activeProjectsCount: number;
    uncalibratedDeliverablesCount: number;
    projectBreakdown: Array<{
      projectId: string;
      demandHours: number;
      deliverablesCount: number;
      complexityTier: string;
    }>;
  };

  @Column({ name: 'capacity_summary', type: 'jsonb' })
  capacitySummary: {
    totalAvailableCapacityHours: number;
    totalAllocatedCapacityHours: number;
    overallUtilizationPercentage: number;
    totalEngineersCount: number;
    overloadedEngineersCount: number;
    underutilizedEngineersCount: number;
  };

  @Column({ name: 'bottlenecks', type: 'jsonb' })
  bottlenecks: Array<{
    bottleneckId: string;
    type: 'ENGINEER_OVERLOAD' | 'SKILL_SHORTAGE' | 'DEADLINE_COLLISION' | 'DEPENDENCY_BLOCKAGE' | 'CAPACITY_DEFICIT';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    projectId?: string;
    resourceId?: string;
    description: string;
    impactSummary: string;
    recommendedAction: string;
  }>;

  @Column({ name: 'recommendations', type: 'jsonb' })
  recommendations: Array<{
    recommendationId: string;
    type: 'REALLOCATE_ENGINEER' | 'LEVEL_WORKLOAD' | 'STAGGER_DEADLINE' | 'SKILL_UPSKILL';
    sourceProjectId?: string;
    targetProjectId?: string;
    engineerId?: string;
    engineerName?: string;
    suggestedHours: number;
    expectedUtilizationDelta: number;
    rationale: string;
    isAutonomousDecision: false;
  }>;

  @Column({ name: 'is_autonomous_decision', type: 'boolean', default: false })
  isAutonomousDecision: boolean;

  @Column({ name: 'generated_by', type: 'varchar', length: 100, default: 'SYSTEM' })
  generatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
