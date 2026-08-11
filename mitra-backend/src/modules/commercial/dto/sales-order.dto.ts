import { Type } from 'class-transformer';
import {
  IsArray, IsDateString, IsIn, IsNumber, IsObject, IsOptional,
  IsString, IsUUID, Min, ValidateNested,
} from 'class-validator';

export class SalesOrderLineDto {
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

  @IsOptional()
  @IsDateString()
  deliveryDate?: string | null;

  @IsOptional()
  @IsString()
  remarks?: string | null;
}

export class CreateSalesOrderDto {
  @IsOptional()
  @IsUUID()
  quotationId?: string | null;

  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @IsOptional()
  @IsUUID()
  customerId?: string | null;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsDateString()
  orderDate?: string;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string | null;

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
  deliveryTerms?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesOrderLineDto)
  lines?: SalesOrderLineDto[];
}

export class UpdateSalesOrderDto {
  @IsOptional()
  @IsDateString()
  deliveryDate?: string | null;

  @IsOptional()
  @IsString()
  paymentTerms?: string | null;

  @IsOptional()
  @IsString()
  deliveryTerms?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesOrderLineDto)
  lines?: SalesOrderLineDto[];
}

export class ConfirmSalesOrderDto {
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class CancelSalesOrderDto {
  @IsString()
  reason: string;
}

export class CompleteSalesOrderDto {
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class SalesOrderFilterDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  quotationId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}

export class MapSalesOrderDto {
  @IsOptional()
  @IsObject()
  mapping?: Record<string, unknown>;
}
