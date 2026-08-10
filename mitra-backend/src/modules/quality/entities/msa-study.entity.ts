import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum MsaStudyType { GAGE_RR='GAGE_RR', BIAS='BIAS', LINEARITY='LINEARITY', STABILITY='STABILITY', REPEATABILITY='REPEATABILITY', REPRODUCIBILITY='REPRODUCIBILITY' }
export enum MsaStatus { DRAFT='DRAFT', COMPLETED='COMPLETED', REVIEW='REVIEW' }

@Entity('quality_msa_studies')
@Index(['studyNumber', 'deletedAt'])
@Index(['projectId', 'status', 'deletedAt'])
export class MsaStudy extends IndustrialBaseEntity {
  @Column({ name: 'study_number', type: 'varchar', length: 40, unique: true })
  studyNumber: string;

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

  @Column({ name: 'gauge_id', type: 'uuid', nullable: true })
  @Index()
  gaugeId: string | null;

  @Column({ name: 'study_type', type: 'varchar', length: 30, default: MsaStudyType.GAGE_RR })
  studyType: MsaStudyType;

  @Column({ type: 'varchar', length: 50, default: MsaStatus.DRAFT })
  status: MsaStatus;

  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true })
  repeatability: number | null;

  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true })
  reproducibility: number | null;

  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true })
  bias: number | null;

  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true })
  linearity: number | null;

  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true })
  stability: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
