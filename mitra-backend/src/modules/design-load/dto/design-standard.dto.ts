import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsUUID,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DesignStandardStatus,
  ComplexityLevel,
  ProvenanceSource,
} from '../entities/design-load-standard.entity';
import { ProficiencyLevel } from '../../people/entities/employee-skill.entity';

export class CreateStandardStageDto {
  @IsString()
  stageCode: string;

  @IsString()
  stageName: string;

  @IsNumber()
  @Min(1)
  sequence: number;

  @IsNumber()
  @Min(0.1)
  @Max(365)
  standardDurationDays: number;

  @IsNumber()
  @Min(0.5)
  @Max(8760)
  standardHours: number;

  @IsOptional()
  @IsUUID()
  requiredSkillId?: string;

  @IsOptional()
  @IsEnum(ProficiencyLevel)
  minimumProficiency?: ProficiencyLevel;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateDesignStandardDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  projectType?: string;

  @IsOptional()
  @IsString()
  moldType?: string;

  @IsOptional()
  @IsEnum(ComplexityLevel)
  complexityLevel?: ComplexityLevel;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  totalStandardDurationDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  totalStandardHours?: number;

  @IsOptional()
  @IsEnum(DesignStandardStatus)
  status?: DesignStandardStatus;

  @IsOptional()
  @IsEnum(ProvenanceSource)
  provenanceSource?: ProvenanceSource;

  @IsOptional()
  @IsString()
  provenanceDetails?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStandardStageDto)
  stages?: CreateStandardStageDto[];
}

export class UpdateDesignStandardDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  projectType?: string;

  @IsOptional()
  @IsString()
  moldType?: string;

  @IsOptional()
  @IsEnum(ComplexityLevel)
  complexityLevel?: ComplexityLevel;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  totalStandardDurationDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  totalStandardHours?: number;

  @IsOptional()
  @IsEnum(DesignStandardStatus)
  status?: DesignStandardStatus;

  @IsOptional()
  @IsEnum(ProvenanceSource)
  provenanceSource?: ProvenanceSource;

  @IsOptional()
  @IsString()
  provenanceDetails?: string;
}
