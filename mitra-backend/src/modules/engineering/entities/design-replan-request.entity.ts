import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('design_replan_requests')
@Index('IDX_REPLAN_REQ_TENANT_PROJ', ['tenantId', 'projectId'])
export class DesignReplanRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'project_id', type: 'varchar', length: 100 })
  projectId: string;

  @Column({ name: 'package_id', type: 'uuid' })
  packageId: string;

  @Column({ name: 'replan_code', type: 'varchar', length: 100 })
  replanCode: string;

  @Column({ name: 'trigger_reason', type: 'text' })
  triggerReason: string;

  @Column({ name: 'variance_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  varianceUnits: number;

  @Column({ name: 'delivery_risk_level', type: 'varchar', length: 50, default: 'HIGH' })
  deliveryRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'PENDING_REVIEW' })
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';

  @Column({ name: 'recommended_action', type: 'text' })
  recommendedAction: string;

  @Column({ name: 'reviewed_by', type: 'varchar', length: 100, nullable: true })
  reviewedBy: string;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
