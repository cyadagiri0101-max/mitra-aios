import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsEnum,
  IsObject,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ManufacturingSignalType,
  ManufacturingSignalSource,
  SignalQualityStatus,
} from '../entities/manufacturing-signal.entity';
import {
  ObservationType,
  ObservationSeverity,
} from '../entities/manufacturing-observation.entity';
import {
  OperationalRecommendationType,
  OperationalRecommendationStatus,
} from '../entities/operational-recommendation.entity';

export class IngestSignalDto {
  @IsString()
  sourceId: string;

  @IsOptional()
  @IsEnum(ManufacturingSignalSource)
  sourceType?: string = ManufacturingSignalSource.MACHINE_TELEMETRY;

  @IsEnum(ManufacturingSignalType)
  signalType: string;

  @IsNumber()
  value: number;

  @IsString()
  unit: string;

  @IsOptional()
  @IsUUID()
  machineId?: string;

  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @IsOptional()
  @IsUUID()
  operationId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsDateString()
  eventTimestamp: string;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsObject()
  rawPayload?: Record<string, any>;
}

export class BatchIngestSignalDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngestSignalDto)
  signals: IngestSignalDto[];
}

export class CreateObservationDto {
  @IsEnum(ObservationType)
  observationType: string;

  @IsOptional()
  @IsString()
  source?: string = 'OPERATOR';

  @IsOptional()
  @IsUUID()
  machineId?: string;

  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @IsOptional()
  @IsUUID()
  operationId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  trialId?: string;

  @IsOptional()
  @IsEnum(ObservationSeverity)
  severity?: string = ObservationSeverity.MEDIUM;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metrics?: Record<string, any>;
}

export class ReviewRecommendationDto {
  @IsEnum(OperationalRecommendationStatus)
  status: OperationalRecommendationStatus;

  @IsOptional()
  @IsString()
  decisionNotes?: string;
}

export interface IngestionResult {
  acceptedCount: number;
  rejectedCount: number;
  quarantinedCount: number;
  signals: {
    id: string;
    status: string;
    correlationId?: string;
  }[];
}

export interface OperationalStateSummary {
  machineId?: string;
  activeWorkOrdersCount: number;
  averageCycleTimeSec: number;
  cycleTimeDeviationPct: number;
  totalSignalsCount: number;
  anomaliesDetected: number;
  recentObservations: any[];
  activeRecommendations: any[];
}
