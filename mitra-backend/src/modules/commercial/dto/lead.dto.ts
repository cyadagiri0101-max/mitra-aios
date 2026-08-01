import {
  IsString, IsOptional, IsUUID, IsEnum, IsNumber, IsDateString, IsArray,
  MinLength, MaxLength, Min, Max, IsInt, ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LeadSource, LeadStatus, Priority } from '../entities/lead.entity';

export class CreateLeadDto {
  @ApiPropertyOptional({ example: 'uuid-of-customer' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-contact' })
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiProperty({ example: 'Acme Automotive Pvt Ltd' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  customerName: string;

  @ApiPropertyOptional({ example: 'REFERRAL', enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  leadSource?: LeadSource;

  @ApiPropertyOptional({ enum: LeadStatus, default: LeadStatus.NEW })
  @IsOptional()
  @IsEnum(LeadStatus)
  leadStatus?: LeadStatus;

  @ApiPropertyOptional({ example: 'uuid-of-owner' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ example: 2500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  expectedRevenue?: number;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @ApiPropertyOptional({ enum: Priority, default: Priority.MEDIUM })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ example: 40, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  probability?: number;

  @ApiPropertyOptional({ example: 'Follow up after the exhibition demo.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

export class UpdateLeadDto extends PartialType(OmitType(CreateLeadDto, ['leadStatus'])) {
  // C-3 remediation: `leadStatus` is intentionally NOT part of the update DTO.
  // Lead status transitions (convert/qualify/close) are guarded state-machine
  // operations in LeadService and must not be reachable through a generic PATCH.
}

export class ConvertLeadDto {
  @ApiPropertyOptional({ example: 'Acme Automotive Pvt Ltd' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  customerName?: string;

  @ApiPropertyOptional({ example: 'automotive' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({ example: 'uuid-of-type' })
  @IsOptional()
  @IsUUID()
  customerTypeId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: '27AAPCA1234F1Z5' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  gstNumber?: string;
}

export class LeadFilterDto {
  @ApiPropertyOptional({ enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  leadSource?: LeadSource;

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  leadStatus?: LeadStatus;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

export class LeadResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  leadNumber: string;

  @ApiPropertyOptional()
  customerId: string | null;

  @ApiProperty()
  customerName: string | null;

  @ApiProperty({ enum: LeadSource })
  leadSource: LeadSource;

  @ApiProperty({ enum: LeadStatus })
  leadStatus: LeadStatus;

  @ApiProperty({ enum: Priority })
  priority: Priority;

  @ApiPropertyOptional()
  expectedRevenue: number | null;

  @ApiPropertyOptional()
  expectedDate: Date | null;

  @ApiProperty()
  probability: number;

  @ApiPropertyOptional()
  convertedCustomerId: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class BulkCreateLeadDto {
  @ApiProperty({ type: [CreateLeadDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLeadDto)
  leads: CreateLeadDto[];
}
