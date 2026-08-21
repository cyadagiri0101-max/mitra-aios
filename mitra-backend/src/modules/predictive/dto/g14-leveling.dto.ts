import {
  IsUUID,
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsObject,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';
import {
  RecommendationType,
  RecommendationStatus,
  LevelingRiskTier,
} from '../entities/g14-leveling-recommendation.entity';

export class GenerateLevelingRecommendationsDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  machineId?: string;

  @IsOptional()
  @IsNumber()
  forecastHorizonDays?: number = 14;
}

export class ReviewRecommendationDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AcceptRecommendationDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ModifyRecommendationDto {
  @IsNotEmpty()
  @IsObject()
  proposedState: Record<string, any>;

  @IsNotEmpty()
  @IsString()
  modificationReason: string;
}

export class RejectRecommendationDto {
  @IsNotEmpty()
  @IsString()
  rejectionReason: string;
}

export class ApplyRecommendationDto {
  @IsNotEmpty()
  @IsBoolean()
  confirmExecution: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelRecommendationDto {
  @IsNotEmpty()
  @IsString()
  cancellationReason: string;
}

export class QueryRecommendationsDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  machineId?: string;

  @IsOptional()
  @IsEnum(RecommendationStatus)
  status?: RecommendationStatus;

  @IsOptional()
  @IsEnum(LevelingRiskTier)
  riskTier?: LevelingRiskTier;
}

export interface ProjectTimelineRiskSummary {
  projectId: string;
  projectName: string;
  riskTier: LevelingRiskTier;
  predictedDelayDays: number;
  delayProbability: number;
  predictionInterval: { lower: number; upper: number };
  modelVersion: string;
  contributingSignals: string[];
  activeMilestonesCount: number;
  criticalMilestonesAtRisk: number;
  recommendationsAvailable: number;
}

export interface MachineCapacityRiskSummary {
  machineId: string;
  machineName: string;
  machineNumber: string;
  riskTier: LevelingRiskTier;
  predictedUtilizationRatio: number;
  capacityDeficitHours: number;
  overloadProbability: number;
  modelVersion: string;
  contributingSignals: string[];
  queueDepthWorkOrders: number;
  activeBookingsCount: number;
  recommendationsAvailable: number;
}
