import { IsString, IsOptional, IsBoolean, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AddressType } from '../entities/customer-address.entity';

export class CreateCustomerAddressDto {
  @ApiPropertyOptional({ enum: AddressType, default: AddressType.BILLING })
  @IsOptional()
  @IsEnum(AddressType)
  addressType?: AddressType;

  @ApiProperty({ example: 'Plot 12, MIDC Industrial Estate' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  line1: string;

  @ApiPropertyOptional({ example: 'Phase II' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  line3?: string;

  @ApiProperty({ example: 'Pune' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  state: string;

  @ApiPropertyOptional({ example: '411019' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ example: 'India', default: 'India' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateCustomerAddressDto extends PartialType(CreateCustomerAddressDto) {}
