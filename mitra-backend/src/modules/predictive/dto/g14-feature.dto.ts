import {
  IsUUID,
  IsOptional,
  IsString,
  IsDateString,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export interface G14ProjectFeatures {
  projectAgeDays: number;
  totalMilestonesCount: number;
  completedMilestonesCount: number;
  milestoneCompletionRatio: number;
  cumulativeScheduleVarianceDays: number;
  overdueMilestonesCount: number;
  remainingPlannedDurationDays: number;
}

export interface G14ExecutionFeatures {
  totalWorkOrdersCount: number;
  completedWorkOrdersCount: number;
  workOrderCompletionRatio: number;
  cumulativeWorkOrderDelayDays: number;
  totalTrialsCount: number;
  failedTrialsCount: number;
  trialFailureRate: number;
}

export interface G14CapacityFeatures {
  totalDemandHours: number;
  availableCapacityHours: number;
  capacityGapHours: number;
  averageUtilizationPct: number;
  isOverloaded: boolean;
}

export interface G14QualityFeatures {
  totalNcrCount: number;
  openNcrCount: number;
  criticalNcrCount: number;
  capaCount: number;
  reworkFrequency: number;
}

export interface G14DependencyFeatures {
  blockedMilestonesCount: number;
  maxPredecessorVarianceDays: number;
}

export interface G14TemporalFeatures {
  elapsedProjectDays: number;
  projectDurationDays: number;
  timeElapsedRatio: number;
}

export interface G14FeatureVector {
  project: G14ProjectFeatures;
  execution: G14ExecutionFeatures;
  capacity: G14CapacityFeatures;
  quality: G14QualityFeatures;
  dependency: G14DependencyFeatures;
  temporal: G14TemporalFeatures;
  denseVector: number[];
}

export interface G14PredictionTarget {
  projectDelayDays: number;
  isDelayed: boolean;
  milestoneDelays: Array<{
    milestoneId: string;
    title: string;
    varianceDays: number;
  }>;
  capacityRiskScore: number;
}

export interface G14FeatureMetadata {
  extractedAt: string;
  predictionCutoff: string;
  featureVersion: string;
  sourceCounts: {
    milestones: number;
    baselines: number;
    workOrders: number;
    ncrs: number;
    trials: number;
    designLoads: number;
  };
  dataQuality: {
    hasMissingBaselines: boolean;
    hasNegativeDurationsSanitized: boolean;
    excludedFutureEventsCount: number;
  };
}

export class ExtractFeaturesDto {
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsDateString()
  predictionCutoff?: string;

  @IsOptional()
  @IsString()
  featureVersion?: string = 'G14_FEATURES_V1';

  @IsOptional()
  @IsBoolean()
  persistSnapshot?: boolean = true;

  @IsOptional()
  @IsBoolean()
  computeGroundTruthTarget?: boolean = false;
}

export class QueryFeatureSnapshotsDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsString()
  featureVersion?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

export class GenerateDatasetDto {
  @IsOptional()
  @IsString()
  featureVersion?: string = 'G14_FEATURES_V1';

  @IsOptional()
  @IsDateString()
  cutoffDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 200;
}
