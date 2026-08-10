import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum NcrType { INTERNAL='INTERNAL', CUSTOMER='CUSTOMER', SUPPLIER='SUPPLIER' }
export enum NcrSeverity { MINOR='MINOR', MAJOR='MAJOR', CRITICAL='CRITICAL' }
export enum NcrDisposition { USE_AS_IS='USE_AS_IS', REWORK='REWORK', SCRAP='SCRAP', RETURN='RETURN', REJECT='REJECT', OTHER='OTHER' }
export enum NcrStatus { OPEN='OPEN', INVESTIGATION='INVESTIGATION', ACTION='ACTION', VERIFIED='VERIFIED', CLOSED='CLOSED' }

/**
 * Sprint 2.4 MES — non-conformance record raised directly from production
 * (Phase 9). Fully linked to the manufacturing traceability chain.
 */
@Entity('ncr_records')
@Index(['workOrderId', 'deletedAt'])
@Index(['status', 'deletedAt'])
@Index(['projectId', 'deletedAt'])
export class NcrRecord extends IndustrialBaseEntity {
  @Column({ name: 'ncr_number', type: 'varchar', length: 30, unique: true })
  ncrNumber: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'work_order_id', type: 'uuid', nullable: true })
  workOrderId: string | null;


  @Column({ name: 'job_card_id', type: 'uuid', nullable: true })
  @Index()
  jobCardId: string | null;

  @Column({ name: 'operation_id', type: 'uuid', nullable: true })
  operationId: string | null;

  @Column({ name: 'inspection_report_id', type: 'uuid', nullable: true })
  inspectionReportId: string | null;

  @Column({ name: 'part_id', type: 'uuid', nullable: true })
  partId: string | null;

  @Column({ name: 'drawing_id', type: 'uuid', nullable: true })
  drawingId: string | null;

  @Column({ name: 'bom_item_id', type: 'uuid', nullable: true })
  bomItemId: string | null;


  @Column({ name: 'bom_id', type: 'uuid', nullable: true })
  @Index()
  bomId: string | null;

  @Column({ name: 'routing_id', type: 'uuid', nullable: true })
  @Index()
  routingId: string | null;

  @Column({ name: 'machine_id', type: 'uuid', nullable: true })
  machineId: string | null;

  @Column({ name: 'operator_id', type: 'uuid', nullable: true })
  operatorId: string | null;


  @Column({ name: 'inspection_plan_id', type: 'uuid', nullable: true })
  @Index()
  inspectionPlanId: string | null;

  @Column({ name: 'material_lot', type: 'varchar', length: 80, nullable: true })
  materialLot: string | null;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  @Index()
  supplierId: string | null;

  @Column({ name: 'ncr_type', type: 'enum', enum: NcrType, default: NcrType.INTERNAL })
  ncrType: NcrType;

  @Column({ type: 'enum', enum: NcrSeverity, default: NcrSeverity.MAJOR })
  severity: NcrSeverity;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'detected_qty', type: 'decimal', precision: 10, scale: 3, nullable: true })
  detectedQty: number | null;

  @Column({ name: 'rejected_qty', type: 'decimal', precision: 10, scale: 3, nullable: true })
  rejectedQty: number | null;

  @Column({ name: 'root_cause', type: 'text', nullable: true })
  rootCause: string | null;

  @Column({ type: 'enum', enum: NcrDisposition, nullable: true })
  disposition: NcrDisposition | null;

  @Column({ type: 'enum', enum: NcrStatus, default: NcrStatus.OPEN })
  status: NcrStatus;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;
}
