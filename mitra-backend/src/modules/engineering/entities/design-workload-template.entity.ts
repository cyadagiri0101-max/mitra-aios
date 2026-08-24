import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { DesignStageEnum } from './design-work-package.entity';

export interface StageDefinition {
  stage: DesignStageEnum;
  order: number;
  workloadUnits: number;
  durationDays: number;
  requiredSkills: string[];
  mandatoryDeliverables: string[];
  requiresCustomerApproval: boolean;
}

@Entity('design_workload_templates')
@Index(['tenantId', 'templateCode'])
@Index(['tenantId', 'status'])
export class DesignWorkloadTemplate extends IndustrialBaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @Column({ name: 'template_code', type: 'varchar', length: 100 })
  templateCode: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'mold_type', type: 'varchar', length: 100 })
  moldType: string;

  @Column({ name: 'estimated_total_workload_units', type: 'decimal', precision: 10, scale: 2, default: 0 })
  estimatedTotalWorkloadUnits: number;

  @Column({ name: 'estimated_calendar_duration_days', type: 'integer', default: 7 })
  estimatedCalendarDurationDays: number;

  @Column({ type: 'varchar', length: 50, default: '1.0' })
  version: string;

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status: 'ACTIVE' | 'DEPRECATED' | 'DRAFT';

  @Column({ name: 'stage_definitions', type: 'jsonb', default: [] })
  stageDefinitions: StageDefinition[];

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
