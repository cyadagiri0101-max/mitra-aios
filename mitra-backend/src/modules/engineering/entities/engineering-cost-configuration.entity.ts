import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum CostRateType {
  MACHINE_HOUR = 'MACHINE_HOUR',
  MATERIAL_UNIT = 'MATERIAL_UNIT',
  LABOR_HOUR = 'LABOR_HOUR',
  TOOLING_SETUP = 'TOOLING_SETUP',
  INSPECTION_HOUR = 'INSPECTION_HOUR',
  REWORK_HOUR = 'REWORK_HOUR',
  SETUP_HOUR = 'SETUP_HOUR',
}

export enum CostConfigurationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEPRECATED = 'DEPRECATED',
}

@Entity('engineering_cost_configurations')
@Index(['tenantId', 'rateType', 'status'])
@Index(['tenantId', 'workCenterId'])
@Index(['tenantId', 'materialId'])
@Index(['tenantId', 'machineId'])
@Index(['tenantId', 'operationId'])
export class EngineeringCostConfiguration extends IndustrialBaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @Column({ name: 'rate_type', type: 'varchar', length: 50 })
  rateType: CostRateType;

  @Column({ name: 'rate_name', type: 'varchar', length: 100 })
  rateName: string;

  @Column({ name: 'work_center_id', type: 'uuid', nullable: true })
  @Index()
  workCenterId: string | null;

  @Column({ name: 'machine_id', type: 'uuid', nullable: true })
  @Index()
  machineId: string | null;

  @Column({ name: 'material_id', type: 'uuid', nullable: true })
  @Index()
  materialId: string | null;

  @Column({ name: 'operation_id', type: 'uuid', nullable: true })
  @Index()
  operationId: string | null;

  @Column({ name: 'rate_value', type: 'decimal', precision: 18, scale: 4 })
  rateValue: number;

  @Column({ name: 'currency', type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ name: 'uom', type: 'varchar', length: 20, default: 'HOUR' })
  uom: string;

  @Column({ name: 'effective_from', type: 'date', nullable: true })
  effectiveFrom: Date | null;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo: Date | null;

  @Column({ name: 'source', type: 'varchar', length: 100, nullable: true })
  source: string | null;

  @Column({ name: 'source_reference', type: 'varchar', length: 200, nullable: true })
  sourceReference: string | null;

  @Column({ type: 'varchar', length: 30, default: CostConfigurationStatus.ACTIVE })
  status: CostConfigurationStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}

export interface CostRateLookupResult {
  rateValue: number | null;
  currency: string;
  uom: string;
  source: string | null;
  sourceReference: string | null;
  effectiveDate: Date | null;
  configurationId: string | null;
  found: boolean;
}