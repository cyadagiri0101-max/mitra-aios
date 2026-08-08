import { IsString, IsOptional, IsObject, IsUUID, ValidateNested, MinLength, MaxLength, IsEmail, IsBoolean, IsEnum, IsArray, IsNumber, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateContactDto } from './contact.dto';
import { CreateCustomerAddressDto } from './customer-address.dto';
import { CreateCustomerNoteDto } from './customer-note.dto';
import { CustomerStatus, CustomerSource } from '../entities/customer.entity';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Acme Mold Corp' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

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

  @ApiPropertyOptional({ example: 'AAPCA1234F' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @ApiPropertyOptional({ example: 'U29309MH2020PTC123456' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  registrationNumber?: string;

  @ApiPropertyOptional({ example: 'https://acme-molds.com' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @ApiPropertyOptional({ example: '+91 98765 43210' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'sales@acme-molds.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'INR', default: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ example: 5000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  creditLimit?: number;

  @ApiPropertyOptional({ example: 'Net 30' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  paymentTerms?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating?: number;

  @ApiPropertyOptional({ enum: CustomerStatus })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({ enum: CustomerSource })
  @IsOptional()
  @IsEnum(CustomerSource)
  source?: CustomerSource;

  @ApiPropertyOptional({ example: { region: 'NA', tier: 'gold' } })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [CreateContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContactDto)
  contacts?: CreateContactDto[];

  @ApiPropertyOptional({ type: [CreateCustomerAddressDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerAddressDto)
  addresses?: CreateCustomerAddressDto[];

  @ApiPropertyOptional({ type: [CreateCustomerNoteDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerNoteDto)
  notes?: CreateCustomerNoteDto[];
}

export class UpdateCustomerDto extends PartialType(OmitType(CreateCustomerDto, ['status'])) {
  // C-3 remediation: `status` is intentionally NOT part of the update DTO.
  // Customer status transitions (activate/deactivate/archive) are guarded
  // state-machine operations in CustomerService and must not be reachable
  // through a generic PATCH.
}

export class CustomerFilterDto {
  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({ example: 'uuid-of-type' })
  @IsOptional()
  @IsUUID()
  customerTypeId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'automotive' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @IsString()
  includeArchived?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class CustomerResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  code: string | null;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  industry: string | null;

  @ApiPropertyOptional()
  customerTypeId: string | null;

  @ApiPropertyOptional()
  categoryId: string | null;

  @ApiPropertyOptional()
  gstNumber: string | null;

  @ApiPropertyOptional()
  taxId: string | null;

  @ApiPropertyOptional()
  website: string | null;

  @ApiPropertyOptional()
  phone: string | null;

  @ApiPropertyOptional()
  email: string | null;

  @ApiProperty({ enum: CustomerStatus })
  status: CustomerStatus;

  @ApiPropertyOptional()
  attributes: Record<string, unknown> | null;

  @ApiPropertyOptional()
  archivedAt: Date | null;

  @ApiPropertyOptional({ type: [Object] })
  contacts: any[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
