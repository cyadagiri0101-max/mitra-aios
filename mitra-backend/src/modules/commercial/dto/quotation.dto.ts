import { IsString, IsOptional, IsUUID, IsNumber, IsObject, IsDateString, Min, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateQuotationDto {
  @ApiProperty()
  @IsUUID()
  rfqId: string;

  @ApiProperty()
  @IsUUID()
  customerId: string;

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

  @ApiProperty({ example: 150000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: { payment_terms: '50% advance, 50% on delivery', delivery_weeks: 12, warranty_months: 12 } })
  @IsObject()
  terms: Record<string, unknown>;

  @ApiProperty({ example: '2026-09-27' })
  @IsDateString()
  validUntil: string;
}

export class UpdateQuotationDto extends PartialType(CreateQuotationDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
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

  @ApiProperty()
  rfqId: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  customerName?: string;

  @ApiProperty()
  quotationNumber: string;

  @ApiProperty()
  version: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  terms: Record<string, unknown>;

  @ApiProperty()
  validUntil: Date;

  @ApiPropertyOptional()
  projectId?: string;

  @ApiPropertyOptional()
  acceptedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
