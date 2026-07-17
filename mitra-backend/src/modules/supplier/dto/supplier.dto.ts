import { IsString, IsOptional, IsEmail, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { SupplierStatus } from '../entities/supplier.entity';

export class CreateSupplierDto {
  @ApiProperty() @IsString() @MaxLength(200) name: string;
  @ApiProperty() @IsString() @MaxLength(30) supplierCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) contactPerson?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(200) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(SupplierStatus) status?: SupplierStatus;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}
