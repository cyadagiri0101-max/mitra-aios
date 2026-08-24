import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ModificationCategoryEnum {
  T_DIA_CORRECTION = 'T_DIA_CORRECTION',
  E_DIA_CORRECTION = 'E_DIA_CORRECTION',
  OFC_MODIFICATION = 'OFC_MODIFICATION',
  GEOMETRY_CORRECTION = 'GEOMETRY_CORRECTION',
  COOLING_MODIFICATION = 'COOLING_MODIFICATION',
  VENTING_MODIFICATION = 'VENTING_MODIFICATION',
  EJECTION_MODIFICATION = 'EJECTION_MODIFICATION',
  GATE_MODIFICATION = 'GATE_MODIFICATION',
  SHRINKAGE_ADJUSTMENT = 'SHRINKAGE_ADJUSTMENT',
  OTHER_APPROVED_CHANGE = 'OTHER_APPROVED_CHANGE',
}

export enum ModificationRootCauseEnum {
  PLANNED_TOOL_PROVING = 'PLANNED_TOOL_PROVING',
  CUSTOMER_DRIVEN_CHANGE = 'CUSTOMER_DRIVEN_CHANGE',
  SCOPE_CHANGE = 'SCOPE_CHANGE',
  MANUFACTURING_DRIVEN = 'MANUFACTURING_DRIVEN',
  TRIAL_DRIVEN_MODIFICATION = 'TRIAL_DRIVEN_MODIFICATION',
  QUALITY_CORRECTION = 'QUALITY_CORRECTION',
  ENGINEERING_CORRECTION = 'ENGINEERING_CORRECTION',
  REWORK = 'REWORK',
}

@Entity('tool_modification_workloads')
@Index(['tenantId', 'projectId'])
@Index(['tenantId', 'toolProvingCycleId'])
@Index(['tenantId', 'category'])
@Index(['tenantId', 'status'])
export class ToolModificationWorkload extends IndustrialBaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'tool_proving_cycle_id', type: 'uuid' })
  toolProvingCycleId: string;

  @Column({ name: 'modification_code', type: 'varchar', length: 100 })
  modificationCode: string;

  @Column({ type: 'varchar', length: 100 })
  category: ModificationCategoryEnum;

  @Column({ name: 'root_cause', type: 'varchar', length: 100 })
  rootCause: ModificationRootCauseEnum;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'estimated_workload_units', type: 'decimal', precision: 10, scale: 2, default: 0 })
  estimatedWorkloadUnits: number;

  @Column({ name: 'actual_workload_units', type: 'decimal', precision: 10, scale: 2, default: 0 })
  actualWorkloadUnits: number;

  @Column({ name: 'assigned_engineer_id', type: 'uuid', nullable: true })
  assignedEngineerId: string | null;

  @Column({ type: 'varchar', length: 50, default: 'PROPOSED' })
  status: 'PROPOSED' | 'REVIEWED' | 'APPROVED' | 'EXECUTING' | 'COMPLETED' | 'CANCELLED';

  @Column({ name: 'approval_notes', type: 'text', nullable: true })
  approvalNotes: string | null;

  @Column({ name: 'approved_by', type: 'varchar', length: 255, nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
