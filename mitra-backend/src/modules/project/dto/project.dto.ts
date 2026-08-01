import { IsString, IsOptional, IsUUID, IsDateString, IsEnum, IsInt, IsNumber, Min, Max, MinLength, MaxLength, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProjectType, ProjectRiskLevel, ProjectPriority } from '../entities/project.entity';

export enum MoldType { INJECTION='INJECTION', BLOW='BLOW', THIN_WALL='THIN_WALL', IBM='IBM', MOLD_BASE='MOLD_BASE', FIXTURE='FIXTURE', PRODUCT_DESIGN='PRODUCT_DESIGN', JOB_WORK='JOB_WORK' }

export class CreateProjectDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(200) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) description?: string;
  @ApiProperty() @IsString() @MinLength(2) customerName: string;
  @ApiProperty() @IsString() @MinLength(2) productName: string;
  @ApiPropertyOptional({ enum: MoldType }) @IsOptional() @IsEnum(MoldType) moldType?: MoldType;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(128) @Type(() => Number) cavitation?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() materialType?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() targetDeliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) projectValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectManagerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;

  // ── Sprint 2.2: Project Management Domain ────────────────────────────────
  @ApiPropertyOptional({ enum: ProjectType, default: ProjectType.NEW_DEVELOPMENT })
  @IsOptional() @IsEnum(ProjectType) projectType?: ProjectType;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) businessUnit?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() plannedEndDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() actualEndDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) budget?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) currency?: string;

  @ApiPropertyOptional({ enum: ProjectRiskLevel, default: ProjectRiskLevel.LOW })
  @IsOptional() @IsEnum(ProjectRiskLevel) riskLevel?: ProjectRiskLevel;

  @ApiPropertyOptional({ enum: ProjectPriority })
  @IsOptional() @IsEnum(ProjectPriority) priority?: ProjectPriority;

  @ApiPropertyOptional() @IsOptional() @IsUUID() quotationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) quotationNumber?: string;

  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}
export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
export class TransitionStageDto {
  @ApiProperty({ example: 'DESIGN_INITIATED' }) @IsString() @MinLength(1) @MaxLength(64) toStage: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) remarks?: string;
}

/** DB-driven workflow transition on a project. */
export class WorkflowTransitionDto {
  @ApiProperty({ description: 'Workflow transition ID (as exposed by GET /project/:id/workflow)' })
  @IsUUID() transitionId: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) remarks?: string;
}

export class ProjectQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) search?: string;
  @ApiPropertyOptional({ enum: ProjectType }) @IsOptional() @IsEnum(ProjectType) projectType?: ProjectType;
  @ApiPropertyOptional({ enum: ProjectRiskLevel }) @IsOptional() @IsEnum(ProjectRiskLevel) riskLevel?: ProjectRiskLevel;
  @ApiPropertyOptional({ description: 'Workflow status (DRAFT, PLANNING, …)' }) @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional({ enum: ProjectPriority }) @IsOptional() @IsEnum(ProjectPriority) priority?: ProjectPriority;
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) businessUnit?: string;
  @ApiPropertyOptional({ description: 'Sort field: name | projectNumber | createdAt | plannedEndDate | budget' }) @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] }) @IsOptional() @IsString() sortOrder?: 'ASC' | 'DESC';
}
