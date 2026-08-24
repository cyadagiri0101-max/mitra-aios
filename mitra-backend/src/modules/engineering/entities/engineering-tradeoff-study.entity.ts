import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum TradeoffObjectiveType {
  TOOLING_COST = 'TOOLING_COST',
  CYCLE_TIME = 'CYCLE_TIME',
  SCRAP_RISK = 'SCRAP_RISK',
  DELIVERY_DATE = 'DELIVERY_DATE',
  DESIGN_CAPACITY = 'DESIGN_CAPACITY',
  MANUFACTURING_CAPACITY = 'MANUFACTURING_CAPACITY',
  TOOL_COMPLEXITY = 'TOOL_COMPLEXITY',
  T0_RISK = 'T0_RISK',
  COMMERCIAL_FEASIBILITY = 'COMMERCIAL_FEASIBILITY',
}

export interface HardConstraintSpec {
  maxToolingCost?: number;
  maxCycleTimeSeconds?: number;
  maxScrapRiskPercentage?: number;
  targetDeliveryWeeks?: number;
  maxDesignWorkloadUnits?: number;
  maxT0ExpectedUnits?: number;
  minCavityCount?: number;
  requiredMaterial?: string;
}

export interface CandidateOptionTradeoff {
  benefits: string[];
  sacrifices: string[];
  uncertainty: string[];
}

export interface EvidenceCitation {
  source: string;
  reference: string;
  hash?: string;
  confidence: number;
}

export interface EngineeringCandidateOption {
  candidateId: string; // e.g. 'OPTION_A', 'OPTION_B', 'OPTION_C'
  name: string;
  description: string;
  strategy: 'COST_MINIMIZED' | 'CYCLE_TIME_MINIMIZED' | 'RISK_MINIMIZED' | 'BALANCED_PARETO' | 'CUSTOM';
  toolingCost: number;
  unitManufacturingCost: number;
  cycleTimeSeconds: number;
  scrapRiskPercentage: number;
  deliveryWeeks: number;
  designWorkloadUnits: number;
  t0ModificationRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  t0ExpectedUnits: number;
  toolComplexity: 'STANDARD' | 'MODERATE' | 'COMPLEX' | 'HIGHLY_COMPLEX';
  dfmScore: number;
  isParetoOptimal: boolean;
  isFeasible: boolean;
  violatedConstraints: string[];
  tradeoffSummary: CandidateOptionTradeoff;
  evidenceCitations: EvidenceCitation[];
}

export enum TradeoffFeasibilityStatus {
  FEASIBLE_CANDIDATES_FOUND = 'FEASIBLE_CANDIDATES_FOUND',
  NO_FEASIBLE_PLAN = 'NO_FEASIBLE_PLAN',
  CONSTRAINED_OPTIMIZATION = 'CONSTRAINED_OPTIMIZATION',
}

export enum HumanDecisionStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  OVERRIDDEN = 'OVERRIDDEN',
}

@Entity('engineering_tradeoff_studies')
@Index(['tenantId', 'studyNumber'])
@Index(['tenantId', 'projectId'])
@Index(['tenantId', 'humanDecisionStatus'])
export class EngineeringTradeoffStudy extends IndustrialBaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @Column({ name: 'project_id', type: 'varchar', length: 100 })
  @Index()
  projectId: string;

  @Column({ name: 'study_number', type: 'varchar', length: 100 })
  studyNumber: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'decision_context', type: 'text' })
  decisionContext: string;

  @Column({ type: 'jsonb', default: [] })
  objectives: TradeoffObjectiveType[];

  @Column({ name: 'hard_constraints', type: 'jsonb', default: {} })
  hardConstraints: HardConstraintSpec;

  @Column({ type: 'jsonb', default: [] })
  candidates: EngineeringCandidateOption[];

  @Column({ name: 'pareto_frontier', type: 'jsonb', default: [] })
  paretoFrontier: string[]; // List of Pareto optimal candidate IDs

  @Column({ name: 'recommended_candidate_id', type: 'varchar', length: 50, nullable: true })
  recommendedCandidateId: string | null;

  @Column({ name: 'recommendation_rationale', type: 'text', nullable: true })
  recommendationRationale: string | null;

  @Column({
    name: 'feasibility_status',
    type: 'enum',
    enum: TradeoffFeasibilityStatus,
    default: TradeoffFeasibilityStatus.FEASIBLE_CANDIDATES_FOUND,
  })
  feasibilityStatus: TradeoffFeasibilityStatus;

  @Column({
    name: 'human_decision_status',
    type: 'enum',
    enum: HumanDecisionStatus,
    default: HumanDecisionStatus.PENDING_REVIEW,
  })
  humanDecisionStatus: HumanDecisionStatus;

  @Column({ name: 'accepted_candidate_id', type: 'varchar', length: 50, nullable: true })
  acceptedCandidateId: string | null;

  @Column({ name: 'decision_notes', type: 'text', nullable: true })
  decisionNotes: string | null;

  @Column({ name: 'decided_by', type: 'varchar', length: 100, nullable: true })
  decidedBy: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @Column({ name: 'input_snapshot', type: 'jsonb', default: {} })
  inputSnapshot: Record<string, any>;

  @Column({ name: 'audit_log_id', type: 'varchar', length: 100, nullable: true })
  auditLogId: string | null;
}
