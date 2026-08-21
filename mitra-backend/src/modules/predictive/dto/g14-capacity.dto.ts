import {
  IsUUID,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export interface G14CapacityFeatureVector {
  machine: {
    availableMachineHours: number;
    bookedDemandHours: number;
    scheduledWorkOrderHours: number;
    totalDemandHours: number;
    capacityUtilizationRatio: number;
    historicalDeficitHours: number;
    queueDepthWorkOrders: number;
    overdueWorkOrdersCount: number;
    activeBookingsCount: number;
    maintenanceDowntimeHours: number;
    costPerHourRate: number;
    isActive: boolean;
    nearTermDueLoadHours: number;
    concurrentProjectCount: number;
    forecastHorizonDays: number;
  };
  denseVector: number[]; // 15-dimensional normalized vector
}

export interface G14CapacityFeatureMetadata {
  extractedAt: string;
  predictionCutoff: string;
  forecastHorizonDays: number;
  featureVersion: string;
  sourceCounts: {
    bookingsCount: number;
    workOrdersCount: number;
    futureExcludedBookings: number;
    futureExcludedWorkOrders: number;
  };
  dataQuality: {
    hasMaintenanceRecord: boolean;
    isOperating: boolean;
    hasZeroAvailableHours: boolean;
  };
}

export interface G14CapacityPredictionTarget {
  capacityDeficitHours: number;
  isOverloaded: boolean;
  actualUtilizationRatio: number;
  actualDemandHours: number;
}

export interface G14CapacityEvaluationMetrics {
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

export interface G14CapacityAttribution {
  featureIndex: number;
  featureName: string;
  featureValue: number;
  importanceWeight: number;
  contributionScore: number;
  signalDirection: 'INCREASES_CAPACITY_PRESSURE' | 'DECREASES_CAPACITY_PRESSURE' | 'NEUTRAL';
  description: string;
}

export interface G14CapacityExplanation {
  primaryContributors: G14CapacityAttribution[];
  summary: string;
  bottleneckRiskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface G14CapacityPredictionResult {
  machineId: string;
  machineNumber: string;
  machineName: string;
  tenantId: string;
  predictionCutoff: string;
  forecastHorizonDays: number;
  featureVersion: string;
  modelVersion: string;
  modelType: string;
  predictedUtilizationRatio: number;
  predictedAvailableHours: number;
  predictedDemandHours: number;
  predictedDeficitHours: number;
  isOverloaded: boolean;
  overloadProbability: number;
  lowerDeficitBound: number;
  upperDeficitBound: number;
  uncertaintyMethod: 'RESIDUAL_PREDICTION_INTERVAL' | 'FALLBACK_UNAVAILABLE';
  confidenceIntervalPct: number;
  dataQualityStatus: 'OPTIMAL' | 'DEGRADED' | 'INSUFFICIENT';
  sourceRecordsHash: string;
  explanation: G14CapacityExplanation;
  generatedAt: string;
  inferenceStatus: 'SUCCESS' | 'FALLBACK_INSUFFICIENT_DATA' | 'FALLBACK_UNTRAINED_MODEL';
  warningMessage?: string | null;
}

export interface G14BottleneckItem {
  machineId: string;
  machineNumber: string;
  machineName: string;
  location: string | null;
  predictedDeficitHours: number;
  predictedUtilizationRatio: number;
  overloadProbability: number;
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  primaryBottleneckSignal: string;
  queueDepth: number;
  activeWorkOrders: number;
}

export class ExtractCapacityFeaturesDto {
  @IsUUID()
  machineId: string;

  @IsOptional()
  @IsDateString()
  predictionCutoff?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(180)
  forecastHorizonDays?: number = 30;

  @IsOptional()
  @IsString()
  featureVersion?: string = 'G14_CAPACITY_V1';

  @IsOptional()
  persistSnapshot?: boolean = false;

  @IsOptional()
  computeGroundTruthTarget?: boolean = false;
}

export class TrainCapacityModelDto {
  @IsOptional()
  @IsString()
  featureVersion?: string = 'G14_CAPACITY_V1';

  @IsOptional()
  @IsString()
  modelType?: 'RIDGE_CAPACITY_DEFICIT_REGRESSION' | 'NAIVE_BASELINE' =
    'RIDGE_CAPACITY_DEFICIT_REGRESSION';

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

export class PredictCapacityDto {
  @IsUUID()
  machineId: string;

  @IsOptional()
  @IsDateString()
  predictionCutoff?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(180)
  forecastHorizonDays?: number = 30;

  @IsOptional()
  @IsString()
  featureVersion?: string = 'G14_CAPACITY_V1';

  @IsOptional()
  @IsString()
  modelVersion?: string;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(99)
  confidenceIntervalPct?: number = 95;
}

export class QueryBottlenecksDto {
  @IsOptional()
  @IsDateString()
  predictionCutoff?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(180)
  forecastHorizonDays?: number = 30;

  @IsOptional()
  @IsString()
  riskTier?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
