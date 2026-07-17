import { IsString, IsOptional, IsUUID, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ProcessPlanStatus { DRAFT='DRAFT', UNDER_REVIEW='UNDER_REVIEW', APPROVED='APPROVED', RELEASED='RELEASED', OBSOLETE='OBSOLETE' }
export class CreateProcessPlanDto {
  @ApiProperty() @IsUUID() projectId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() partId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) totalEstimatedHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) totalEstimatedCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
export class UpdateProcessPlanDto extends PartialType(CreateProcessPlanDto) {
  @ApiPropertyOptional({ enum: ProcessPlanStatus }) @IsOptional() @IsEnum(ProcessPlanStatus) status?: ProcessPlanStatus;
}
