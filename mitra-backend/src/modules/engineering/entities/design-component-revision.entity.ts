import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DesignComponent } from './design-component.entity';

@Entity('design_component_revisions')
@Index('IDX_COMP_REV_TENANT_COMP', ['tenantId', 'componentId'])
export class DesignComponentRevision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'component_id', type: 'uuid' })
  componentId: string;

  @ManyToOne(() => DesignComponent, (comp) => comp.revisions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'component_id' })
  component: DesignComponent;

  @Column({ name: 'revision_code', type: 'varchar', length: 50 })
  revisionCode: string;

  @Column({ name: 'revision_reason', type: 'varchar', length: 100 })
  revisionReason: 'CUSTOMER_ECR' | 'DFM_FEEDBACK' | 'TRIAL_MODIFICATION' | 'DESIGN_ERROR' | 'MANUFACTURING_FIT' | 'STANDARDIZATION';

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'incremental_workload_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  incrementalWorkloadUnits: number;

  @Column({ name: 'rework_workload_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  reworkWorkloadUnits: number;

  @Column({ name: 'engineer_id', type: 'varchar', length: 100, nullable: true })
  engineerId: string;

  @Column({ name: 'reviewer_id', type: 'varchar', length: 100, nullable: true })
  reviewerId: string;

  @Column({ type: 'varchar', length: 50, default: 'PENDING_REVIEW' })
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
