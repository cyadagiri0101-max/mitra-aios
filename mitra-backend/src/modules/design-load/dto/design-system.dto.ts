import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import {
  DesignSystemStatus,
  DesignSystemType,
} from '../entities/design-system.entity';

export class CreateDesignSystemDto {
  @IsString()
  systemCode: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(DesignSystemType)
  systemType?: DesignSystemType;

  @IsOptional()
  @IsString()
  specifications?: string;

  @IsOptional()
  @IsString()
  softwareLicenses?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(DesignSystemStatus)
  status?: DesignSystemStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  totalShiftsSupported?: number;

  @IsOptional()
  @IsBoolean()
  shift1Available?: boolean;

  @IsOptional()
  @IsBoolean()
  shift2Available?: boolean;

  @IsOptional()
  @IsBoolean()
  shift3Available?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(72)
  dailyCapacityHours?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDesignSystemDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(DesignSystemType)
  systemType?: DesignSystemType;

  @IsOptional()
  @IsString()
  specifications?: string;

  @IsOptional()
  @IsString()
  softwareLicenses?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(DesignSystemStatus)
  status?: DesignSystemStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  totalShiftsSupported?: number;

  @IsOptional()
  @IsBoolean()
  shift1Available?: boolean;

  @IsOptional()
  @IsBoolean()
  shift2Available?: boolean;

  @IsOptional()
  @IsBoolean()
  shift3Available?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(72)
  dailyCapacityHours?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
