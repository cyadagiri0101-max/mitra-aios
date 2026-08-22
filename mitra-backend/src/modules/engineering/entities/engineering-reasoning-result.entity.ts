import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ReasoningStatus {
  GENERATED = 'GENERATED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACCEPTED = 'ACCEPTED',
  MODIFIED = 'MODIFIED',
  REJECTED = 'REJECTED',
  SUPERSEDED = 'SUPERSEDED',
  CANCELLED = 'CANCELLED',
}

export enum EvidenceType {
  GEOMETRIC_FEATURE = 'GEOMETRIC_FEATURE',
  DFM_FINDING = 'DFM_FINDING',
  HISTORICAL_NCR = 'HISTORICAL_NCR',
  TRIAL_OBSERVATION = 'TRIAL_OBSERVATION',
  CAPA = 'CAPA',
  DRAWING_REVISION = 'DRAWING_REVISION',
  MATERIAL = 'MATERIAL',
  PROCESS_PLAN = 'PROCESS_PLAN',
  WORK_ORDER = 'WORK_ORDER',
  MACHINE = 'MACHINE',
  CYCLE_TIME_TELEMETRY = 'CYCLE_TIME_TELEMETRY',
  EKOS_LINEAGE = 'EKOS_LINEAGE',
  ENGINEERING_STANDARD = 'ENGINEERING_STANDARD',
}

export enum ContradictionState {
  NO_CONFLICT = 'NO_CONFLICT',
  CONFLICT_PRESENT = 'CONFLICT_PRESENT',
  INSUFFICIENT_EVIDENCE = 'INSUFFICIENT_EVIDENCE',
  REQUIRES_ENGINEERING_REVIEW = 'REQUIRES_ENGINEERING_REVIEW',
}

export enum AssumptionStatus {
  VERIFIED = 'VERIFIED',
  UNVERIFIED_ASSUMPTION = 'UNVERIFIED_ASSUMPTION',
}

export enum ImpactCertainty {
  OBSERVED = 'OBSERVED',
  LIKELY = 'LIKELY',
  POSSIBLE = 'POSSIBLE',
  UNKNOWN = 'UNKNOWN',
}

export enum CostStatus {
  KNOWN = 'KNOWN',
  ESTIMATED = 'ESTIMATED',
  ASSUMED = 'ASSUMED',
  UNAVAILABLE = 'COST_NOT_CONFIGURED',
}

export enum RecommendationType {
  REVIEW_GEOMETRY = 'REVIEW_GEOMETRY',
  INCREASE_WALL_THICKNESS = 'INCREASE_WALL_THICKNESS',
  INCREASE_DRAFT = 'INCREASE_DRAFT',
  REDUCE_RIB_RATIO = 'REDUCE_RIB_RATIO',
  REVIEW_HOLE_DEPTH = 'REVIEW_HOLE_DEPTH',
  REVIEW_TOOLING = 'REVIEW_TOOLING',
  REVIEW_PROCESS = 'REVIEW_PROCESS',
  RUN_TRIAL = 'RUN_TRIAL',
  REVIEW_MATERIAL = 'REVIEW_MATERIAL',
  REQUEST_ENGINEERING_APPROVAL = 'REQUEST_ENGINEERING_APPROVAL',
}

