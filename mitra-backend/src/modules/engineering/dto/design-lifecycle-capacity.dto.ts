import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray, IsUUID, Min, Max } from 'class-validator';
import { DesignStageEnum, DesignPackageStatus } from '../entities/design-work-package.entity';
import { ModificationCategoryEnum, ModificationRootCauseEnum } from '../entities/tool-modification-workload.entity';
import { EngineerSkillType } from '../entities/design-team-capacity.entity';

export class CreateDesignWorkPackageDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  packageCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsUUID()
  leadEngineerId?: string;

  @IsOptional()
  @IsString()
  activeRevision?: string;
}

export class AdvanceDesignStageDto {
  @IsEnum(DesignStageEnum)
  @IsNotEmpty()
  targetStage: DesignStageEnum;

  @IsOptional()
  @IsNumber()
  actualWorkloadUnits?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateWorkloadTemplateDto {
  @IsString()
  @IsNotEmpty()
  templateCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  moldType: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(1)
  estimatedTotalWorkloadUnits: number;

  @IsNumber()
  @Min(1)
  estimatedCalendarDurationDays: number;

  @IsArray()
  stageDefinitions: Array<{
    stage: DesignStageEnum;
    order: number;
    workloadUnits: number;
    durationDays: number;
    requiredSkills: string[];
    mandatoryDeliverables: string[];
    requiresCustomerApproval: boolean;
  }>;
}

export class RegisterEngineerProfileDto {
  @IsString()
  @IsNotEmpty()
  engineerCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  proficiencyLevel?: 'JUNIOR' | 'MID' | 'SENIOR' | 'PRINCIPAL';

  @IsArray()
  primarySkills: Array<{
    skill: EngineerSkillType;
    level: 'JUNIOR' | 'MID' | 'SENIOR' | 'PRINCIPAL';
    yearsExperience: number;
  }>;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(80)
  weeklyCapacityHours?: number;
}

export class CreateToolProvingCycleDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  toolId: string;

  @IsOptional()
  @IsString()
  cycleCode?: 'T0' | 'T1' | 'T2' | 'T3_FINAL';

  @IsOptional()
  @IsString()
  machineId?: string;
}

export class LogToolModificationDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsUUID()
  @IsNotEmpty()
  toolProvingCycleId: string;

  @IsString()
  @IsNotEmpty()
  modificationCode: string;

  @IsEnum(ModificationCategoryEnum)
  @IsNotEmpty()
  category: ModificationCategoryEnum;

  @IsEnum(ModificationRootCauseEnum)
  @IsNotEmpty()
  rootCause: ModificationRootCauseEnum;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0.1)
  estimatedWorkloadUnits: number;

  @IsOptional()
  @IsNumber()
  actualWorkloadUnits?: number;

  @IsOptional()
  @IsUUID()
  assignedEngineerId?: string;
}
