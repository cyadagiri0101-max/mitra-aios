import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum DesignStageEnum {
  CUSTOMER_INPUTS = 'CUSTOMER_INPUTS',
  KICK_OFF_INPUT_SHEET = 'KICK_OFF_INPUT_SHEET',
  LAYOUT = 'LAYOUT',
  CAVITY_MODEL = 'CAVITY_MODEL',
  MOLD_DESIGN = 'MOLD_DESIGN',
  MASK_DESIGN = 'MASK_DESIGN',
  DESIGN_REVIEW = 'DESIGN_REVIEW',
  CUSTOMER_APPROVAL = 'CUSTOMER_APPROVAL',
  RAW_MATERIAL = 'RAW_MATERIAL',
  PROCESS_PLANNING = 'PROCESS_PLANNING',
  FINAL_PART_LIST = 'FINAL_PART_LIST',
  FINAL_DESIGN_REVIEW = 'FINAL_DESIGN_REVIEW',
  DATA_TO_PROGRAMMING = 'DATA_TO_PROGRAMMING',
  DESIGN_DELIVERY_COMPLETE = 'DESIGN_DELIVERY_COMPLETE',
}

export enum DesignPackageStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
}

export interface DesignStageState {
  stage: DesignStageEnum;
  order: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  plannedStartDate?: string;
  plannedFinishDate?: string;
  actualStartDate?: string;
  actualFinishDate?: string;
  plannedWorkloadUnits: number;
  actualWorkloadUnits: number;
  assignedEngineerId?: string;
  requiredSkills: string[];
  deliverablesCount: number;
  approvalStatus?: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  approvalNotes?: string;
}

export interface DesignDeliverableItem {
  id: string;
  stage: DesignStageEnum;
  title: string;
  fileReference?: string;
  drawingRevision: string;
  status: 'DRAFT' | 'RELEASED' | 'OBSOLETE';
  completedAt?: string;
}

@Entity('design_work_packages')
@Index(['tenantId', 'projectId'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'packageCode'])
export class DesignWorkPackage extends IndustrialBaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'package_code', type: 'varchar', length: 100 })
  packageCode: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50, default: DesignPackageStatus.PLANNING })
  status: DesignPackageStatus;

  @Column({ name: 'current_stage', type: 'varchar', length: 100, default: DesignStageEnum.CUSTOMER_INPUTS })
  currentStage: DesignStageEnum;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string | null;

  @Column({ name: 'lead_engineer_id', type: 'uuid', nullable: true })
  leadEngineerId: string | null;

  @Column({ name: 'active_revision', type: 'varchar', length: 50, default: 'Rev A' })
  activeRevision: string;

  @Column({ name: 'planned_start_date', type: 'timestamptz', nullable: true })
  plannedStartDate: Date | null;

  @Column({ name: 'planned_finish_date', type: 'timestamptz', nullable: true })
  plannedFinishDate: Date | null;

  @Column({ name: 'actual_start_date', type: 'timestamptz', nullable: true })
  actualStartDate: Date | null;

  @Column({ name: 'actual_finish_date', type: 'timestamptz', nullable: true })
  actualFinishDate: Date | null;

  @Column({ name: 'planned_workload_units', type: 'decimal', precision: 10, scale: 2, default: 0 })
  plannedWorkloadUnits: number;

  @Column({ name: 'actual_workload_units', type: 'decimal', precision: 10, scale: 2, default: 0 })
  actualWorkloadUnits: number;

  @Column({ name: 'stages_state', type: 'jsonb', default: [] })
  stagesState: DesignStageState[];

  @Column({ type: 'jsonb', default: [] })
  deliverables: DesignDeliverableItem[];

  @Column({ name: 'audit_trail', type: 'jsonb', default: [] })
  auditTrail: Array<{
    timestamp: string;
    actor: string;
    action: string;
    stage: DesignStageEnum;
    notes?: string;
  }>;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
