import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ImportTrackingSheetRowDto {
  @IsString()
  @IsOptional()
  sheetTabName?: string;

  @IsOptional()
  rowNumber?: number;

  @IsString()
  @IsOptional()
  componentCode?: string;

  @IsString()
  @IsOptional()
  componentName?: string;

  @IsString()
  @IsOptional()
  rawDeliverableText?: string;

  @IsString()
  @IsOptional()
  recordedStatus?: 'NOT_STARTED' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

  @IsString()
  @IsOptional()
  assignedEngineer?: string;

  @IsString()
  @IsOptional()
  plannedDate?: string;

  @IsString()
  @IsOptional()
  actualDate?: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsOptional()
  cellProvenance?: Record<string, any>;
}

export class ImportTrackingSheetDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  sheetTitle: string;

  @IsString()
  @IsOptional()
  sheetType?: 'PROCESS_PLANNING' | 'WORKLOAD_TRACKING' | 'PROJECT_CHECKLIST' | 'DELIVERABLE_REGISTER';

  @IsString()
  @IsNotEmpty()
  sourceFileName: string;

  @IsString()
  @IsOptional()
  sourceFileHash?: string;

  @IsString()
  @IsOptional()
  revisionCode?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportTrackingSheetRowDto)
  rows: ImportTrackingSheetRowDto[];
}

export class QueryStatusCopilotDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsString()
  @IsOptional()
  projectId?: string;
}

export class AutoReconcileVaultFileDto {
  @IsString()
  @IsNotEmpty()
  relativePath: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  sha256: string;

  @IsOptional()
  fileSize?: number;
}

export class CheckFileHashMismatchDto {
  @IsString()
  @IsNotEmpty()
  deliverableId: string;

  @IsString()
  @IsNotEmpty()
  observedSha256: string;
}
