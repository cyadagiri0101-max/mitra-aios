import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ServiceWarrantyClaimStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
}

@Entity('service_warranty_claims')
@Index(['claimNumber', 'deletedAt'])
@Index(['warrantyId', 'deletedAt'])
export class ServiceWarrantyClaim extends IndustrialBaseEntity {
  @Column({ name: 'claim_number', type: 'varchar', length: 30, unique: true })
  claimNumber: string;

  @Column({ name: 'warranty_id', type: 'uuid', nullable: true })
  @Index()
  warrantyId: string | null;

  @Column({ name: 'service_request_id', type: 'uuid', nullable: true })
  @Index()
  serviceRequestId: string | null;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'claim_date', type: 'date', nullable: true })
  claimDate: Date | null;

  @Column({ name: 'issue_summary', type: 'text', nullable: true })
  issueSummary: string | null;

  @Column({ name: 'eligibility_reason', type: 'text', nullable: true })
  eligibilityReason: string | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  @Index()
  approvedBy: string | null;

  @Column({ name: 'approval_notes', type: 'text', nullable: true })
  approvalNotes: string | null;

  @Column({ name: 'resolved_date', type: 'date', nullable: true })
  resolvedDate: Date | null;

  @Column({ type: 'enum', enum: ServiceWarrantyClaimStatus, default: ServiceWarrantyClaimStatus.SUBMITTED })
  status: ServiceWarrantyClaimStatus;
}
