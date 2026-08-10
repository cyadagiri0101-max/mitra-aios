import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum SupplierInspectionStatus { DRAFT='DRAFT', ACCEPTED='ACCEPTED', REJECTED='REJECTED', QUARANTINED='QUARANTINED', CLOSED='CLOSED' }

@Entity('supplier_inspections')
@Index(['inspectionNumber', 'deletedAt'])
@Index(['supplierId', 'status', 'deletedAt'])
export class SupplierInspection extends IndustrialBaseEntity {
  @Column({ name: 'inspection_number', type: 'varchar', length: 40, unique: true })
  inspectionNumber: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  @Index()
  supplierId: string | null;

  @Column({ name: 'inspection_plan_id', type: 'uuid', nullable: true })
  @Index()
  inspectionPlanId: string | null;

  @Column({ name: 'material_lot', type: 'varchar', length: 80, nullable: true })
  materialLot: string | null;


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

  @Column({ name: 'material_certificate', type: 'varchar', length: 200, nullable: true })
  materialCertificate: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column({ type: 'varchar', length: 20, default: SupplierInspectionStatus.DRAFT })
  status: SupplierInspectionStatus;

  @Column({ name: 'accepted_qty', type: 'int', default: 0 })
  acceptedQty: number;

  @Column({ name: 'rejected_qty', type: 'int', default: 0 })
  rejectedQty: number;

  @Column({ name: 'quarantine_qty', type: 'int', default: 0 })
  quarantineQty: number;

  @Column({ name: 'inspection_date', type: 'date', nullable: true })
  inspectionDate: Date | null;

  @Column({ name: 'inspected_by', type: 'uuid', nullable: true })
  inspectedBy: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
