import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
} from 'class-validator';

export class CrossDomainQuestionDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsArray()
  filterEntityTypes?: string[];
}

export class EnterpriseSearchQueryDto {
  @IsString()
  searchTerm: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsString()
  entityType?: string;
}

export interface EnterpriseProjectContextResult {
  projectId: string;
  projectName: string;
  commercialCommitment?: Record<string, any>;
  engineeringArtifactsCount: number;
  activeWorkOrdersCount: number;
  qualityIssuesCount: number;
  governedKnowledgeArticlesCount: number;
  predictiveSignals: {
    delayRiskTier?: string;
    capacityDeficitRiskTier?: string;
    activeRecommendationsCount: number;
  };
  lineageNodesCount: number;
  lineageEdgesCount: number;
}

export interface CrossDomainAnswerResult {
  query: string;
  answer: string;
  citedEntities: {
    entityType: string;
    entityId: string;
    label: string;
    provenanceSource: string;
    confidence: number;
  }[];
  isAiInferred: boolean;
  modelProvenance: {
    model: string;
    temperature: number;
    groundedContextTokens: number;
  };
}
