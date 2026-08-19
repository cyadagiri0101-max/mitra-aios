import { IsString, IsOptional, IsEnum, IsNumber, Min, Max, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CapacityHorizon {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export class CapacityQueryDto {
  @ApiPropertyOptional({ enum: CapacityHorizon, default: CapacityHorizon.WEEKLY })
  @IsOptional()
  @IsEnum(CapacityHorizon)
  horizon?: CapacityHorizon;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-11-30' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skillId?: string;
}

export class WhatIfSimulationDto {
  @ApiPropertyOptional({ example: 1, description: 'Number of additional engineers to simulate' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  addEngineers?: number;

  @ApiPropertyOptional({ example: 40, description: 'Hours per added engineer per week' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  engineerWeeklyHours?: number;

  @ApiPropertyOptional({ example: 1, description: 'Number of additional CAD workstations' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  addWorkstations?: number;

  @ApiPropertyOptional({ example: 0, description: 'Hours of work outsourced to external design vendor' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  outsourceHours?: number;

  @ApiPropertyOptional({ example: 0, description: 'Shift project start date in days' })
  @IsOptional()
  @IsNumber()
  shiftDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetProjectId?: string;
}
