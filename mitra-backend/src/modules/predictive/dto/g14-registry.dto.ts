import {
  IsUUID,
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import {
  ModelCapability,
  ModelLifecycleStatus,
} from '../entities/g14-model-registry.entity';

export class QueryModelRegistryDto {
  @IsOptional()
  @IsEnum(ModelCapability)
  capability?: ModelCapability;

  @IsOptional()
  @IsEnum(ModelLifecycleStatus)
  status?: ModelLifecycleStatus;

  @IsOptional()
  @IsString()
  modelVersion?: string;
}

export class EvaluateModelDto {
  @IsOptional()
  evaluationMetrics?: Record<string, any>;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveModelDto {
  @IsOptional()
  @IsString()
  approvalNotes?: string;
}

export class RejectModelDto {
  @IsNotEmpty()
  @IsString()
  rejectionReason: string;
}

export class ActivateModelDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RollbackModelDto {
  @IsNotEmpty()
  @IsString()
  rollbackReason: string;
}

export class RegisterModelDto {
  @IsEnum(ModelCapability)
  capability: ModelCapability;

  @IsString()
  modelVersion: string;

  @IsString()
  featureVersion: string;

  @IsString()
  modelType: string;

  @IsOptional()
  @IsString()
  algorithm?: string = 'RIDGE_REGRESSION';

  @IsArray()
  weights: number[];

  @IsNumber()
  intercept: number;

  @IsNumber()
  residualStdDev: number;

  @IsOptional()
  hyperparameters?: Record<string, any>;

  evaluationMetrics: Record<string, any>;

  @IsOptional()
  @IsString()
  uncertaintyMethod?: string = 'RESIDUAL_PREDICTION_INTERVAL';

  @IsString()
  provenanceHash: string;

  @IsOptional()
  @IsString()
  trainingDatasetHash?: string;

  @IsNumber()
  trainingSampleCount: number;

  @IsOptional()
  @IsNumber()
  validationSampleCount?: number = 0;

  @IsOptional()
  @IsNumber()
  testSampleCount?: number = 0;

  @IsOptional()
  trainingWindowStart?: Date;

  @IsOptional()
  trainingWindowEnd?: Date;
}
