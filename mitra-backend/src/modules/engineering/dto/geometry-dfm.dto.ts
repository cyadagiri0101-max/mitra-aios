import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  IsArray,
} from 'class-validator';
import {
  GeometricFeatureType,
  ExtractionStatus,
} from '../entities/geometric-feature.entity';
import {
  DfmSeverity,
  DfmFindingStatus,
} from '../entities/dfm-finding.entity';

export class ExtractGeometricFeaturesDto {
  @IsUUID()
  drawingId: string;

  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsString()
  drawingRevision?: string = 'Rev A';

  @IsOptional()
  @IsString()
  cadFormat?: string = 'STEP';

  @IsOptional()
  @IsObject()
  rawGeometryMetadata?: Record<string, any>;
}

export class EvaluateDfmDto {
  @IsUUID()
  drawingId: string;

  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsString()
  drawingRevision?: string = 'Rev A';

  @IsOptional()
  @IsString()
  material?: string = 'ABS';

  @IsOptional()
  @IsString()
  processType?: string = 'INJECTION_MOLDING';

  @IsOptional()
  @IsObject()
  customThresholds?: Record<string, number>;
}

export class ReviewDfmFindingDto {
  @IsEnum(DfmFindingStatus)
  status: DfmFindingStatus;

  @IsOptional()
  @IsString()
  decisionNotes?: string;
}

export interface GeometricExtractionSummary {
  drawingId: string;
  drawingRevision: string;
  extractionStatus: ExtractionStatus;
  featuresCount: number;
  features: Record<string, any>[];
  normalizedUnits: string;
}

export interface DfmEvaluationSummary {
  drawingId: string;
  drawingRevision: string;
  material: string;
  processType: string;
  totalFindingsCount: number;
  criticalCount: number;
  warningCount: number;
  advisoryCount: number;
  findings: Record<string, any>[];
}
