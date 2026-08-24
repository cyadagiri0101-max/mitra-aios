import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CalculateProjectComplexityDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  moldType: string;

  @IsNumber()
  @IsOptional()
  cavityCount?: number;

  @IsString()
  @IsOptional()
  moldSizeClass?: 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE';

  @IsNumber()
  @IsOptional()
  sliderCount?: number;

  @IsNumber()
  @IsOptional()
  lifterCount?: number;

  @IsNumber()
  @IsOptional()
  insertCount?: number;

  @IsString()
  @IsOptional()
  coolingComplexityLevel?: 'STANDARD' | 'BAFFLE_COMPLEX' | 'CONFORMAL';

  @IsString()
  @IsOptional()
  gatingComplexityLevel?: 'DIRECT_SPRUE' | 'EDGE_SUB_GATE' | 'HOT_RUNNER_SEQUENTIAL';

  @IsString()
  @IsOptional()
  toleranceClass?: 'COMMERCIAL' | 'STANDARD' | 'PRECISION' | 'ULTRA_PRECISION';

  @IsString()
  @IsOptional()
  surfaceFinishClass?: 'COMMERCIAL' | 'TECHNICAL' | 'OPTICAL_SPI_A1';

  @IsOptional()
  specialMaterialFactors?: Record<string, any>;
}

export class CreateChecklistItemDto {
  @IsString()
  @IsNotEmpty()
  itemCode: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;

  @IsString()
  @IsOptional()
  ownerRole?: string;
}

export class CreateDesignChecklistDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsOptional()
  packageId?: string;

  @IsString()
  @IsNotEmpty()
  stage: string;

  @IsString()
  @IsNotEmpty()
  checklistType: 'PROJECT' | 'STAGE' | 'DELIVERABLE' | 'DESIGN_REVIEW' | 'CUSTOMER_APPROVAL' | 'FINAL_DESIGN_REVIEW' | 'PROGRAMMING_HANDOFF' | 'T0_MODIFICATION';

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChecklistItemDto)
  items: CreateChecklistItemDto[];
}

export class CompleteChecklistItemDto {
  @IsString()
  @IsOptional()
  evidenceReference?: string;

  @IsString()
  @IsOptional()
  reviewNotes?: string;
}

export class CreateDesignDependencyDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  sourceStage: string;

  @IsString()
  @IsNotEmpty()
  targetStage: string;

  @IsString()
  @IsOptional()
  category?: 'CUSTOMER' | 'PROJECT' | 'ENGINEERING' | 'DESIGN' | 'MATERIAL' | 'MANUFACTURING' | 'QUALITY' | 'PROGRAMMING' | 'TOOL_PROVING' | 'APPROVAL' | 'EXTERNAL';

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsBoolean()
  @IsOptional()
  isBlocking?: boolean;
}

export class CreateDesignBlockerDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsOptional()
  packageId?: string;

  @IsString()
  @IsNotEmpty()
  stage: string;

  @IsString()
  @IsNotEmpty()
  blockerCode: string;

  @IsString()
  @IsOptional()
  category?: 'CUSTOMER' | 'PROJECT' | 'ENGINEERING' | 'DESIGN' | 'MATERIAL' | 'MANUFACTURING' | 'QUALITY' | 'PROGRAMMING' | 'TOOL_PROVING' | 'APPROVAL' | 'EXTERNAL';

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  impactSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsString()
  @IsOptional()
  evidenceReference?: string;
}

export class ProjectAcceptanceSimulationDto {
  @IsString()
  @IsNotEmpty()
  projectType: string;

  @IsNumber()
  @IsOptional()
  complexityScore?: number;

  @IsString()
  @IsNotEmpty()
  requestedDeliveryDate: string;

  @IsString()
  @IsOptional()
  templateCode?: string;

  @IsArray()
  @IsOptional()
  requiredSkills?: string[];

  @IsNumber()
  @IsOptional()
  estimatedWorkloadUnits?: number;
}

export class WhatIfScenarioDto {
  @IsString()
  @IsNotEmpty()
  scenarioType: 'MOVE_PROJECT_DATE' | 'ENGINEER_UNAVAILABLE' | 'CHANGE_PRIORITY' | 'T0_SURGE_30_PERCENT' | 'ADD_DESIGN_ENGINEER';

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  engineerId?: string;

  @IsNumber()
  @IsOptional()
  daysShift?: number;

  @IsNumber()
  @IsOptional()
  addedCapacityHours?: number;
}

export class RecordHistoricalWorkloadDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  moldType: string;

  @IsString()
  @IsNotEmpty()
  stage: string;

  @IsString()
  @IsNotEmpty()
  templateCode: string;

  @IsString()
  @IsOptional()
  engineerId?: string;

  @IsString()
  @IsNotEmpty()
  requiredSkill: string;

  @IsNumber()
  plannedDurationDays: number;

  @IsNumber()
  actualDurationDays: number;

  @IsNumber()
  plannedWorkloadUnits: number;

  @IsNumber()
  actualWorkloadUnits: number;

  @IsString()
  @IsOptional()
  rootCauseCategory?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
