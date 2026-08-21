import {
  IsUUID,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export interface G14ModelEvaluationMetrics {
  mae: number;
  rmse: number;
  r2: number;
  accuracy: number;
  brierScore: number;
  sampleCount: number;
  trainSamples: number;
  valSamples: number;
  testSamples: number;
  baselineNaiveMae: number;
  improvementOverNaivePct: number;
}

export interface G14FeatureAttribution {
  featureIndex: number;
  featureName: string;
  category: 'project' | 'execution' | 'capacity' | 'quality' | 'dependency' | 'temporal';
  featureValue: number;
  importanceWeight: number;
  contributionScore: number;
  signalDirection: 'INCREASES_DELAY' | 'DECREASES_DELAY' | 'NEUTRAL';
  description: string;
}

export interface G14PredictionExplanation {
  primaryContributors: G14FeatureAttribution[];
  summary: string;
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface G14PredictionResult {
  projectId: string;
  tenantId: string;
  predictionCutoff: string;
  featureVersion: string;
  modelVersion: string;
  modelType: string;
  predictedDelayDays: number;
  isDelayed: boolean;
  delayProbability: number;
  lowerPredictionBound: number;
  upperPredictionBound: number;
  uncertaintyMethod: 'RESIDUAL_PREDICTION_INTERVAL' | 'NAIVE_INTERVAL' | 'FALLBACK_UNAVAILABLE';
  confidenceIntervalPct: number;
  dataQualityStatus: 'OPTIMAL' | 'DEGRADED' | 'INSUFFICIENT';
  sourceRecordsHash: string;
  explanation: G14PredictionExplanation;
  generatedAt: string;
  inferenceStatus: 'SUCCESS' | 'FALLBACK_INSUFFICIENT_DATA' | 'FALLBACK_UNTRAINED_MODEL';
  warningMessage?: string | null;
}

export class TrainModelDto {
  @IsOptional()
  @IsString()
  featureVersion?: string = 'G14_FEATURES_V1';

  @IsOptional()
  @IsString()
  modelType?: 'RIDGE_CALIBRATED_REGRESSION' | 'NAIVE_BASELINE' = 'RIDGE_CALIBRATED_REGRESSION';

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(100.0)
  regularizationAlpha?: number = 1.0;

  @IsOptional()
  @IsNumber()
  @Min(3)
  minSamplesThreshold?: number = 5;
}

export class PredictDelayDto {
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsDateString()
  predictionCutoff?: string;

  @IsOptional()
  @IsString()
  featureVersion?: string = 'G14_FEATURES_V1';

  @IsOptional()
  @IsString()
  modelVersion?: string;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(99)
  confidenceIntervalPct?: number = 95;
}
