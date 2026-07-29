import { IsString, IsOptional, IsObject, IsUUID, ValidateNested, MinLength, MaxLength, IsEmail, IsBoolean, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateContactDto } from './contact.dto';
import { CustomerStatus } from '../entities/customer.entity';

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
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @ApiPropertyOptional({ enum: CustomerStatus })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;
}

export class CustomerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  industry: string | null;

  @ApiProperty({ enum: CustomerStatus })
  status: CustomerStatus;

  @ApiPropertyOptional()
  attributes: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: [Object] })
  contacts: any[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
