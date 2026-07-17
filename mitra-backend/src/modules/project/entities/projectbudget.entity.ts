import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('project_budgets')
@Index(['projectId', 'deletedAt'])
export class ProjectBudget extends IndustrialBaseEntity {
  @Column({ name: 'project_id', type: 'uuid', unique: true })
  projectId: string;

  @Column({ name: 'total_budgeted', type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalBudgeted: number;

  @Column({ name: 'design_cost_budgeted', type: 'decimal', precision: 18, scale: 2, default: 0 })
  designCostBudgeted: number;

  @Column({ name: 'material_cost_budgeted', type: 'decimal', precision: 18, scale: 2, default: 0 })
  materialCostBudgeted: number;

  @Column({ name: 'machining_cost_budgeted', type: 'decimal', precision: 18, scale: 2, default: 0 })
  machiningCostBudgeted: number;

  @Column({ name: 'trial_cost_budgeted', type: 'decimal', precision: 18, scale: 2, default: 0 })
  trialCostBudgeted: number;

  @Column({ name: 'overhead_budgeted', type: 'decimal', precision: 18, scale: 2, default: 0 })
  overheadBudgeted: number;

  @Column({ name: 'total_actual', type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalActual: number;

  @Column({ name: 'design_cost_actual', type: 'decimal', precision: 18, scale: 2, default: 0 })
  designCostActual: number;

  @Column({ name: 'material_cost_actual', type: 'decimal', precision: 18, scale: 2, default: 0 })
  materialCostActual: number;

  @Column({ name: 'machining_cost_actual', type: 'decimal', precision: 18, scale: 2, default: 0 })
  machiningCostActual: number;

  @Column({ name: 'trial_cost_actual', type: 'decimal', precision: 18, scale: 2, default: 0 })
  trialCostActual: number;

  @Column({ name: 'overhead_actual', type: 'decimal', precision: 18, scale: 2, default: 0 })
  overheadActual: number;

  @Column({ name: 'budget_variance', type: 'decimal', precision: 18, scale: 2, default: 0 })
  budgetVariance: number;

  @Column({ name: 'budget_variance_pct', type: 'decimal', precision: 5, scale: 2, default: 0 })
  budgetVariancePct: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ name: 'last_updated_at', type: 'timestamptz', nullable: true })
  lastUpdatedAt: Date | null;
}