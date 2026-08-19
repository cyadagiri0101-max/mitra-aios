import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum DecisionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUPERSEDED = 'SUPERSEDED',
  CANCELLED = 'CANCELLED',
}

export enum DecisionType {
  DESIGN = 'DESIGN',
  MATERIAL_SELECTION = 'MATERIAL_SELECTION',
  PROCESS = 'PROCESS',
  ENGINEERING_CHANGE = 'ENGINEERING_CHANGE',
  QUALITY = 'QUALITY',
  TRIAL = 'TRIAL',
  RELEASE = 'RELEASE',
  COST = 'COST',
  SCHEDULE = 'SCHEDULE',
  OTHER = 'OTHER',
}

/**
 * Engineering Decision Log (M1 Sprint 1) — a CRITICAL MITRA governance
 * feature mandated by PROJECT_CONSTITUTION.md (traceability by design) and
 * TRACEABILITY_MODEL.md.
 *
 * A durable, queryable, auditable project record answering WHAT was decided,
 * WHY, WHO decided it, WHEN, FOR WHICH PROJECT, WHAT alternatives were
 * considered and WHAT the current status is. Lifecycle:
 * DRAFT → SUBMITTED → APPROVED | REJECTED → SUPERSEDED; CANCELLED from
 * DRAFT/SUBMITTED. Supersession preserves the original and records the
 * successor relationship.
 */
@Entity('engineering_decisions')
@Index(['decisionNumber', 'tenantId'])
@Index(['projectId', 'status', 'deletedAt'])
@Index(['status', 'decisionDate', 'tenantId'])
@Index(['decisionType', 'tenantId', 'deletedAt'])
export class EngineeringDecision extends IndustrialBaseEntity {
  @Column({ name: 'decision_number', type: 'varchar', length: 30 })
  decisionNumber: string;

  /** Project scope — populated whenever project scope applies. */
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({
    name: 'decision_type',
    type: 'enum',
    enum: DecisionType,
    default: DecisionType.OTHER,
  })
  decisionType: DecisionType;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  context: string | null;

  @Column({ name: 'options_considered', type: 'text', nullable: true })
  optionsConsidered: string | null;

  @Column({ name: 'selected_option', type: 'text', nullable: true })
  selectedOption: string | null;

  @Column({ type: 'text', nullable: true })
  rationale: string | null;

  @Column({ type: 'text', nullable: true })
  decision: string | null;

  @Column({ type: 'enum', enum: DecisionStatus, default: DecisionStatus.DRAFT })
  status: DecisionStatus;

  @Column({ name: 'decision_date', type: 'date', nullable: true })
  decisionDate: Date | null;

  @Column({ name: 'decision_owner_id', type: 'uuid', nullable: true })
  decisionOwnerId: string | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'rejected_by', type: 'uuid', nullable: true })
  rejectedBy: string | null;

  @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
  rejectedAt: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  /**
   * Generic traceability reference to the affected engineering artifact
   * (design revision, drawing revision, BOM revision, change request,
   * trial, NCR/CAPA, …). No cross-domain FK by design (DOMAIN_MODEL.md).
   */
  @Column({ name: 'related_entity_type', type: 'varchar', length: 50, nullable: true })
  relatedEntityType: string | null;

  @Column({ name: 'related_entity_id', type: 'uuid', nullable: true })
  relatedEntityId: string | null;

  /** Set on a successor decision that supersedes an earlier one. */
  @Column({ name: 'supersedes_decision_id', type: 'uuid', nullable: true })
  supersedesDecisionId: string | null;

  /** Set on the original decision when a successor supersedes it. */
  @Column({ name: 'superseded_by_decision_id', type: 'uuid', nullable: true })
  supersededByDecisionId: string | null;
}