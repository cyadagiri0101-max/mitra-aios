import { IsString, IsOptional, IsUUID, IsEnum, IsNumber, Min, MaxLength, MinLength, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaselineStatus } from '../entities/schedule-baseline.entity';

export class CreateScheduleBaselineDto {
  @ApiProperty({ example: 'Initial Customer Baseline' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Contractually agreed milestone and task schedule.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Initial contract kickoff' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}

export class UpdateScheduleBaselineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
