import { Type } from 'class-transformer';
import {
  IsArray, IsDateString, IsNumber, IsOptional, IsString,
  IsUUID, Min, ValidateNested,
} from 'class-validator';

export class InvoiceLineDto {
  @IsOptional()
  @IsString()
  itemCode?: string | null;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  itemCategory?: string | null;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxPct?: number;
}

export class CreateInvoiceDto {
  @IsOptional()
  @IsUUID()
  quotationId?: string | null;

  @IsOptional()
  @IsUUID()
  salesOrderId?: string | null;

  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @IsOptional()
  @IsUUID()
  customerId?: string | null;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsDateString()
  invoiceDate: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxPct?: number;

  @IsOptional()
  @IsString()
  paymentTerms?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines?: InvoiceLineDto[];
}

export class IssueInvoiceDto {
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class CancelInvoiceDto {
  @IsString()
  reason: string;
}

export class InvoiceFilterDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  salesOrderId?: string;
}
