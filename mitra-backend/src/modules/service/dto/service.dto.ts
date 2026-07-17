import { IsString, IsOptional, IsUUID, IsDateString, IsEnum, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ServiceRequestStatus { OPEN='OPEN', ACKNOWLEDGED='ACKNOWLEDGED', IN_PROGRESS='IN_PROGRESS', RESOLVED='RESOLVED', CLOSED='CLOSED', CANCELLED='CANCELLED' }
export enum ServicePriority { LOW='LOW', MEDIUM='MEDIUM', HIGH='HIGH', CRITICAL='CRITICAL' }
export enum ServiceType { REPAIR='REPAIR', MAINTENANCE='MAINTENANCE', MODIFICATION='MODIFICATION', INSPECTION='INSPECTION', EMERGENCY='EMERGENCY' }

export class CreateServiceRequestDto {
  @ApiProperty() @IsString() customerName: string;
  @ApiProperty() @IsString() issueDescription: string;
  @ApiProperty() @IsDateString() reportedDate: string;
  @ApiPropertyOptional({ enum: ServiceType }) @IsOptional() @IsEnum(ServiceType) serviceType?: ServiceType;
  @ApiPropertyOptional() @IsOptional() @IsUUID() moldId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reportedBy?: string;
  @ApiPropertyOptional({ enum: ServicePriority }) @IsOptional() @IsEnum(ServicePriority) priority?: ServicePriority;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() warrantyClaim?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) costEstimate?: number;
}
export class UpdateServiceRequestDto extends PartialType(CreateServiceRequestDto) {
  @ApiPropertyOptional({ enum: ServiceRequestStatus }) @IsOptional() @IsEnum(ServiceRequestStatus) status?: ServiceRequestStatus;
}
