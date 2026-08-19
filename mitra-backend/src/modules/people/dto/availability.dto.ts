import {
  IsString, IsOptional, IsEnum, IsDateString, IsNumber, MaxLength, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AvailabilityType } from '../entities/resource-availability.entity';

export class CreateAvailabilityDto {
  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  workDate: string;

  @ApiPropertyOptional({ enum: AvailabilityType, default: AvailabilityType.AVAILABLE })
  @IsOptional()
  @IsEnum(AvailabilityType)
  availabilityType?: AvailabilityType;

  @ApiPropertyOptional({ example: 8, maximum: 168 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(168)
  availableHours?: number;

  @ApiPropertyOptional({ example: 'Focused on mold design task M-12' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateAvailabilityDto {
  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString()
  workDate?: string;

  @ApiPropertyOptional({ enum: AvailabilityType })
  @IsOptional()
  @IsEnum(AvailabilityType)
  availabilityType?: AvailabilityType;

  @ApiPropertyOptional({ maximum: 168 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(168)
  availableHours?: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}