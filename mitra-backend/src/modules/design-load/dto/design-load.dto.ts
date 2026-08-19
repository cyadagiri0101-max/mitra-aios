import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ProjectDesignLoadStatus } from '../entities/project-design-load.entity';
import { ProjectStageStatus } from '../entities/project-design-load-stage.entity';
import { ProficiencyLevel } from '../../people/entities/employee-skill.entity';

export class CreateProjectDesignLoadDto {
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsUUID()
  standardId?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  projectType?: string;

  @IsOptional()
  @IsString()
  moldType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10.0)
  complexityFactor?: number;

  @IsOptional()
  @IsDateString()
  plannedStartDate?: string;

  @IsOptional()
  @IsDateString()
  plannedFinishDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateProjectDesignLoadDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10.0)
  complexityFactor?: number;

  @IsOptional()
  @IsEnum(ProjectDesignLoadStatus)
  status?: ProjectDesignLoadStatus;

  @IsOptional()
  @IsString()
  currentStageCode?: string;

  @IsOptional()
  @IsDateString()
  plannedStartDate?: string;

  @IsOptional()
  @IsDateString()
  plannedFinishDate?: string;

  @IsOptional()
  @IsDateString()
  actualStartDate?: string;

  @IsOptional()
  @IsDateString()
  actualFinishDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualDurationDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualHours?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class EstimateDesignLoadDto {
  @IsOptional()
  @IsUUID()
  standardId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10.0)
  complexityFactor?: number;

  @IsOptional()
  @IsDateString()
  plannedStartDate?: string;
}

export class UpdateProjectDesignLoadStageDto {
  @IsOptional()
  @IsEnum(ProjectStageStatus)
  status?: ProjectStageStatus;

  @IsOptional()
  @IsDateString()
  plannedStartDate?: string;

  @IsOptional()
  @IsDateString()
  plannedFinishDate?: string;

  @IsOptional()
  @IsDateString()
  actualStartDate?: string;

  @IsOptional()
  @IsDateString()
  actualFinishDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualDurationDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualHours?: number;

  @IsOptional()
  @IsUUID()
  assignedEmployeeId?: string;

  @IsOptional()
  @IsUUID()
  assignedDesignSystemId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
