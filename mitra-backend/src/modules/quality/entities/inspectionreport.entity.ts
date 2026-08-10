import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum InspectionType { INCOMING='INCOMING', IN_PROCESS='IN_PROCESS', FINAL='FINAL', DIMENSIONAL='DIMENSIONAL', VISUAL='VISUAL' }

@Entity('inspection_reports')
@Index(['reportNumber', 'deletedAt'])
@Index(['projectId', 'inspectionType', 'deletedAt'])
export class InspectionReport extends IndustrialBaseEntity {
  @Column({ name: 'report_number', type: 'varchar', length: 30, unique: true })
  reportNumber: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  /** Sprint 2.3.1 G-1: artifact traceability links (UUID + index, no relations). */
  @Column({ name: 'part_id', type: 'uuid', nullable: true })
  @Index()
  partId: string | null;

  @Column({ name: 'drawing_id', type: 'uuid', nullable: true })
  @Index()
  drawingId: string | null;

  @Column({ name: 'bom_item_id', type: 'uuid', nullable: true })
  @Index()
  bomItemId: string | null;

  @Column({ name: 'routing_id', type: 'uuid', nullable: true })
  @Index()
  routingId: string | null;

  @Column({ name: 'work_order_id', type: 'uuid', nullable: true })
  @Index()
  workOrderId: string | null;

  @Column({ name: 'inspection_type', type: 'enum', enum: InspectionType, default: InspectionType.FINAL })
  inspectionType: InspectionType;

  @Column({ name: 'inspection_date', type: 'date' })
  inspectionDate: Date;

  @Column({ name: 'inspector_id', type: 'uuid', nullable: true })
  @Index()
  inspectorId: string | null;

  @Column({ name: 'sample_size', type: 'int', default: 1 })
  sampleSize: number;

  @Column({ name: 'accepted_qty', type: 'int', default: 0 })
  acceptedQty: number;

  @Column({ name: 'rejected_qty', type: 'int', default: 0 })
  rejectedQty: number;

  @Column({ name: 'overall_result', type: 'varchar', length: 20, default: 'PENDING' })
  overallResult: string;

  @Column({ name: 'defects_found', type: 'jsonb', nullable: true })
  defectsFound: Record<string, number> | null;

  @Column({ name: 'disposition', type: 'varchar', length: 50, nullable: true })
  disposition: string | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}