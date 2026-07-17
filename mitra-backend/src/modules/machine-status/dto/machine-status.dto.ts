import {
  IsString, IsOptional, IsEnum, IsNumber, IsDate, IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MachineStatusEnum } from '../entities/machine-telemetry.entity';

export class TelemetryDto {
  @ApiProperty()
  @IsString()
  machineId: string;

  @ApiProperty()
  @IsString()
  machineName: string;

  @ApiProperty({ enum: MachineStatusEnum })
  @IsEnum(MachineStatusEnum)
  status: MachineStatusEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  spindleLoad?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  feedRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  coolantTemp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alarmCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  cycleCount?: number;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  recordedAt: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  utilizationPercent?: number;
}

export class MachineStatusResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  machineId: string;

  @ApiProperty({ enum: MachineStatusEnum })
  currentStatus: MachineStatusEnum;

  @ApiPropertyOptional()
  lastTelemetryAt?: Date;

  @ApiPropertyOptional()
  totalRuntimeToday?: number;

  @ApiPropertyOptional()
  utilizationPercent?: number;

  @ApiProperty()
  updatedAt: Date;
}

export class MachineStatusSummaryDto {
  @ApiProperty()
  totalMachines: number;

  @ApiProperty()
  running: number;

  @ApiProperty()
  idle: number;

  @ApiProperty()
  alarm: number;

  @ApiProperty()
  setup: number;

  @ApiProperty()
  offline: number;

  @ApiProperty()
  averageUtilization: number;
}
