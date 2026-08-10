import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum FmeaStatus { DRAFT='DRAFT', REVIEW='REVIEW', APPROVED='APPROVED', ARCHIVED='ARCHIVED' }
export enum FmeaType { DESIGN='DESIGN', PROCESS='PROCESS' }

@Entity('quality_fmeas')
@Index(['fmeaNumber', 'deletedAt'])
@Index(['projectId', 'status', 'deletedAt'])
export class Fmea extends IndustrialBaseEntity {
  @Column({ name: 'fmea_number', type: 'varchar', length: 40, unique: true })
  fmeaNumber: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'drawing_id', type: 'uuid', nullable: true })
  @Index()
  drawingId: string | null;

  @Column({ name: 'routing_id', type: 'uuid', nullable: true })
  @Index()
  routingId: string | null;


  @Column({ name: 'bom_id', type: 'uuid', nullable: true })
  @Index()
  bomId: string | null;


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

  @Column({ name: 'fmea_type', type: 'varchar', length: 20, default: FmeaType.DESIGN })
  fmeaType: FmeaType;

  @Column({ type: 'varchar', length: 50, default: FmeaStatus.DRAFT })
  status: FmeaStatus;

  @Column({ name: 'failure_mode', type: 'text', nullable: true })
  failureMode: string | null;

  @Column({ type: 'text', nullable: true })
  effects: string | null;

  @Column({ type: 'text', nullable: true })
  causes: string | null;

  @Column({ type: 'int', nullable: true })
  severity: number | null;

  @Column({ type: 'int', nullable: true })
  occurrence: number | null;

  @Column({ type: 'int', nullable: true })
  detection: number | null;

  @Column({ type: 'int', nullable: true })
  rpn: number | null;

  @Column({ name: 'recommended_actions', type: 'text', nullable: true })
  recommendedActions: string | null;

  @Column({ name: 'revision_number', type: 'int', default: 1 })
  revisionNumber: number;
}
