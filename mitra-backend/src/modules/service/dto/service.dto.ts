import { IsString, IsOptional, IsUUID, IsDateString, IsEnum, IsBoolean, IsNumber, IsArray, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ServiceVisitStatus } from '../entities/servicevisit.entity';

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

export class CreateInstallationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) installationNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() serviceRequestId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() dispatchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() siteReadiness?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() installationDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() completionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() checklist?: Record<string, unknown>[];
  @ApiPropertyOptional() @IsOptional() @IsString() installationReport?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() sitePhotos?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() customerSignoff?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() signoffBy?: string;
}
export class UpdateInstallationDto extends PartialType(CreateInstallationDto) {}

export class CompleteInstallationDto {
  @ApiProperty() @IsString() signoffBy: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() completionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() installationReport?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() checklist?: Record<string, unknown>[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoActivateWarranty?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) coverageMonths?: number;
}

export class CreateWarrantyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) warrantyNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() moldId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() dispatchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() workOrderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() warrantyStartDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() warrantyEndDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) coverageMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() coverageTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() eligibilityRule?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) claimLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) maxCycles?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) currentCycles?: number;
}
export class UpdateWarrantyDto extends PartialType(CreateWarrantyDto) {}

export class CreateWarrantyClaimDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) claimNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() warrantyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() serviceRequestId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() claimDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() issueSummary?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() eligibilityReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) claimAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) approvedAmount?: number;
}
export class UpdateWarrantyClaimDto extends PartialType(CreateWarrantyClaimDto) {}

export class AdjudicateWarrantyClaimDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'] })
  @IsEnum(['APPROVE', 'REJECT'])
  decision: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional() @IsOptional() @IsString() approvalNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rejectionReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resolutionNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) approvedAmount?: number;
}

export class CreateAmcDto {
  @ApiProperty() @IsString() @MaxLength(30) contractNumber: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coverageType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) contractValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() renewalDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() billingSchedule?: Record<string, unknown>[];
  @ApiPropertyOptional() @IsOptional() @IsArray() visitSchedule?: Record<string, unknown>[];
}
export class UpdateAmcDto extends PartialType(CreateAmcDto) {}

export class CreateVisitDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) visitNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() serviceRequestId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() visitDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() technicianId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serviceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workPerformed?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() partsUsed?: Array<{ partCode: string; partName: string; qty: number }>;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) travelHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) serviceHours?: number;
}
export class UpdateVisitDto extends PartialType(CreateVisitDto) {
  @ApiPropertyOptional({ enum: ServiceVisitStatus }) @IsOptional() @IsEnum(ServiceVisitStatus) status?: ServiceVisitStatus;
}

