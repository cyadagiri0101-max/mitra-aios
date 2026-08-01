import {
  IsString, IsOptional, IsUUID, IsNumber, IsObject, IsDateString, IsArray,
  Min, Max, MaxLength, MinLength, IsInt, IsEnum, ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { QuotationStatus } from '../entities/quotation.entity';

export class CreateQuotationItemDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  lineNumber?: number;

  @ApiPropertyOptional({ example: 'MOLD-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  itemCode?: string;

  @ApiProperty({ example: 'Injection mold for dashboard panel' })
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({ example: 'MOLD' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  itemCategory?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional({ example: 'NOS', default: 'NOS' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional({ example: 450000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice?: number;

  @ApiPropertyOptional({ example: 380000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  estimatedCost?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  discountPct?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  leadTimeWeeks?: number;

  @ApiPropertyOptional({ example: 'HSN 84807100' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  hsnCode?: string;

  @ApiPropertyOptional({ example: 'Ex-works Pune' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;
}

export class CreateQuotationDto {
  @ApiPropertyOptional({ example: 'uuid-of-rfq' })
  @IsOptional()
  @IsUUID()
  rfqId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-legacy-enquiry' })
  @IsOptional()
  @IsUUID()
  enquiryId?: string;

  @ApiProperty({ example: 'uuid-of-customer' })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({ example: 'ABC Plastics Pvt Ltd' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  customerName?: string;

  @ApiPropertyOptional({ example: 'INR', default: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  discountPct?: number;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  taxPct?: number;

  @ApiPropertyOptional({ example: '50% advance, 50% before dispatch' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  paymentTerms?: string;

  @ApiPropertyOptional({ example: 'Ex-works, packed for sea freight' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  deliveryTerms?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  deliveryWeeks?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  warrantyMonths?: number;

  @ApiPropertyOptional({ example: 'Quotation valid for 30 days.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  termsAndConditions?: string;

  @ApiPropertyOptional({ type: [CreateQuotationItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items?: CreateQuotationItemDto[];
}

export class UpdateQuotationDto extends PartialType(CreateQuotationDto) {
  @ApiPropertyOptional({ type: [CreateQuotationItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items?: CreateQuotationItemDto[];
}

export class ApproveQuotationDto {
  @ApiPropertyOptional({ example: 'Approved in commercial review.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;
}

export class ReviseQuotationDto {
  @ApiPropertyOptional({ example: 'Revised pricing per customer feedback.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  changeSummary?: string;

  @ApiPropertyOptional({ type: [CreateQuotationItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items?: CreateQuotationItemDto[];
}

export class QuotationFilterDto {
  @ApiPropertyOptional({ enum: QuotationStatus })
  @IsOptional()
  @IsEnum(QuotationStatus)
  status?: QuotationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  rfqId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;
}

export class AcceptQuotationDto {
  @ApiProperty({ example: 'Acme Dashboard Panel - DSH-001' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  projectName: string;

  @ApiPropertyOptional({ example: 'ABC Plastics Pvt Ltd' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  customerName?: string;

  @ApiPropertyOptional({ example: '500 mL Bottle Blow Mold' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  productName?: string;
}

export class RejectQuotationDto {
  @ApiProperty({ example: 'Pricing does not meet budget' })
  @IsString()
  @MaxLength(500)
  reason: string;
}

export class QuotationResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  rfqId: string | null;

  @ApiPropertyOptional()
  enquiryId: string | null;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  customerName?: string;

  @ApiProperty()
  quotationNumber: string;

  @ApiProperty()
  revisionNumber: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  estimatedCost: number;

  @ApiProperty()
  sellingPrice: number;

  @ApiProperty()
  marginAmount: number;

  @ApiProperty()
  marginPct: number;

  @ApiProperty()
  taxPct: number;

  @ApiProperty()
  taxAmount: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  validUntil: Date;

  @ApiPropertyOptional()
  projectId?: string | null;

  @ApiPropertyOptional({ type: [Object] })
  items?: any[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
