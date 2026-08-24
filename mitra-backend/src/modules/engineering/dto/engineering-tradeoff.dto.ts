import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
  IsNumber,
} from 'class-validator';
import {
  TradeoffObjectiveType,
  HardConstraintSpec,
  HumanDecisionStatus,
} from '../entities/engineering-tradeoff-study.entity';

export class SynthesizeTradeoffsDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  decisionContext: string;

  @IsArray()
  @IsOptional()
  objectives?: TradeoffObjectiveType[];

  @IsObject()
  @IsOptional()
  hardConstraints?: HardConstraintSpec;

  @IsArray()
  @IsOptional()
  customCandidateOverrides?: Array<{
    candidateId: string;
    name: string;
    description: string;
    strategy: string;
    toolingCost: number;
    unitManufacturingCost: number;
    cycleTimeSeconds: number;
    scrapRiskPercentage: number;
    deliveryWeeks: number;
    designWorkloadUnits: number;
    t0ModificationRisk: string;
    t0ExpectedUnits: number;
    toolComplexity: string;
    dfmScore: number;
  }>;
}

export class RecordTradeoffDecisionDto {
  @IsEnum(HumanDecisionStatus)
  @IsNotEmpty()
  decisionStatus: HumanDecisionStatus;

  @IsString()
  @IsOptional()
  acceptedCandidateId?: string;

  @IsString()
  @IsOptional()
  decisionNotes?: string;
}

export class QueryTradeoffCopilotDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsString()
  @IsOptional()
  studyId?: string;

  @IsString()
  @IsOptional()
  projectId?: string;
}
