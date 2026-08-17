import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID, IsNumber, IsBoolean, IsDateString, IsArray, IsObject, Min, Max, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class ProjectScopeDto {
  @ApiProperty({ description: 'Owning project — no orphan engineering records' })
  @IsUUID()
  projectId: string;
}

// ── Drawings ────────────────────────────────────────────────────────────────

export class CreateDrawingDto extends ProjectScopeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional({ enum: ['PART', 'ASSEMBLY', 'SUB_ASSEMBLY', 'TOOL', 'FIXTURE', 'GAUGE', 'STANDARD', 'OTHER'] })
  @IsOptional() @IsString() drawingType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cadFileType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cadAppName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cadAppVersion?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() lengthMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() widthMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() heightMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() weightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, any>;
}

export class UpdateDrawingDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() drawingType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() lengthMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() widthMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() heightMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() weightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, any>;
}

export class CreateDrawingRevisionDto {
  @ApiProperty() @IsString() revisionCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() revisionNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() uploadedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() fileSizeBytes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() fileChecksum?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isReleased?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, any>;
}

export class CheckInDrawingDto {
  @ApiProperty() @IsString() revision: string;
  @ApiPropertyOptional() @IsOptional() @IsString() changeSummary?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() fileSizeBytes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() fileChecksum?: string;
}

// ── BOM ─────────────────────────────────────────────────────────────────────

export class CreateBomDto extends ProjectScopeDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() drawingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() revisionCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, any>;
}

export class AddBomItemDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() parentItemId?: string;
  @ApiProperty() @IsString() partNumber: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() itemType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceDrawing?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() materialSpec?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() quantityPer?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unitCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, any>;
}

export class UpdateBomItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() partNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() itemType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() quantityPer?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unitCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, any>;
}

export class BomRevisionDto {
  @ApiProperty() @IsString() revisionCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() changeNotes?: string;
}

// ── BOM substitutions (Sprint 2.3.1 G-3) ────────────────────────────────────

export class AddSubstitutionDto {
  @ApiProperty() @IsUUID() substituteItemId: string;
  @ApiPropertyOptional({ enum: ['SUBSTITUTE', 'ALTERNATE'] }) @IsOptional() @IsString() substitutionType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() priority?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() effectiveFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() effectiveTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() restrictionNotes?: string;
}

export class UpdateSubstitutionDto {
  @ApiPropertyOptional({ enum: ['SUBSTITUTE', 'ALTERNATE'] }) @IsOptional() @IsString() substitutionType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() priority?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() effectiveFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() effectiveTo?: string;
  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'PENDING_APPROVAL'] }) @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() restrictionNotes?: string;
}

// ── Process planning ────────────────────────────────────────────────────────

export class CreateWorkCenterDto extends ProjectScopeDto {
  @ApiProperty() @IsString() code: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() department?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() hourlyRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() machineIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateRoutingDto extends ProjectScopeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() routingName?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() bomId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() partId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() drawingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() revisionCode?: string;
}

// ── Routing revisions (Sprint 2.3.1 G-4) ────────────────────────────────────

export class RoutingRevisionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() changeSummary?: string;
}

export class CreateOperationDto {
  @ApiProperty() @IsNumber() sequence: number;
  @ApiProperty() @IsString() operationName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workCenterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() setupTimeMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cycleTimeMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() machineRatePerHour?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() laborRatePerHour?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() toolingNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() qualityCheckpoints?: Record<string, any>[];
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, any>;
}

// ── Material / component libraries ──────────────────────────────────────────

export class CreateMaterialDto extends ProjectScopeDto {
  @ApiProperty() @IsString() materialCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() materialName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() grade?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() specification?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() density?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() tensileStrengthMpa?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() yieldStrengthMpa?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() hardness?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() supplier?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unitCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() leadTimeDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPreferred?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, any>;
}

export class CreateComponentDto extends ProjectScopeDto {
  @ApiProperty() @IsString() componentCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() componentName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() componentType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() modelNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() specification?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unitCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() leadTimeDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() preferredSupplier?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() vendorMapping?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isQualified?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, any>;
}

export class AlternateComponentDto {
  @ApiProperty() @IsUUID() alternateComponentId: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isApproved?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() approvalNotes?: string;
}

// ── Reviews ─────────────────────────────────────────────────────────────────

export class CreateReviewRequestDto extends ProjectScopeDto {
  @ApiProperty() @IsString() entityType: string;
  @ApiProperty() @IsUUID() entityId: string;
  @ApiProperty() @IsString() reviewType: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsUUID('4', { each: true }) assignees?: string[];
}

export class ReviewDecisionDto {
  @ApiProperty() @IsString() decision: string;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireResubmit?: boolean;
}

export class AddReviewCommentDto {
  @ApiProperty() @IsString() comment: string;
  @ApiPropertyOptional() @IsOptional() @IsString() markerRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() markup?: Record<string, any>;
}

// ── Multi-reviewer assignments (Sprint 2.3.1 G-5) ───────────────────────────

export class ReviewAssigneeDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() assigneeId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assigneeName?: string;
  @ApiPropertyOptional({ enum: ['REVIEWER', 'APPROVER', 'OBSERVER'] }) @IsOptional() @IsString() reviewRole?: string;
}

export class AssignReviewersDto {
  @ApiProperty({ type: [ReviewAssigneeDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReviewAssigneeDto)
  assignees: ReviewAssigneeDto[];
}

export class AssignmentDecisionDto {
  @ApiProperty() @IsString() decision: string;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}

// ── Unit conversions (Sprint 2.3.1 G-8) ─────────────────────────────────────

export class UomConversionCreateDto {
  @ApiProperty() @IsString() fromUom: string;
  @ApiProperty() @IsString() toUom: string;
  @ApiProperty() @IsNumber() conversionFactor: number;
  @ApiPropertyOptional({ enum: ['EXACT', 'ROUNDED', 'APPROXIMATE'] }) @IsOptional() @IsString() conversionType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UomConversionUpdateDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() conversionFactor?: number;
  @ApiPropertyOptional({ enum: ['EXACT', 'ROUNDED', 'APPROXIMATE'] }) @IsOptional() @IsString() conversionType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ── Documents ───────────────────────────────────────────────────────────────

export class CreateEngineeringDocumentDto extends ProjectScopeDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() docType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, any>;
}

export class DocumentVersionDto {
  @ApiProperty() @IsString() versionCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fileName?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() fileSizeBytes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() storageKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mimeType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() changeSummary?: string;
}

// ── AI hooks / misc ─────────────────────────────────────────────────────────

export class AiHookUpdateDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsObject() config?: Record<string, any>;
}

export class DashboardQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endDate?: string;
}

export class EngineeringQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(100) @Type(() => Number) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sortOrder?: 'ASC' | 'DESC';
}