@Entity('engineering_reasoning_results')
@Index(['tenantId', 'projectId'])
@Index(['tenantId', 'drawingId', 'drawingRevision'])
@Index(['tenantId', 'sourceFindingId'])
@Index(['tenantId', 'status'])
export class EngineeringReasoningResult extends IndustrialBaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'drawing_id', type: 'uuid' })
  drawingId: string;

  @Column({ name: 'drawing_revision', type: 'varchar', length: 50, default: 'Rev A' })
  drawingRevision: string;

  @Column({ name: 'source_finding_id', type: 'uuid', nullable: true })
  sourceFindingId: string | null;

  @Column({ name: 'reasoning_version', type: 'varchar', length: 20, default: '1.0' })
  reasoningVersion: string;

  @Column({ type: 'varchar', length: 30, default: ReasoningStatus.GENERATED })
  status: ReasoningStatus;

  @Column({ name: 'evidence_hash', type: 'varchar', length: 64, nullable: true })
  evidenceHash: string | null;

  @Column({ type: 'jsonb', name: 'steps', default: [] })
  steps: ReasoningStep[];

  @Column({ type: 'jsonb', name: 'evidence', default: [] })
  evidence: EvidenceItem[];

  @Column({ type: 'jsonb', name: 'assumptions', default: [] })
  assumptions: Assumption[];

  @Column({ type: 'jsonb', name: 'constraints', default: [] })
  constraints: EngineeringConstraint[];

  @Column({ type: 'jsonb', name: 'contradictions', default: [] })
  contradictions: Contradiction[];

  @Column({ type: 'jsonb', name: 'impacts', default: [] })
  impacts: EngineeringImpact[];

  @Column({ type: 'jsonb', name: 'cost_summary', nullable: true })
  costSummary: CostSummary | null;

  @Column({ type: 'jsonb', name: 'recommendation', nullable: true })
  recommendation: Recommendation | null;

  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 4, default: 0.0 })
  confidenceScore: number;

  @Column({ type: 'jsonb', name: 'confidence_factors', nullable: true })
  confidenceFactors: ConfidenceFactors | null;

  @Column({ type: 'jsonb', name: 'provenance', default: {} })
  provenance: Record<string, any>;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'decision_notes', type: 'text', nullable: true })
  decisionNotes: string | null;
}

export interface ReasoningStep {
  stepNumber: number;
  stepName: string;
  inputEvidence: string[];
  transformation: string;
  output: Record<string, any>;
  confidence: number;
  provenance: Record<string, any>;
  reasoningVersion: string;
  timestamp: string;
}

export interface EvidenceItem {
  evidenceId: string;
  evidenceType: EvidenceType;
  sourceEntity: string;
  sourceId: string;
  sourceRevision: string | null;
  tenantId: string;
  projectId: string;
  timestamp: string;
  provenance: Record<string, any>;
  sourceHash: string | null;
  metadata: Record<string, any>;
}

export interface Assumption {
  assumptionId: string;
  description: string;
  source: string;
  status: AssumptionStatus;
  verifiedAt: string | null;
  verifiedBy: string | null;
  impactOnConfidence: number;
}

export interface EngineeringConstraint {
  constraintId: string;
  type: string;
  description: string;
  source: string;
  severity: 'HARD' | 'SOFT';
}

export interface Contradiction {
  contradictionId: string;
  description: string;
  conflictingEvidence: string[];
  state: ContradictionState;
  resolutionNotes: string | null;
}

export interface EngineeringImpact {
  impactId: string;
  category: string;
  description: string;
  certainty: ImpactCertainty;
  supportingEvidence: string[];
  magnitude: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface CostComponent {
  componentId: string;
  category: 'MATERIAL' | 'MACHINING' | 'TOOLING' | 'QUALITY' | 'SCHEDULE' | 'REWORK';
  subCategory: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number | null;
  rateSource: string | null;
  rateTimestamp: string | null;
  calculatedCost: number | null;
  currency: string;
  status: CostStatus;
  calculationMethod: string;
  confidence: number;
  assumptions: string[];
}

export interface CostSummary {
  material: CostComponent[];
  machining: CostComponent[];
  tooling: CostComponent[];
  quality: CostComponent[];
  schedule: CostComponent[];
  rework: CostComponent[];
  total: {
    low: number | null;
    expected: number | null;
    high: number | null;
    currency: string;
  };
  costRangeModel: 'THREE_POINT' | 'MIN_MAX';
  missingComponents: string[];
}

export interface ConfidenceFactors {
  evidenceQuality: number;
  featureRelevance: number;
  historicalRelevance: number;
  contextCompleteness: number;
  sourceAuthority: number;
  contradictionCount: number;
  formula: string;
}

export interface Recommendation {
  recommendationId: string;
  type: RecommendationType;
  title: string;
  description: string;
  rationale: string;
  supportingEvidence: string[];
  assumptions: string[];
  constraints: string[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedEffort: string | null;
  estimatedCostImpact: number | null;
  costImpactCurrency: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'MODIFIED' | 'REJECTED' | 'CANCELLED';
}