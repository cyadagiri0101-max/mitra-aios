import { IsString, IsOptional, IsUUID, IsDateString, IsEnum, IsInt, Min, Max, MinLength, MaxLength, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MilestoneStatus } from '../entities/projectmilestone.entity';

export class CreateMilestoneTemplateDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(50) code: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateMilestoneTemplateDto extends PartialType(CreateMilestoneTemplateDto) {}

export class CreateMilestoneTemplateItemDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) milestoneName: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(50) milestoneStage: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number) sequenceNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number) plannedDaysOffset?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) dependsOnSequence?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCriticalPath?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) defaultOwnerRole?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresApproval?: boolean;
}

export class UpdateMilestoneTemplateItemDto extends PartialType(CreateMilestoneTemplateItemDto) {}

export class CreateMilestoneDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(200) milestoneName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(50) milestoneStage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number) sequenceNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() plannedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() revisedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() ownerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100) @Type(() => Number) completionPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() dependsOnMilestoneId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresApproval?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCriticalPath?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) remarks?: string;
}

export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {
  @ApiPropertyOptional({ enum: MilestoneStatus }) @IsOptional() @IsEnum(MilestoneStatus) status?: MilestoneStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) delayReason?: string;
}

export class CompleteMilestoneDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() actualDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) remarks?: string;
}

export class ApproveMilestoneDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) remarks?: string;
}
