import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
} from 'class-validator';
import {
  ComplianceFramework,
  PackageCompletenessStatus,
} from '../entities/compliance-package.entity';

export class GenerateCompliancePackageDto {
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsEnum(ComplianceFramework)
  framework?: string = ComplianceFramework.ISO_9001;

  @IsOptional()
  @IsString()
  scope?: string = 'FULL_PROJECT_TRACEABILITY';
}

export interface ComplianceGapItem {
  entityType: string;
  expectedRelation: string;
  severity: 'WARNING' | 'CRITICAL';
  description: string;
}

export interface PackageExportResult {
  packageId: string;
  projectId: string;
  framework: string;
  packageHash: string;
  version: number;
  completenessStatus: string;
  generatedAt: Date;
  generatorVersion: string;
  manifest: {
    evidenceCount: number;
    lineageEdgeCount: number;
    auditEventCount: number;
    gapsCount: number;
  };
  evidenceItems: Record<string, any>[];
  lineageEdges: Record<string, any>[];
  auditTrail: Record<string, any>[];
  gapsAndWarnings: ComplianceGapItem[];
}
