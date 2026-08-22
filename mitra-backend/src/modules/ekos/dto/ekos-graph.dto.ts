import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsObject,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { EkosEntityType } from '../entities/ekos-graph-node.entity';
import { EkosRelationType, EkosProvenanceType } from '../entities/ekos-graph-edge.entity';

export class RegisterNodeDto {
  @IsEnum(EkosEntityType)
  entityType: EkosEntityType | string;

  @IsUUID()
  entityId: string;

  @IsOptional()
  @IsString()
  entityRevision?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsString()
  label: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  provenanceSource?: string;

  @IsOptional()
  @IsString()
  provenanceHash?: string;
}

export class RecordEdgeDto {
  @IsEnum(EkosEntityType)
  sourceEntityType: EkosEntityType | string;

  @IsUUID()
  sourceEntityId: string;

  @IsOptional()
  @IsString()
  sourceEntityRevision?: string;

  @IsEnum(EkosEntityType)
  targetEntityType: EkosEntityType | string;

  @IsUUID()
  targetEntityId: string;

  @IsOptional()
  @IsString()
  targetEntityRevision?: string;

  @IsEnum(EkosRelationType)
  relationType: EkosRelationType | string;

  @IsOptional()
  @IsEnum(EkosProvenanceType)
  provenanceType?: EkosProvenanceType | string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.0)
  @Max(1.0)
  confidence?: number;

  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;
}

export enum LineageDirection {
  UPSTREAM = 'UPSTREAM',
  DOWNSTREAM = 'DOWNSTREAM',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

export class LineageQueryDto {
  @IsOptional()
  @IsEnum(LineageDirection)
  direction?: LineageDirection = LineageDirection.BIDIRECTIONAL;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxDepth?: number = 5;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relationTypes?: string[];

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsBoolean()
  includeSuperseded?: boolean = false;
}

export class ImpactAnalysisQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxDepth?: number = 5;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}

export interface LineageGraphResult {
  rootNodeId: string;
  nodes: {
    id: string;
    entityType: string;
    entityId: string;
    entityRevision?: string;
    projectId?: string;
    label: string;
    metadata: Record<string, any>;
    provenanceSource: string;
    isSuperseded: boolean;
  }[];
  edges: {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    relationType: string;
    provenanceType: string;
    projectId?: string;
    confidence: number;
    properties: Record<string, any>;
    isSuperseded: boolean;
  }[];
  metrics: {
    traversalTimeMs: number;
    nodeCount: number;
    edgeCount: number;
    depthReached: number;
  };
}

export interface ImpactAnalysisResult {
  sourceEntity: {
    entityType: string;
    entityId: string;
    label: string;
  };
  impactedEntitiesCount: number;
  blastRadiusScore: number; // 0-100 scale
  impactByDepth: {
    depth: number;
    entities: {
      id: string;
      entityType: string;
      entityId: string;
      label: string;
      relationType: string;
      projectId?: string;
    }[];
  }[];
  criticalImpacts: {
    entityType: string;
    entityId: string;
    label: string;
    impactReason: string;
  }[];
}

export interface GraphIntegrityReport {
  timestamp: string;
  tenantId: string;
  totalNodes: number;
  totalEdges: number;
  orphanNodesCount: number;
  danglingEdgesCount: number;
  duplicateEdgesCount: number;
  crossTenantViolationsCount: number;
  forbiddenCyclesCount: number;
  isHealthy: boolean;
  violations: {
    type: string;
    details: string;
    nodeId?: string;
    edgeId?: string;
  }[];
}
