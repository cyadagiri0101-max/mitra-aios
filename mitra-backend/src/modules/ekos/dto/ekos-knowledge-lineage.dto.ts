import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsObject,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { EkosEntityType } from '../entities/ekos-graph-node.entity';
import { EkosRelationType, EkosProvenanceType } from '../entities/ekos-graph-edge.entity';

export class LinkKnowledgeToEntityDto {
  @IsUUID()
  articleId: string;

  @IsEnum(EkosEntityType)
  targetEntityType: EkosEntityType | string;

  @IsUUID()
  targetEntityId: string;

  @IsOptional()
  @IsString()
  targetEntityRevision?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsEnum(EkosRelationType)
  relationType: EkosRelationType | string = EkosRelationType.CITED_BY;

  @IsOptional()
  @IsEnum(EkosProvenanceType)
  provenanceType?: EkosProvenanceType | string = EkosProvenanceType.EXPLICIT_HUMAN;

  @IsOptional()
  @IsNumber()
  @Min(0.0)
  @Max(1.0)
  confidence?: number = 1.0;

  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;
}

export interface KnowledgeArticleLineageResult {
  article: {
    id: string;
    label: string;
    entityRevision?: string;
    isSuperseded: boolean;
    projectId?: string;
    metadata: Record<string, any>;
  };
  upstreamSources: {
    nodeId: string;
    entityType: string;
    entityId: string;
    entityRevision?: string;
    label: string;
    relationType: string;
    provenanceType: string;
    confidence: number;
    isSuperseded: boolean;
  }[];
  supportingEvidence: {
    evidenceId?: string;
    chunkId?: string;
    sourceFile?: string;
    authorityStatus?: string;
    citationLabel?: string;
  }[];
  downstreamUsages: {
    nodeId: string;
    entityType: string;
    entityId: string;
    label: string;
    relationType: string;
    provenanceType: string;
  }[];
}

export interface EntityKnowledgeLineageResult {
  entity: {
    entityType: string;
    entityId: string;
    entityRevision?: string;
    label: string;
  };
  knowledgeArticlesCount: number;
  knowledgeArticles: {
    articleId: string;
    label: string;
    relationType: string;
    provenanceType: string;
    isSuperseded: boolean;
    validFrom: Date;
    validTo?: Date;
  }[];
  evidenceCount: number;
}

export interface RecommendationProvenanceResult {
  recommendation: {
    id: string;
    recommendationType: string;
    status: string;
    riskTier: string;
    modelVersion: string;
    projectId?: string;
    machineId?: string;
    milestoneId?: string;
  };
  upstreamEvidence: {
    nodeId: string;
    entityType: string;
    entityId: string;
    label: string;
    relationType: string;
    provenanceType: string;
    confidence: number;
  }[];
  isAiInferred: boolean;
  humanReviewRequired: boolean;
}
