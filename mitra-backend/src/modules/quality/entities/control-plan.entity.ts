import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ControlPlanStatus { DRAFT='DRAFT', ACTIVE='ACTIVE', REVIEW='REVIEW', RELEASED='RELEASED' }
export enum ControlPlanType { PRODUCT='PRODUCT', PROCESS='PROCESS' }

@Entity('quality_control_plans')
@Index(['planNumber', 'deletedAt'])
@Index(['projectId', 'status', 'deletedAt'])
export class ControlPlan extends IndustrialBaseEntity {
  @Column({ name: 'plan_number', type: 'varchar', length: 40, unique: true })
  planNumber: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'drawing_id', type: 'uuid', nullable: true })
  @Index()
  drawingId: string | null;

  @Column({ name: 'bom_id', type: 'uuid', nullable: true })
  @Index()
  bomId: string | null;

  @Column({ name: 'routing_id', type: 'uuid', nullable: true })
  @Index()
  routingId: string | null;


  @Column({ name: 'work_order_id', type: 'uuid', nullable: true })
  @Index()
  workOrderId: string | null;

  @Column({ name: 'job_card_id', type: 'uuid', nullable: true })
  @Index()
  jobCardId: string | null;

  @Column({ name: 'machine_id', type: 'uuid', nullable: true })
  @Index()
  machineId: string | null;

  @Column({ name: 'operator_id', type: 'uuid', nullable: true })
  @Index()
  operatorId: string | null;

  @Column({ name: 'inspection_plan_id', type: 'uuid', nullable: true })
  @Index()
  inspectionPlanId: string | null;

  @Column({ name: 'material_lot', type: 'varchar', length: 80, nullable: true })
  materialLot: string | null;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  @Index()
  supplierId: string | null;

  @Column({ name: 'process_plan_id', type: 'uuid', nullable: true })
  @Index()
  processPlanId: string | null;

  @Column({ name: 'control_type', type: 'varchar', length: 20, default: ControlPlanType.PRODUCT })
  controlType: ControlPlanType;

  @Column({ type: 'varchar', length: 50, default: ControlPlanStatus.DRAFT })
  status: ControlPlanStatus;

  @Column({ name: 'operation_mapping', type: 'jsonb', nullable: true })
  operationMapping: Record<string, any> | null;

  @Column({ name: 'inspection_mapping', type: 'jsonb', nullable: true })
  inspectionMapping: Record<string, any> | null;

  @Column({ name: 'reaction_plan', type: 'text', nullable: true })
  reactionPlan: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
