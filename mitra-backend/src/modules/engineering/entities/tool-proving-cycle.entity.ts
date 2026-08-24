import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ToolProvingStageEnum {
  T0_PREPARATION = 'T0_PREPARATION',
  FIRST_TRIAL = 'FIRST_TRIAL',
  TRIAL_OBSERVATION = 'TRIAL_OBSERVATION',
  MODIFICATION_REQUIRED = 'MODIFICATION_REQUIRED',
  MODIFICATION_REVIEW = 'MODIFICATION_REVIEW',
  RE_TRIAL = 'RE_TRIAL',
  T1_EVALUATION = 'T1_EVALUATION',
  T2_EVALUATION = 'T2_EVALUATION',
  FINAL_ACCEPTANCE = 'FINAL_ACCEPTANCE',
}

@Entity('tool_proving_cycles')
@Index(['tenantId', 'projectId'])
@Index(['tenantId', 'toolId'])
@Index(['tenantId', 'status'])
export class ToolProvingCycle extends IndustrialBaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'tool_id', type: 'varchar', length: 100 })
  toolId: string;

  @Column({ name: 'cycle_code', type: 'varchar', length: 50, default: 'T0' })
  cycleCode: 'T0' | 'T1' | 'T2' | 'T3_FINAL';

  @Column({ type: 'varchar', length: 100, default: ToolProvingStageEnum.T0_PREPARATION })
  stage: ToolProvingStageEnum;

  @Column({ name: 'trial_date', type: 'timestamptz', nullable: true })
  trialDate: Date | null;

  @Column({ name: 'machine_id', type: 'varchar', length: 100, nullable: true })
  machineId: string | null;

  @Column({ type: 'varchar', length: 50, default: 'SCHEDULED' })
  status: 'SCHEDULED' | 'RUNNING' | 'OBSERVATIONS_LOGGED' | 'MODIFICATIONS_APPROVED' | 'ACCEPTED' | 'REJECTED';

  @Column({ name: 'observations_count', type: 'integer', default: 0 })
  observationsCount: number;

  @Column({ name: 'modifications_count', type: 'integer', default: 0 })
  modificationsCount: number;

  @Column({ name: 'total_actual_modification_workload', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalActualModificationWorkload: number;

  @Column({ name: 'trial_metrics', type: 'jsonb', default: {} })
  trialMetrics: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
