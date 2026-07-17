import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ProjectStage {
  ENQUIRY = 'ENQUIRY',
  QUOTATION = 'QUOTATION',
  APPROVAL = 'APPROVAL',
  PROJECT_CREATED = 'PROJECT_CREATED',
  DESIGN_INITIATED = 'DESIGN_INITIATED',
  CPS_APPROVED = 'CPS_APPROVED',
  DESIGN_RELEASED = 'DESIGN_RELEASED',
  PROCESS_PLANNING = 'PROCESS_PLANNING',
  MACHINE_PLANNING = 'MACHINE_PLANNING',
  MANUFACTURING = 'MANUFACTURING',
  INTERNAL_TRIAL = 'INTERNAL_TRIAL',
  CUSTOMER_TRIAL = 'CUSTOMER_TRIAL',
  CAPA = 'CAPA',
  RETRIAL = 'RETRIAL',
  CUSTOMER_APPROVAL = 'CUSTOMER_APPROVAL',
  DISPATCH = 'DISPATCH',
  SERVICE = 'SERVICE',
}

export enum ProjectHealth {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  RED = 'RED',
}

export enum MoldType {
  INJECTION = 'INJECTION',
  BLOW = 'BLOW',
  THIN_WALL = 'THIN_WALL',
  IBM = 'IBM',
  MOLD_BASE = 'MOLD_BASE',
  FIXTURE = 'FIXTURE',
  PRODUCT_DESIGN = 'PRODUCT_DESIGN',
  JOB_WORK = 'JOB_WORK',
}

@Entity('projects')
@Index(['projectNumber', 'deletedAt'])
@Index(['customerId', 'stage', 'deletedAt'])
export class Project extends IndustrialBaseEntity {
  @Column({ name: 'project_number', type: 'varchar', length: 30 })
  projectNumber: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  @Index()
  customerId: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 200, nullable: true })
  customerName: string | null;

  @Column({
    name: 'mold_type',
    type: 'enum',
    enum: MoldType,
    default: MoldType.INJECTION,
  })
  moldType: MoldType;

  @Column({ name: 'product_name', type: 'varchar', length: 200 })
  productName: string;

  @Column({ type: 'int', default: 1 })
  cavitation: number;

  @Column({ name: 'material_type', type: 'varchar', length: 100, nullable: true })
  materialType: string | null;

  @Column({ name: 'part_weight_grams', type: 'decimal', precision: 10, scale: 3, nullable: true })
  partWeightGrams: number | null;

  @Column({ name: 'shot_weight_grams', type: 'decimal', precision: 10, scale: 3, nullable: true })
  shotWeightGrams: number | null;

  @Column({
    type: 'enum',
    enum: ProjectStage,
    default: ProjectStage.ENQUIRY,
  })
  stage: ProjectStage;

  @Column({
    name: 'health_status',
    type: 'enum',
    enum: ProjectHealth,
    default: ProjectHealth.GREEN,
  })
  healthStatus: ProjectHealth;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'target_delivery_date', type: 'date', nullable: true })
  targetDeliveryDate: Date | null;

  @Column({ name: 'enquiry_date', type: 'date', nullable: true })
  enquiryDate: Date | null;

  @Column({ name: 'rfq_number', type: 'varchar', length: 50, nullable: true })
  rfqNumber: string | null;

  @Column({ name: 'po_number', type: 'varchar', length: 50, nullable: true })
  poNumber: string | null;

  @Column({ name: 'project_value', type: 'decimal', precision: 18, scale: 2, nullable: true })
  projectValue: number | null;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ name: 'project_manager_id', type: 'uuid', nullable: true })
  @Index()
  projectManagerId: string | null;

  @Column({ name: 'design_lead_id', type: 'uuid', nullable: true })
  @Index()
  designLeadId: string | null;

  @Column({ name: 'stage_entered_at', type: 'timestamptz', nullable: true })
  stageEnteredAt: Date | null;

  @Column({ name: 'dispatched_at', type: 'timestamptz', nullable: true })
  dispatchedAt: Date | null;

  @Column({ name: 'days_overdue', type: 'int', default: 0 })
  daysOverdue: number;

  @Column({ type: 'text', array: true, nullable: true })
  tags: string[] | null;

  @Column({ name: 'priority', type: 'int', default: 5 })
  priority: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}