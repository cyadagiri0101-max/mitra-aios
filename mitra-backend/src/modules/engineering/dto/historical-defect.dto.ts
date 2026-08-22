import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
} from 'class-validator';
import {
  DefectTaxonomyType,
  CorrelationStrength,
} from '../entities/historical-defect-correlation.entity';

export class CorrelateHistoricalDefectsDto {
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
}

export interface DefectCorrelationResult {
  findingId?: string;
  featureId?: string;
  defectType: DefectTaxonomyType;
  correlationStrength: CorrelationStrength;
  confidenceScore: number;
  historicalEvidenceCount: number;
  relatedDefectCount: number;
  similarityScore: number;
  matchedMaterial: string;
  matchedProcess: string;
  explanation: string;
  evidenceReferences: {
    ncrIds: string[];
    trialObservationIds: string[];
    capaIds: string[];
  };
}

export interface FindingHistoricalContext {
  findingId: string;
  ruleId: string;
  correlations: DefectCorrelationResult[];
  totalHistoricalEvidence: number;
  topRiskDefect: DefectTaxonomyType;
}
