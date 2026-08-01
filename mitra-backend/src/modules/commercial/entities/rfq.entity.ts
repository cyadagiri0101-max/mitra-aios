import { Entity, Column, VersionColumn, Index, OneToMany  } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { RfqProduct } from './rfq-product.entity';
import { RfqRevision } from './rfq-revision.entity';

export enum RfqStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum RfqPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RfqMoldType {
  INJECTION = 'INJECTION',
  COMPRESSION = 'COMPRESSION',
  BLOW = 'BLOW',
  DIE_CASTING = 'DIE_CASTING',
  VACUUM = 'VACUUM',
  THERMOFORMING = 'THERMOFORMING',
  OTHER = 'OTHER',
}

export enum RfqApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RETURNED = 'RETURNED',
  NOT_REQUIRED = 'NOT_REQUIRED',
}

export enum RfqWorkflowState {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  TECHNICAL_REVIEW = 'TECHNICAL_REVIEW',
  COMMERCIAL_REVIEW = 'COMMERCIAL_REVIEW',
  APPROVED = 'APPROVED',
  QUOTED = 'QUOTED',
  ACCEPTED = 'ACCEPTED',
  PROJECT_READY = 'PROJECT_READY',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('rfqs')
@Index(['rfqNumber', 'deletedAt'])
@Index(['customerId', 'status', 'deletedAt'])
@Index(['workflowState', 'deletedAt'])
export class Rfq extends IndustrialBaseEntity {
  @Column({ name: 'rfq_number', type: 'varchar', length: 30, unique: true })
  rfqNumber: string;

  @Column({ name: 'enquiry_id', type: 'uuid', nullable: true })
  @Index()
  enquiryId: string | null;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  @Index()
  customerId: string | null;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 200 })
  customerName: string;

  @Column({ name: 'mold_type', type: 'varchar', length: 50, nullable: true })
  moldType: RfqMoldType | null;

  @Column({ name: 'target_quantity', type: 'int', nullable: true })
  targetQuantity: number | null;

  @Column({ name: 'annual_volume', type: 'int', nullable: true })
  annualVolume: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  material: string | null;

  @Column({ name: 'machine_details', type: 'text', nullable: true })
  machineDetails: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'varchar', length: 20, default: RfqPriority.MEDIUM })
  priority: RfqPriority;

  @Column({ name: 'technical_notes', type: 'text', nullable: true })
  technicalNotes: string | null;

  @Column({ type: 'jsonb', nullable: true })
  attachments: Record<string, unknown>[] | null;

  @Column({ name: 'revision_number', type: 'int', default: 1 })
  revisionNumber: number;

  @Column({ name: 'approval_status', type: 'varchar', length: 30, default: RfqApprovalStatus.PENDING })
  approvalStatus: RfqApprovalStatus;

  @Column({ name: 'workflow_state', type: 'varchar', length: 50, default: RfqWorkflowState.DRAFT })
  workflowState: RfqWorkflowState;

  @Column({ type: 'varchar', length: 20, default: RfqStatus.OPEN })
  status: RfqStatus;

  @VersionColumn()
  version: number;

  @OneToMany(() => RfqProduct, (product) => product.rfq, { cascade: true })
  products: RfqProduct[];

  @OneToMany(() => RfqRevision, (revision) => revision.rfq, { cascade: true })
  revisions: RfqRevision[];
}
