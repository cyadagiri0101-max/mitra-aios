import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateComponentDeliverableDto {
  @IsString()
  @IsNotEmpty()
  deliverableType: '3D_DEVELOPMENT' | 'DETAILING' | 'VERIFICATION' | '3D_DTP' | '2D_PDF' | 'SUBMISSION' | 'PROCESS_PLANNING' | 'ELECTRODE_EXTRACTION' | 'FIXTURE_DESIGN' | 'FINAL_PART_LIST';

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsOptional()
  plannedUnits?: number;

  @IsString()
  @IsOptional()
  responsibleEngineerId?: string;
}

export class CreateDesignComponentDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsOptional()
  packageId?: string;

  @IsString()
  @IsNotEmpty()
  componentCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  componentType: 'CORE_INSERT' | 'CAVITY_INSERT' | 'SLIDER' | 'LIFTER' | 'STRIPPER_PLATE' | 'MANIFOLD' | 'CAVITY_PLATE' | 'CORE_PLATE' | 'EJECTOR_GRID' | 'SPECIAL_INSERT';

  @IsString()
  @IsOptional()
  variantBpCode?: string;

  @IsString()
  @IsOptional()
  responsibleEngineerId?: string;

  @IsString()
  @IsOptional()
  reviewerId?: string;

  @IsNumber()
  @IsOptional()
  plannedWorkloadUnits?: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateComponentDeliverableDto)
  deliverables?: CreateComponentDeliverableDto[];
}

export class CreateComponentRevisionDto {
  @IsString()
  @IsNotEmpty()
  revisionCode: string;

  @IsString()
  @IsNotEmpty()
  revisionReason: 'CUSTOMER_ECR' | 'DFM_FEEDBACK' | 'TRIAL_MODIFICATION' | 'DESIGN_ERROR' | 'MANUFACTURING_FIT' | 'STANDARDIZATION';

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsOptional()
  incrementalWorkloadUnits?: number;

  @IsNumber()
  @IsOptional()
  reworkWorkloadUnits?: number;

  @IsString()
  @IsOptional()
  engineerId?: string;
}

export class UpdateComponentDeliverableStatusDto {
  @IsString()
  @IsNotEmpty()
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

  @IsNumber()
  @IsOptional()
  actualUnits?: number;

  @IsString()
  @IsOptional()
  evidenceReference?: string;

  @IsString()
  @IsOptional()
  reviewerNotes?: string;
}

export class BulkAssignDeliverablesDto {
  @IsArray()
  @IsNotEmpty()
  deliverableIds: string[];

  @IsString()
  @IsNotEmpty()
  engineerId: string;

  @IsOptional()
  overwriteExisting?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
