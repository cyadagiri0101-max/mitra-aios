import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  IsUUID,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PortfolioSnapshotQueryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  projectIds?: string[];

  @IsOptional()
  @IsString()
  scenarioId?: string;

  @IsOptional()
  @IsString()
  snapshotName?: string;
}

export class CreatePortfolioSnapshotDto extends PortfolioSnapshotQueryDto {}

export class PortfolioDemandQueryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  projectIds?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  timeframeDays?: number = 90;
}

export class PortfolioCapacityQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  timeframeDays?: number = 90;

  @IsOptional()
  @IsString()
  engineerRole?: string;
}

export class CreateCrossProjectAllocationDto {
  @IsString()
  projectId: string;

  @IsString()
  engineerId: string;

  @IsOptional()
  @IsString()
  engineerName?: string;

  @IsOptional()
  @IsString()
  workPackageId?: string;

  @IsOptional()
  @IsString()
  deliverableId?: string;

  @IsString()
  allocationRole: string;

  @IsNumber()
  @Min(0)
  @Max(168)
  allocatedHoursPerWeek: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  allocatedWorkloadUnits?: number;

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsOptional()
  @IsString()
  reviewRationale?: string;
}

export class UpdateAllocationStatusDto {
  @IsEnum(['ACTIVE', 'RELEASED', 'OVERRIDDEN'])
  status: 'ACTIVE' | 'RELEASED' | 'OVERRIDDEN';

  @IsOptional()
  @IsString()
  rationale?: string;
}

export class DelayedProjectItem {
  @IsString()
  projectId: string;

  @IsNumber()
  @Min(1)
  delayDays: number;
}

export class ReassignmentItem {
  @IsString()
  engineerId: string;

  @IsString()
  targetProjectId: string;

  @IsNumber()
  @Min(0)
  allocatedHours: number;
}

export class SimulatePortfolioScenarioDto {
  @IsString()
  scenarioName: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addedProjectIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  removedProjectIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DelayedProjectItem)
  delayedProjects?: DelayedProjectItem[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  unavailableEngineers?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(5.0)
  capacityMultiplier?: number = 1.0;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReassignmentItem)
  reassignments?: ReassignmentItem[];
}

export class PortfolioBalancingQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(200)
  targetUtilizationCap?: number = 100.0;

  @IsOptional()
  prioritizeNearDeadlines?: boolean = true;
}
