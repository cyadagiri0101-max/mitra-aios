import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EngineeringReasoningResult,
  ReasoningStatus,
  EvidenceType,
  ContradictionState,
  AssumptionStatus,
  ImpactCertainty,
  CostStatus,
  RecommendationType,
  type ReasoningStep,
  type EvidenceItem,
  type Assumption,
  type EngineeringConstraint,
  type Contradiction,
  type EngineeringImpact,
  type CostComponent,
  type CostSummary,
  type ConfidenceFactors,
  type Recommendation,
} from '../entities/engineering-reasoning-result.entity';
import { CostRateType, CostConfigurationStatus } from '../entities/engineering-cost-configuration.entity';

export class EvaluateEngineeringReasoningDto {
  @IsUUID()
  drawingId: string;

  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsString()
  drawingRevision?: string = 'Rev A';

  @IsOptional()
  @IsUUID()
  sourceFindingId?: string;

  @IsOptional()
  @IsString()
  material?: string = 'ABS';

  @IsOptional()
  @IsString()
  processType?: string = 'INJECTION_MOLDING';

  @IsOptional()
  @IsObject()
  customThresholds?: Record<string, number>;

  @IsOptional()
  @IsObject()
  manufacturingContext?: Record<string, any>;
}

export class ReviewReasoningResultDto {
  @IsEnum(ReasoningStatus)
  status: ReasoningStatus;

  @IsOptional()
  @IsString()
  decisionNotes?: string;

  @IsOptional()
  @IsObject()
  modifiedRecommendation?: Partial<Recommendation>;
}

export class CreateCostConfigurationDto {
  @IsEnum(CostRateType)
  rateType: CostRateType;

  @IsString()
  rateName: string;

  @IsOptional()
  @IsUUID()
  workCenterId?: string;

  @IsOptional()
  @IsUUID()
  machineId?: string;

  @IsOptional()
  @IsUUID()
  materialId?: string;

  @IsOptional()
  @IsUUID()
  operationId?: string;

  @IsNumber()
  rateValue: number;

  @IsOptional()
  @IsString()
  currency?: string = 'INR';

  @IsOptional()
  @IsString()
  uom?: string = 'HOUR';

  @IsOptional()
  @IsString()
  effectiveFrom?: string;

  @IsOptional()
  @IsString()
  effectiveTo?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  sourceReference?: string;

  @IsOptional()
  @IsEnum(CostConfigurationStatus)
  status?: CostConfigurationStatus = CostConfigurationStatus.ACTIVE;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateCostConfigurationDto {
  @IsOptional()
  @IsString()
  rateName?: string;

  @IsOptional()
  @IsNumber()
  rateValue?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsOptional()
  @IsString()
  effectiveFrom?: string;

  @IsOptional()
  @IsString()
  effectiveTo?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  sourceReference?: string;

  @IsOptional()
  @IsEnum(CostConfigurationStatus)
  status?: CostConfigurationStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class QueryCostConfigurationsDto {
  @IsOptional()
  @IsEnum(CostRateType)
  rateType?: CostRateType;

  @IsOptional()
  @IsUUID()
  workCenterId?: string;

  @IsOptional()
  @IsUUID()
  machineId?: string;

  @IsOptional()
  @IsUUID()
  materialId?: string;

  @IsOptional()
  @IsUUID()
  operationId?: string;

  @IsOptional()
  @IsEnum(CostConfigurationStatus)
  status?: CostConfigurationStatus;

  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  limit?: number = 50;
}

export interface ReasoningEvaluationSummary {
  reasoningId: string;
  tenantId: string;
  projectId: string;
  drawingId: string;
  drawingRevision: string;
  sourceFindingId: string | null;
  reasoningVersion: string;
  status: ReasoningStatus;
  stepsCount: number;
  evidenceCount: number;
  assumptionsCount: number;
  contradictionsCount: number;
  impactsCount: number;
  confidenceScore: number;
  costSummary: CostSummary | null;
  recommendation: Recommendation | null;
  createdAt: string;
}

export interface ReasoningEvidenceResponse {
  reasoningId: string;
  evidence: EvidenceItem[];
}

export interface ReasoningCostResponse {
  reasoningId: string;
  costSummary: CostSummary;
}

export interface ReasoningRecommendationResponse {
  reasoningId: string;
  recommendation: Recommendation;
}

export interface CostConfigurationResponse {
  id: string;
  tenantId: string;
  rateType: CostRateType;
  rateName: string;
  workCenterId: string | null;
  machineId: string | null;
  materialId: string | null;
  operationId: string | null;
  rateValue: number;
  currency: string;
  uom: string;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  source: string | null;
  sourceReference: string | null;
  status: CostConfigurationStatus;
  notes: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}