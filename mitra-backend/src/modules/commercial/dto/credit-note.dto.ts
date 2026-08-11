import {
  IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min,
} from 'class-validator';

export class CreateCreditNoteDto {
  @IsOptional()
  @IsUUID()
  invoiceId?: string | null;

  @IsOptional()
  @IsUUID()
  customerId?: string | null;

  @IsOptional()
  @IsUUID()
  salesOrderId?: string | null;

  @IsDateString()
  creditDate: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class ApplyCreditNoteDto {
  @IsUUID()
  invoiceId: string;
}

export class CancelCreditNoteDto {
  @IsString()
  reason: string;
}

export class CreditNoteFilterDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;
}
