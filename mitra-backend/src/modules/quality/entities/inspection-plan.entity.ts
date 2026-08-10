import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum InspectionPlanStatus { DRAFT='DRAFT', ACTIVE='ACTIVE', REVIEW='REVIEW', RELEASED='RELEASED', ARCHIVED='ARCHIVED' }
export enum InspectionType { INCOMING='INCOMING', IN_PROCESS='IN_PROCESS', FINAL='FINAL', SPECIAL='SPECIAL' }

@Entity('inspection_plans')
@Index(['planNumber', 'deletedAt'])
@Index(['projectId', 'status', 'deletedAt'])
export class InspectionPlan extends IndustrialBaseEntity {
  @Column({ name: 'plan_number', type: 'varchar', length: 40, unique: true })
  planNumber: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

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

  @Column({ name: 'part_id', type: 'uuid', nullable: true })
  @Index()
  partId: string | null;


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

  @Column({ name: 'material_lot', type: 'varchar', length: 80, nullable: true })
  materialLot: string | null;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  @Index()
  supplierId: string | null;

  @Column({ name: 'inspection_type', type: 'varchar', length: 30, default: InspectionType.INCOMING })
  inspectionType: InspectionType;

  @Column({ type: 'varchar', length: 50, default: InspectionPlanStatus.DRAFT })
  status: InspectionPlanStatus;

  @Column({ name: 'revision_number', type: 'int', default: 1 })
  revisionNumber: number;

  @Column({ name: 'source_artifact_type', type: 'varchar', length: 50, nullable: true })
  sourceArtifactType: string | null;

  @Column({ name: 'source_artifact_id', type: 'uuid', nullable: true })
  sourceArtifactId: string | null;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt: Date | null;

  @Column({ name: 'released_by', type: 'uuid', nullable: true })
  releasedBy: string | null;


  @Column({ type: 'jsonb', nullable: true })
  characteristics: Record<string, any>[] | null;

  @Column({ type: 'jsonb', nullable: true })
  dimensions: Record<string, any>[] | null;

  @Column({ type: 'jsonb', nullable: true })
  tolerances: Record<string, any>[] | null;

  @Column({ name: 'acceptance_criteria', type: 'jsonb', nullable: true })
  acceptanceCriteria: Record<string, any> | null;

  @Column({ name: 'inspection_frequency', type: 'varchar', length: 80, nullable: true })
  inspectionFrequency: string | null;

  @Column({ name: 'sampling_plan', type: 'jsonb', nullable: true })
  samplingPlan: Record<string, any> | null;

  @Column({ name: 'inspection_methods', type: 'jsonb', nullable: true })
  inspectionMethods: Record<string, any>[] | null;

  @Column({ type: 'jsonb', nullable: true })
  instruments: Record<string, any>[] | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
