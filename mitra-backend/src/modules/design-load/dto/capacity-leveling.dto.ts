import { IsString, IsOptional, IsEnum, IsUUID, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum LevelingActionType {
  REASSIGN_ENGINEER = 'REASSIGN_ENGINEER',
  EXTEND_SHIFT_OVERTIME = 'EXTEND_SHIFT_OVERTIME',
  OUTSOURCE_STAGE = 'OUTSOURCE_STAGE',
  RESCHEDULE_TASK = 'RESCHEDULE_TASK',
  ADD_WORKSTATION = 'ADD_WORKSTATION',
}

export class AnalyzeLevelingDto {
  @ApiPropertyOptional({ description: 'Optional project ID scope' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Maximum overtime hours per week allowed per engineer', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(40)
  maxOvertimeHoursPerWeek?: number;

  @ApiPropertyOptional({ description: 'Allow outsourcing recommendations for non-critical stages', default: true })
  @IsOptional()
  @IsBoolean()
  allowOutsourcing?: boolean;
}

export class ApplyLevelingActionDto {
  @ApiProperty({ description: 'Action type to execute', enum: LevelingActionType })
  @IsEnum(LevelingActionType)
  actionType: LevelingActionType;

  @ApiPropertyOptional({ description: 'Target project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Target design stage ID' })
  @IsOptional()
  @IsUUID()
  stageId?: string;

  @ApiPropertyOptional({ description: 'Source engineer ID (for reassignment)' })
  @IsOptional()
  @IsUUID()
  sourceEngineerId?: string;

  @ApiPropertyOptional({ description: 'Target engineer ID (for reassignment)' })
  @IsOptional()
  @IsUUID()
  targetEngineerId?: string;

  @ApiPropertyOptional({ description: 'Overtime or outsource hours to allocate' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  hours?: number;

  @ApiPropertyOptional({ description: 'Days to shift task/stage' })
  @IsOptional()
  @IsNumber()
  shiftDays?: number;

  @ApiPropertyOptional({ description: 'Approval notes / justification' })
  @IsOptional()
  @IsString()
  notes?: string;
}
