import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ResourceType { MACHINE='MACHINE', OPERATOR='OPERATOR', TOOL='TOOL', MATERIAL='MATERIAL' }
export enum AllocationStatus { PLANNED='PLANNED', CONFIRMED='CONFIRMED', RELEASED='RELEASED', CANCELLED='CANCELLED' }

@Entity('resource_allocations')
@Index(['projectId', 'status', 'deletedAt'])
@Index(['resourceId', 'startDate', 'deletedAt'])
export class ResourceAllocation extends IndustrialBaseEntity {
  @Column({ name: 'plan_id', type: 'uuid', nullable: true })
  planId: string | null;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'resource_type', type: 'enum', enum: ResourceType })
  resourceType: ResourceType;

  @Column({ name: 'resource_id', type: 'uuid' })
  @Index()
  resourceId: string;

  @Column({ name: 'resource_name', type: 'varchar', length: 100 })
  resourceName: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({ name: 'allocated_hours', type: 'decimal', precision: 8, scale: 2, nullable: true })
  allocatedHours: number | null;

  @Column({ name: 'utilization_pct', type: 'decimal', precision: 5, scale: 2, default: 100 })
  utilizationPct: number;

  @Column({ type: 'enum', enum: AllocationStatus, default: AllocationStatus.PLANNED })
  status: AllocationStatus;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}