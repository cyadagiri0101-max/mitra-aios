import { IsString, IsOptional, IsUUID, IsDateString, IsEnum, IsInt, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum WorkOrderStatus { DRAFT='DRAFT', RELEASED='RELEASED', IN_PROGRESS='IN_PROGRESS', ON_HOLD='ON_HOLD', COMPLETED='COMPLETED', CANCELLED='CANCELLED' }
export enum WorkOrderPriority { LOW='LOW', NORMAL='NORMAL', HIGH='HIGH', URGENT='URGENT' }

export class CreateWorkOrderDto {
  @ApiProperty() @IsUUID() projectId: string;
  @ApiProperty() @IsString() partName: string;
  @ApiProperty() @IsString() operationType: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() partId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() plannedStartDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() plannedEndDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) estimatedHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() machineId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() operatorId?: string;
  @ApiPropertyOptional({ enum: WorkOrderPriority }) @IsOptional() @IsEnum(WorkOrderPriority) priority?: WorkOrderPriority;
  @ApiPropertyOptional() @IsOptional() @IsString() instructions?: string;
}
export class UpdateWorkOrderDto extends PartialType(CreateWorkOrderDto) {
  @ApiPropertyOptional({ enum: WorkOrderStatus }) @IsOptional() @IsEnum(WorkOrderStatus) status?: WorkOrderStatus;
}
