import { IsString, IsOptional, IsUUID, IsDateString, IsEnum, IsInt, IsArray, Min, Max, MinLength, MaxLength, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RiskStatus, RiskCategory } from '../entities/projectrisk.entity';

export class CreateRiskDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(300) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(3000) description?: string;
  @ApiPropertyOptional({ enum: RiskCategory, default: RiskCategory.OTHER }) @IsOptional() @IsEnum(RiskCategory) category?: RiskCategory;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) @Type(() => Number) impact?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) @Type(() => Number) probability?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(3000) mitigation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(3000) contingency?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() ownerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) ownerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() reviewDate?: string;
  @ApiPropertyOptional({ enum: RiskStatus }) @IsOptional() @IsEnum(RiskStatus) status?: RiskStatus;
}

export class UpdateRiskDto extends PartialType(CreateRiskDto) {}

export class CloseRiskDto {
  @ApiPropertyOptional({ description: 'Resolution (close) or reason (reopen)' }) @IsOptional() @IsString() @MaxLength(3000) resolution?: string;
}

export class ReopenRiskDto {
  @ApiPropertyOptional({ description: 'Reason for reopening' }) @IsOptional() @IsString() @MaxLength(3000) reason?: string;
}

export class RiskQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
  @ApiPropertyOptional({ enum: RiskStatus }) @IsOptional() @IsEnum(RiskStatus) status?: RiskStatus;
  @ApiPropertyOptional({ enum: RiskCategory }) @IsOptional() @IsEnum(RiskCategory) category?: RiskCategory;
  @ApiPropertyOptional() @IsOptional() @IsUUID() ownerId?: string;
  @ApiPropertyOptional({ description: 'Minimum exposure (impact × probability) to filter by' }) @IsOptional() @IsInt() @Min(1) @Max(25) @Type(() => Number) minExposure?: number;
}
