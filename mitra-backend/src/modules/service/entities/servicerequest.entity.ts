import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ServiceRequestStatus { OPEN='OPEN', ACKNOWLEDGED='ACKNOWLEDGED', IN_PROGRESS='IN_PROGRESS', RESOLVED='RESOLVED', CLOSED='CLOSED', CANCELLED='CANCELLED' }
export enum ServicePriority { LOW='LOW', MEDIUM='MEDIUM', HIGH='HIGH', CRITICAL='CRITICAL' }
export enum ServiceType { REPAIR='REPAIR', MAINTENANCE='MAINTENANCE', MODIFICATION='MODIFICATION', INSPECTION='INSPECTION', EMERGENCY='EMERGENCY' }

@Entity('service_requests')
@Index(['srNumber', 'deletedAt'])
@Index(['moldId', 'status', 'deletedAt'])
export class ServiceRequest extends IndustrialBaseEntity {
  @Column({ name: 'sr_number', type: 'varchar', length: 30, unique: true })
  srNumber: string;

  @Column({ name: 'mold_id', type: 'uuid', nullable: true })
  @Index()
  moldId: string | null;

  @Column({ name: 'mold_number', type: 'varchar', length: 30, nullable: true })
  moldNumber: string | null;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  @Index()
  customerId: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 200, nullable: true })
  customerName: string | null;

  @Column({ name: 'service_type', type: 'enum', enum: ServiceType, default: ServiceType.REPAIR })
  serviceType: ServiceType;

  @Column({ name: 'issue_description', type: 'text' })
  issueDescription: string;

  @Column({ name: 'reported_by', type: 'varchar', length: 100, nullable: true })
  reportedBy: string | null;

  @Column({ name: 'reported_date', type: 'date' })
  reportedDate: Date;

  @Column({ type: 'enum', enum: ServicePriority, default: ServicePriority.MEDIUM })
  priority: ServicePriority;

  @Column({ name: 'assigned_technician_id', type: 'uuid', nullable: true })
  @Index()
  assignedTechnicianId: string | null;

  @Column({ name: 'estimated_completion_date', type: 'date', nullable: true })
  estimatedCompletionDate: Date | null;

  @Column({ name: 'actual_completion_date', type: 'date', nullable: true })
  actualCompletionDate: Date | null;

  @Column({ name: 'mold_shots_at_request', type: 'int', nullable: true })
  moldShotsAtRequest: number | null;

  @Column({ type: 'enum', enum: ServiceRequestStatus, default: ServiceRequestStatus.OPEN })
  status: ServiceRequestStatus;

  @Column({ name: 'resolution_summary', type: 'text', nullable: true })
  resolutionSummary: string | null;

  @Column({ name: 'customer_feedback', type: 'text', nullable: true })
  customerFeedback: string | null;

  @Column({ name: 'warranty_claim', type: 'boolean', default: false })
  warrantyClaim: boolean;

  @Column({ name: 'cost_estimate', type: 'decimal', precision: 18, scale: 2, nullable: true })
  costEstimate: number | null;

  @Column({ name: 'actual_cost', type: 'decimal', precision: 18, scale: 2, nullable: true })
  actualCost: number | null;
}